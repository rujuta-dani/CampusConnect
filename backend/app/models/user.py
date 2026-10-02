import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    TIMESTAMP,
    Boolean,
    func,
)
from app.database.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    faculty = "faculty"
    club = "club"
    admin = "admin"
    teacher = "teacher"


class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    banned = "banned"


class AccountStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    banned = "banned"


class User(Base):
    """
    Represents the `users` table.

    Schema is fixed — do NOT alter columns here.
    Future modules will reference this model via foreign keys.
    """

    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        String(20),
        nullable=False,
        default=UserRole.student.value,
    )
    status = Column(
        String(20),
        nullable=False,
        default=UserStatus.active.value,
    )
    created_at = Column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )
    is_verified     = Column(Boolean, default=False, nullable=False)
    department      = Column(String(150), nullable=True)
    designation     = Column(String(150), nullable=True)
    employee_id     = Column(String(100), nullable=True, unique=True)
    office_location = Column(String(255), nullable=True)
    office_hours    = Column(String(255), nullable=True)
    warning_count   = Column(Integer, default=0, nullable=False)
    account_status  = Column(String(20), default="active", nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.user_id} email={self.email} role={self.role}>"
