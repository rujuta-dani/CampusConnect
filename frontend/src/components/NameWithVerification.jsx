import VerifiedBadge from './VerifiedBadge';

/**
 * Reusable component to render a user's name with a verification badge
 * if they are verified faculty.
 */
export default function NameWithVerification({ user, nameStyle = {}, badgeSize = 16 }) {
  if (!user) return null;
  const name = user.name || '';
  const isVerifiedFaculty = (user.role === 'faculty' || user.role === 'teacher') && user.is_verified;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
      <span style={nameStyle}>{name}</span>
      {isVerifiedFaculty && <VerifiedBadge size={badgeSize} />}
    </span>
  );
}
