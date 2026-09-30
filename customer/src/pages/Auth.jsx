import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [mode, setMode] = useState('password');
  const [form, setForm] = useState({ identifier: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/account';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'password') {
        const res = await authApi.login({ identifier: form.identifier, password: form.password });
        login(res.token, res.customer);
        navigate(redirect);
      } else if (!otpSent) {
        await authApi.requestOtp({ identifier: form.identifier, purpose: 'login' });
        setOtpSent(true);
      } else {
        const res = await authApi.loginOtp({ identifier: form.identifier, otp: form.otp });
        login(res.token, res.customer);
        navigate(redirect);
      }
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout title="Sign In">
      <div className="container" style={{ maxWidth: 440, padding: '48px 24px' }}>
        <h1 className="section-title" style={{ textAlign: 'center' }}>Welcome Back</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32 }}>Sign in to your Stamps account</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`btn ${mode === 'password' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => { setMode('password'); setOtpSent(false); }}>Password</button>
          <button className={`btn ${mode === 'otp' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setMode('otp')}>OTP</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Mobile</label>
            <input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required />
          </div>
          {mode === 'password' ? (
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          ) : otpSent ? (
            <div className="form-group">
              <label>OTP (use 123456 in dev)</label>
              <input value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} maxLength={6} required />
            </div>
          ) : null}
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {mode === 'otp' && !otpSent ? 'Send OTP' : 'Sign In'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9rem' }}>
          New collector? <Link to="/signup" style={{ color: 'var(--forest)' }}>Create account</Link>
        </p>
      </div>
    </Layout>
  );
}

export function Signup() {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [step, setStep] = useState('form');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await authApi.signup(form);
      setStep('otp');
    } catch (err) { setError(err.message); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authApi.verifySignup({ email: form.email, otp });
      login(res.token, res.customer);
      navigate('/account');
    } catch (err) { setError(err.message); }
  };

  return (
    <Layout title="Create Account">
      <div className="container" style={{ maxWidth: 440, padding: '48px 24px' }}>
        <h1 className="section-title" style={{ textAlign: 'center' }}>Join Stamps</h1>
        {step === 'form' ? (
          <form onSubmit={handleSignup}>
            <div className="form-group"><label>Full Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="form-group"><label>Mobile</label><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required /></div>
            <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Account</button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <p style={{ marginBottom: 16, fontSize: '0.9rem' }}>Enter the OTP sent to {form.email}. Dev OTP: <strong>123456</strong></p>
            <div className="form-group"><label>OTP</label><input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required /></div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Verify &amp; Continue</button>
          </form>
        )}
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--forest)' }}>Sign in</Link>
        </p>
      </div>
    </Layout>
  );
}
