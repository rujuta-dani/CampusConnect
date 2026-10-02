import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUndoDelete } from '../context/UndoDeleteContext';
import Sidebar from '../components/Sidebar';
import {
  getMyProfile, updateProfile,
  getMySkills, addSkill, removeSkill, uploadPicture, deletePicture,
} from '../services/profileService';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function EditProfile() {
  const { user, refreshProfilePicture } = useAuth();
  const navigate = useNavigate();
  const { addPendingDelete } = useUndoDelete();

  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    bio: '', department: '', year_of_study: '',
    designation: '', profile_picture: '',
  });
  const [skills, setSkills]                 = useState([]);
  const [newSkill, setNewSkill]             = useState('');
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addingSkill, setAddingSkill]       = useState(false);
  const [success, setSuccess]               = useState('');
  const [error, setError]                   = useState('');
  const [skillError, setSkillError]         = useState('');
  const [photoError, setPhotoError]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, sRes] = await Promise.all([getMyProfile(), getMySkills()]);
        const p = pRes.data;
        setForm({
          bio:             p.bio             || '',
          department:      p.department      || '',
          year_of_study:   p.year_of_study   || '',
          designation:     p.designation     || '',
          profile_picture: p.profile_picture || '',
        });
        setSkills(sRes.data);
      } catch {
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess('');
    setError('');
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Instant local preview
    const reader = new FileReader();
    reader.onload = (ev) => setForm(prev => ({ ...prev, profile_picture: ev.target.result }));
    reader.readAsDataURL(file);
    // Upload to backend
    setUploadingPhoto(true);
    setPhotoError('');
    try {
      const { data } = await uploadPicture(file);
      setForm(prev => ({ ...prev, profile_picture: data.url }));
      // Sync the sidebar immediately
      await refreshProfilePicture();
    } catch (err) {
      setPhotoError(err.response?.data?.detail?.message || 'Upload failed. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    if (!form.profile_picture) return;
    const oldPhoto = form.profile_picture;
    setForm(prev => ({ ...prev, profile_picture: '' }));
    setPhotoError('');
    // Sync sidebar to show no picture immediately
    refreshProfilePicture();

    addPendingDelete(
      `avatar_${user?.user_id}`,
      'Profile Picture',
      'avatar',
      null,
      async () => {
        try {
          await deletePicture();
        } catch (err) {
          console.error('Failed to delete profile picture:', err);
        }
      },
      () => {
        // Undo: restore the old URL in the form and refresh the sidebar
        setForm(prev => ({ ...prev, profile_picture: oldPhoto }));
        refreshProfilePicture();
      }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await updateProfile(form);
      setSuccess('Profile saved.');
    } catch (err) {
      setError(err.response?.data?.detail?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async (e) => {
    e.preventDefault();
    const name = newSkill.trim();
    if (!name) { setSkillError('Enter a skill name'); return; }
    setAddingSkill(true);
    setSkillError('');
    try {
      await addSkill(name);
      const { data } = await getMySkills();
      setSkills(data);
      setNewSkill('');
    } catch (err) {
      setSkillError(err.response?.data?.detail?.message || 'Could not add skill.');
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemoveSkill = async (skillId) => {
    await removeSkill(skillId);
    setSkills(prev => prev.filter(s => s.skill_id !== skillId));
  };

  const isStudent = user?.role === 'student';
  const isFaculty = user?.role === 'faculty';

  return (
    <div className="app-shell">
      {/* Use the global Sidebar component so the profile picture updates are reflected instantly */}
      <Sidebar active="profile" />
      <main className="app-main">
        <div className="topbar">
          <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)', flex: 1 }}>
            Edit profile
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')}>
            Back to profile
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--ink-faint)' }}>
            <div className="spinner spinner-ink" style={{ width: 28, height: 28, borderWidth: 3, margin: '0 auto var(--space-2)' }} />
            <p className="eyebrow">Loading</p>
          </div>
        ) : (
          <div style={{ padding: 'var(--space-4)', maxWidth: 680 }}>

            {/* ── Profile Form ── */}
            <div className="card fade-in" style={{ marginBottom: 'var(--space-3)' }}>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-3)' }}>
                Profile information
              </h2>

              {success && <div className="alert alert-success">{success}</div>}
              {error   && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSave}>
                {/* Profile picture — file picker */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  {/* Clickable avatar */}
                  <div
                    style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                    onClick={() => fileInputRef.current?.click()}
                    title="Click to change photo"
                  >
                    {form.profile_picture ? (
                      <img
                        src={form.profile_picture}
                        alt="Profile"
                        className="avatar avatar-xl"
                        onError={e => e.target.style.display = 'none'}
                      />
                    ) : (
                      <div className="avatar avatar-xl">{initials(user?.name)}</div>
                    )}
                    {/* Overlay */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(28,27,25,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: uploadingPhoto ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                    }}
                      onMouseEnter={e => { if (!uploadingPhoto) e.currentTarget.style.opacity = 1; }}
                      onMouseLeave={e => { if (!uploadingPhoto) e.currentTarget.style.opacity = 0; }}
                    >
                      {uploadingPhoto
                        ? <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', width: 20, height: 20 }} />
                        : <span style={{ color: '#fff', fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>Change</span>
                      }
                    </div>
                  </div>

                  {/* Text prompt */}
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ink)', marginBottom: 4 }}>Profile photo</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', marginBottom: 6 }}>
                      Click the avatar to upload a new photo. JPEG, PNG or WebP, max 5 MB.
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? 'Uploading…' : 'Select photo'}
                      </button>
                      {form.profile_picture && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--coral)', borderColor: 'var(--coral-tint)' }}
                          onClick={handleRemovePhoto}
                          disabled={uploadingPhoto}
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                    {photoError && <p className="form-error" style={{ marginTop: 6 }}>{photoError}</p>}
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handlePhotoSelect}
                  />
                </div>

                {/* Bio */}
                <div className="form-group">
                  <label className="form-label" htmlFor="ep-bio">Bio</label>
                  <textarea
                    id="ep-bio"
                    name="bio"
                    rows={3}
                    placeholder="Tell your campus community about yourself…"
                    className="input"
                    style={{ resize: 'vertical' }}
                    value={form.bio}
                    onChange={handleChange}
                  />
                </div>

                {/* Department */}
                <div className="form-group">
                  <label className="form-label" htmlFor="ep-dept">Department</label>
                  <input
                    id="ep-dept"
                    name="department"
                    type="text"
                    placeholder="e.g. Computer Science"
                    className="input"
                    value={form.department}
                    onChange={handleChange}
                  />
                </div>

                {/* Year of study — students only */}
                {isStudent && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="ep-year">Year of study</label>
                    <select
                      id="ep-year"
                      name="year_of_study"
                      className="input"
                      value={form.year_of_study}
                      onChange={handleChange}
                    >
                      <option value="">Select year</option>
                      {['1st Year','2nd Year','3rd Year','4th Year','5th Year'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Designation — faculty only */}
                {isFaculty && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="ep-desig">Designation</label>
                    <input
                      id="ep-desig"
                      name="designation"
                      type="text"
                      placeholder="e.g. Assistant Professor"
                      className="input"
                      value={form.designation}
                      onChange={handleChange}
                    />
                  </div>
                )}

                <div style={{ marginTop: 'var(--space-3)' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <span className="spinner" /> : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Skills ── */}
            <div className="card fade-in">
              <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-2)' }}>
                Skills
              </h2>

              {/* Current skills */}
              {skills.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-3)' }}>
                  {skills.map(s => (
                    <span
                      key={s.skill_id}
                      className="tag tag-quad"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {s.skill_name}
                      <button
                        onClick={() => handleRemoveSkill(s.skill_id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--coral)', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1,
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--ink-faint)', marginBottom: 'var(--space-2)', fontStyle: 'italic' }}>
                  No skills added yet.
                </p>
              )}

              {/* Add skill input */}
              <form onSubmit={handleAddSkill} style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    placeholder="e.g. Python, React, Machine Learning"
                    className={`input${skillError ? ' error' : ''}`}
                    value={newSkill}
                    onChange={e => { setNewSkill(e.target.value); setSkillError(''); }}
                  />
                  {skillError && <p className="form-error">{skillError}</p>}
                </div>
                <button type="submit" className="btn btn-accent btn-sm" disabled={addingSkill} style={{ flexShrink: 0 }}>
                  {addingSkill ? <span className="spinner" style={{ borderColor: 'rgba(28,27,25,0.2)', borderTopColor: 'var(--ink)' }} /> : 'Add skill'}
                </button>
              </form>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
