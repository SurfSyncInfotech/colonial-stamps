import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { api, inr } from '../api';
import { State, useAuth, useMeta } from '../shell';

const blank = { full_name: '', phone: '', address_line: '', apartment: '', area: '', city: '', state: '', pincode: '', country: 'India', is_default: false };

export function AccountLayout() {
  const auth = useAuth();
  if (!auth.user) return <div className="wrap" style={{ padding: 40 }}><Link className="btn" to="/login">Sign in</Link></div>;
  return (
    <div className="wrap account">
      <aside className="side">
        <NavLink to="/account" end>Profile</NavLink>
        <NavLink to="/account/addresses">Addresses</NavLink>
        <NavLink to="/account/orders">Orders</NavLink>
        <NavLink to="/wishlist">Wishlist</NavLink>
        <NavLink to="/account/settings">Settings</NavLink>
        <button className="btn ghost" onClick={() => { auth.persist(null); }}>Log out</button>
      </aside>
      <div><Outlet /></div>
    </div>
  );
}

export function ProfilePage() {
  const auth = useAuth();
  const [form, setForm] = useState({ full_name: auth.user.full_name, email: auth.user.email, mobile: auth.user.mobile });
  const [message, setMessage] = useState('');
  useMeta('Profile');
  async function save(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    data.set('full_name', form.full_name);
    data.set('email', form.email);
    data.set('mobile', form.mobile);
    await api('/api/auth/profile', { method: 'PUT', form: data });
    auth.persist({ ...auth.user, ...form });
    setMessage('Profile saved.');
  }
  return (
    <form onSubmit={save}>
      <h1>Profile</h1>
      <p className="status" style={{ margin: '8px 0 12px' }}>{auth.user.status}</p>
      {auth.user.profile_image && <img src={auth.user.profile_image} alt="" width="72" />}
      <label className="field"><span>Photo</span><input name="profile_image" type="file" accept="image/*" /></label>
      {['full_name','email','mobile'].map((key) => (
        <label key={key} className="field"><span>{key.replace('_', ' ')}</span><input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
      ))}
      {message && <p className="note">{message}</p>}
      <button className="btn">Save profile</button>
    </form>
  );
}

export function AddressesPage() {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  useMeta('Addresses');
  function load() { api('/api/addresses').then((res) => setRows(res.data)).catch((err) => setError(err.message)); }
  useEffect(load, []);
  async function save(event) {
    event.preventDefault();
    if (editing) await api(`/api/addresses/${editing}`, { method: 'PUT', body: form });
    else await api('/api/addresses', { method: 'POST', body: form });
    setForm(blank); setEditing(null); load();
  }
  if (error) return <State error onRetry={load} />;
  if (!rows) return <State loading />;
  return (
    <div>
      <h1>Addresses</h1>
      {rows.length === 0 && <p>No addresses yet.</p>}
      {rows.map((row) => (
        <article key={row.id} className="addr">
          <strong>{row.full_name}</strong> {row.is_default ? <span className="status">Default</span> : null}
          <p>{row.address_line}, {row.apartment} {row.area}, {row.city}, {row.state} {row.pincode}, {row.country}</p>
          <p>{row.phone}</p>
          <button className="btn ghost" onClick={() => { setEditing(row.id); setForm({ ...row, is_default: !!row.is_default }); }}>Edit</button>
          <button className="btn ghost" onClick={() => api(`/api/addresses/${row.id}`, { method: 'DELETE' }).then(load)}>Delete</button>
          {!row.is_default && <button className="btn ghost" onClick={() => api(`/api/addresses/${row.id}/default`, { method: 'POST' }).then(load)}>Set default</button>}
        </article>
      ))}
      <form onSubmit={save} className="panel" style={{ marginTop: 12 }}>
        <h3>{editing ? 'Edit address' : 'Add address'}</h3>
        {Object.keys(blank).filter((key) => key !== 'is_default').map((key) => (
          <label key={key} className="field"><span>{key.replace('_', ' ')}</span><input value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={!['apartment','area'].includes(key)} /></label>
        ))}
        <label><input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Default address</label>
        <button className="btn" type="submit">Save</button>
      </form>
    </div>
  );
}

export function OrdersPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useMeta('Orders');
  useEffect(() => { api('/api/orders').then((res) => setRows(res.data)).catch((err) => setError(err.message)); }, []);
  if (error) return <State error />;
  if (!rows) return <State loading />;
  if (!rows.length) return <State empty="No orders yet." />;
  return (
    <div>
      <h1>Orders</h1>
      <table className="table">
        <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><Link to={`/account/orders/${row.id}`}>{row.order_number}</Link></td>
              <td>{new Date(row.created_at).toLocaleDateString('en-IN')}</td>
              <td>{inr(row.grand_total)}</td>
              <td><span className={`status ${row.payment_status}`}>{row.payment_status}</span></td>
              <td><span className={`status ${row.status}`}>{row.status.replaceAll('_', ' ')}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useMeta('Order');
  function load() { api(`/api/orders/${id}`).then(setData).catch((err) => setError(err.message)); }
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
      <h1>{order.order_number}</h1>
      <p>{new Date(order.created_at).toLocaleString('en-IN')}</p>
      <p><span className={`status ${order.status}`}>{order.status.replaceAll('_', ' ')}</span> <span className={`status ${order.payment_status}`}>{order.payment_status}</span></p>
      {items.map((item) => (
        <div className="line" key={item.id}><img src={item.image} alt="" /><div><strong>{item.product_name}</strong><p>{item.sku} · Qty {item.quantity}</p></div><strong>{inr(item.line_total)}</strong></div>
      ))}
      <div className="summary" style={{ marginTop: 12 }}>
        <div className="sum-row"><span>Subtotal</span><span>{inr(order.subtotal)}</span></div>
        <div className="sum-row"><span>Discount</span><span>{inr(order.discount)}</span></div>
        <div className="sum-row"><span>Shipping</span><span>{inr(order.shipping_charge)}</span></div>
        <div className="sum-row"><span>GST</span><span>{inr(order.tax)}</span></div>
        <div className="sum-row"><strong>Total</strong><strong>{inr(order.grand_total)}</strong></div>
      </div>
      <div className="specs" style={{ marginTop: 16 }}>
        <div>
          <h3>Timeline</h3>
          <ul className="timeline">{history.map((step) => <li key={step.id}><span className="dot" /><div><strong>{step.to_status.replaceAll('_', ' ')}</strong><br /><small>{new Date(step.created_at).toLocaleString('en-IN')} {step.note ? `· ${step.note}` : ''}</small></div></li>)}</ul>
        </div>
        <div>
          <h3>Delivery</h3>
          <p>{address.full_name}<br />{address.address_line}<br />{address.city}, {address.state} {address.pincode}</p>
          <p>{order.shipping_method_name}</p>
          {shipping?.tracking_number && <p>Tracking {shipping.tracking_number} · {shipping.courier} {shipping.tracking_url && <a href={shipping.tracking_url}>Open</a>}</p>}
        </div>
      </div>
      <div className="buy-row" style={{ marginTop: 16 }}>
        <button className="btn light" onClick={invoice}>Invoice</button>
        <button className="btn light" onClick={() => api(`/api/orders/${id}/reorder`, { method: 'POST' }).then(() => navigate('/cart'))}>Reorder</button>
        {['placed','under_review','confirmed','payment_pending'].includes(order.status) && (
          <button className="btn ghost" onClick={() => { if (confirm('Cancel this order? Stock returns to the cabinet.')) api(`/api/orders/${id}/cancel`, { method: 'POST', body: {} }).then(load); }}>Cancel order</button>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const prefs = typeof auth.user.notification_prefs === 'string' ? JSON.parse(auth.user.notification_prefs) : (auth.user.notification_prefs || { order_updates: true, promotions: false });
  const [form, setForm] = useState({ current_password: '', password: '', confirm_password: '' });
  const [notes, setNotes] = useState(prefs);
  const [message, setMessage] = useState('');
  useMeta('Settings');
  return (
    <div>
      <h1>Settings</h1>
      <form className="panel" onSubmit={async (e) => { e.preventDefault(); try { await api('/api/auth/password', { method: 'PUT', body: form }); setMessage('Password updated.'); } catch (err) { setMessage(err.message); } }}>
        <h3>Password</h3>
        {['current_password','password','confirm_password'].map((key) => <label key={key} className="field"><span>{key.replaceAll('_', ' ')}</span><input type="password" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required /></label>)}
        <button className="btn">Update password</button>
      </form>
      <form className="panel" style={{ marginTop: 12 }} onSubmit={async (e) => { e.preventDefault(); await api('/api/auth/preferences', { method: 'PUT', body: notes }); setMessage('Preferences saved.'); }}>
        <h3>Notifications</h3>
        <label><input type="checkbox" checked={notes.order_updates} onChange={(e) => setNotes({ ...notes, order_updates: e.target.checked })} /> Order updates</label><br />
        <label><input type="checkbox" checked={notes.promotions} onChange={(e) => setNotes({ ...notes, promotions: e.target.checked })} /> Cabinet notes</label>
        <div><button className="btn" style={{ marginTop: 10 }}>Save preferences</button></div>
      </form>
      {message && <p className="note">{message}</p>}
      <button className="btn ghost" onClick={() => { auth.persist(null); navigate('/'); }}>Log out</button>
    </div>
  );
}
