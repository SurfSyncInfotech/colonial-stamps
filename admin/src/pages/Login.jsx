import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await adminApi.login(form);
      login(res.token, res.admin);
      navigate('/');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Stamps Admin</h1>
        <p>Sign in to manage Stamp House</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}
