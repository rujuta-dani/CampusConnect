from typing import List
from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.user import User
from app.schemas.profile import (
    ProfileCreate, ProfileUpdate, ProfileResponse,
    AddSkillRequest, SkillOut, MessageResponse,
)
from app.services import profile_service

router = APIRouter(prefix="/api/profile", tags=["Profile & Skills"])


# ── Profile ───────────────────────────────────────────────────────────────────

@router.post("", response_model=MessageResponse, status_code=201)
def create_profile(
    payload: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a profile for the logged-in user (one per user)."""
    return profile_service.create_profile(current_user, payload, db)


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the full profile of the currently authenticated user."""
    return profile_service.get_my_profile(current_user, db)


@router.put("", response_model=MessageResponse)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the logged-in user's profile (auto-creates if missing)."""
    return profile_service.update_profile(current_user, payload, db)


# ── Skills ────────────────────────────────────────────────────────────────────

@router.get("/skills", response_model=List[SkillOut])
def get_user_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's skill list with IDs (for edit/remove)."""
    return profile_service.get_user_skills(current_user, db)


@router.post("/skills", response_model=MessageResponse, status_code=201)
def add_skill(
    payload: AddSkillRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a skill (reuses an existing master-skill record if name matches)."""
    return profile_service.add_skill(current_user, payload.skill_name, db)


@router.delete("/skills/{skill_id}", response_model=MessageResponse)
def remove_skill(
    skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a skill from the authenticated user's profile."""
    return profile_service.remove_skill(current_user, skill_id, db)


@router.post("/picture")
async def upload_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile picture — accepts JPEG/PNG/WebP/GIF up to 5 MB."""
    return await profile_service.upload_picture(current_user, file, db)


@router.delete("/picture", response_model=MessageResponse)
def delete_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the profile picture and remove the file from disk."""
    return profile_service.delete_picture(current_user, db)


@router.post("/picture/undo", response_model=MessageResponse)
def undo_delete_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Restore a soft-deleted profile picture."""
    return profile_service.undo_delete_picture(current_user, db)


# ── Public Profile View (must be LAST to avoid swallowing /me and /skills) ────

@router.get("/{user_id}", response_model=ProfileResponse)
def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View any user's public profile by user_id."""
    return profile_service.get_user_profile(user_id, db)
