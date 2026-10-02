from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ── Requests ──────────────────────────────────────────────────────────────────

class ProfileCreate(BaseModel):
    bio:             Optional[str] = None
    department:      Optional[str] = None
    year_of_study:   Optional[str] = None
    designation:     Optional[str] = None
    profile_picture: Optional[str] = None

    model_config = {"from_attributes": True}


class ProfileUpdate(ProfileCreate):
    """Same fields as create; all optional so partial updates are allowed."""
    pass


class AddSkillRequest(BaseModel):
    skill_name: str

    model_config = {"from_attributes": True}


# ── Responses ─────────────────────────────────────────────────────────────────

class SkillOut(BaseModel):
    skill_id:   int
    skill_name: str

    model_config = {"from_attributes": True}


class ProfileCommunity(BaseModel):
    community_id: int
    community_name: str
    logo_url: Optional[str] = None
    category: Optional[str] = None

    model_config = {"from_attributes": True}


class ProfileResponse(BaseModel):
    """Full profile — includes user info joined from the users table."""
    user_id:         int
    name:            str
    email:           str
    role:            str
    bio:             Optional[str] = None
    department:      Optional[str] = None
    year_of_study:   Optional[str] = None
    designation:     Optional[str] = None
    profile_picture: Optional[str] = None
    skills:          List[str] = []
    communities:     List[ProfileCommunity] = []
    profile_exists:  bool = False
    created_at:      Optional[datetime] = None
    is_verified:     bool = False
    office_location: Optional[str] = None
    office_hours:    Optional[str] = None
    employee_id:     Optional[str] = None

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str

