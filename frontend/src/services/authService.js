import api from './api';

/**
 * Register a new user.
 * @param {{ name: string, email: string, password: string, role: string }} data
 */
export const register = (data) => api.post('/auth/register', data);

/**
 * Login and receive JWT token + user data.
 * @param {{ email: string, password: string }} data
 */
export const login = (data) => api.post('/auth/login', data);

/**
 * Fetch the currently authenticated user's profile.
 * Requires a valid token in localStorage (attached by interceptor).
 */
export const getMe = () => api.get('/auth/me');

/**
 * Request a 6-digit password reset OTP sent to the user's email.
 * @param {{ email: string }} data
 */
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);

/**
 * Verify the 6-digit OTP code and receive a single-use password reset token.
 * @param {{ email: string, otp: string }} data
 */
export const verifyResetOtp = (data) => api.post('/auth/verify-reset-otp', data);

/**
 * Resend the 6-digit OTP code (subject to 60-second cooldown).
 * @param {{ email: string }} data
 */
export const resendResetOtp = (data) => api.post('/auth/resend-reset-otp', data);

/**
 * Set a new password using the single-use reset token.
 * @param {{ reset_token: string, new_password: string }} data
 */
export const resetPassword = (data) => api.post('/auth/reset-password', data);

