from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models.models import User, MonthlyCredit
from ..core.config import settings


def get_current_year_month() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def get_or_create_monthly_credit(db: Session, user_id: int) -> MonthlyCredit:
    year_month = get_current_year_month()
    credit = db.query(MonthlyCredit).filter(
        MonthlyCredit.user_id == user_id,
        MonthlyCredit.year_month == year_month
    ).first()
    
    if not credit:
        credit = MonthlyCredit(
            user_id=user_id,
            year_month=year_month,
            free_interviews_used=0,
            bonus_unlocked=False,
            total_score=0.0,
            interviews_completed=0
        )
        db.add(credit)
        db.commit()
        db.refresh(credit)
    return credit


def can_start_interview(db: Session, user: User) -> tuple[bool, str]:
    credit = get_or_create_monthly_credit(db, user.id)
    
    free_remaining = settings.FREE_INTERVIEWS_PER_MONTH - credit.free_interviews_used
    
    if free_remaining > 0:
        return True, "Free interview available"
    
    # Bonus: one extra interview when cumulative score exceeds threshold
    if credit.bonus_unlocked:
        bonus_limit = settings.FREE_INTERVIEWS_PER_MONTH + 1
        if credit.interviews_completed < bonus_limit:
            return True, "Bonus interview unlocked"
        return False, "Monthly limit reached (including bonus). Keep practicing next month!"
    
    score_needed = settings.BONUS_UNLOCK_SCORE - credit.total_score
    return False, (
        f"No free interviews left this month. "
        f"Score {score_needed:.0f} more points across retries to unlock a bonus interview."
    )


def record_interview_completion(db: Session, user: User, score: float) -> MonthlyCredit:
    credit = get_or_create_monthly_credit(db, user.id)
    
    credit.interviews_completed += 1
    credit.total_score += score
    
    # Count against free quota only if under free limit
    if credit.free_interviews_used < settings.FREE_INTERVIEWS_PER_MONTH:
        credit.free_interviews_used += 1
    
    # Check bonus unlock
    if not credit.bonus_unlocked and credit.total_score > settings.BONUS_UNLOCK_SCORE:
        credit.bonus_unlocked = True
    
    db.commit()
    db.refresh(credit)
    return credit


def get_credit_status(db: Session, user: User) -> dict:
    credit = get_or_create_monthly_credit(db, user.id)
    free_remaining = max(0, settings.FREE_INTERVIEWS_PER_MONTH - credit.free_interviews_used)
    
    can_start, reason = can_start_interview(db, user)
    
    progress = min(100.0, (credit.total_score / settings.BONUS_UNLOCK_SCORE) * 100)
    
    return {
        "year_month": credit.year_month,
        "free_interviews_used": credit.free_interviews_used,
        "free_interviews_remaining": free_remaining,
        "bonus_unlocked": credit.bonus_unlocked,
        "total_score": credit.total_score,
        "interviews_completed": credit.interviews_completed,
        "can_start_interview": can_start,
        "progress_to_bonus": round(progress, 1),
        "message": reason
    }
