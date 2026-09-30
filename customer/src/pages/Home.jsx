import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ProductCard, Stars, State, useAuth, useMeta } from '../shell';

export default function HomePage() {
  const auth = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState([]);
  const [email, setEmail] = useState('');
  const [news, setNews] = useState('');
  useMeta('Stamp House', 'Independence issues, princely states, and wildlife definitives from Folio.');

  function load() {
    setError('');
    api('/api/home').then(setData).catch((err) => setError(err.message));
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem('folio_viewed') || '[]');
    if (auth.user) api('/api/recently-viewed').then((res) => setRecent(res.data)).catch(() => setRecent(local));
    else setRecent(local);
  }, [auth.user]);

  if (!data && !error) return <div className="wrap section"><State loading /></div>;
  if (error) return <div className="wrap"><State error onRetry={load} /></div>;

  const hero = data.banners.find((b) => b.placement === 'hero') || data.banners[0];
  const promos = data.banners.filter((b) => b.placement !== 'hero').slice(0, 3);
  const tones = ['sage', 'cream', 'blue'];
  const floats = [...data.rare, ...data.featured].slice(0, 3);

  return (
    <div className="wrap">
      <section className="hero">
        <div>
          <div className="eyebrow">The cabinet</div>
          <h1>{hero?.title || 'Stamps chosen the way a collector would'}</h1>
          <p className="lead">{hero?.subtitle}</p>
          <div className="hero-actions">
            <Link className="btn" to={hero?.button_url || '/stamps'}>{hero?.button_text || 'Shop the cabinet'} →</Link>
            <Link className="btn light" to="/stamps?rare=1">Rare paper</Link>
          </div>
          <div className="checks"><span>Examined before dispatch</span><span>Archival sleeves</span><span>Trusted by album keepers</span></div>
        </div>
        <div className="hero-stage">
          <div className="sale-card"><small>CABINET</small><b>30%</b><small>selected issues</small></div>
          {floats.map((product) => (
            <Link key={product.id} to={`/product/${product.slug}`} className="stamp-float">
              <img src={product.image} alt={product.name} />
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cats">
          {data.categories.slice(0, 8).map((category) => (
            <Link key={category.id} to={`/stamps/${category.slug}`} className="cat-pill">
              <i aria-hidden="true">{category.name.slice(0, 1)}</i>
              {category.name.replace(' Stamps', '')}
            </Link>
          ))}
          <Link to="/stamps" className="cat-pill"><i>+</i>View all</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Top picks for you</h2><Link to="/stamps?featured=1">See all deals</Link></div>
        <div className="rail">{data.featured.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>

      <section className="section promos">
        {promos.map((banner, index) => (
          <article key={banner.id} className={`promo ${tones[index % 3]}`}>
            <div>
              <h3>{banner.title}</h3>
              <p>{banner.subtitle}</p>
            </div>
            <Link className="btn" to={banner.button_url || '/stamps'}>{banner.button_text || 'Browse'}</Link>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-head"><h2>New arrivals</h2><Link to="/stamps?new_arrival=1">See the new tray</Link></div>
        <div className="rail">{data.new_arrivals.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>

      <section className="section rare">
        <div>
          <div className="eyebrow">Rare cabinet</div>
          <h2 style={{ fontSize: 36, margin: '8px 0' }}>Pieces we keep one of</h2>
          <p>Lithographs, mourning issues, and state stamps. Stock is the number on the invoice, not a guess.</p>
          <Link className="btn light" style={{ marginTop: 16 }} to="/stamps?rare=1">View the rare tray</Link>
        </div>
        <div className="rail">{data.rare.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Best sellers</h2><Link to="/stamps?sort=bestselling">See all</Link></div>
        <div className="rail">{data.best_sellers.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>

      {recent.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Recently viewed</h2></div>
          <div className="rail">{recent.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>
      )}

      <section className="section reviews">
        <div>
          <h2 style={{ fontSize: 36 }}>Loved by collectors</h2>
          <p style={{ marginTop: 8 }}>Notes from people who already keep an album</p>
          <Stars value={4.8} />
        </div>
        <div className="review-row">
          {data.reviews.slice(0, 3).map((review) => (
            <article key={review.id} className="review">
              <header>
                <div className="avatar">{review.full_name.slice(0, 1)}</div>
                <div><strong>{review.full_name}</strong><Stars value={review.rating} /></div>
              </header>
              <p>“{review.body}”</p>
              <small style={{ color: 'var(--muted)' }}>{review.product_name}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="newsletter">
        <div>
          <h2 style={{ fontSize: 32 }}>Stay with the desk</h2>
          <p>New cabinet notes, not a weekly shout.</p>
        </div>
        <form className="news-form" onSubmit={(e) => { e.preventDefault(); setNews(email.includes('@') ? 'Noted. The list is not connected to a mail provider yet.' : 'Enter an email address.'); }}>
          <input aria-label="Email address" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn light" type="submit">Subscribe</button>
        </form>
        {news && <p>{news}</p>}
      </section>

      <section className="trust">
        <div><strong>Free shipping</strong><small>On orders over ₹2,499</small></div>
        <div><strong>Easy returns</strong><small>14 days, if unhinged by you</small></div>
        <div><strong>Secure checkout</strong><small>Prices calculated on the server</small></div>
        <div><strong>Desk support</strong><small>desk@folio.test</small></div>
      </section>
    </div>
  );
}
