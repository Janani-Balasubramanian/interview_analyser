from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .models import ExperienceTier, DomainTrack, InterviewStatus


# ============== Auth ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    experience_tier: ExperienceTier = ExperienceTier.TIER1
    preferred_domains: List[DomainTrack] = []


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    experience_tier: ExperienceTier
    preferred_domains: List[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Interview ==============
class InterviewCreate(BaseModel):
    domain: DomainTrack
    tier: Optional[ExperienceTier] = None  # defaults to user's tier


class AnswerSubmit(BaseModel):
    question_id: int
    transcript: str
    audio_url: Optional[str] = None


class ProctoringData(BaseModel):
    tab_switches: int = 0
    fullscreen_exits: int = 0
    copy_paste_attempts: int = 0
    webcam_enabled: bool = False
    proctoring_flags: Optional[Dict[str, Any]] = None


class InterviewResponse(BaseModel):
    id: int
    domain: DomainTrack
    tier: ExperienceTier
    status: InterviewStatus
    total_score: Optional[float]
    confidence_score: Optional[float]
    communication_score: Optional[float]
    technical_score: Optional[float]
    feedback_summary: Optional[str]
    detailed_feedback: Optional[Dict[str, Any]]
    tab_switches: Optional[int] = 0
    fullscreen_exits: Optional[int] = 0
    copy_paste_attempts: Optional[int] = 0
    webcam_enabled: Optional[bool] = False
    proctoring_flags: Optional[Dict[str, Any]] = None
    integrity_score: Optional[float] = None
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionResponse(BaseModel):
    id: int
    domain: DomainTrack
    tier: ExperienceTier
    difficulty: int
    question_text: str
    tags: List[str]

    class Config:
        from_attributes = True


# ============== Credits ==============
class MonthlyCreditResponse(BaseModel):
    year_month: str
    free_interviews_used: int
    free_interviews_remaining: int
    bonus_unlocked: bool
    total_score: float
    interviews_completed: int
    can_start_interview: bool
    progress_to_bonus: float  # 0-100 percentage toward 250
    message: Optional[str] = None

    class Config:
        from_attributes = True


# ============== Dashboard ==============
class DashboardResponse(BaseModel):
    user: UserResponse
    current_month_credits: MonthlyCreditResponse
    recent_interviews: List[InterviewResponse]
    average_score: Optional[float]
    total_interviews: int
