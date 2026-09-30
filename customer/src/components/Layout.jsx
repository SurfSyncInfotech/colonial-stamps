import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Layout({ children, title, description }) {
  const { customer, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  if (title) document.title = `${title} — FOLIO Stamp House`;
  if (description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
  }

  return (
    <>
      <div className="utility-bar">Free insured shipping on orders above ₹5,000 · Authenticated stamps guaranteed</div>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">FOLIO<span>Stamp House</span></Link>
          <nav className="nav-links">
            <Link to="/stamps">Shop</Link>
            <Link to="/stamps/british-commonwealth">Commonwealth</Link>
            <Link to="/stamps/european-classics">European</Link>
            <Link to="/stamps/asian-rarities">Asian</Link>
            <Link to="/page/about">About</Link>
          </nav>
          <form className="search-pill" onSubmit={handleSearch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input placeholder="Search stamps..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          <div className="header-actions">
            <Link to={isAuthenticated ? '/account' : '/login'} className="icon-btn" title="Account">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Link>
            <Link to="/account/wishlist" className="icon-btn" title="Wishlist">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </Link>
            <Link to="/cart" className="icon-btn" title="Cart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              {itemCount > 0 && <span className="badge">{itemCount}</span>}
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <section className="newsletter">
        <div className="container">
          <h2>Join the Collector&apos;s Circle</h2>
          <p>Early access to rare finds and exclusive offers</p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Your email address" />
            <button type="submit" className="btn btn-sale">Subscribe</button>
          </form>
        </div>
      </section>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h4>FOLIO Stamp House</h4>
              <p>Premium physical postage &amp; collector stamps since 1987.</p>
            </div>
            <div>
              <h4>Shop</h4>
              <Link to="/stamps">All Stamps</Link>
              <Link to="/stamps/british-commonwealth">Commonwealth</Link>
              <Link to="/stamps/thematic-collections">Thematic</Link>
            </div>
            <div>
              <h4>Help</h4>
              <Link to="/page/shipping-returns">Shipping &amp; Returns</Link>
              <Link to="/page/privacy">Privacy</Link>
              <Link to="/page/about">About Us</Link>
            </div>
            <div>
              <h4>Account</h4>
              {isAuthenticated ? (
                <>
                  <Link to="/account">My Account</Link>
                  <Link to="/account/orders">Orders</Link>
                  <button onClick={logout} style={{ color: 'inherit', opacity: 0.75, fontSize: 'inherit' }}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login">Sign In</Link>
                  <Link to="/signup">Create Account</Link>
                </>
              )}
            </div>
          </div>
          <div className="footer-bottom">&copy; {new Date().getFullYear()} FOLIO Stamp House. All rights reserved.</div>
        </div>
      </footer>
    </>
  );
}
