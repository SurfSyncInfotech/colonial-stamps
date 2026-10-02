import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { Banner, useDesk } from '../kit';

export function LoginPage() {
  const { persist } = useDesk();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your admin email and password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await api('/api/admin/auth/login', { method: 'POST', body: form });
      persist(res.admin, res.token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: '#ffffff',
      }}
    >
      {/* Left Brand Panel */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d1322 0%, #15203b 100%)',
          color: '#ffffff',
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'var(--primary-gradient)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: 'var(--shadow-primary)',
            }}
          >
            <Sparkles size={22} color="white" />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, margin: 0 }}>Folio Admin</h2>
            <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600, letterSpacing: '0.08em' }}>PHILATELY DESK</span>
          </div>
        </div>

        <div style={{ maxWidth: 460 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 12.5,
              color: '#c7d2fe',
              marginBottom: 16,
            }}
          >
            <ShieldCheck size={15} color="#818cf8" />
            <span>Secure Admin Portal</span>
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 38, lineHeight: 1.2, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
            Store management, catalog control &amp; orders.
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6 }}>
            Manage stamp categories, create unlimited subcategories, monitor customer dispatches, and adjust inventory.
          </p>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          © {new Date().getFullYear()} Stamps from Everywhere · Admin Portal
        </div>
      </div>

      {/* Right Login Form */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: '#f8fafc',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400, background: '#ffffff', padding: 36, borderRadius: 20, boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-card)' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)' }}>Sign In to Admin Desk</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>
              Enter your administrator credentials to continue.
            </p>
          </div>

          <Banner error={error} />

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Admin Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-control"
                  placeholder="admin@stamps.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{ paddingLeft: 38 }}
                />
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-light)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  style={{ paddingLeft: 38 }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-light)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', height: 44, justifyContent: 'center', fontSize: 14 }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
