import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import NameWithVerification from '../components/NameWithVerification';
import { Megaphone } from 'lucide-react';
import { getUserProfile } from '../services/profileService';
import { getMutualConnections } from '../services/connectionService';
import { useConnections } from '../hooks/useConnections';
import ConnectionButton from '../components/ConnectionButton';
import UserPostsList from '../components/UserPostsList';
import { createOrGetConversation } from '../services/chatService';
import { getTeacherNotices } from '../services/noticeService';
import ErrorBoundary from '../components/ErrorBoundary';
import { getBlockStatus, unblockUser } from '../services/blockService';
import ReportUserModal from '../components/ReportUserModal';
import BlockConfirmModal from '../components/BlockConfirmModal';

function initials(name) {
  const cleanName = typeof name === 'string' ? name : '';
  return cleanName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function roleMeta(role) {
  const map = {
    student: { label: 'Student', cls: 'role-student' },
    faculty: { label: 'Faculty', cls: 'role-faculty' },
    club:    { label: 'Club',    cls: 'role-club'    },
    admin:   { label: 'Admin',   cls: 'role-admin'   },
  };
  return map[role] || { label: role, cls: 'role-student' };
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="eyebrow">{label}</span>
      <span style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [error, setError] = useState('');
  const [notices, setNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  // Overflow menu & Block/Report modal state
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isReportAndBlock, setIsReportAndBlock] = useState(false);

  const fetchBlockStatus = useCallback(async () => {
    if (!userId || String(currentUser?.user_id) === String(userId)) return;
    try {
      const res = await getBlockStatus(userId);
      setIsBlocked(res.data.is_blocked);
    } catch (err) {
      console.error('Failed to fetch block status:', err);
    }
  }, [userId, currentUser]);

  const { connectionCount, refetch: refetchConnection } = useConnections(userId);
  const [mutualCount, setMutualCount] = useState(0);
  const [mutualUsers, setMutualUsers] = useState([]);
  const [showMutualModal, setShowMutualModal] = useState(false);

  const fetchMutualCount = useCallback(async () => {
    try {
      const res = await getMutualConnections(userId);
      setMutualCount(res.data.mutual_count || 0);
      setMutualUsers(res.data.mutual_users || []);
    } catch (err) {
      console.error('Failed to load mutual connections count:', err);
    }
  }, [userId]);

  const loadNotices = useCallback(async () => {
    setLoadingNotices(true);
    try {
      const res = await getTeacherNotices(userId);
      setNotices(res.data || []);
    } catch (err) {
      console.error('Failed to load teacher notices:', err);
    } finally {
      setLoadingNotices(false);
    }
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const profRes = await getUserProfile(userId);
        setProfile(profRes.data);
        await fetchMutualCount();
        await fetchBlockStatus();
        if (profRes.data.role === 'faculty') {
          await loadNotices();
        }
      } catch (err) {
        setError(err.response?.data?.detail?.message || 'User not found.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, fetchMutualCount, loadNotices]);

  // Sync mutualCount & connection on connection updates
  useEffect(() => {
    const handleConnectionsChanged = () => {
      fetchMutualCount();
      if (refetchConnection) {
        refetchConnection();
      }
    };
    window.addEventListener('connections-changed', handleConnectionsChanged);
    return () => {
      window.removeEventListener('connections-changed', handleConnectionsChanged);
    };
  }, [fetchMutualCount, refetchConnection]);

  // If viewing own profile, redirect to /profile
  useEffect(() => {
    if (currentUser && Number(userId) === currentUser.user_id) {
      navigate('/profile', { replace: true });
    }
  }, [userId, currentUser, navigate]);

  const handleGoToDirectChat = async () => {
    try {
      const res = await createOrGetConversation({
        conversation_type: 'direct',
        recipient_id: parseInt(userId)
      });
      navigate(`/messages?conversation_id=${res.data.conversation_id}`);
    } catch (err) {
      alert(err.response?.data?.detail?.message || 'Failed to open message conversation.');
    }
  };

  const meta = roleMeta(profile?.role);

  return (
    <div className="app-shell">
      <Sidebar active="discover" subtitle="User Profile" />
      <main className="app-main">
        <div className="topbar">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            Back
          </button>
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)', flex: 1, paddingLeft: 'var(--space-2)' }}>
            {profile ? profile.name : 'User profile'}
          </span>
        </div>

        <div style={{ padding: 'var(--space-4)', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
              <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
              <p className="eyebrow">Loading profile</p>
            </div>
          )}

          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          {!loading && !error && profile && (
            <>
              {/* Profile header */}
              <div className="pin-card pin-sky fade-in" style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {profile.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={profile.name}
                      className="avatar avatar-xl"
                      style={{ flexShrink: 0 }}
                      onError={e => e.target.style.display = 'none'}
                    />
                  ) : (
                    <div className="avatar avatar-xl" style={{ flexShrink: 0 }}>
                      {initials(profile.name)}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.65rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <NameWithVerification user={profile} badgeSize={22} />
                    </h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <span className={`role-badge ${meta.cls}`}>{meta.label}</span>
                      {profile.department && (
                        <span className="eyebrow" style={{ color: 'var(--ink-soft)' }}>
                          {profile.department}
                          {profile.year_of_study ? ` · ${profile.year_of_study}` : ''}
                          {profile.designation   ? ` · ${profile.designation}` : ''}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)' }}>{profile.email}</p>

                    <div style={{ display: 'flex', gap: 16, marginTop: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <span
                          onClick={() => navigate('/network')}
                          style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', cursor: 'pointer' }}
                          className="hover:underline"
                        >
                          <strong style={{ color: 'var(--ink)' }}>{connectionCount ?? 0}</strong> connections
                        </span>
                        {mutualCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowMutualModal(true)}
                            style={{
                              background: 'var(--sand-tint)',
                              border: '1.5px solid var(--marigold)',
                              borderRadius: 'var(--radius-pill)',
                              padding: '2px 10px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '0.82rem',
                              color: 'var(--ink)',
                              fontFamily: 'inherit',
                              transition: 'transform 100ms ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            title="Click to view mutual connections"
                          >
                            {/* Stacked avatar thumbnails */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {mutualUsers.slice(0, 3).map((u, i) => (
                                u.profile_picture ? (
                                  <img
                                    key={u.user_id}
                                    src={u.profile_picture}
                                    alt={u.name}
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      marginLeft: i > 0 ? -6 : 0,
                                      border: '1.5px solid #fff',
                                    }}
                                  />
                                ) : (
                                  <div
                                    key={u.user_id}
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: '50%',
                                      background: 'var(--marigold-deep)',
                                      color: '#fff',
                                      fontSize: '0.55rem',
                                      fontWeight: 'bold',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginLeft: i > 0 ? -6 : 0,
                                      border: '1.5px solid #fff',
                                    }}
                                  >
                                    {initials(u.name)}
                                  </div>
                                )
                              ))}
                            </div>
                            <span>
                              <strong>{mutualCount}</strong> mutual {mutualCount === 1 ? 'connection' : 'connections'}
                            </span>
                          </button>
                        )}
                      </div>

                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
                        <button
                          onClick={handleGoToDirectChat}
                          className="btn btn-sm btn-accent"
                        >
                          Message
                        </button>
                        <ConnectionButton
                          targetUserId={userId}
                          targetUserName={profile.name}
                        />

                        {/* Three-dot Overflow Menu (Only on another user's profile) */}
                        {String(currentUser?.user_id) !== String(userId) && (
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                              className="btn btn-ghost btn-sm"
                              style={{
                                padding: '4px 8px', fontSize: '1.2rem', lineHeight: 1,
                                border: '1px solid var(--line-strong)', color: 'var(--ink)',
                              }}
                              title="Profile options"
                            >
                              ⋮
                            </button>

                            {showOverflowMenu && (
                              <div
                                style={{
                                  position: 'absolute', right: 0, top: '100%', marginTop: '6px',
                                  background: '#fff', border: '2px solid var(--ink)',
                                  borderRadius: 'var(--radius-md)', boxShadow: '4px 4px 0 var(--ink)',
                                  zIndex: 100, minWidth: '150px', display: 'flex', flexDirection: 'column',
                                  overflow: 'hidden',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setShowOverflowMenu(false);
                                    setIsReportAndBlock(false);
                                    setIsReportModalOpen(true);
                                  }}
                                  style={{
                                    padding: '10px 14px', textAlign: 'left', background: 'none',
                                    border: 'none', borderBottom: '1px solid var(--line)',
                                    fontSize: '0.85rem', color: 'var(--ink)', fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                  className="hover:bg-gray-100"
                                >
                                  Report
                                </button>

                                {isBlocked ? (
                                  <button
                                    onClick={async () => {
                                      setShowOverflowMenu(false);
                                      try {
                                        await unblockUser(userId);
                                        setIsBlocked(false);
                                      } catch (err) {
                                        alert(err.response?.data?.message || 'Failed to unblock user.');
                                      }
                                    }}
                                    style={{
                                      padding: '10px 14px', textAlign: 'left', background: 'none',
                                      border: 'none', fontSize: '0.85rem', color: 'var(--ink)',
                                      fontWeight: '600', cursor: 'pointer',
                                    }}
                                  >
                                    Unblock
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setShowOverflowMenu(false);
                                        setIsBlockConfirmOpen(true);
                                      }}
                                      style={{
                                        padding: '10px 14px', textAlign: 'left', background: 'none',
                                        border: 'none', borderBottom: '1px solid var(--line)',
                                        fontSize: '0.85rem', color: 'var(--coral)', fontWeight: '600',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Block
                                    </button>

                                    <button
                                      onClick={() => {
                                        setShowOverflowMenu(false);
                                        setIsReportAndBlock(true);
                                        setIsReportModalOpen(true);
                                      }}
                                      style={{
                                        padding: '10px 14px', textAlign: 'left', background: 'none',
                                        border: 'none', fontSize: '0.85rem', color: 'var(--coral)',
                                        fontWeight: '600', cursor: 'pointer',
                                      }}
                                    >
                                      Report & Block
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {profile.bio && (
                  <>
                    <div style={{ height: 1, background: 'var(--line)', margin: 'var(--space-2) 0' }} />
                    <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                      {profile.bio}
                    </p>
                  </>
                )}
              </div>

              {/* Tabs nav */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 'var(--space-3)' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveTab('about')}
                  style={{
                    borderRadius: 0,
                    borderBottom: activeTab === 'about' ? '2px solid var(--quad)' : 'none',
                    fontWeight: activeTab === 'about' ? 600 : 400,
                    color: activeTab === 'about' ? 'var(--ink)' : 'var(--ink-soft)'
                  }}
                >
                  About
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveTab('posts')}
                  style={{
                    borderRadius: 0,
                    borderBottom: activeTab === 'posts' ? '2px solid var(--quad)' : 'none',
                    fontWeight: activeTab === 'posts' ? 600 : 400,
                    color: activeTab === 'posts' ? 'var(--ink)' : 'var(--ink-soft)'
                  }}
                >
                  Posts
                </button>
                {profile.role === 'faculty' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setActiveTab('notices')}
                    style={{
                      borderRadius: 0,
                      borderBottom: activeTab === 'notices' ? '2px solid var(--quad)' : 'none',
                      fontWeight: activeTab === 'notices' ? 600 : 400,
                      color: activeTab === 'notices' ? 'var(--ink)' : 'var(--ink-soft)'
                    }}
                  >
                    Official Notices ({notices.length})
                  </button>
                )}
              </div>

              {activeTab === 'about' && (
                <>
                  {/* Details card */}
                  {(profile.department || profile.year_of_study || profile.designation || profile.employee_id || profile.office_location || profile.office_hours) && (
                    <div className="card fade-in" style={{ marginBottom: 'var(--space-3)' }}>
                      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--ink)' }}>
                        Details
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-2)' }}>
                        <InfoRow label="Department"      value={profile.department} />
                        <InfoRow label="Year of study"   value={profile.year_of_study} />
                        <InfoRow label="Designation"     value={profile.designation} />
                        <InfoRow label="Employee ID"     value={profile.employee_id} />
                        <InfoRow label="Office Location" value={profile.office_location} />
                        <InfoRow label="Office Hours"    value={profile.office_hours} />
                      </div>
                    </div>
                  )}

                  {/* Skills — read only */}
                  {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                    <div className="card fade-in">
                      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
                        Skills
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {profile.skills.map(s => (
                          <span key={s} className="tag tag-quad">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Joined Communities card */}
                  {Array.isArray(profile.communities) && profile.communities.length > 0 && (
                    <div className="card fade-in" style={{ marginTop: 'var(--space-3)' }}>
                      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
                        Joined Communities
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                        {profile.communities.map(c => (
                          <div
                            key={c.community_id}
                            onClick={() => navigate(`/communities/${c.community_id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 8, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--paper-raised)', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
                            className="hover:scale-[1.02] hover:border-neutral-400"
                          >
                            {c.logo_url ? (
                              <img src={c.logo_url} alt={c.community_name} className="avatar" style={{ width: 32, height: 32, flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                            ) : (
                              <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', flexShrink: 0 }}>{initials(c.community_name)}</div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.community_name}</div>
                              <div className="eyebrow" style={{ fontSize: '0.65rem', color: 'var(--ink-faint)', textTransform: 'capitalize' }}>{c.category}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'posts' && (
                <div className="fade-in">
                  <UserPostsList userId={userId} />
                </div>
              )}

              {activeTab === 'notices' && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {loadingNotices ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <div className="spinner spinner-ink" style={{ width: 24, height: 24, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
                      <p className="eyebrow">Loading notices...</p>
                    </div>
                  ) : notices.length === 0 ? (
                    <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--ink-faint)' }}>
                      <div style={{ display: 'block', marginBottom: '8px' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                        </svg>
                      </div>
                      <p style={{ fontSize: '0.875rem', marginTop: 8 }}>No official notices published by this faculty member.</p>
                    </div>
                  ) : (
                    notices.map(notice => (
                      <div key={notice.notice_id} className="card" style={{
                        padding: 'var(--space-4)',
                        border: '1.5px solid var(--ink)',
                        borderLeft: '4px solid #2563EB',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#2563EB18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', flexShrink: 0 }}>
                            <Megaphone size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>{notice.title}</span>
                              <span style={{
                                fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px',
                                background: '#2563EB', color: '#fff', borderRadius: 'var(--radius-pill)',
                                letterSpacing: '0.04em', textTransform: 'uppercase'
                              }}>IMPORTANT</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0 }}>
                              {notice.description}
                            </p>
                            <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--ink-faint)', marginTop: 8 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                                  <circle cx="12" cy="12" r="10" />
                                  <circle cx="12" cy="12" r="6" />
                                  <circle cx="12" cy="12" r="2" />
                                </svg>
                                {notice.target_audience.replace(/_/g, ' ')}
                              </span>
                              <span>{new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Profile Report Modal */}
      <ReportUserModal
        isOpen={isReportModalOpen}
        targetUserId={userId}
        targetUserName={profile?.name}
        isReportAndBlock={isReportAndBlock}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => {
          if (isReportAndBlock) setIsBlocked(true);
        }}
      />

      {/* Block Confirm Modal */}
      <BlockConfirmModal
        isOpen={isBlockConfirmOpen}
        targetUserId={userId}
        targetUserName={profile?.name}
        onClose={() => setIsBlockConfirmOpen(false)}
        onSuccess={() => setIsBlocked(true)}
      />

      {/* Mutual Connections Modal */}
      {showMutualModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(28, 27, 25, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 'var(--space-2)',
          }}
          onClick={() => setShowMutualModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 440,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 'var(--space-4)',
              background: 'var(--paper-raised)',
              boxShadow: 'var(--shadow-modal, 8px 8px 0 var(--ink))',
              animation: 'star-pop 150ms ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--marigold-deep)' }}>Shared Network</span>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, margin: 0, fontSize: '1.2rem' }}>
                  Mutual Connections ({mutualCount})
                </h3>
              </div>
              <button
                onClick={() => setShowMutualModal(false)}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 10px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: 0, marginBottom: 'var(--space-3)' }}>
              People connected to both you and {profile?.name || 'this user'}:
            </p>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mutualUsers.map((u) => (
                <div
                  key={u.user_id}
                  onClick={() => {
                    setShowMutualModal(false);
                    navigate(`/profile/${u.user_id}`);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--line)',
                    background: 'var(--paper)',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--quad)';
                    e.currentTarget.style.background = 'var(--quad-tint)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line)';
                    e.currentTarget.style.background = 'var(--paper)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {u.profile_picture ? (
                      <img
                        src={u.profile_picture}
                        alt={u.name}
                        className="avatar"
                        style={{ width: 36, height: 36, objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="avatar"
                        style={{ width: 36, height: 36, fontSize: '0.8rem', background: 'var(--sand-tint)' }}
                      >
                        {initials(u.name)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 650, color: 'var(--ink)' }}>
                        <NameWithVerification user={u} badgeSize={13} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                        {u.department || u.role}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.78rem', color: 'var(--quad)', fontWeight: 600 }}>
                    View Profile →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserProfileWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <UserProfile />
    </ErrorBoundary>
  );
}
