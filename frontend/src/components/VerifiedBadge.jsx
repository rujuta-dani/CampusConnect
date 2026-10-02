/**
 * VerifiedBadge — shown beside verified faculty names throughout the app.
 * Condition: user.is_verified === true AND user.role === 'faculty'
 */
export default function VerifiedBadge({ size = 16, style = {} }) {
  return (
    <span
      title="Verified Faculty"
      aria-label="Verified Faculty"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#2563EB',
        flexShrink: 0,
        verticalAlign: 'middle',
        marginLeft: 4,
        boxShadow: '0 0 0 2px #fff',
        ...style,
      }}
    >
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 12 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 5L4.5 8.5L11 1.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
