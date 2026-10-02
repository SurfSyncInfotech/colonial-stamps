import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowRight, ShoppingCart, Globe, Plane, Sparkles } from 'lucide-react';
import { api, discountOf, inr, media } from './api';

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('folio_user') || 'null'); } catch { return null; }
  });
  const [cartCount, setCartCount] = useState(0);
  const [authPrompt, setAuthPrompt] = useState(null); // { open: boolean, message: string, redirect: string, action: object }
  const [isLoading, setIsLoading] = useState(true);

  function persist(next, token) {
    if (token) localStorage.setItem('folio_token', token);
    if (next) localStorage.setItem('folio_user', JSON.stringify(next));
    else {
      localStorage.removeItem('folio_token');
      localStorage.removeItem('folio_user');
    }
    setUser(next);
  }

  function logout() {
    persist(null);
    setCartCount(0);
  }

  function requireAuth(actionPayload, redirectUrl) {
    if (user) return true;
    if (actionPayload) {
      localStorage.setItem('folio_intended_action', JSON.stringify(actionPayload));
    }
    setAuthPrompt({
      open: true,
      message: 'Please sign in or create an account to add stamps to your cart.',
      redirect: redirectUrl || window.location.pathname,
      action: actionPayload,
    });
    return false;
  }

  async function executeIntendedAction() {
    try {
      const raw = localStorage.getItem('folio_intended_action');
      if (!raw) return false;
      const intended = JSON.parse(raw);
      localStorage.removeItem('folio_intended_action');
      if (intended.action === 'add_to_cart' && intended.productId) {
        await api('/api/cart/items', { method: 'POST', body: { product_id: intended.productId, quantity: intended.quantity || 1 } });
        await refreshCart();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function refreshCart() {
    if (!localStorage.getItem('folio_token')) { setCartCount(0); return; }
    try {
      const cart = await api('/api/cart');
      setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
    } catch { setCartCount(0); }
  }

  // Validate session on load
  useEffect(() => {
    const token = localStorage.getItem('folio_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    api('/api/auth/me')
      .then((res) => {
        if (res.user) {
          persist(res.user, token);
          refreshCart();
        }
      })
      .catch(() => {
        persist(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      persist,
      logout,
      requireAuth,
      executeIntendedAction,
      cartCount,
      refreshCart,
      setUser: (next) => persist(next),
      authPrompt,
      setAuthPrompt,
    }}>
      {children}
      {authPrompt?.open && (
        <AuthPromptModal
          message={authPrompt.message}
          redirect={authPrompt.redirect}
          onClose={() => setAuthPrompt(null)}
        />
      )}
    </AuthContext.Provider>
  );
}

export function AuthPromptModal({ message, redirect, onClose }) {
  const navigate = useNavigate();
  const targetRedirect = encodeURIComponent(redirect || window.location.pathname);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Sign in required" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, textAlign: 'center', padding: '32px 24px' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#fef3ec',
          color: '#c45525',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 16px'
        }}>
          <Lock size={26} />
        </div>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 26, margin: '0 0 8px', color: 'var(--ink)' }}>
          Collector Account Required
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.5, margin: '0 0 24px' }}>
          {message || 'Please sign in or create an account to reserve and order stamps from the cabinet.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            onClick={() => {
              onClose();
              navigate(`/login?redirect=${targetRedirect}`);
            }}
          >
            <span>Sign In to Continue</span>
            <ArrowRight size={16} />
          </button>
          <button
            className="btn light"
            style={{ width: '100%', borderColor: '#1e6b4f', color: '#1e6b4f' }}
            onClick={() => {
              onClose();
              navigate(`/signup?redirect=${targetRedirect}`);
            }}
          >
            Create New Account
          </button>
          <button
            className="btn ghost"
            style={{ width: '100%', marginTop: 4 }}
            onClick={onClose}
          >
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}

export function useMeta(title, description) {
  useEffect(() => {
    if (!title && !description) return;
    document.title = title ? `${title} · Stamps from everywhere` : 'Stamps from everywhere';
    const tag = document.querySelector('meta[name="description"]');
    if (tag && description) tag.setAttribute('content', description);
  }, [title, description]);
}

function Icon({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const paths = {
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.3-4.3',
  user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  heart: 'M19.5 12.6 12 20l-7.5-7.4a4.5 4.5 0 0 1 6.4-6.3L12 7.2l1.1-.9a4.5 4.5 0 0 1 6.4 6.3z',
  bag: 'M6 7h12l-1 13H7L6 7zM9 7V5a3 3 0 0 1 6 0v2',
  menu: 'M4 7h16M4 12h16M4 17h16',
  truck: 'M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
};

export function Stars({ value }) {
  const full = Math.round(Number(value || 0));
  return <div className="stars" aria-label={value ? `${value} out of 5` : 'No ratings yet'}>{'★'.repeat(full)}{'☆'.repeat(5 - full)} <span>{value ? `(${value})` : ''}</span></div>;
}

export function ProductCard({ product }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const off = discountOf(product.price, product.sale_price);
  const [quick, setQuick] = useState(false);
  const [note, setNote] = useState('');

  async function wish(event) {
    event.preventDefault();
    if (!auth.user) {
      auth.requireAuth(
        { action: 'wishlist', productId: product.id },
        location.pathname
      );
      return;
    }
    try {
      if (product.wished) await api(`/api/wishlist/items/${product.id}`, { method: 'DELETE' });
      else await api('/api/wishlist/items', { method: 'POST', body: { product_id: product.id } });
      setNote(product.wished ? 'Removed from wishlist' : 'Saved to wishlist');
    } catch (error) { setNote(error.message); }
  }

  async function add(event) {
    if (event) event.preventDefault();
    if (!auth.user) {
      auth.requireAuth(
        { action: 'add_to_cart', productId: product.id, quantity: 1 },
        location.pathname
      );
      return;
    }
    try {
      await api('/api/cart/items', { method: 'POST', body: { product_id: product.id, quantity: 1 } });
      auth.refreshCart();
      setNote('Added to cart');
      if (quick) setQuick(false);
    } catch (error) { setNote(error.message); }
  }

  return (
    <article className="pcard">
      <div className="pcard-media">
        <button className="heart" aria-label="Save to wishlist" onClick={wish}><Icon d={paths.heart} size={16} /></button>
        <Link to={`/product/${product.slug}`}><img src={media(product.image)} alt={product.name} /></Link>
        <button className="quick" onClick={() => setQuick(true)}>Quick view</button>
      </div>
      <h3><Link to={`/product/${product.slug}`}>{product.name}</Link></h3>
      <Stars value={product.rating} />
      <div className="pcard-row">
        <div>
          <strong>{inr(product.effective_price || product.price)}</strong>
          {off > 0 && <span className="pcard-discount-tag">{off}% off</span>}
        </div>
      </div>
      <button
        className="pcard-add-cart-btn"
        type="button"
        aria-label={`Add ${product.name} to cart`}
        onClick={add}
        disabled={product.available < 1}
      >
        <ShoppingCart size={15} />
        <span>{product.available < 1 ? 'Out of Stock' : 'Add to Cart'}</span>
      </button>
      {note && <small style={{ display: 'block', marginTop: 4, color: '#1e6b4f', fontWeight: 600, textAlign: 'center', fontSize: 12 }}>{note}</small>}
      {quick && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={product.name} onClick={() => setQuick(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <img src={media(product.image)} alt="" style={{ height: 220, margin: '0 auto', objectFit: 'contain' }} />
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginTop: 8 }}>{product.name}</h3>
            <p style={{ color: 'var(--muted)', margin: '6px 0 12px' }}>{product.short_description}</p>
            <div style={{ margin: '10px 0 16px' }}>
              <strong style={{ fontSize: 22 }}>{inr(product.effective_price || product.price)}</strong>
              {off > 0 && <span style={{ marginLeft: 8, color: '#c45525', fontWeight: 600, fontSize: 13 }}>({off}% OFF)</span>}
            </div>
            <div className="buy-row">
              <button className="btn" onClick={add} disabled={product.available < 1} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ShoppingCart size={16} /> Add to cart
              </button>
              <Link className="btn light" to={`/product/${product.slug}`}>Full details</Link>
              <button className="btn ghost" onClick={() => setQuick(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function State({ loading, error, empty, onRetry, children }) {
  if (loading) return <div className="rail">{[1, 2, 3, 4].map((n) => <div key={n} className="skeleton" />)}</div>;
  if (error) return <div className="state"><p>Something went wrong. Please try again.</p><button className="btn" onClick={onRetry}>Try again</button></div>;
  if (empty) return <div className="state"><h2>Nothing in this drawer</h2><p>{empty}</p></div>;
  return children;
}

export function SiteLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [openCats, setOpenCats] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState('');
  const [suggest, setSuggest] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    api('/api/categories').then((res) => setCategories(res.data)).catch(() => {});
    api('/api/cms').then((res) => setPages(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setSuggest(null); return; }
    const timer = setTimeout(() => {
      api(`/api/search/suggest?q=${encodeURIComponent(q)}`).then(setSuggest).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const recent = JSON.parse(localStorage.getItem('folio_recent_searches') || '[]');

  function goSearch(event) {
    event?.preventDefault();
    const term = q.trim();
    if (!term) return;
    const next = [term, ...recent.filter((item) => item !== term)].slice(0, 6);
    localStorage.setItem('folio_recent_searches', JSON.stringify(next));
    setSuggest(null);
    navigate(`/stamps?q=${encodeURIComponent(term)}`);
  }

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="top-marquee-bar" role="region" aria-label="Global Announcements">
        <div className="top-marquee-track">
          <div className="top-marquee-content">
            <span><Globe size={13} className="tm-icon" /> <strong>Serving Stamp Collectors in All Countries Worldwide</strong></span>
            <span className="tm-dot">✦</span>
            <span><Plane size={13} className="tm-icon" /> Safe Worldwide Shipping &amp; Fast Dispatch</span>
            <span className="tm-dot">✦</span>
            <span><Sparkles size={13} className="tm-icon" /> 100% Genuine &amp; Authentic Stamps</span>
            <span className="tm-dot">✦</span>
            <span><ShieldCheck size={13} className="tm-icon" /> Safe Moisture-Proof Protective Packaging</span>
            <span className="tm-dot">✦</span>
            <span><Globe size={13} className="tm-icon" /> <strong>Serving Stamp Collectors in All Countries Worldwide</strong></span>
            <span className="tm-dot">✦</span>
            <span><Plane size={13} className="tm-icon" /> Safe Worldwide Shipping &amp; Fast Dispatch</span>
            <span className="tm-dot">✦</span>
            <span><Sparkles size={13} className="tm-icon" /> 100% Genuine &amp; Authentic Stamps</span>
            <span className="tm-dot">✦</span>
            <span><ShieldCheck size={13} className="tm-icon" /> Safe Moisture-Proof Protective Packaging</span>
            <span className="tm-dot">✦</span>
          </div>
          <div className="top-marquee-content" aria-hidden="true">
            <span><Globe size={13} className="tm-icon" /> <strong>Serving Stamp Collectors in All Countries Worldwide</strong></span>
            <span className="tm-dot">✦</span>
            <span><Plane size={13} className="tm-icon" /> Safe Worldwide Shipping &amp; Fast Dispatch</span>
            <span className="tm-dot">✦</span>
            <span><Sparkles size={13} className="tm-icon" /> 100% Genuine &amp; Authentic Stamps</span>
            <span className="tm-dot">✦</span>
            <span><ShieldCheck size={13} className="tm-icon" /> Safe Moisture-Proof Protective Packaging</span>
            <span className="tm-dot">✦</span>
            <span><Globe size={13} className="tm-icon" /> <strong>Serving Stamp Collectors in All Countries Worldwide</strong></span>
            <span className="tm-dot">✦</span>
            <span><Plane size={13} className="tm-icon" /> Safe Worldwide Shipping &amp; Fast Dispatch</span>
            <span className="tm-dot">✦</span>
            <span><Sparkles size={13} className="tm-icon" /> 100% Genuine &amp; Authentic Stamps</span>
            <span className="tm-dot">✦</span>
            <span><ShieldCheck size={13} className="tm-icon" /> Safe Moisture-Proof Protective Packaging</span>
            <span className="tm-dot">✦</span>
          </div>
        </div>
      </div>
      <header className="mast">
        <div className="wrap mast-row">
          <button className="menu-btn" aria-label="Open menu" onClick={() => setDrawer(true)}><Icon d={paths.menu} /></button>
          <Link to="/" className="logo" aria-label="Stamps from everywhere home">
            <img src="/stamps/logo.svg" alt="Stamps logo" style={{ width: 46, height: 46, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
            <span><strong>Stamps</strong><small>FROM EVERYWHERE</small></span>
          </Link>
          <form className={`search ${searchOpen ? 'open' : ''}`} onSubmit={goSearch} role="search">
            <input aria-label="Search stamps" placeholder="Search stamps, catalogue numbers, countries…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button aria-label="Search" type="submit"><Icon d={paths.search} size={16} /></button>
            {suggest && (
              <div className="suggest">
                {recent.length > 0 && <div className="label">Recent</div>}
                {recent.slice(0, 3).map((item) => <button type="button" key={item} onClick={() => { setQ(item); navigate(`/stamps?q=${encodeURIComponent(item)}`); }}>{item}</button>)}
                <div className="label">Stamps</div>
                {suggest.products.length === 0 && <p style={{ padding: 8 }}>No matches yet.</p>}
                {suggest.products.map((item) => (
                  <Link key={item.slug} to={`/product/${item.slug}`} onClick={() => setSuggest(null)}>
                    <img src={media(item.image)} alt="" /><span>{item.name}<br /><small>{item.catalogue_number || item.sku}</small></span>
                  </Link>
                ))}
              </div>
            )}
          </form>
          <div className="actions">
            <button className="mobile-search" aria-label="Search" onClick={() => setSearchOpen((v) => !v)}><Icon d={paths.search} /></button>
            <Link to={auth.user ? '/account' : '/login'}><Icon d={paths.user} /><span>Account</span></Link>
            <Link to="/wishlist"><Icon d={paths.heart} /><span>Wishlist</span></Link>
            <Link className="keep" to="/cart"><ShoppingCart size={20} /><span>Cart</span>{auth.cartCount > 0 && <em className="badge">{auth.cartCount}</em>}</Link>
          </div>
        </div>
      </header>
      <div className="navrow">
        <div className="wrap nav-inner">
          <button className={`cat-btn ${openCats ? 'is-open' : ''}`} aria-expanded={openCats} aria-controls="category-panel" onClick={() => setOpenCats((v) => !v)}>
            <span>All categories</span>
            <svg className="cat-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <nav className="nav-links" aria-label="Primary">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/pages/about-us">About</NavLink>
            <NavLink to="/stamps">Product</NavLink>
            <NavLink to="/pages/contact">Contact us</NavLink>
          </nav>
        </div>
        <div className={`mega ${openCats ? 'is-open' : ''}`} id="category-panel" aria-hidden={!openCats} onClick={() => setOpenCats(false)}>
          <div className="wrap mega-grid" onClick={(e) => e.stopPropagation()}>
            {categories.map((category, index) => {
              const isIndia = category.slug === 'indian-stamps';
              return (
                <div key={category.id} className={`mega-col ${isIndia ? 'is-india' : 'is-world'}`} style={{ animationDelay: `${80 + index * 70}ms` }}>
                  <span className="mega-kicker">{isIndia ? 'We focus on stamps from India' : 'World stamps'}</span>
                  <Link className="cat-link" to={`/stamps/${category.slug}`} onClick={() => setOpenCats(false)}>
                    {category.name}
                  </Link>
                  <p className="mega-desc">{category.description}</p>
                  <ul className="mega-subs">
                    {category.subcategories?.map((sub, subIndex) => (
                      <li key={sub.id} style={{ animationDelay: `${140 + index * 70 + subIndex * 45}ms` }}>
                        <Link to={`/stamps/${category.slug}/${sub.slug}`} onClick={() => setOpenCats(false)}>
                          <span>{sub.name}</span>
                          <small>{sub.product_count} stamps</small>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {drawer && (
        <div className="drawer" onClick={() => setDrawer(false)}>
          <aside onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/stamps/logo.svg" alt="Stamps" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
                <strong style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>Cabinet Menu</strong>
              </div>
              <button className="icon-btn" onClick={() => setDrawer(false)} style={{ fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <Link to="/" onClick={() => setDrawer(false)}>Home</Link>
            <Link to="/pages/about-us" onClick={() => setDrawer(false)}>About</Link>
            <Link to="/stamps" onClick={() => setDrawer(false)}>Product</Link>
            <Link to="/pages/contact" onClick={() => setDrawer(false)}>Contact us</Link>
            <div style={{ margin: '18px 0 8px', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Categories
            </div>
            {categories.map((category) => (
              <div key={category.id} style={{ marginBottom: 12 }}>
                <Link to={`/stamps/${category.slug}`} onClick={() => setDrawer(false)} style={{ fontWeight: 600, color: category.slug === 'indian-stamps' ? '#c45525' : '#1e6b4f' }}>
                  {category.slug === 'indian-stamps' ? 'We focus on stamps from India' : 'WORLD STAMPS'}
                </Link>
                {category.subcategories?.map((sub) => (
                  <Link key={sub.id} to={`/stamps/${category.slug}/${sub.slug}`} onClick={() => setDrawer(false)} style={{ paddingLeft: 14, fontSize: 13, color: 'var(--muted)' }}>
                    ↳ {sub.name}
                  </Link>
                ))}
              </div>
            ))}
            <div style={{ margin: '18px 0 8px', fontWeight: 700, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Collector
            </div>
            <Link to="/account" onClick={() => setDrawer(false)}>Account</Link>
            <Link to="/wishlist" onClick={() => setDrawer(false)}>Wishlist</Link>
            <Link to="/cart" onClick={() => setDrawer(false)}>Cart</Link>
          </aside>
        </div>
      )}
      <main id="main"><Outlet /></main>
      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <Link to="/" className="logo">
              <img src="/stamps/logo.svg" alt="Stamps logo" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
              <span><strong>Stamps</strong><small>FROM EVERYWHERE</small></span>
            </Link>
            <p style={{ marginTop: 10 }}>Specialized philately cabinet focusing on rare Indian issues, Princely States, Gandhi memorials, and classic world postage.</p>
          </div>
          <div>
            <h3>Categories</h3>
            {categories.map((category) => (
              <Link key={category.id} to={`/stamps/${category.slug}`}>{category.name}</Link>
            ))}
            <Link to="/stamps">All Products</Link>
          </div>
          <div>
            <h3>Customer care</h3>
            <Link to="/pages/about-us">About us</Link>
            <Link to="/pages/contact">Contact us</Link>
            <Link to="/track">Track order</Link>
            <Link to="/account/orders">My orders</Link>
          </div>
          <div>
            <h3>The house</h3>
            {pages.filter((page) => ['about-us', 'faq', 'terms', 'privacy'].includes(page.slug)).map((page) => <Link key={page.slug} to={`/pages/${page.slug}`}>{page.title.replace(/\bFolio\b/gi, 'Stamps from everywhere')}</Link>)}
          </div>
          <div>
            <h3>Desk</h3>
            <p>heartsap@yahoo.in</p>
            <p>+91 98493 96820</p>
            <p>Bapatla, Andhra Pradesh</p>
          </div>
        </div>
        <div className="wrap legal">
          <span>© {new Date().getFullYear()} Stamps from everywhere. Sample cabinet marked in the database.</span>
          <span>India · INR</span>
        </div>
      </footer>
    </>
  );
}
