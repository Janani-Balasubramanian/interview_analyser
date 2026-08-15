from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..core.database import get_db
from ..core.security import get_current_active_user
from ..models.models import User, Interview, InterviewStatus
from ..models.schemas import DashboardResponse, UserResponse, InterviewResponse, MonthlyCreditResponse
from ..services.credits import get_credit_status

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    credit_status = get_credit_status(db, current_user)
    
    recent = db.query(Interview).filter(
        Interview.user_id == current_user.id,
        Interview.status == InterviewStatus.COMPLETED
    ).order_by(Interview.completed_at.desc()).limit(5).all()
    
    avg_score = db.query(func.avg(Interview.total_score)).filter(
        Interview.user_id == current_user.id,
        Interview.status == InterviewStatus.COMPLETED
    ).scalar()
    
    total_count = db.query(Interview).filter(
        Interview.user_id == current_user.id,
        Interview.status == InterviewStatus.COMPLETED
    ).count()
    
    return {
        "user": current_user,
        "current_month_credits": credit_status,
        "recent_interviews": recent,
        "average_score": round(avg_score, 1) if avg_score else None,
        "total_interviews": total_count
    }


@router.get("/credits", response_model=MonthlyCreditResponse)
def get_credits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return get_credit_status(db, current_user)
