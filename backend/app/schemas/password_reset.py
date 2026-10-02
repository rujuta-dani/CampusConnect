from pydantic import BaseModel, EmailStr, Field


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered user email address")


class ForgotPasswordResponse(BaseModel):
    message: str


class VerifyResetOtpRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered user email address")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class VerifyResetOtpResponse(BaseModel):
    message: str
    reset_token: str


class ResendResetOtpRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered user email address")


class ResendResetOtpResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    reset_token: str = Field(..., min_length=10, description="Single-use reset token")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")


class ResetPasswordResponse(BaseModel):
    message: str
