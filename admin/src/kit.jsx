import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from './api';

const AuthContext = createContext(null);
export function useDesk() { return useContext(AuthContext); }

export function DeskAuth({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('folio_admin') || 'null'); } catch { return null; }
  });
  function persist(next, token) {
    if (token) localStorage.setItem('folio_admin_token', token);
    if (next) localStorage.setItem('folio_admin', JSON.stringify(next));
    else { localStorage.removeItem('folio_admin_token'); localStorage.removeItem('folio_admin'); }
    setAdmin(next);
  }
  return <AuthContext.Provider value={{ admin, persist }}>{children}</AuthContext.Provider>;
}

const nav = [
  ['Overview', [['/','Dashboard','analytics.view'], ['/analytics','Analytics','analytics.view'], ['/notifications','Notifications', null]]],
  ['Catalogue', [['/products','Products','products.view'], ['/categories','Categories','products.view'], ['/subcategories','Subcategories','products.view'], ['/inventory','Inventory','inventory.view']]],
  ['Trade', [['/orders','Orders','orders.view'], ['/customers','Customers','customers.view'], ['/coupons','Coupons','coupons.view'], ['/reviews','Reviews','reviews.moderate']]],
  ['House', [['/banners','Homepage','content.manage'], ['/shipping','Shipping','content.manage'], ['/cms','Pages','content.manage'], ['/admins','Desk users','admins.manage'], ['/activity','Activity','analytics.view'], ['/settings','Settings','settings.manage']]],
];

export function can(admin, permission) {
  if (!permission) return true;
  if (!admin) return false;
  if (admin.permissions?.includes('*') || admin.role === 'super_admin') return true;
  return admin.permissions?.includes(permission);
}

export function Shell() {
  const { admin, persist } = useDesk();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return; }
    const timer = setTimeout(() => api(`/api/admin/search?q=${encodeURIComponent(q)}`).then(setHits).catch(() => {}), 250);
    return () => clearTimeout(timer);
  }, [q]);
  return (
    <div className="desk">
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="brand"><strong>FOLIO</strong><small>DESK</small></div>
        {nav.map(([group, links]) => (
          <div key={group}>
            <div className="group">{group}</div>
            {links.filter(([, , permission]) => can(admin, permission)).map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>{label}</NavLink>
            ))}
          </div>
        ))}
        <NavLink to="/profile">Profile</NavLink>
        <button className="nav" onClick={() => { persist(null); navigate('/login'); }}>Log out</button>
      </aside>
      <div className="main">
        <div className="top">
          <button className="menu-btn" aria-label="Menu" onClick={() => setOpen((v) => !v)}>Menu</button>
          <input aria-label="Search the desk" placeholder="Search a stamp, SKU, order, customer, email, or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
          <span>{admin?.full_name}</span>
        </div>
        {hits && (
          <div className="search-pop">
            {hits.products.map((item) => <div key={item.id}><a href={`/products/${item.id}`}>{item.name} · {item.sku}</a></div>)}
            {hits.orders.map((item) => <div key={item.id}><a href={`/orders/${item.id}`}>{item.order_number}</a></div>)}
            {hits.customers.map((item) => <div key={item.id}><a href={`/customers/${item.id}`}>{item.full_name} · {item.email}</a></div>)}
            {!hits.products.length && !hits.orders.length && !hits.customers.length && <p>No records.</p>}
          </div>
        )}
        <div className="content"><Outlet /></div>
      </div>
    </div>
  );
}

export function Guard({ children }) {
  const { admin } = useDesk();
  const navigate = useNavigate();
  useEffect(() => { if (!admin) navigate('/login'); }, [admin]);
  if (!admin) return null;
  return children;
}

export function Banner({ error }) { return error ? <p className="error">{error}</p> : null; }

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet">
        <div className="page-title"><h2>{title}</h2><button className="btn light" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ text, onYes, onNo }) {
  return (
    <Modal title="Please confirm" onClose={onNo}>
      <p>{text}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn danger" onClick={onYes}>Confirm</button>
        <button className="btn light" onClick={onNo}>Keep it</button>
      </div>
    </Modal>
  );
}
