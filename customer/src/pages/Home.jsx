import { useEffect, useRef, useState } from 'react';
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
  const carouselRef = useRef(null);
  const reviewCarouselRef = useRef(null);

  function scrollCarousel(dir) {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 240 * dir, behavior: 'smooth' });
    }
  }

  function scrollReviewCarousel(dir) {
    if (reviewCarouselRef.current) {
      reviewCarouselRef.current.scrollBy({ left: 360 * dir, behavior: 'smooth' });
    }
  }
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



      <section className="section">
        <div className="section-head"><h2>Top picks for you</h2><Link to="/stamps?featured=1">See all deals</Link></div>
        <div className="rail">{data.featured.slice(0, 5).map((product) => <ProductCard key={product.id} product={product} />)}</div>
      </section>



      <section className="section rare carousel-section">
        <div className="rare-info">
          <div className="eyebrow">New Arrivals</div>
          <h2 style={{ fontSize: 36, margin: '8px 0', lineHeight: 1.15 }}>Fresh from the Cabinet</h2>
          <p>Newly cataloged First Day Covers, colonial singles, and princely state issues authenticated and ready for your collection.</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, flexWrap: 'wrap' }}>
            <Link className="btn light" to="/stamps?new_arrival=1">Explore new tray</Link>
            <div className="carousel-nav-btns">
              <button
                type="button"
                className="carousel-arrow"
                aria-label="Scroll left"
                onClick={() => scrollCarousel(-1)}
              >
                ←
              </button>
              <button
                type="button"
                className="carousel-arrow"
                aria-label="Scroll right"
                onClick={() => scrollCarousel(1)}
              >
                →
              </button>
            </div>
          </div>
        </div>
        <div className="carousel-track-wrapper">
          <div className="carousel-track" ref={carouselRef}>
            {(data.new_arrivals?.length ? data.new_arrivals : data.rare).map((product) => (
              <div key={product.id} className="carousel-slide">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
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
        ];
        return (
          <section className="section reviews-section-wrap" style={{ margin: '54px auto 40px' }}>
            <div className="reviews-hero-head">
              <div className="reviews-hero-content">
                <div className="reviews-kicker">
                  <span className="reviews-kicker-dot" />
                  COLLECTOR EXPERIENCES & PROVENANCE
                </div>
                <h2 className="reviews-main-title">Loved by Collectors Worldwide</h2>
                <p className="reviews-lead">
                  Authentic dispatches trusted by philatelic society fellows, historians, and archival album keepers across India & overseas.
                </p>

              </div>

              <div className="reviews-nav-box">
                <button
                  type="button"
                  className="reviews-nav-btn"
                  aria-label="Previous reviews"
                  onClick={() => scrollReviewCarousel(-1)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button
                  type="button"
                  className="reviews-nav-btn"
                  aria-label="Next reviews"
                  onClick={() => scrollReviewCarousel(1)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>

            <div className="carousel-track-wrapper">
              <div className="carousel-track reviews-track" ref={reviewCarouselRef}>
                {allReviews.map((review, idx) => {
                  const avatarLetter = review.full_name?.slice(0, 1) || 'C';
                  const avatarTones = ['#eaf3ed', '#fef3ec', '#eff3fc', '#fdf7e6'];
                  const avatarTextTones = ['#1e6b4f', '#c45525', '#2554a6', '#9c680c'];
                  const toneIdx = idx % avatarTones.length;
                  return (
                    <article key={review.id} className="review-carousel-card">
                      <div className="review-card-top">
                        <div
                          className="review-avatar-wrap"
                          style={{
                            backgroundColor: avatarTones[toneIdx],
                            color: avatarTextTones[toneIdx]
                          }}
                        >
                          {avatarLetter}
                        </div>
                        <div className="review-author-meta">
                          <div className="review-author-name-row">
                            <strong className="review-author-name">{review.full_name}</strong>
                            <span className="review-verified-tag">✓ Verified</span>
                          </div>
                          {review.location && (
                            <div className="review-location">
                              <span>🏛️</span> {review.location}
                            </div>
                          )}
                          <div className="review-card-stars">
                            {'★'.repeat(review.rating || 5)}
                          </div>
                        </div>
                      </div>

                      <blockquote className="review-quote-body">
                        “{review.body}”
                      </blockquote>

                      <div className="review-card-footer">
                        <span className="review-stamp-tag" title={review.product_name}>
                          <span className="stamp-icon">✉</span> {review.product_name}
                        </span>
                        {review.date && <span className="review-date-tag">{review.date}</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
