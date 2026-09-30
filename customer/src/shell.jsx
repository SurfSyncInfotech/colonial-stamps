import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, discountOf, inr } from './api';

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('folio_user') || 'null'); } catch { return null; }
  });
  const [cartCount, setCartCount] = useState(0);

  function persist(next, token) {
    if (token) localStorage.setItem('folio_token', token);
    if (next) localStorage.setItem('folio_user', JSON.stringify(next));
    else {
      localStorage.removeItem('folio_token');
      localStorage.removeItem('folio_user');
    }
    setUser(next);
  }

  async function refreshCart() {
    if (!localStorage.getItem('folio_token')) { setCartCount(0); return; }
    try {
      const cart = await api('/api/cart');
      setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0));
    } catch { setCartCount(0); }
  }

  useEffect(() => { refreshCart(); }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, persist, cartCount, refreshCart, setUser: (next) => persist(next) }}>
      {children}
    </AuthContext.Provider>
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
  const off = discountOf(product.price, product.sale_price);
  const [quick, setQuick] = useState(false);
  const [note, setNote] = useState('');

  async function wish(event) {
    event.preventDefault();
    if (!auth.user) return navigate('/login');
    try {
      if (product.wished) await api(`/api/wishlist/items/${product.id}`, { method: 'DELETE' });
      else await api('/api/wishlist/items', { method: 'POST', body: { product_id: product.id } });
      setNote(product.wished ? 'Removed from wishlist' : 'Saved to wishlist');
    } catch (error) { setNote(error.message); }
  }

  async function add(event) {
    event.preventDefault();
    if (!auth.user) return navigate('/login');
    try {
      await api('/api/cart/items', { method: 'POST', body: { product_id: product.id, quantity: 1 } });
      auth.refreshCart();
      setNote('Added to cart');
    } catch (error) { setNote(error.message); }
  }

  return (
    <article className="pcard">
      <div className="pcard-media">
        <button className="heart" aria-label="Save to wishlist" onClick={wish}><Icon d={paths.heart} size={16} /></button>
        <Link to={`/product/${product.slug}`}><img src={product.image} alt={product.name} /></Link>
        <button className="quick" onClick={() => setQuick(true)}>Quick view</button>
      </div>
      <h3><Link to={`/product/${product.slug}`}>{product.name}</Link></h3>
      <Stars value={product.rating} />
      <div className="pcard-row">
        <div><strong>₹</strong></div>
        <button className="cart-btn" aria-label={`Add ${product.name} to cart`} onClick={add} disabled={product.available < 1}><Icon d={paths.bag} size={16} /></button>
      </div>
      {product.available < 1 && <small>Out of stock</small>}
      {note && <small>{note}</small>}
      {quick && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={product.name}>
          <div className="sheet">
            <img src={product.image} alt="" style={{ height: 220, margin: '0 auto' }} />
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 28, marginTop: 8 }}>{product.name}</h3>
            <p style={{ color: 'var(--muted)', margin: '6px 0 12px' }}>{product.short_description}</p>
            <strong>₹</strong>
            <div className="buy-row">
              <button className="btn" onClick={add}>Add to cart</button>
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
      <header className="mast">
        <div className="wrap mast-row">
          <button className="menu-btn" aria-label="Open menu" onClick={() => setDrawer(true)}><Icon d={paths.menu} /></button>
          <Link to="/" className="logo" aria-label="Stamps from everywhere home">
            <span className="logo-mark"><Icon d="M7 4h10v16H7zM9 8h6M9 12h6" size={18} /></span>
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
                    <img src={item.image} alt="" /><span>{item.name}<br /><small>{item.catalogue_number || item.sku}</small></span>
                  </Link>
                ))}
              </div>
            )}
          </form>
          <div className="actions">
            <button className="mobile-search" aria-label="Search" onClick={() => setSearchOpen((v) => !v)}><Icon d={paths.search} /></button>
            <Link to={auth.user ? '/account' : '/login'}><Icon d={paths.user} /><span>Account</span></Link>
            <Link to="/wishlist"><Icon d={paths.heart} /><span>Wishlist</span></Link>
            <Link className="keep" to="/cart"><Icon d={paths.bag} /><span>Cart</span>{auth.cartCount > 0 && <em className="badge">{auth.cartCount}</em>}</Link>
          </div>
        </div>
      </header>
      <div className="navrow">
        <div className="wrap nav-inner">
          <button className="cat-btn" aria-expanded={openCats} onClick={() => setOpenCats((v) => !v)}>
            <span>All categories</span>
            <span style={{ fontSize: 11 }}>{openCats ? '▲' : '▼'}</span>
          </button>
          <nav className="nav-links" aria-label="Primary">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/pages/about-us">About</NavLink>
            <NavLink to="/stamps">Product</NavLink>
            <NavLink to="/pages/contact">Contact us</NavLink>
          </nav>
        </div>
        {openCats && (
          <div className="mega" onClick={() => setOpenCats(false)}>
            <div className="wrap mega-grid" onClick={(e) => e.stopPropagation()}>
              {categories.map((category) => {
                const isIndia = category.slug === 'indian-stamps';
                return (
                  <div key={category.id} className="mega-col" style={{ borderLeft: isIndia ? '3px solid #c45525' : '3px solid #1e6b4f', paddingLeft: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        fontWeight: 700,
                        color: isIndia ? '#c45525' : '#1e6b4f',
                        background: isIndia ? '#fef3ec' : '#edf7f2',
                        padding: '3px 8px',
                        borderRadius: 4
                      }}>
                        {isIndia ? 'We focus on stamps from India' : 'WORLD STAMPS'}
                      </span>
                    </div>
                    <Link className="cat-link" to={`/stamps/${category.slug}`} onClick={() => setOpenCats(false)} style={{ display: 'block', fontSize: 20, fontWeight: 600 }}>
                      {category.name}
                    </Link>
                    <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 14px' }}>{category.description}</p>
                    <ul className="mega-subs" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {category.subcategories?.map((sub) => (
                        <li key={sub.id} style={{ margin: '6px 0' }}>
                          <Link
                            to={`/stamps/${category.slug}/${sub.slug}`}
                            onClick={() => setOpenCats(false)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--text)', padding: '4px 0' }}
                          >
                            <span style={{ fontWeight: 500 }}>• {sub.name}</span>
                            <small style={{ color: 'var(--muted)' }}>{sub.product_count} stamps</small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {drawer && (
        <div className="drawer" onClick={() => setDrawer(false)}>
          <aside onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <strong style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>Cabinet Menu</strong>
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
              <span className="logo-mark"><Icon d="M7 4h10v16H7zM9 8h6M9 12h6" size={18} /></span>
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
            <p>desk@stampsfromeverywhere.test</p>
            <p>Weekdays, 10 to 6 IST</p>
            <p>Bengaluru, by appointment</p>
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
