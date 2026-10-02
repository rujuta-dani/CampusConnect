import os
import uuid
import shutil
from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.profile import Profile, Skill, UserSkill
from app.models.community import Community, CommunityMember
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse, SkillOut


# ── Helpers ───────────────────────────────────────────────────────────────────

def _skill_names_for_user(user_id: int, db: Session) -> List[str]:
    rows = (
        db.query(Skill.skill_name)
        .join(UserSkill, UserSkill.skill_id == Skill.skill_id)
        .filter(UserSkill.user_id == user_id)
        .all()
    )
    return [r.skill_name for r in rows]


def _build_response(user: User, profile: Profile | None, db: Session) -> dict:
    skills = _skill_names_for_user(user.user_id, db)
    
    # Query communities the user has joined
    member_records = (
        db.query(Community)
        .join(CommunityMember, CommunityMember.community_id == Community.community_id)
        .filter(CommunityMember.user_id == user.user_id)
        .all()
    )
    communities_joined = [
        {
            "community_id": c.community_id,
            "community_name": c.community_name,
            "logo_url": c.logo_url,
            "category": c.category,
        }
        for c in member_records
    ]

    return {
        "user_id":         user.user_id,
        "name":            user.name,
        "email":           user.email,
        "role":            user.role,
        "bio":             profile.bio             if profile else None,
        "department":      (user.department or (profile.department if profile else None)) if user.role == "teacher" else (profile.department if profile else None),
        "year_of_study":   profile.year_of_study   if profile else None,
        "designation":     (user.designation or (profile.designation if profile else None)) if user.role == "teacher" else (profile.designation if profile else None),
        "profile_picture": profile.profile_picture if profile else None,
        "skills":          skills,
        "communities":     communities_joined,
        "profile_exists":  profile is not None,
        "created_at":      profile.created_at      if profile else None,
        "is_verified":     getattr(user, "is_verified", False),
        "office_location": getattr(user, "office_location", None),
        "office_hours":    getattr(user, "office_hours", None),
        "employee_id":     getattr(user, "employee_id", None),
    }



# ── Profile CRUD ──────────────────────────────────────────────────────────────

def create_profile(current_user: User, payload: ProfileCreate, db: Session) -> dict:
    existing = db.query(Profile).filter(Profile.user_id == current_user.user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Profile already exists. Use PUT to update."},
        )

    profile = Profile(
        user_id         = current_user.user_id,
        bio             = payload.bio,
        department      = payload.department,
        year_of_study   = payload.year_of_study,
        designation     = payload.designation,
        profile_picture = payload.profile_picture,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {"message": "Profile created successfully"}


def get_my_profile(current_user: User, db: Session) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == current_user.user_id).first()
    return _build_response(current_user, profile, db)


def update_profile(current_user: User, payload: ProfileUpdate, db: Session) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == current_user.user_id).first()

    if not profile:
        # Auto-create if not present
        profile = Profile(user_id=current_user.user_id)
        db.add(profile)

    if payload.bio             is not None: profile.bio             = payload.bio
    if payload.department      is not None: profile.department      = payload.department
    if payload.year_of_study   is not None: profile.year_of_study   = payload.year_of_study
    if payload.designation     is not None: profile.designation     = payload.designation
    if payload.profile_picture is not None:
        profile.profile_picture = payload.profile_picture
        profile.avatar_is_deleted = False
        profile.avatar_deleted_at = None

    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return {"message": "Profile updated successfully"}


def get_user_profile(user_id: int, db: Session) -> dict:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "User not found"},
        )
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    return _build_response(user, profile, db)


# ── Skill Management ──────────────────────────────────────────────────────────

def add_skill(current_user: User, skill_name: str, db: Session) -> dict:
    skill_name = skill_name.strip()
    if not skill_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Skill name cannot be empty"},
        )

    # Get-or-create the master skill record
    skill = db.query(Skill).filter(
        Skill.skill_name.ilike(skill_name)
    ).first()

    if not skill:
        skill = Skill(skill_name=skill_name)
        db.add(skill)
        db.flush()  # get skill_id without full commit

    # Avoid duplicate user_skill
    existing = db.query(UserSkill).filter(
        UserSkill.user_id  == current_user.user_id,
        UserSkill.skill_id == skill.skill_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Skill already added"},
        )

    user_skill = UserSkill(user_id=current_user.user_id, skill_id=skill.skill_id)
    db.add(user_skill)
    db.commit()
    return {"message": f"Skill '{skill.skill_name}' added"}


def remove_skill(current_user: User, skill_id: int, db: Session) -> dict:
    user_skill = db.query(UserSkill).filter(
        UserSkill.user_id  == current_user.user_id,
        UserSkill.skill_id == skill_id,
    ).first()

    if not user_skill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Skill not found in your profile"},
        )

    db.delete(user_skill)
    db.commit()
    return {"message": "Skill removed"}


def get_user_skills(current_user: User, db: Session) -> List[dict]:
    rows = (
        db.query(Skill)
        .join(UserSkill, UserSkill.skill_id == Skill.skill_id)
        .filter(UserSkill.user_id == current_user.user_id)
        .order_by(Skill.skill_name)
        .all()
    )
    return [{"skill_id": s.skill_id, "skill_name": s.skill_name} for s in rows]


# ── Profile Picture Upload ────────────────────────────────────────────────────

UPLOAD_DIR    = "uploads/avatars"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB   = 5


async def upload_picture(current_user: User, file: UploadFile, db: Session) -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Only JPEG, PNG, WebP or GIF images are allowed"},
        )

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": f"File too large. Maximum {MAX_SIZE_MB} MB"},
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext      = (file.filename or "img").rsplit(".", 1)[-1].lower()
    filename = f"{current_user.user_id}_{uuid.uuid4().hex[:10]}.{ext}"
    dest     = os.path.join(UPLOAD_DIR, filename)

    with open(dest, "wb") as f:
        f.write(content)

    url = f"/static/avatars/{filename}"

    # Persist URL — auto-create profile row if needed
    profile = db.query(Profile).filter(Profile.user_id == current_user.user_id).first()
    if not profile:
        profile = Profile(user_id=current_user.user_id, profile_picture=url, avatar_is_deleted=False, avatar_deleted_at=None)
        db.add(profile)
    else:
        profile.profile_picture = url
        profile.avatar_is_deleted = False
        profile.avatar_deleted_at = None
        profile.updated_at      = datetime.now(timezone.utc)

    db.commit()
    return {"url": url, "message": "Picture updated"}


def delete_picture(current_user: User, db: Session) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == current_user.user_id).first()
    if not profile or not profile.profile_picture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "No profile picture found"}
        )

    profile.avatar_is_deleted = True
    profile.avatar_deleted_at = datetime.utcnow()
    profile.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Profile picture deleted successfully"}


def undo_delete_picture(current_user: User, db: Session) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == current_user.user_id).first()
    if not profile or not profile.avatar_is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "No soft-deleted profile picture found or cannot be restored"}
        )

    profile.avatar_is_deleted = False
    profile.avatar_deleted_at = None
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Profile picture restored successfully"}

