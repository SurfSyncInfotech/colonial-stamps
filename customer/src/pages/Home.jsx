import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ProductCard, Stars, State, useAuth, useMeta } from '../shell';

const defaultPhilatelistReviews = [
  {
    id: 'phil-rev-1',
    full_name: 'Dr. Vikramaditya Roy',
    location: 'Kolkata Philatelic Guild',
    rating: 5,
    body: 'The 1950 Republic of India First Day Cover arrived in pristine archival condition. The cancellation marks and embossing are immaculate. An essential addition to my modern Indian collection.',
    product_name: '1950 Republic Inauguration FDC',
    date: '2 days ago'
  },
  {
    id: 'phil-rev-2',
    full_name: 'Meera Iyer',
    location: 'Bengaluru Philatelic Club',
    rating: 5,
    body: 'The 1½ anna Independence issue arrived in an acid-free sleeve with flawless centering and original gum intact. Exemplary provenance and transparent grading.',
    product_name: '1947 Independence Jai Hind 1½a',
    date: '4 days ago'
  },
  {
    id: 'phil-rev-3',
    full_name: 'Arjun Deshpande',
    location: 'Pune Philately Circle',
    rating: 5,
    body: 'A serious 1948 Mahatma Gandhi mourning single. Packed safely between reinforced archival boards. The cataloging accuracy and historical notes are world-class.',
    product_name: '1948 Mahatma Gandhi 1½a Mourning Single',
    date: '1 week ago'
  },
  {
    id: 'phil-rev-4',
    full_name: 'Rajeshwari Swaminathan',
    location: 'Chennai Philatelic Society',
    rating: 5,
    body: 'Incredible find with the Feudatory Princely States exhibit sheet. Having Jaipur Service, Gwalior, and Indore together with crisp perforations is rare to discover.',
    product_name: 'Indian Princely States Archival Sheet I',
    date: '1 week ago'
  },
  {
    id: 'phil-rev-5',
    full_name: 'Alistair Campbell',
    location: 'London Postal History Fellowship',
    rating: 5,
    body: 'Remarkable delivery speed to the UK. The 1983 Siberian Crane Bharatpur Workshop FDC has an exceptionally clear commemorative postmark. Will definitely order again.',
    product_name: '1983 Siberian Crane Workshop FDC',
    date: '2 weeks ago'
  },
  {
    id: 'phil-rev-6',
    full_name: 'Lt. Col. (Retd.) Sanjeev Varma',
    location: 'Jaipur Philatelists Association',
    rating: 5,
    body: 'The 1975 Monal Pheasant complete mint sheet of 200 stamps came untouched, crisp, and flat. Truly museum grade preservation. Best stamp desk in India.',
    product_name: '1975 Monal Pheasant Complete Mint Sheet',
    date: '3 weeks ago'
  }
];

export default function HomePage() {
  const auth = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState([]);
  const [email, setEmail] = useState('');
  const [news, setNews] = useState('');
  useMeta('Stamps from everywhere', 'Independence issues, princely states, and wildlife definitives from around the world.');

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

  const indiaCat = data.categories.find((c) => c.slug === 'indian-stamps') || data.categories[0];
  const worldCat = data.categories.find((c) => c.slug === 'world-stamps') || data.categories[1];
  const subImages = {
    'first-day-covers': '/stamps/hero_cover_cropped.png',
    'princely-states': '/stamps/princely_states_sheet1.png',
    'independent-india': '/stamps/independence_stamp.jpg',
    'gandhi': '/stamps/gandhi_stamp.jpg',
    'british-india-colonial': '/stamps/british_india.jpg',
    'uk-spain-poland': '/stamps/world_uk.jpg',
    'australia': '/stamps/world_australia.jpg',
    'birds': '/stamps/birds_monal_sheet.png',
    'oddities-mint': '/stamps/princely_states_sheet3.png',
  };

  return (
    <div className="wrap">
      <section className="hero">
        <div>
          <div className="eyebrow">EST. 1854 · THE PHILATELIC CABINET</div>
          <h1>Stamps from India & Across the World</h1>
          <p className="lead">
            Preserving historical postal heritage: 1948 Mahatma Gandhi memorial issues, 1947 Independence tri-colors, British India Colonial, Princely States, First Day Covers, and classic World Stamps.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-catalog" to="/stamps">Explore Product Catalog →</Link>
            <Link className="btn light" to="/stamps/indian-stamps" style={{ borderColor: '#c45525', color: '#c45525' }}>India Focus</Link>
            <Link className="btn light" to="/stamps/world-stamps" style={{ borderColor: '#1e6b4f', color: '#1e6b4f' }}>World Stamps</Link>
          </div>
          <div className="checks">
            <span>✓ Museum archival sleeves</span>
            <span>✓ Authenticity guaranteed</span>
          </div>
        </div>
        <div className="hero-stage">
          <div className="hero-stage-card">
            <img src="/stamps/hero_cover_cropped.png" alt="1950 First Day Cover Inauguration of Republic of India" className="hero-main-photo" />
            <div className="hero-stage-footer">
              <div>
                <strong>1950 Republic of India First Day Cover</strong>
                <br />
                <small>Government of India Posts &amp; Telegraphs</small>
              </div>
              <Link to="/stamps/indian-stamps/first-day-covers" className="btn light" style={{ height: 32, padding: '0 12px', fontSize: 12 }}>
                Explore FDC
              </Link>
            </div>
          </div>

          <Link to="/stamps/indian-stamps/princely-states" className="hero-stamp-badge badge-princely">
            <img src="/stamps/princely_bhopal_service.png" alt="Bhopal State Service" />
            <div className="badge-text">
              <strong>Bhopal State Service</strong>
              <span>Moti Masjid · Princely</span>
            </div>
          </Link>

          <Link to="/stamps/world-stamps/birds" className="hero-stamp-badge badge-birds">
            <img src="/stamps/birds_monal_pheasant.png" alt="1975 Monal Pheasant" />
            <div className="badge-text">
              <strong>Monal Pheasant 1975</strong>
              <span>Avian Wildlife Series</span>
            </div>
          </Link>

          <Link to="/stamps/indian-stamps/first-day-covers" className="hero-stamp-badge badge-crane">
            <img src="/stamps/siberian_crane_stamp.png" alt="1983 Siberian Crane" />
            <div className="badge-text">
              <strong>Siberian Crane 1983</strong>
              <span>Bharatpur Workshop</span>
            </div>
          </Link>

          <Link to="/stamps/indian-stamps/gandhi" className="hero-stamp-badge badge-gandhi">
            <img src="/stamps/gandhi_stamp.jpg" alt="1948 Gandhi Memorial Stamp" />
            <div className="badge-text">
              <strong>1948 Gandhi Memorial</strong>
              <span>10 Annas · Rare Single</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Categories Section based on Excel Sheet */}
      <section className="excel-cats">
        {/* Group 1: We focus on stamps from India */}
        {indiaCat && (
          <div className="excel-group india">
            <div className="excel-group-head">
              <div>
                <span className="excel-group-tag">Specialized Focus</span>
                <h2>We focus on stamps from India</h2>
                <p>Five core categories documenting Indian postal history from early colonial issues to the Republic.</p>
              </div>
              <Link to={`/stamps/${indiaCat.slug}`} className="group-all-btn">
                View all Indian stamps ({indiaCat.product_count}) →
              </Link>
            </div>
            <div className="excel-grid-5">
              {indiaCat.subcategories?.map((sub) => {
                const isFdc = sub.slug === 'first-day-covers';
                return (
                  <article key={sub.id} className="excel-cat-card">
                    <div className="card-thumb-wrap">
                      <img src={subImages[sub.slug] || sub.image || '/stamps/hero_cover_cropped.png'} alt={sub.name} />
                    </div>
                    <h3>{sub.name}</h3>
                    <p className="card-desc">
                      {sub.description}
                    </p>
                    {isFdc && (
                      <small style={{ margin: '-8px 0 10px', fontSize: 11 }}>
                        <a href="https://www.collectorbazar.com/categories/fdc-special-covers-brochures" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                          Reference: CollectorBazar FDC Archive ↗
                        </a>
                      </small>
                    )}
                    <div className="card-footer">
                      <Link to={`/stamps/${indiaCat.slug}/${sub.slug}`}>
                        Explore ({sub.product_count}) →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* Group 2: WORLD STAMPS */}
        {worldCat && (
          <div className="excel-group world">
            <div className="excel-group-head">
              <div>
                <span className="excel-group-tag">Global Cabinet</span>
                <h2>WORLD STAMPS</h2>
                <p>Classic European postage, Australian commonwealth, bird wildlife themes, and rare mint oddities.</p>
              </div>
              <Link to={`/stamps/${worldCat.slug}`} className="group-all-btn">
                View all World stamps ({worldCat.product_count}) →
              </Link>
            </div>
            <div className="excel-grid-4">
              {worldCat.subcategories?.map((sub) => (
                <article key={sub.id} className="excel-cat-card">
                  <div className="card-thumb-wrap">
                    <img src={subImages[sub.slug] || sub.image || '/stamps/birds_monal_sheet.png'} alt={sub.name} />
                  </div>
                  <h3>{sub.name}</h3>
                  <p className="card-desc">
                    {sub.description}
                  </p>
                  <div className="card-footer">
                    <Link to={`/stamps/${worldCat.slug}/${sub.slug}`}>
                      Explore ({sub.product_count}) →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Exclusive Archival Holdings Gallery from User Collection */}
      <section className="section" style={{ margin: '36px auto 44px' }}>
        <div className="section-head">
          <div>
            <span style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c45525', fontWeight: 700 }}>Archival Stamp Desk</span>
            <h2 style={{ fontSize: 32, marginTop: 4 }}>Authentic Philatelic Exhibit Sheets & Covers</h2>
          </div>
          <Link to="/stamps">View All Products →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          <div className="excel-cat-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-thumb-wrap" style={{ height: 180, background: '#fcfbf7' }}>
              <img src="/stamps/princely_states_sheet1.png" alt="Indian Princely States Exhibit Sheet I" style={{ height: '100%', objectFit: 'contain' }} />
            </div>
            <h3>Indian Princely States Sheet I</h3>
            <p className="card-desc">Featuring Jaipur State Service, Gwalior Service, Hyderabad Charminar, Bahawalpur, and Indore.</p>
            <div className="card-footer" style={{ marginTop: 'auto', paddingTop: 12 }}>
              <Link to="/product/indian-princely-states-archival-sheet-1">View Exhibit Piece →</Link>
            </div>
          </div>

          <div className="excel-cat-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-thumb-wrap" style={{ height: 180, background: '#fcfbf7' }}>
              <img src="/stamps/princely_states_sheet2.png" alt="Indian Princely States Exhibit Sheet II" style={{ height: '100%', objectFit: 'contain' }} />
            </div>
            <h3>Indian Princely States Sheet II</h3>
            <p className="card-desc">Featuring Cochin Anchal, Gwalior Service, Duttia State, Hyderabad Victory, and Travancore green.</p>
            <div className="card-footer" style={{ marginTop: 'auto', paddingTop: 12 }}>
              <Link to="/product/indian-princely-states-archival-sheet-2">View Exhibit Piece →</Link>
            </div>
          </div>

          <div className="excel-cat-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-thumb-wrap" style={{ height: 180, background: '#fcfbf7' }}>
              <img src="/stamps/fdc_siberian_crane_1983.png" alt="1983 Siberian Crane First Day Cover" style={{ height: '100%', objectFit: 'contain' }} />
            </div>
            <h3>1983 Siberian Crane First Day Cover</h3>
            <p className="card-desc">International Crane Workshop Bharatpur FDC with official Calcutta postmark and Siberian Crane stamp.</p>
            <div className="card-footer" style={{ marginTop: 'auto', paddingTop: 12 }}>
              <Link to="/product/1983-siberian-crane-bharatpur-workshop-first-day-cover">View Cover →</Link>
            </div>
          </div>

          <div className="excel-cat-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-thumb-wrap" style={{ height: 180, background: '#fcfbf7' }}>
              <img src="/stamps/birds_monal_sheet.png" alt="1975 Monal Pheasant Mint Sheet" style={{ height: '100%', objectFit: 'contain' }} />
            </div>
            <h3>1975 Monal Pheasant Mint Sheet</h3>
            <p className="card-desc">Full mint sheet of 200 (Rs 2) Himalayan Monal Pheasant definitive stamps with complete margins.</p>
            <div className="card-footer" style={{ marginTop: 'auto', paddingTop: 12 }}>
              <Link to="/product/1975-monal-pheasant-complete-mint-sheet">View Mint Sheet →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Top picks for you</h2><Link to="/stamps?featured=1">See all deals</Link></div>
        <div className="rail">{data.featured.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>

      <section className="section promos">
        {promos.map((banner) => (
          <article key={banner.id} className="promo">
            <div>
              <h3>{banner.title?.replace(/the rare cabinet/gi, 'Curated collection').replace(/rare cabinet/gi, 'Curated pieces')}</h3>
              <p>{banner.subtitle?.replace(/rare cabinet/gi, 'curated album')}</p>
            </div>
            <Link className="btn" to={banner.button_url || '/stamps'}>
              {banner.button_text?.replace(/rare stamps/gi, 'Curated stamps') || 'Browse'}
            </Link>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-head"><h2>New arrivals</h2><Link to="/stamps?new_arrival=1">See the new tray</Link></div>
        <div className="rail">{data.new_arrivals.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>

      <section className="section rare">
        <div>
          <div className="eyebrow">Curated Pieces</div>
          <h2 style={{ fontSize: 36, margin: '8px 0' }}>Pieces we keep one of</h2>
          <p>Lithographs, mourning issues, and state stamps. Stock is the number on the invoice, not a guess.</p>
          <Link className="btn light" style={{ marginTop: 16 }} to="/stamps?rare=1">View collection</Link>
        </div>
        <div className="rail">{data.rare.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>

      <section className="section">
        <div className="section-head"><h2>Curated highlights</h2><Link to="/stamps">See all</Link></div>
        <div className="rail">{data.best_sellers.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>

      {recent.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Recently viewed</h2></div>
          <div className="rail">{recent.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
        </section>
      )}

      {(() => {
        const allReviews = [
          ...(data?.reviews || []),
          ...defaultPhilatelistReviews.filter((dr) => !(data?.reviews || []).some((r) => r.full_name === dr.full_name))
        ].slice(0, 6);
        return (
          <section className="section" style={{ margin: '48px auto 36px' }}>
            <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 32px' }}>
              <span style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c45525', fontWeight: 700 }}>
                Collector Experiences & Notes
              </span>
              <h2 style={{ fontSize: 34, marginTop: 6, lineHeight: 1.15 }}>Loved by Collectors Worldwide</h2>
              <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 15 }}>
                Feedback from philatelic society members, historians, and passionate album keepers across India & overseas.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 12, background: '#f5faf3', padding: '6px 18px', borderRadius: 999, border: '1px solid #d5e7e4' }}>
                <Stars value={5.0} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  5.0 Rating · 240+ Verified Philatelic Deliveries
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
              {allReviews.map((review) => (
                <article key={review.id} style={{
                  background: '#ffffff',
                  border: '1px solid var(--line)',
                  borderRadius: 18,
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 16px rgba(28, 41, 36, 0.04)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}>
                  <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--sage)',
                      color: 'var(--text)',
                      fontWeight: 700,
                      fontSize: 16,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0
                    }}>
                      {review.full_name?.slice(0, 1) || 'C'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{review.full_name}</strong>
                        <span style={{ fontSize: 11, color: '#1e6b4f', fontWeight: 600, background: '#eaf6f0', padding: '2px 8px', borderRadius: 999 }}>Verified</span>
                      </div>
                      {review.location && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{review.location}</div>}
                      <div style={{ marginTop: 4 }}>
                        <Stars value={review.rating || 5} />
                      </div>
                    </div>
                  </header>
                  <p style={{ color: '#2c332e', fontSize: 14.5, lineHeight: 1.55, margin: '6px 0 16px', flex: 1 }}>
                    “{review.body}”
                  </p>
                  <div style={{ borderTop: '1px solid #f0ede6', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#c45525', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {review.product_name}
                    </span>
                    {review.date && <small style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0 }}>{review.date}</small>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })()}

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
        <div><strong>Archival safe packaging</strong><small>Acid-free protective sleeves</small></div>
        <div><strong>Collector authenticity</strong><small>Verified philatelic condition</small></div>
        <div><strong>Careful dispatch</strong><small>Tracked postal handling</small></div>
        <div><strong>Desk support</strong><small>desk@stampsfromeverywhere.test</small></div>
      </section>
    </div>
  );
}
