import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { verifyResetOtp, resendResetOtp } from '../services/authService';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    setError('');
    setApiError('');
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email.trim()) return;
    setResending(true);
    setApiError('');
    setSuccessMsg('');

    try {
      const { data } = await resendResetOtp({ email: email.trim().toLowerCase() });
      setSuccessMsg(data.message || 'A new OTP has been sent to your email.');
      setCooldown(60);
    } catch (err) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'Failed to resend OTP. Please try again.';
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    setLoading(true);
    setApiError('');
    setSuccessMsg('');

    try {
      const { data } = await verifyResetOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      // Navigate to reset password page passing the temporary reset_token
      navigate('/reset-password', {
        state: {
          reset_token: data.reset_token,
          email: email.trim().toLowerCase(),
        },
      });
    } catch (err) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'Invalid OTP. Please check the OTP and try again.';
      setApiError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        {/* Logo mark */}
        <div className="auth-logo-mark">
          <svg viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
        </div>

        <h1 className="auth-title">Verify OTP</h1>
        <p className="auth-subtitle">
          {email ? (
            <>
              Enter the 6-digit code sent to <strong style={{ color: 'var(--ink)' }}>{email}</strong>
            </>
          ) : (
            'Enter the email address and 6-digit OTP'
          )}
        </p>

        {/* Banners */}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {apiError && <div className="alert alert-error">{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email input if not available in state */}
          {!location.state?.email && (
            <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
              <label className="form-label" htmlFor="verify-email">Email address</label>
              <input
                id="verify-email"
                type="email"
                placeholder="you@university.edu"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {/* OTP Code Input */}
          <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="form-label" htmlFor="otp-input" style={{ textAlign: 'center', display: 'block' }}>
              6-Digit Verification Code
            </label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="••••••"
              autoFocus
              className={`input${error ? ' error' : ''}`}
              style={{
                fontSize: '1.75rem',
                letterSpacing: '0.45em',
                textAlign: 'center',
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace, Courier",
                padding: '12px 16px',
              }}
              value={otp}
              onChange={handleOtpChange}
            />
            {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}
          </div>

          <button
            id="verify-otp-btn"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || otp.length !== 6}
            style={{
              opacity: (loading || otp.length !== 6) ? 0.6 : 1,
              cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
              marginBottom: 'var(--space-3)',
            }}
          >
            {loading ? <span className="spinner" /> : 'Verify OTP'}
          </button>
        </form>

        {/* Resend OTP section */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-2)', fontSize: '0.88rem', color: 'var(--ink-soft)' }}>
          {cooldown > 0 ? (
            <span>
              Resend code in <strong style={{ color: 'var(--ink)' }}>{cooldown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--forest, #2F6F4E)',
                cursor: resending ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
              }}
            >
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          )}
        </div>

        <div className="divider">or</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <Link to="/forgot-password" style={{ color: 'var(--forest, #2F6F4E)', fontWeight: 600, textDecoration: 'none' }}>
            ← Change email
          </Link>
          <Link to="/login" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
