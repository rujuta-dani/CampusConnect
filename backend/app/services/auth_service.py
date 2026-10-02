from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, UserStatus, UserRole
from app.schemas.auth import RegisterRequest
from app.utils.hashing import hash_password, verify_password
from app.auth.jwt_handler import create_access_token


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

def register_user(payload: RegisterRequest, db: Session) -> dict:
    """
    Validate uniqueness, hash password, persist new user.
    Returns a success message dict.
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Account already exists."},
        )

    from app.models.notification import NotificationPreference
    new_user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    if payload.role in (UserRole.faculty, "faculty"):
        new_user.department      = payload.department
        new_user.designation     = payload.designation
        new_user.employee_id     = payload.employee_id
        new_user.office_location = payload.office_location
        new_user.office_hours    = payload.office_hours
        new_user.is_verified     = False  # requires admin approval
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize notification preferences
    pref = NotificationPreference(user_id=new_user.user_id)
    db.add(pref)
    db.commit()

    return {"message": "User registered successfully"}


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def login_user(email: str, password: str, db: Session) -> dict:
    """
    Verify credentials, check account status, and return JWT + user data.
    """
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Invalid email or password"},
        )

    if user.status == UserStatus.suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Account suspended"},
        )

    access_token = create_access_token(data={"sub": str(user.user_id)})

    # Log login activity
    from app.services.analytics_service import log_user_activity
    log_user_activity(db, user.user_id, "login", user.user_id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }

