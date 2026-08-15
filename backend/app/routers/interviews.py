from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
import random

from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Interview, Question, Answer, InterviewStatus, DomainTrack, ExperienceTier
from ..models.schemas import (
    InterviewCreate, InterviewResponse, QuestionResponse, AnswerSubmit, DashboardResponse,
    MonthlyCreditResponse, UserResponse, ProctoringData
)
from ..services.credits import can_start_interview, record_interview_completion, get_credit_status
from ..services.scoring import score_answer_with_llm, generate_interview_summary

router = APIRouter(prefix="/interviews", tags=["Interviews"])


@router.post("/start", response_model=InterviewResponse)
async def start_interview(
    payload: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    can_start, reason = can_start_interview(db, current_user)
    if not can_start:
        raise HTTPException(status_code=403, detail=reason)
    
    tier = payload.tier or current_user.experience_tier
    
    interview = Interview(
        user_id=current_user.id,
        domain=payload.domain,
        tier=tier,
        status=InterviewStatus.IN_PROGRESS,
        started_at=datetime.utcnow()
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


@router.get("/{interview_id}/questions", response_model=List[QuestionResponse])
def get_interview_questions(
    interview_id: int,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    questions = db.query(Question).filter(
        Question.domain == interview.domain,
        Question.tier == interview.tier,
        Question.is_active == True
    ).all()
    
    if not questions:
        # Fallback: return any questions for the domain
        questions = db.query(Question).filter(
            Question.domain == interview.domain,
            Question.is_active == True
        ).all()
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available for this domain/tier")
    
    selected = random.sample(questions, min(limit, len(questions)))
    return selected


@router.post("/{interview_id}/answer")
async def submit_answer(
    interview_id: int,
    answer: AnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status != InterviewStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Interview is not in progress")
    
    question = db.query(Question).filter(Question.id == answer.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Score the answer
    score_result = await score_answer_with_llm(
        transcript=answer.transcript,
        question_text=question.question_text,
        domain=interview.domain.value,
        tier=interview.tier.value
    )
    
    db_answer = Answer(
        interview_id=interview_id,
        question_id=answer.question_id,
        transcript=answer.transcript,
        audio_url=answer.audio_url,
        score=score_result.get("total"),
        feedback=score_result.get("feedback"),
        scores_breakdown=score_result
    )
    db.add(db_answer)
    db.commit()
    
    return {
        "message": "Answer submitted and scored",
        "score": score_result.get("total"),
        "feedback": score_result.get("feedback"),
        "breakdown": score_result.get("breakdown")
    }


@router.post("/{interview_id}/complete", response_model=InterviewResponse)
async def complete_interview(
    interview_id: int,
    proctoring: ProctoringData = ProctoringData(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    answers = db.query(Answer).filter(Answer.interview_id == interview_id).all()
    scores = [a.scores_breakdown for a in answers if a.scores_breakdown]
    
    summary = generate_interview_summary(scores)
    
    # Proctoring data
    tab_switches = proctoring.tab_switches if proctoring else 0
    fullscreen_exits = proctoring.fullscreen_exits if proctoring else 0
    copy_paste_attempts = proctoring.copy_paste_attempts if proctoring else 0
    webcam_enabled = proctoring.webcam_enabled if proctoring else False
    flags = proctoring.proctoring_flags if proctoring else {}

    # Integrity score: start at 100, deduct for violations
    integrity = 100.0
    integrity -= min(tab_switches * 15, 45)
    integrity -= min(fullscreen_exits * 10, 30)
    integrity -= min(copy_paste_attempts * 10, 30)
    if not webcam_enabled:
        integrity -= 10
    integrity = max(0, integrity)

    interview.status = InterviewStatus.COMPLETED
    interview.completed_at = datetime.utcnow()
    interview.total_score = summary["total_score"]
    interview.confidence_score = summary["confidence_score"]
    interview.communication_score = summary["communication_score"]
    interview.technical_score = summary["technical_score"]
    interview.feedback_summary = summary["feedback_summary"]
    interview.detailed_feedback = summary["detailed_feedback"]
    interview.tab_switches = tab_switches
    interview.fullscreen_exits = fullscreen_exits
    interview.copy_paste_attempts = copy_paste_attempts
    interview.webcam_enabled = webcam_enabled
    interview.proctoring_flags = flags
    interview.integrity_score = integrity
    
    db.commit()
    
    # Update credits
    record_interview_completion(db, current_user, summary["total_score"])
    
    db.refresh(interview)
    return interview


@router.get("/history", response_model=List[InterviewResponse])
def get_interview_history(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    interviews = db.query(Interview).filter(
        Interview.user_id == current_user.id
    ).order_by(Interview.created_at.desc()).limit(limit).all()
    return interviews


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    interview = db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview
