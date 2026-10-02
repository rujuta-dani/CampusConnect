from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import UserRole, UserStatus


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.student
    # Teacher-specific optional fields (ignored for non-teacher roles)
    department:      Optional[str] = None
    designation:     Optional[str] = None
    employee_id:     Optional[str] = None
    office_location: Optional[str] = None
    office_hours:    Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class UserPublic(BaseModel):
    """Safe user data returned to the client (no password_hash)."""

    user_id: int
    name: str
    email: EmailStr
    role: UserRole
    is_verified: bool = False

    model_config = {"from_attributes": True}


class UserDetail(UserPublic):
    """Extended user data including status — used in /me endpoint."""

    status: UserStatus
    created_at: datetime
    is_verified: bool = False
    department:      Optional[str] = None
    designation:     Optional[str] = None
    office_location: Optional[str] = None
    office_hours:    Optional[str] = None
    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    message: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class MessageResponse(BaseModel):
    message: str
