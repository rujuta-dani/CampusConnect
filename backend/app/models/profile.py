from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey,
    TIMESTAMP, UniqueConstraint, Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base


class Profile(Base):
    """
    One-to-one with users.user_id.
    Fields are role-contextual (year_of_study for students,
    designation for faculty, etc.) — left as nullable so one
    table serves all roles.
    """

    __tablename__ = "profiles"

    profile_id      = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    bio             = Column(Text, nullable=True)
    department      = Column(String(100), nullable=True)
    year_of_study   = Column(String(20), nullable=True)
    designation     = Column(String(100), nullable=True)
    _profile_picture = Column("profile_picture", String(500), nullable=True)
    created_at      = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    updated_at      = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    avatar_is_deleted = Column(Boolean, default=False, nullable=False)
    avatar_deleted_at = Column(TIMESTAMP, nullable=True)

    @property
    def profile_picture(self):
        if self.avatar_is_deleted:
            return None
        return self._profile_picture

    @profile_picture.setter
    def profile_picture(self, value):
        self._profile_picture = value

    # Back-reference to User (uselist=False = one-to-one)
    user = relationship("User", backref="profile", uselist=False)


class Skill(Base):
    """
    Master skill catalogue — skill_name is UNIQUE so we never
    duplicate entries.  Shared across all users.
    """

    __tablename__ = "skills"

    skill_id   = Column(Integer, primary_key=True, autoincrement=True, index=True)
    skill_name = Column(String(100), nullable=False, unique=True, index=True)


class UserSkill(Base):
    """
    Junction: a user can have many skills, a skill can belong to
    many users.  (user_id, skill_id) is UNIQUE so duplicates are
    prevented at the DB level.
    """

    __tablename__ = "user_skills"

    id       = Column(Integer, primary_key=True, autoincrement=True)
    user_id  = Column(Integer, ForeignKey("users.user_id",  ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False)

    skill = relationship("Skill")

    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_user_skill"),
    )
