import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  ShoppingCart,
  Users,
  Boxes,
  User,
  LogOut,
  Search,
  Calendar,
  Bell,
  Sparkles,
  ShieldCheck,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  Package
} from 'lucide-react';
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
    else {
      localStorage.removeItem('folio_admin_token');
      localStorage.removeItem('folio_admin');
    }
    setAdmin(next);
  }

  return <AuthContext.Provider value={{ admin, persist }}>{children}</AuthContext.Provider>;
}

export function Guard({ children }) {
  const { admin } = useDesk();
  const navigate = useNavigate();
  useEffect(() => {
    if (!admin) navigate('/login');
  }, [admin, navigate]);
  if (!admin) return null;
  return children;
}

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/categories', label: 'Categories', icon: Layers },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/profile', label: 'Profile', icon: User },
];

export function Shell() {
  const { admin, persist } = useDesk();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits(null);
      return;
    }
    const timer = setTimeout(() => {
      api(`/api/admin/search?q=${encodeURIComponent(q)}`)
        .then(setHits)
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setHits(null);
    setQ('');
  }, [location.pathname]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good Morning' : greetingHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const todayStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

  return (
    <div className="desk">
      {/* EXACT MONEYFLOW SIDEBAR */}
      <aside className="side">
        <div>
          {/* Brand Mark */}
          <div className="brand-container">
            <div className="brand-logo-mark">
              {/* MoneyFlow N-Wave Icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 18L10 6L14 14L20 6" />
              </svg>
            </div>
            <div className="brand-text">
              <h2>Folio Admin</h2>
              <span>Track. Save. Grow.</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="side-nav" aria-label="Admin Navigation">
            {navItems.map(({ to, label, icon: IconComponent }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <IconComponent size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          {/* Bottom Card (Take control of your money / Catalog) */}
          <div className="side-promo-card">
            <div className="side-promo-badge">
              <Boxes size={22} />
            </div>
            <div className="side-promo-title">Take control of stock</div>
            <div className="side-promo-desc">
              Organize categories, create subcategories and achieve goals faster.
            </div>
            <NavLink to="/categories" className="side-promo-btn">
              <Plus size={15} />
              <span>+ New Category</span>
            </NavLink>
          </div>

          {/* Theme & Logout */}
          <div className="side-footer">
            <div className="side-theme-pill">
              <Sun size={14} />
              <span>Light</span>
            </div>

            <button
              type="button"
              className="side-logout-btn"
              onClick={() => {
                persist(null);
                navigate('/login');
              }}
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="main">
        {/* TOP HEADER */}
        <header className="top">
          <div className="top-greeting">
            <h2>{greeting}, {admin?.full_name?.split(' ')[0] || 'Admin'}! 👋</h2>
            <p>Here's what's happening with your store today.</p>
          </div>

          <div className="top-actions">
            {/* Date Pill Selector */}
            <div className="date-pill-btn">
              <Calendar size={15} color="#6366f1" />
              <span>{todayStr}</span>
              <ChevronDown size={14} color="#94a3b8" />
            </div>

            {/* Notification Bell */}
            <button type="button" className="notif-bell-btn" aria-label="Notifications">
              <Bell size={18} />
              <span className="notif-badge">3</span>
            </button>

            {/* Search Input */}
            <div className="search-box" style={{ width: 260 }}>
              <Search size={15} />
              <input
                placeholder="Search stamps, orders..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {hits && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    left: 0,
                    background: '#ffffff',
                    border: '1px solid var(--border-card)',
                    borderRadius: 14,
                    boxShadow: 'var(--shadow-modal)',
                    padding: 12,
                    zIndex: 50,
                  }}
                >
                  {hits.products?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Stamps
                      </div>
                      {hits.products.map((item) => (
                        <div key={item.id} style={{ padding: '4px 0', fontSize: 13 }}>
                          <NavLink to={`/inventory?q=${encodeURIComponent(item.name)}`} style={{ color: 'var(--purple)', fontWeight: 600 }}>
                            {item.name}
                          </NavLink>
                        </div>
                      ))}
                    </div>
                  )}

                  {hits.orders?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Orders
                      </div>
                      {hits.orders.map((item) => (
                        <div key={item.id} style={{ padding: '4px 0', fontSize: 13 }}>
                          <NavLink to={`/orders/${item.id}`} style={{ color: 'var(--purple)', fontWeight: 600 }}>
                            #{item.order_number} · {item.status}
                          </NavLink>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hits.products?.length && !hits.orders?.length && (
                    <p style={{ padding: 6, color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No records found.</p>
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar Pill */}
            <NavLink to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'var(--purple-gradient)',
                  color: 'white',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                {admin?.full_name ? admin.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
            </NavLink>
          </div>
        </header>

        {/* OUTLET PAGE VIEW */}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function Modal({ title, children, onClose, maxWidth = 600 }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ title = 'Please Confirm', text, onYes, onNo, confirmText = 'Confirm', danger = false }) {
  return (
    <Modal title={title} onClose={onNo} maxWidth={440}>
      <p style={{ color: 'var(--text-main)', fontSize: 14.5, marginBottom: 20 }}>{text}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" className="btn-secondary" onClick={onNo}>
          Cancel
        </button>
        <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onYes}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

export function Banner({ error, success }) {
  if (error) {
    return (
      <div style={{ background: 'var(--red-soft)', border: '1px solid #fecaca', color: 'var(--red)', padding: '10px 14px', borderRadius: 12, fontSize: 13.5, marginBottom: 18, fontWeight: 500 }}>
        {error}
      </div>
    );
  }
  if (success) {
    return (
      <div style={{ background: 'var(--green-soft)', border: '1px solid var(--green-border)', color: '#065f46', padding: '10px 14px', borderRadius: 12, fontSize: 13.5, marginBottom: 18, fontWeight: 500 }}>
        {success}
      </div>
    );
  }
  return null;
}
