import { useEffect, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Camera,
  CheckCircle2,
  KeyRound,
  LogOut,
  Sparkles,
  Key,
  Shield
} from 'lucide-react';
import { api } from '../api';
import { Banner, useDesk } from '../kit';

export function ProfilePage() {
  const { admin, persist } = useDesk();
  const [name, setName] = useState(admin?.full_name || '');
  const [mobile, setMobile] = useState(admin?.mobile || '');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(admin?.profile_image || '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  useEffect(() => {
    if (admin) {
      setName(admin.full_name || '');
      setMobile(admin.mobile || '');
      setPreviewUrl(admin.profile_image || '');
    }
  }, [admin]);

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    if (!name.trim()) {
      setProfileErr('Full name is required.');
      return;
    }
    try {
      setSavingProfile(true);
      setProfileErr('');
      setProfileMsg('');

      const fd = new FormData();
      fd.append('full_name', name.trim());
      if (mobile) fd.append('mobile', mobile.trim());
      if (imageFile) fd.append('profile_image', imageFile);

      await api('/api/admin/auth/profile', { method: 'PUT', form: fd });

      const meRes = await api('/api/admin/auth/me');
      persist(meRes.admin, localStorage.getItem('folio_admin_token'));

      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(''), 3500);
    } catch (err) {
      setProfileErr(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function updatePassword(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordErr('Current and new passwords are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErr('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('New password and confirmation do not match.');
      return;
    }
    try {
      setSavingPassword(true);
      setPasswordErr('');
      setPasswordMsg('');

      await api('/api/admin/auth/password', {
        method: 'PUT',
        body: { current_password: currentPassword, password: newPassword }
      });

      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 3500);
    } catch (err) {
      setPasswordErr(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      {/* TOP 4 MONEYFLOW STAT CARDS */}
      <div className="mf-stats-row">
        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble purple">
              <User size={22} />
            </div>
          </div>
          <div className="mf-stat-label purple">Administrator Role</div>
          <div className="mf-stat-val">{admin?.role_name || 'Super Admin'}</div>
          <div className="mf-stat-trend purple">
            <span>Full platform access</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble green">
              <ShieldCheck size={22} />
            </div>
          </div>
          <div className="mf-stat-label green">Account Security</div>
          <div className="mf-stat-val">Active &amp; Secure</div>
          <div className="mf-stat-trend green">
            <span>JWT session verified</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble orange">
              <Key size={22} />
            </div>
          </div>
          <div className="mf-stat-label orange">Session Status</div>
          <div className="mf-stat-val">Live Desk</div>
          <div className="mf-stat-trend orange">
            <span>SQLite real-time pool</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble blue">
              <Sparkles size={22} />
            </div>
          </div>
          <div className="mf-stat-label blue">Profile Completion</div>
          <div className="mf-stat-val">100%</div>
          <div className="mf-progress-bg">
            <div className="mf-progress-fill" style={{ width: '100%' }} />
          </div>
          <div className="mf-progress-sub">All details verified</div>
        </div>
      </div>

      {/* 2-COLUMN PROFILE & PASSWORD CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, maxWidth: 1080 }}>
        {/* CARD 1: PROFILE DETAILS */}
        <div className="mf-card">
          <div className="mf-card-head">
            <div className="mf-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="var(--purple)" />
              <span>Admin Profile Details</span>
            </div>
            <span className="status-pill confirmed">{admin?.role_name || 'Super Administrator'}</span>
          </div>

          <Banner error={profileErr} success={profileMsg} />

          <form onSubmit={updateProfile}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, padding: '16px', background: '#f8fafc', borderRadius: 16, border: '1px solid var(--border-card)' }}>
              <div>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Admin Avatar"
                    style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--purple-border)', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'var(--purple-gradient)',
                      color: 'white',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 800,
                      fontSize: 26,
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    {name ? name.charAt(0).toUpperCase() : 'A'}
                  </div>
                )}
              </div>

              <div>
                <label className="btn-secondary" style={{ height: 34, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex' }}>
                  <Camera size={14} />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handleImageFile} style={{ display: 'none' }} />
                </label>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, margin: 0 }}>
                  PNG, JPG, or WebP.
                </p>
              </div>
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Admin Login Email</label>
              <input
                className="form-control"
                value={admin?.email || ''}
                disabled
                style={{ background: '#f8fafc', color: 'var(--text-muted)' }}
              />
            </div>

            <div className="form-group">
              <label>Mobile Contact Number</label>
              <input
                className="form-control"
                placeholder="e.g. 9849396820"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 22 }}>
              <button type="submit" className="btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: PASSWORD SECURITY */}
        <div className="mf-card">
          <div className="mf-card-head">
            <div className="mf-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={18} color="var(--purple)" />
              <span>Change Security Password</span>
            </div>
            <span className="status-pill neutral">Security</span>
          </div>

          <Banner error={passwordErr} success={passwordMsg} />

          <form onSubmit={updatePassword}>
            <div className="form-group">
              <label>Current Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ marginTop: 22 }}>
              <button type="submit" className="btn-secondary" disabled={savingPassword} style={{ width: '100%', justifyContent: 'center', height: 42 }}>
                <KeyRound size={15} />
                <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Administrator: <strong>{admin?.full_name}</strong><br />
              Email: <strong>{admin?.email}</strong><br />
              Role: <strong style={{ color: 'var(--purple)' }}>{admin?.role_name || admin?.role}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
