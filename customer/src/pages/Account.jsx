import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import {
  User,
  MapPin,
  Package,
  Heart,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Plus,
  Home,
  Briefcase,
  Building,
  Edit3,
  Trash2,
  Check,
  Printer,
  RotateCcw,
  Eye,
  EyeOff,
  Clock,
  Truck,
  FileText,
  CreditCard,
  ArrowRight,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { api, inr, media } from '../api';
import { State, useAuth, useMeta } from '../shell';

export function AccountLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth.user) {
    return (
      <div className="wrap" style={{ padding: '60px 0', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sage)', color: 'var(--ink)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <User size={30} />
        </div>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>Collector Account</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24, lineHeight: 1.5 }}>
          Please sign in to access your dashboard, saved addresses, and orders.
        </p>
        <Link className="btn" to="/login?redirect=/account">Sign in</Link>
      </div>
    );
  }

  const initial = (auth.user.full_name || 'Collector').charAt(0).toUpperCase();

  return (
    <div className="wrap account" style={{ paddingTop: 28 }}>
      <aside className="side" style={{ alignSelf: 'start', position: 'sticky', top: 24 }}>
        <div className="account-sidebar-box" style={{ marginBottom: 16 }}>
          <div className="account-profile-header">
            <div className="account-avatar-wrap">
              {initial}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className="account-user-name">
                {auth.user.full_name}
              </h2>
              <div className="account-user-contact">
                <Phone size={12} style={{ flexShrink: 0, color: 'var(--muted)' }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {auth.user.mobile || auth.user.email}
                </span>
              </div>
            </div>
          </div>

          <div className="account-status-strip">
            {auth.user.mobile_verified ? (
              <span className="account-badge-pill verified">
                <CheckCircle2 size={12} />
                Verified
              </span>
            ) : (
              <span className="account-badge-pill unverified">
                <AlertCircle size={12} />
                Unverified
              </span>
            )}
            <span className="account-badge-pill status" style={{ textTransform: 'capitalize' }}>
              {auth.user.status || 'Active'}
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink to="/account" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <User size={18} />
            <span>Profile Details</span>
          </NavLink>
          <NavLink to="/account/addresses" className={({ isActive }) => (isActive ? 'active' : '')}>
            <MapPin size={18} />
            <span>Delivery Addresses</span>
          </NavLink>
          <NavLink to="/account/orders" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Package size={18} />
            <span>My Orders</span>
          </NavLink>
          <NavLink to="/wishlist" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Heart size={18} />
            <span>Saved Wishlist</span>
          </NavLink>
          <NavLink to="/account/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
            <ShieldCheck size={18} />
            <span>Account & Security</span>
          </NavLink>

          <button
            type="button"
            className="btn ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textAlign: 'left',
              marginTop: 14,
              border: '1px solid #f0dedb',
              background: '#fff9f8',
              color: '#a82c1f',
              padding: '10px 14px',
              borderRadius: 12,
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
            onClick={() => {
              auth.logout();
              navigate('/');
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      <main style={{ minHeight: 480 }}>
        <Outlet />
      </main>
    </div>
  );
}

export function ProfilePage() {
  const auth = useAuth();
  const [form, setForm] = useState({
    full_name: auth.user.full_name || '',
    email: auth.user.email || '',
    mobile: auth.user.mobile || '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useMeta('My Profile');

  async function save(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    try {
      const res = await api('/api/auth/profile', {
        method: 'PUT',
        body: form,
      });
      auth.persist({ ...auth.user, ...res.user });
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="account-panel">
      <div className="account-page-header">
        <div>
          <h1 className="account-page-title">
            <User size={24} style={{ color: '#1e6b4f' }} />
            Profile Details
          </h1>
          <p className="account-page-desc">
            Manage your personal profile and contact details.
          </p>
        </div>
      </div>

      <form onSubmit={save} style={{ maxWidth: 540 }}>
        <label className="field">
          <span>Full Name *</span>
          <div className="account-field-icon-wrap">
            <User />
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>
        </label>

        <label className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Email Address *</span>
            {auth.user.email_verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1e6b4f', fontSize: 12, fontWeight: 600 }}>
                <CheckCircle2 size={13} /> Verified
              </span>
            )}
          </div>
          <div className="account-field-icon-wrap">
            <Mail />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Enter email address"
              required
            />
          </div>
        </label>

        <label className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Mobile Number (10 Digits) *</span>
            {auth.user.mobile_verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1e6b4f', fontSize: 12, fontWeight: 600 }}>
                <CheckCircle2 size={13} /> Verified
              </span>
            )}
          </div>
          <div className="account-field-icon-wrap">
            <Phone />
            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="Enter 10-digit mobile number"
              required
            />
          </div>
        </label>

        {message && (
          <div className="note" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eaf6ef', borderColor: '#a3d8b8', color: '#165c3b', marginBottom: 16 }}>
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="error" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button className="btn" type="submit" disabled={saving} style={{ marginTop: 8, minWidth: 140 }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

const emptyAddress = {
  full_name: '',
  phone: '',
  address_line: '',
  apartment: '',
  area: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  address_type: 'home',
  is_default: false,
};

export function AddressesPage() {
  const auth = useAuth();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(emptyAddress);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useMeta('My Addresses');

  function load() {
    api('/api/addresses')
      .then((res) => {
        setRows(res.data);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function startAdd() {
    setEditingId(null);
    setForm({
      ...emptyAddress,
      full_name: auth.user?.full_name || '',
      phone: auth.user?.mobile || '',
      is_default: rows?.length === 0,
    });
    setShowForm(true);
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      full_name: row.full_name || '',
      phone: row.phone || row.mobile || '',
      address_line: row.address_line_1 || row.address_line || '',
      apartment: row.address_line_2 || row.apartment || '',
      area: row.area || '',
      landmark: row.landmark || '',
      city: row.city || '',
      state: row.state || '',
      pincode: row.pincode || '',
      country: row.country || 'India',
      address_type: row.address_type || 'home',
      is_default: !!row.is_default,
    });
    setShowForm(true);
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10))) {
      return setError('Please enter a valid 10-digit Indian mobile number.');
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      return setError('Please enter a valid 6-digit PIN code.');
    }

    setSaving(true);
    try {
      if (editingId) {
        await api(`/api/addresses/${editingId}`, { method: 'PUT', body: form });
      } else {
        await api('/api/addresses', { method: 'POST', body: form });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyAddress);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await api(`/api/addresses/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setDefault(id) {
    try {
      await api(`/api/addresses/${id}/default`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!rows) return <State loading />;

  return (
    <div>
      <div className="account-page-header">
        <div>
          <h1 className="account-page-title">
            <MapPin size={24} style={{ color: '#1e6b4f' }} />
            Delivery Addresses
          </h1>
          <p className="account-page-desc">
            Manage delivery locations for insured stamp consignments.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn" onClick={startAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Add New Address
          </button>
        )}
      </div>

      {error && (
        <div className="error" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="account-panel" style={{ marginBottom: 24, border: '2px solid #1e6b4f' }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={18} style={{ color: '#1e6b4f' }} />
            {editingId ? 'Edit Address' : 'Add New Address'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label className="field">
              <span>Full Name *</span>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Enter full name" required />
            </label>
            <label className="field">
              <span>10-Digit Mobile Number *</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Enter mobile number" required />
            </label>
          </div>

          <label className="field">
            <span>House / Flat / Street (Address Line 1) *</span>
            <input value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} placeholder="House/Flat No., Building Name, Street" required />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label className="field">
              <span>Apartment / Unit (Address Line 2)</span>
              <input value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} placeholder="Apartment / Suite (Optional)" />
            </label>
            <label className="field">
              <span>Landmark</span>
              <input value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Nearby landmark (Optional)" />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <label className="field">
              <span>City *</span>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" required />
            </label>
            <label className="field">
              <span>State *</span>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" required />
            </label>
            <label className="field">
              <span>PIN Code *</span>
              <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="6-digit PIN" maxLength={6} required />
            </label>
          </div>

          <div style={{ margin: '14px 0' }}>
            <span style={{ fontSize: 13, color: '#3d3832', display: 'block', marginBottom: 6, fontWeight: 500 }}>Address Type:</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'work', label: 'Work', icon: Briefcase },
                { id: 'other', label: 'Other', icon: Building },
              ].map(({ id, label, icon: Icon }) => (
                <label
                  key={id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 13.5,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: form.address_type === id ? '1.5px solid #1e6b4f' : '1px solid #dcd7cc',
                    background: form.address_type === id ? '#f0f9f5' : '#ffffff',
                    color: form.address_type === id ? '#1e6b4f' : 'inherit',
                    fontWeight: form.address_type === id ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="account_addr_type"
                    checked={form.address_type === id}
                    onChange={() => setForm({ ...form, address_type: id })}
                    style={{ accentColor: '#1e6b4f' }}
                  />
                  <Icon size={14} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '14px 0', fontSize: 13.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} style={{ accentColor: '#1e6b4f' }} />
            Set as default delivery address
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 && !showForm ? (
        <div className="account-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f5f3ef', color: 'var(--muted)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <MapPin size={26} />
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>No Addresses Saved</h3>
          <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 14 }}>
            Add your primary shipping destination for certified dispatch.
          </p>
          <button type="button" className="btn" onClick={startAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Add New Address
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {rows.map((row) => (
            <article
              key={row.id}
              className={`account-address-card ${row.is_default ? 'is-default' : ''}`}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <strong style={{ fontSize: 16, color: 'var(--ink)' }}>{row.full_name}</strong>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      <span className="account-badge-pill status" style={{ textTransform: 'capitalize' }}>
                        {row.address_type === 'work' ? <Briefcase size={11} /> : row.address_type === 'other' ? <Building size={11} /> : <Home size={11} />}
                        {row.address_type || 'Home'}
                      </span>
                      {row.is_default && (
                        <span className="account-badge-pill verified">
                          <CheckCircle2 size={11} />
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 14, color: '#3d3832', lineHeight: 1.5, margin: '10px 0' }}>
                  {row.address_line_1 || row.address_line}
                  {(row.address_line_2 || row.apartment) ? `, ${row.address_line_2 || row.apartment}` : ''}
                  {row.landmark ? ` (Landmark: ${row.landmark})` : ''}
                  <br />
                  {row.city}, {row.state} - {row.pincode}
                  <br />
                  {row.country || 'India'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} />
                  {row.phone || row.mobile}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, borderTop: '1px solid #efeae0', paddingTop: 12 }}>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: 13, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => startEdit(row)}
                >
                  <Edit3 size={13} /> Edit
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: 13, padding: '4px 10px', color: '#a82c1f', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => remove(row.id)}
                >
                  <Trash2 size={13} /> Delete
                </button>
                {!row.is_default && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ fontSize: 12.5, padding: '4px 10px', marginLeft: 'auto', color: '#1e6b4f', fontWeight: 600 }}
                    onClick={() => setDefault(row.id)}
                  >
                    Set as Default
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrdersPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useMeta('My Orders');

  useEffect(() => {
    api('/api/orders')
      .then((res) => setRows(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <State error />;
  if (!rows) return <State loading />;
  if (!rows.length) {
    return (
      <div className="account-panel" style={{ textAlign: 'center', padding: '50px 20px' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#f5f3ef', color: 'var(--muted)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <Package size={28} />
        </div>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>No Orders Placed Yet</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
          Explore our stamp catalog and start your collection today.
        </p>
        <Link to="/stamps" className="btn">Browse Stamps</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="account-page-header">
        <div>
          <h1 className="account-page-title">
            <Package size={24} style={{ color: '#1e6b4f' }} />
            My Orders
          </h1>
          <p className="account-page-desc">
            Track your certified specimens and archival consignments.
          </p>
        </div>
      </div>

      <div className="account-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Order Ref</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link to={`/account/orders/${row.id}`} style={{ fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Package size={15} style={{ color: '#1e6b4f' }} />
                    {row.order_number}
                  </Link>
                </td>
                <td style={{ color: '#4b554e' }}>
                  {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{inr(row.grand_total)}</td>
                <td><span className={`status ${row.payment_status}`}>{row.payment_status}</span></td>
                <td><span className={`status ${row.status}`}>{row.status.replaceAll('_', ' ')}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <Link to={`/account/orders/${row.id}`} className="btn ghost" style={{ fontSize: 12.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>Details</span>
                    <ArrowRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useMeta('Order Details');

  function load() {
    api(`/api/orders/${id}`).then(setData).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  if (error) return <State error onRetry={load} />;
  if (!data) return <State loading />;

  const { order, items, history, shipping } = data;
  const address = order.shipping_address;

  async function invoice() {
    const token = localStorage.getItem('folio_token');
    const response = await fetch(`/api/orders/${id}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
    const html = await response.text();
    const win = window.open('');
    win.document.write(html);
    win.document.close();
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/account/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#1e6b4f', fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to My Orders
        </Link>
      </div>

      <div className="account-page-header">
        <div>
          <h1 className="account-page-title">
            <Package size={24} style={{ color: '#1e6b4f' }} />
            Order {order.order_number}
          </h1>
          <p className="account-page-desc" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Clock size={13} />
            Placed on {new Date(order.created_at).toLocaleString('en-IN')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`status ${order.status}`}>{order.status.replaceAll('_', ' ')}</span>
          <span className={`status ${order.payment_status}`}>{order.payment_status}</span>
        </div>
      </div>

      <div className="account-panel" style={{ padding: '0 24px', marginBottom: 20 }}>
        {items.map((item) => (
          <div className="line" key={item.id} style={{ alignItems: 'center', padding: '18px 0' }}>
            <img src={media(item.image)} alt={item.product_name} style={{ width: 68, height: 80, objectFit: 'contain', borderRadius: 8, border: '1px solid #e7e2d8', background: '#faf8f5' }} />
            <div>
              <strong style={{ fontSize: 15.5, color: 'var(--ink)' }}>{item.product_name}</strong>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>SKU: {item.sku} · Qty: {item.quantity}</p>
            </div>
            <strong style={{ fontSize: 16, color: 'var(--ink)' }}>{inr(item.line_total)}</strong>
          </div>
        ))}
      </div>

      <div className="summary" style={{ marginBottom: 20, borderRadius: 18, padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <CreditCard size={17} style={{ color: '#1e6b4f' }} />
          Payment Summary
        </h3>
        <div className="sum-row"><span>Items Subtotal</span><span>{inr(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="sum-row" style={{ color: '#1e6b4f' }}><span>Discount</span><span>−{inr(order.discount)}</span></div>}
        <div className="sum-row"><span>Insured Dispatch</span><span>{inr(order.shipping_charge)}</span></div>
        <div className="sum-row"><span>GST (18% inclusive)</span><span>{inr(order.tax)}</span></div>
        <div className="sum-row" style={{ borderTop: '2px solid #e7e2d8', paddingTop: 12, marginTop: 8, fontSize: 17 }}>
          <strong>Grand Total</strong>
          <strong style={{ color: '#1e6b4f' }}>{inr(order.grand_total)}</strong>
        </div>
      </div>

      <div className="specs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
        <div className="account-panel">
          <h3 style={{ fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={17} style={{ color: '#1e6b4f' }} />
            Dispatch Timeline
          </h3>
          <ul className="timeline">
            {history.map((step) => (
              <li key={step.id}>
                <span className="dot" />
                <div>
                  <strong style={{ textTransform: 'capitalize', color: 'var(--ink)' }}>{step.to_status.replaceAll('_', ' ')}</strong>
                  <br />
                  <small style={{ color: 'var(--muted)' }}>
                    {new Date(step.created_at).toLocaleString('en-IN')} {step.note ? `· ${step.note}` : ''}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="account-panel">
          <h3 style={{ fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={17} style={{ color: '#1e6b4f' }} />
            Delivery Destination
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: '#3d3832' }}>
            <strong style={{ color: 'var(--ink)' }}>{address.full_name}</strong><br />
            {address.address_line_1 || address.address_line}<br />
            {address.city}, {address.state} - {address.pincode}<br />
            Phone: {address.phone || address.mobile}
          </p>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #efeae0', fontSize: 13, color: 'var(--muted)' }}>
            <span>Method: <strong style={{ color: 'var(--ink)' }}>{order.shipping_method_name}</strong></span>
            {shipping?.tracking_number && (
              <p style={{ marginTop: 6, fontSize: 13 }}>
                Tracking: <strong>{shipping.tracking_number}</strong> ({shipping.courier}){' '}
                {shipping.tracking_url && <a href={shipping.tracking_url} target="_blank" rel="noreferrer" style={{ color: '#1e6b4f', textDecoration: 'underline' }}>Track</a>}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn light" onClick={invoice} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Printer size={15} /> Print Tax Invoice
        </button>
        <button type="button" className="btn light" onClick={() => api(`/api/orders/${id}/reorder`, { method: 'POST' }).then(() => navigate('/cart'))} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={15} /> Reorder Items
        </button>
        {['placed', 'under_review', 'confirmed', 'payment_pending'].includes(order.status) && (
          <button
            type="button"
            className="btn ghost"
            style={{ color: '#a82c1f', borderColor: '#f0dedb' }}
            onClick={() => {
              if (confirm('Cancel this order? Specimen reservations will be released.')) {
                api(`/api/orders/${id}/cancel`, { method: 'POST', body: {} }).then(load);
              }
            }}
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', password: '', confirm_password: '' });
  const [showPass, setShowPass] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useMeta('Account Security');

  async function updatePassword(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    if (form.password.length < 8) {
      return setError('New password must be at least 8 characters long.');
    }
    if (form.password !== form.confirm_password) {
      return setError('New passwords do not match.');
    }

    setSaving(true);
    try {
      await api('/api/auth/password', { method: 'PUT', body: form });
      setMessage('Password updated successfully.');
      setForm({ current_password: '', password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="account-panel" style={{ marginBottom: 20 }}>
        <div className="account-page-header">
          <div>
            <h1 className="account-page-title">
              <ShieldCheck size={24} style={{ color: '#1e6b4f' }} />
              Account & Security
            </h1>
            <p className="account-page-desc">
              Update your account password regularly to protect your collection and purchase history.
            </p>
          </div>
        </div>

        <form onSubmit={updatePassword} style={{ maxWidth: 460 }}>
          <label className="field">
            <span>Current Password *</span>
            <input
              type={showPass ? 'text' : 'password'}
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              placeholder="Enter current password"
              required
            />
          </label>

          <label className="field">
            <span>New Password (min 8 chars) *</span>
            <input
              type={showPass ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter new password"
              minLength={8}
              required
            />
          </label>

          <label className="field">
            <span>Confirm New Password *</span>
            <input
              type={showPass ? 'text' : 'password'}
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              placeholder="Confirm new password"
              required
            />
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, fontSize: 13.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPass} onChange={(e) => setShowPass(e.target.checked)} style={{ accentColor: '#1e6b4f' }} />
            <span>Show passwords</span>
          </label>

          {message && (
            <div className="note" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eaf6ef', borderColor: '#a3d8b8', color: '#165c3b', marginBottom: 16 }}>
              <CheckCircle2 size={16} />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="error" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button className="btn" type="submit" disabled={saving} style={{ minWidth: 150 }}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="account-panel">
        <h2 style={{ fontSize: 18, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, color: '#a82c1f' }}>
          <ShieldAlert size={18} />
          Active Session
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>
          Sign out of your collector account on this device.
        </p>
        <button
          type="button"
          className="btn ghost"
          style={{ color: '#a82c1f', borderColor: '#f0dedb', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => {
            auth.logout();
            navigate('/');
          }}
        >
          <LogOut size={15} /> Sign Out of Account
        </button>
      </div>
    </div>
  );
}
