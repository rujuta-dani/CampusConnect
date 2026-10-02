import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import CreatePost from '../components/CreatePost';
import NameWithVerification from '../components/NameWithVerification';
import { getMyProfile, getMySkills, removeSkill } from '../services/profileService';
import { useConnections } from '../hooks/useConnections';
import { getMyRegistrations, getMyEvents } from '../services/eventService';
import { getMyCollaborations, getMyApplications } from '../services/collaborationService';
import UserPostsList from '../components/UserPostsList';

/* ── Helpers ─────────────────────────────────────────────────── */
function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
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

/* ── Skill chip (removable) ──────────────────────────────────── */
function SkillChip({ skill, onRemove, removable }) {
  const [removing, setRemoving] = useState(false);
  const handle = async () => {
    setRemoving(true);
    try { await onRemove(skill.skill_id); }
    finally { setRemoving(false); }
  };
  return (
    <span
      className="tag tag-quad"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {skill.skill_name}
      {removable && (
        <button
          onClick={handle}
          disabled={removing}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--coral)', fontWeight: 700, fontSize: '0.75rem',
            lineHeight: 1, padding: '0 0 0 2px',
          }}
          title="Remove skill"
        >
          {removing ? '…' : '×'}
        </button>
      )}
    </span>
  );
}

/* ── Profile info row ────────────────────────────────────────── */
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="eyebrow">{label}</span>
      <span style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>{value}</span>
    </div>
  );
}

/* ── Tab button ─────────────────────────────────────────────── */
function TabBtn({ label, tabKey, active, onClick }) {
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={() => onClick(tabKey)}
      style={{
        borderRadius: 0,
        borderBottom: active === tabKey ? '2px solid var(--quad)' : 'none',
        fontWeight: active === tabKey ? 600 : 400,
        color: active === tabKey ? 'var(--ink)' : 'var(--ink-soft)',
      }}
    >
      {label}
    </button>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile]   = useState(null);
  const [skills, setSkills]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const { connectionCount }     = useConnections(user?.user_id);
  // Initialise to whatever tab the caller requested, defaulting to 'about'
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'about');
  const [error, setError]       = useState('');

  // Incremented each time the user creates a post, causing UserPostsList to refresh
  const [postsRefreshTrigger, setPostsRefreshTrigger] = useState(0);

  // Flow 6 — Events Profile State
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [createdEvents, setCreatedEvents]       = useState([]);

  // Flow 7 — Collaborations Profile State
  const [createdCollabs, setCreatedCollabs] = useState([]);
  const [appliedCollabs, setAppliedCollabs] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, regRes, createdRes, collabsRes, appsRes] = await Promise.all([
        getMyProfile(),
        getMySkills(),
        getMyRegistrations(),
        getMyEvents(),
        getMyCollaborations(),
        getMyApplications(),
      ]);
      setProfile(pRes.data);
      setSkills(sRes.data);
      setRegisteredEvents(regRes.data || []);
      setCreatedEvents(createdRes.data || []);
      setCreatedCollabs(collabsRes.data || []);
      setAppliedCollabs(appsRes.data || []);
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const handleRemoveSkill = async (skillId) => {
    await removeSkill(skillId);
    setSkills(prev => prev.filter(s => s.skill_id !== skillId));
  };

  /** Called by CreatePost when a new post is successfully published. */
  const handlePostCreated = useCallback(() => {
    setPostsRefreshTrigger(n => n + 1);
  }, []);

  const meta = roleMeta(user?.role);

  return (
    <div className="app-shell">
      <Sidebar active="profile" />
      <main className="app-main">

        {/* Topbar */}
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.25rem', color: 'var(--ink)', flex: 1 }}>
            My Profile
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/profile/edit')}
          >
            Edit profile
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading profile</p>
          </div>
        )}

        {error && (
          <div style={{ padding: 'var(--space-4)' }}>
            <div className="alert alert-error">{error}</div>
          </div>
        )}

        {!loading && !error && (
          <div className="profile-container">
            {/* Left Column - Profile Card and Tabs */}
            <div>
              {/* Profile header pin-card */}
              <div className="pin-card pin-quad fade-in" style={{ marginBottom: 'var(--space-3)', border: '1.5px solid var(--ink)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                  {/* Avatar */}
                  {profile?.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={user?.name}
                      className="avatar avatar-xl"
                      style={{ flexShrink: 0, border: '1px solid var(--ink)' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="avatar avatar-xl" style={{ flexShrink: 0 }}>
                      {initials(user?.name)}
                    </div>
                  )}

                  {/* Identity */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.65rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <NameWithVerification user={user} badgeSize={22} />
                    </h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <span className={`role-badge ${meta.cls}`}>{meta.label}</span>
                      {profile?.department && (
                        <span className="eyebrow" style={{ color: 'var(--ink-soft)' }}>
                          {profile.department}
                          {profile.year_of_study ? ` · ${profile.year_of_study}` : ''}
                          {profile.designation   ? ` · ${profile.designation}` : ''}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)' }}>{user?.email}</p>

                    <div style={{ display: 'flex', gap: 16, marginTop: 'var(--space-2)' }}>
                      <span
                        onClick={() => navigate('/network')}
                        style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', cursor: 'pointer' }}
                        className="hover:underline"
                      >
                        <strong style={{ color: 'var(--ink)' }}>{connectionCount ?? 0}</strong> connections
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {profile?.bio && (
                  <>
                    <div style={{ height: 1, background: 'var(--line)', margin: 'var(--space-2) 0' }} />
                    <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', lineHeight: 1.7 }}>
                      {profile.bio}
                    </p>
                  </>
                )}

                {!profile?.profile_exists && !profile?.bio && (
                  <>
                    <div style={{ height: 1, background: 'var(--line)', margin: 'var(--space-2) 0' }} />
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                      No bio yet.{' '}
                      <button onClick={() => navigate('/profile/edit')} style={{ background: 'none', border: 'none', color: 'var(--quad)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                        Add one
                      </button>
                    </p>
                  </>
                )}
              </div>

              {/* Tabs nav */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 'var(--space-3)' }}>
                <TabBtn label="About"                                       tabKey="about"     active={activeTab} onClick={setActiveTab} />
                <TabBtn label="Posts"                                       tabKey="posts"     active={activeTab} onClick={setActiveTab} />
                <TabBtn label={`Postings (${createdCollabs.length})`}       tabKey="postings"  active={activeTab} onClick={setActiveTab} />
                <TabBtn label={`Applications (${appliedCollabs.length})`}   tabKey="applied"   active={activeTab} onClick={setActiveTab} />
              </div>

              {/* ── About Tab ─────────────────────────────────────── */}
              {activeTab === 'about' && (
                <>
                  {/* Joined Communities card */}
                  <div className="card fade-in" style={{ border: '1.5px solid var(--ink)' }}>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
                      Joined Communities
                    </h3>
                    {profile?.communities && profile.communities.length > 0 ? (
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
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                        No communities joined yet.{' '}
                        <button onClick={() => navigate('/communities')} style={{ background: 'none', border: 'none', color: 'var(--quad)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                          Explore communities
                        </button>
                      </p>
                    )}
                  </div>

                  {/* Registered Events card */}
                  <div className="card fade-in" style={{ marginTop: 'var(--space-3)', border: '1.5px solid var(--ink)' }}>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
                      Registered Events ({registeredEvents.length})
                    </h3>
                    {registeredEvents.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {registeredEvents.map(e => (
                          <div
                            key={`reg-${e.event_id}`}
                            onClick={() => navigate(`/events/${e.event_id}`)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 8, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--paper-raised)', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
                            className="hover:scale-[1.02] hover:border-neutral-400"
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                              <div className="eyebrow" style={{ fontSize: '0.65rem', color: 'var(--ink-faint)' }}>{new Date(e.start_datetime).toLocaleDateString()} · {e.venue || 'No venue'}</div>
                            </div>
                            <span className="role-badge role-student" style={{ fontSize: '0.6rem' }}>{e.category}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                        No upcoming registered events.{' '}
                        <button onClick={() => navigate('/events')} style={{ background: 'none', border: 'none', color: 'var(--quad)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                          Browse events
                        </button>
                      </p>
                    )}
                  </div>

                  {/* Created Events card */}
                  <div className="card fade-in" style={{ marginTop: 'var(--space-3)', border: '1.5px solid var(--ink)' }}>
                    <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
                      Events Hosted by You ({createdEvents.length})
                    </h3>
                    {createdEvents.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {createdEvents.map(e => (
                          <div
                            key={`host-${e.event_id}`}
                            onClick={() => navigate(`/events/${e.event_id}`)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: 8, borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--paper-raised)', transition: 'transform 0.2s ease, border-color 0.2s ease' }}
                            className="hover:scale-[1.02] hover:border-neutral-400"
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                              <div className="eyebrow" style={{ fontSize: '0.65rem', color: 'var(--ink-faint)' }}>{new Date(e.start_datetime).toLocaleDateString()} · {e.registered_count} attending</div>
                            </div>
                            <span className="role-badge role-faculty" style={{ fontSize: '0.6rem' }}>{e.category}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                        No hosted events.{' '}
                        <button onClick={() => navigate('/events/create')} style={{ background: 'none', border: 'none', color: 'var(--quad)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                          Host one now
                        </button>
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* ── Posts Tab ──────────────────────────────────────── */}
              {activeTab === 'posts' && (
                <div className="fade-in">
                  {/* Post composer sits at the top of the Posts tab */}
                  <CreatePost onPostCreated={handlePostCreated} />

                  {/* Divider */}
                  <div style={{ height: 1, background: 'var(--line)', margin: 'var(--space-1) 0 var(--space-3)' }} />

                  {/* User's published posts — auto-refreshes when postsRefreshTrigger changes */}
                  <UserPostsList
                    userId={profile?.user_id}
                    refreshTrigger={postsRefreshTrigger}
                  />
                </div>
              )}

              {/* ── Postings Tab ───────────────────────────────────── */}
              {activeTab === 'postings' && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                    Opportunities Posted by You
                  </h3>
                  {createdCollabs.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                      No opportunities posted yet.
                    </p>
                  ) : (
                    createdCollabs.map(col => (
                      <div
                        key={col.collaboration_id}
                        className="card hover:scale-[1.01] hover:border-neutral-400"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease', border: '1.5px solid var(--ink)' }}
                        onClick={() => navigate(`/collaborations/${col.collaboration_id}`)}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>{col.title}</div>
                          <div className="eyebrow" style={{ fontSize: '0.65rem', color: 'var(--ink-faint)', marginTop: 2 }}>
                            {col.category} · {col.positions_available} open · {col.applications_count} applicant{col.applications_count !== 1 && 's'}
                          </div>
                        </div>
                        <span className={`role-badge ${col.status === 'open' ? 'role-student' : 'role-admin'}`} style={{ fontSize: '0.6rem' }}>
                          {col.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Applied Tab ────────────────────────────────────── */}
              {activeTab === 'applied' && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                    Applied Opportunities
                  </h3>
                  {appliedCollabs.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                      No applications submitted yet.
                    </p>
                  ) : (
                    appliedCollabs.map(app => (
                      <div
                        key={app.application_id}
                        className="card hover:scale-[1.01] hover:border-neutral-400"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s ease, border-color 0.2s ease', border: '1.5px solid var(--ink)' }}
                        onClick={() => navigate(`/collaborations/${app.collaboration_id}`)}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>{app.collaboration?.title}</div>
                          <div className="eyebrow" style={{ fontSize: '0.65rem', color: 'var(--ink-faint)', marginTop: 2 }}>
                            Posted by {app.collaboration?.creator_name} · Applied on {new Date(app.applied_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span
                          className={`role-badge ${app.status === 'accepted' ? 'role-club' : app.status === 'rejected' ? 'role-admin' : 'role-student'}`}
                          style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}
                        >
                          {app.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Sidebar Widgets (Details & Skills) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Details card */}
              <div className="card fade-in" style={{ border: '1.5px solid var(--ink)' }}>
                <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--ink)' }}>
                  Profile Details
                </h3>
                {profile?.department || profile?.year_of_study || profile?.designation ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <InfoRow label="Department"    value={profile?.department} />
                    <InfoRow label="Year of study" value={profile?.year_of_study} />
                    <InfoRow label="Designation"   value={profile?.designation} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '6px 0' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', marginBottom: 12 }}>
                      No academic details added yet.
                    </p>
                    <button
                      onClick={() => navigate('/profile/edit')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.7rem', padding: '4px 8px', height: 'auto', minHeight: 0, width: '100%' }}
                    >
                      Add Details
                    </button>
                  </div>
                )}
              </div>

              {/* Skills card */}
              <div className="card fade-in" style={{ border: '1.5px solid var(--ink)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
                    Skills
                  </h3>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate('/profile/edit')} style={{ padding: '4px 8px', height: 'auto', minHeight: 0, fontSize: '0.725rem' }}>
                    Manage
                  </button>
                </div>

                {skills.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {skills.map(s => (
                      <SkillChip
                        key={s.skill_id}
                        skill={s}
                        onRemove={handleRemoveSkill}
                        removable={true}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                    No skills added yet.{' '}
                    <button onClick={() => navigate('/profile/edit')} style={{ background: 'none', border: 'none', color: 'var(--quad)', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                      Add skills
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
