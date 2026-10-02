import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/authService';

function validate(email) {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address';
  }
  return '';
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valError = validate(email);
    if (valError) {
      setError(valError);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    setApiError('');

    try {
      await forgotPassword({ email: cleanEmail });
      // Navigate to OTP verification page passing email in state
      navigate('/verify-otp', { state: { email: cleanEmail } });
    } catch (err) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.detail ||
        'Failed to request password reset. Please try again.';
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
            <path d="M12 2C7 2 3 6 3 11c0 4 2.5 7.5 6 9l1-4c-2-1-3.5-3-3.5-5 0-3 2.5-5.5 5.5-5.5S17.5 8 17.5 11c0 2-1.5 4-3.5 5l1 4c3.5-1.5 6-5 6-9 0-5-4-9-9-9z"/>
          </svg>
        </div>

        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-subtitle">
          Enter the email address associated with your CampusConnect account and we'll send you an OTP.
        </p>

        {apiError && <div className="alert alert-error">{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email input */}
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label" htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              autoFocus
              className={`input${error ? ' error' : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
                setApiError('');
              }}
            />
            {error && <p className="form-error">{error}</p>}
          </div>

          <button
            id="send-otp-btn"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Send OTP'}
          </button>
        </form>

        <div className="divider">or</div>

        <p className="auth-footer-text">
          Remember your password?{' '}
          <Link to="/login">Back to Sign in</Link>
        </p>
      </div>
    </div>
  );
}
