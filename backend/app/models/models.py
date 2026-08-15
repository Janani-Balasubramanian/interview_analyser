from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, 
    Text, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..core.database import Base


class ExperienceTier(str, enum.Enum):
    TIER1 = "tier1"  # Freshers 0-2 years
    TIER2 = "tier2"  # Mid-level 2-10 years
    TIER3 = "tier3"  # Senior >10 years


class DomainTrack(str, enum.Enum):
    SOFTWARE_ENGINEERING = "software_engineering"
    DATA_ANALYTICS = "data_analytics"
    HR_BEHAVIORAL = "hr_behavioral"
    BUSINESS_ANALYTICS = "business_analytics"
    PRODUCT_MANAGEMENT = "product_management"
    MARKETING = "marketing"


class InterviewStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    experience_tier = Column(SQLEnum(ExperienceTier), default=ExperienceTier.TIER1)
    preferred_domains = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    interviews = relationship("Interview", back_populates="user")
    monthly_credits = relationship("MonthlyCredit", back_populates="user")


class MonthlyCredit(Base):
    __tablename__ = "monthly_credits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year_month = Column(String, nullable=False)  # "2026-08"
    free_interviews_used = Column(Integer, default=0)
    bonus_unlocked = Column(Boolean, default=False)
    total_score = Column(Float, default=0.0)
    interviews_completed = Column(Integer, default=0)
    
    user = relationship("User", back_populates="monthly_credits")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    domain = Column(SQLEnum(DomainTrack), nullable=False)
    tier = Column(SQLEnum(ExperienceTier), nullable=False)
    difficulty = Column(Integer, default=1)  # 1-5
    question_text = Column(Text, nullable=False)
    ideal_answer_outline = Column(Text, nullable=True)
    tags = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain = Column(SQLEnum(DomainTrack), nullable=False)
    tier = Column(SQLEnum(ExperienceTier), nullable=False)
    status = Column(SQLEnum(InterviewStatus), default=InterviewStatus.SCHEDULED)
    total_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    technical_score = Column(Float, nullable=True)
    feedback_summary = Column(Text, nullable=True)
    detailed_feedback = Column(JSON, nullable=True)
    # Proctoring / integrity data
    tab_switches = Column(Integer, default=0)
    fullscreen_exits = Column(Integer, default=0)
    copy_paste_attempts = Column(Integer, default=0)
    webcam_enabled = Column(Boolean, default=False)
    proctoring_flags = Column(JSON, nullable=True)  # extra details
    integrity_score = Column(Float, nullable=True)  # 100 = clean, lower = more violations
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="interviews")
    answers = relationship("Answer", back_populates="interview")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    transcript = Column(Text, nullable=True)
    audio_url = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    scores_breakdown = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="answers")
    question = relationship("Question")
