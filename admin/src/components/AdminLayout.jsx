import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { adminApi } from '../api/client';

const NAV = [
  { section: 'Overview', items: [
    { to: '/', label: 'Dashboard' },
    { to: '/analytics', label: 'Analytics' },
  ]},
  { section: 'Catalog', items: [
    { to: '/products', label: 'Products' },
    { to: '/categories', label: 'Categories' },
    { to: '/inventory', label: 'Inventory' },
  ]},
  { section: 'Sales', items: [
    { to: '/orders', label: 'Orders' },
    { to: '/customers', label: 'Customers' },
    { to: '/coupons', label: 'Coupons' },
  ]},
  { section: 'Content', items: [
    { to: '/reviews', label: 'Reviews' },
    { to: '/banners', label: 'Banners' },
    { to: '/cms', label: 'CMS Pages' },
    { to: '/shipping', label: 'Shipping' },
  ]},
  { section: 'System', items: [
    { to: '/admin-users', label: 'Admin Users' },
    { to: '/activity-logs', label: 'Activity Logs' },
    { to: '/settings', label: 'Settings' },
  ]},
];

export default function AdminLayout({ children, title }) {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Stamps<small>Admin Panel</small></div>
        <nav className="sidebar-nav">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="section-label">{group.section}</div>
              {group.items.map((item) => (
                <Link key={item.to} to={item.to} className={location.pathname === item.to ? 'active' : ''}>{item.label}</Link>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
          <div style={{ color: 'white', marginBottom: 4 }}>{admin?.name}</div>
          <div style={{ opacity: 0.5, marginBottom: 8 }}>{admin?.role}</div>
          <button onClick={logout} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Sign Out</button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <h1>{title || 'Dashboard'}</h1>
          <form className="topbar-search" onSubmit={handleSearch}>
            <input placeholder="Search products, orders, customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
