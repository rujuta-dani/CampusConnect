from sqlalchemy import (
    Column,
    Integer,
    String,
    TIMESTAMP,
    Boolean,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship
from app.database.database import Base


class PasswordResetOtp(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(150), nullable=False, index=True)
    otp_hash = Column(String(255), nullable=False)
    expires_at = Column(TIMESTAMP, nullable=False, index=True)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    user = relationship("User", backref="password_reset_otps")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(TIMESTAMP, nullable=False, index=True)
    is_used = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    user = relationship("User", backref="password_reset_tokens")
