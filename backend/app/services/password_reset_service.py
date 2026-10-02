import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.user import User
from app.models.password_reset import PasswordResetOtp, PasswordResetToken
from app.utils.hashing import hash_password, verify_password
from app.services.email_service import send_otp_email


def request_password_reset(email: str, db: Session, client_ip: Optional[str] = None) -> dict:
    """
    Generate and send a 6-digit OTP for password reset.
    Guarantees non-enumeration by returning identical generic response.
    """
    clean_email = email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    # Rate limiting & abuse protection if user exists
    if user:
        now = datetime.utcnow()
        # Cooldown: 60 seconds between OTP requests
        recent_otp = (
            db.query(PasswordResetOtp)
            .filter(
                PasswordResetOtp.user_id == user.user_id,
                PasswordResetOtp.created_at >= now - timedelta(seconds=60),
            )
            .first()
        )
        if recent_otp:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={"message": "Please wait 60 seconds before requesting another OTP."}
            )

        # Max 5 requests per 15 minutes window
        request_count = (
            db.query(PasswordResetOtp)
            .filter(
                PasswordResetOtp.user_id == user.user_id,
                PasswordResetOtp.created_at >= now - timedelta(minutes=15),
            )
            .count()
        )
        if request_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={"message": "Too many password reset requests. Please try again later."}
            )

        # Invalidate any previous unused OTPs
        db.query(PasswordResetOtp).filter(
            PasswordResetOtp.user_id == user.user_id,
            PasswordResetOtp.is_used == False,
        ).update({"is_used": True})

        # Generate cryptographically secure 6-digit OTP
        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = hash_password(otp)
        expires_at = now + timedelta(minutes=10)

        new_otp_record = PasswordResetOtp(
            user_id=user.user_id,
            email=user.email,
            otp_hash=otp_hash,
            expires_at=expires_at,
            attempts=0,
            max_attempts=5,
            is_used=False,
        )
        db.add(new_otp_record)
        db.commit()

        # Send OTP email
        send_otp_email(user.email, otp, expires_minutes=10)

    # Always return generic message to prevent email enumeration
    return {"message": "If an account exists with this email, an OTP has been sent."}


def resend_password_reset_otp(email: str, db: Session, client_ip: Optional[str] = None) -> dict:
    """
    Resend a fresh OTP with a 60-second cooldown check.
    """
    return request_password_reset(email, db, client_ip)


def verify_reset_otp(email: str, otp: str, db: Session) -> dict:
    """
    Verify 6-digit OTP code against bcrypt hash in database.
    On success, generates a single-use 15-minute reset token.
    """
    clean_email = email.strip().lower()
    clean_otp = otp.strip()

    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid OTP. Please check the OTP and try again."}
        )

    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid OTP. Please check the OTP and try again."}
        )

    # Find latest unused OTP for user
    otp_record = (
        db.query(PasswordResetOtp)
        .filter(
            PasswordResetOtp.user_id == user.user_id,
            PasswordResetOtp.is_used == False,
        )
        .order_by(PasswordResetOtp.created_at.desc())
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid OTP. Please check the OTP and try again."}
        )

    now = datetime.utcnow()

    # Check attempt limit
    if otp_record.attempts >= otp_record.max_attempts:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Too many incorrect attempts. Please request a new OTP."}
        )

    # Check expiration
    if now > otp_record.expires_at:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "This OTP has expired. Please request a new OTP."}
        )

    # Verify bcrypt hash
    if not verify_password(clean_otp, otp_record.otp_hash):
        otp_record.attempts += 1
        if otp_record.attempts >= otp_record.max_attempts:
            otp_record.is_used = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Too many incorrect attempts. Please request a new OTP."}
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid OTP. Please check the OTP and try again."}
        )

    # Valid OTP -> Consume it
    otp_record.is_used = True

    # Generate cryptographically secure random reset token
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = now + timedelta(minutes=15)

    reset_token_record = PasswordResetToken(
        user_id=user.user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        is_used=False,
    )
    db.add(reset_token_record)
    db.commit()

    return {
        "message": "OTP verified successfully.",
        "reset_token": raw_token
    }


def reset_password_with_token(reset_token: str, new_password: str, db: Session) -> dict:
    """
    Validate the single-use reset token and update user's password.
    """
    if not new_password or len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Password must be at least 8 characters long."}
        )

    clean_token = reset_token.strip()
    token_hash = hashlib.sha256(clean_token.encode("utf-8")).hexdigest()

    token_record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.is_used == False,
        )
        .first()
    )

    now = datetime.utcnow()
    if not token_record or now > token_record.expires_at:
        if token_record:
            token_record.is_used = True
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Your password reset session has expired. Please start again."}
        )

    user = db.query(User).filter(User.user_id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "User account not found."}
        )

    # Hash new password using existing password hashing mechanism
    user.password_hash = hash_password(new_password)

    # Invalidate reset token
    token_record.is_used = True

    # Invalidate all remaining OTPs and tokens for this user
    db.query(PasswordResetOtp).filter(
        PasswordResetOtp.user_id == user.user_id,
        PasswordResetOtp.is_used == False,
    ).update({"is_used": True})

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.user_id,
        PasswordResetToken.is_used == False,
    ).update({"is_used": True})

    db.commit()

    return {"message": "Password reset successful! You can now log in with your new password."}
