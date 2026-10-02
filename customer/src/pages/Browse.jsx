import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { api, media } from '../api';
import { ProductCard, State, useMeta } from '../shell';

const sorts = [
  ['newest', 'Newest'],
  ['popular', 'Popular'],
  ['bestselling', 'Curated'],
  ['name', 'Alphabetical'],
];

export function ShopPage() {
  return <div className="wrap"><Catalog /></div>;
}

export function CategoryPage() {
  const { categorySlug } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setInfo(null);
    api(`/api/categories/${categorySlug}`).then(setInfo).catch((err) => setError(err.message));
  }, [categorySlug]);
  useMeta(info?.category?.seo_title || info?.category?.name, info?.category?.seo_description);
  if (error) return <div className="wrap"><State error onRetry={() => window.location.reload()} /></div>;
  if (!info) return <div className="wrap section"><State loading /></div>;
  return (
    <div className="wrap">
      <Crumbs items={[['Home', '/'], [info.category.name, null]]} />
      <Intro item={info.category} />
      <div className="sub-row">
        {info.subcategories.map((sub) => (
          <Link className="chip" key={sub.id} to={`/stamps/${categorySlug}/${sub.slug}`}>{sub.name} · {sub.product_count}</Link>
        ))}
      </div>
      <Catalog locked={{ category: categorySlug }} />
    </div>
  );
}

export function SubcategoryPage() {
  const { categorySlug, subSlug } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setInfo(null);
    api(`/api/categories/${categorySlug}/subcategories/${subSlug}`).then(setInfo).catch((err) => setError(err.message));
  }, [categorySlug, subSlug]);
  useMeta(info?.subcategory?.seo_title || info?.subcategory?.name, info?.subcategory?.seo_description);
  if (error) return <div className="wrap"><State error /></div>;
  if (!info) return <div className="wrap section"><State loading /></div>;
  const sub = info.subcategory;
  return (
    <div className="wrap">
      <Crumbs items={[['Home', '/'], [sub.category_name, `/stamps/${categorySlug}`], [sub.name, null]]} />
      <Intro item={sub} />
      <Catalog locked={{ category: categorySlug, subcategory: subSlug }} />
    </div>
  );
}

function Crumbs({ items }) {
  return <nav className="crumbs" aria-label="Breadcrumb">{items.map(([label, href], i) => <span key={label}>{i > 0 && ' / '}{href ? <Link to={href}>{label}</Link> : label}</span>)}</nav>;
}

function Intro({ item }) {
  const bullets = Array.isArray(item.bullet_points) ? item.bullet_points : [];
  const isFdc = item.slug === 'first-day-covers';
  const subFallback = {
    'first-day-covers': '/stamps/hero_cover_cropped.png',
    'princely-states': '/stamps/princely_states_sheet1.png',
    'birds': '/stamps/birds_monal_sheet.png',
    'oddities-mint': '/stamps/princely_states_sheet3.png',
  };
  const imgUrl = subFallback[item.slug] || item.image;
  return (
    <header className="page-intro">
      {imgUrl && <img src={media(imgUrl)} alt={item.name} />}
      <div>
        <h1>{item.name}</h1>
        <p>{item.description}</p>
        {isFdc && (
          <p style={{ marginTop: 8 }}>
            <a href="https://www.collectorbazar.com/categories/fdc-special-covers-brochures" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontSize: 13 }}>
              Reference source: CollectorBazar FDC Special Covers & Brochures ↗
            </a>
          </p>
        )}
        {bullets.length > 0 && <ul className="bullets">{bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
      </div>
    </header>
  );
}

function Catalog({ locked = {} }) {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [facets, setFacets] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const query = params.get('q') || '';
  useMeta(locked.category ? '' : (query ? `Search: ${query}` : 'Shop stamps'), locked.category ? '' : 'Browse the Stamps cabinet by country, year, condition, and rarity.');

  const qs = new URLSearchParams(params);
  if (locked.category) qs.set('category', locked.category);
  if (locked.subcategory) qs.set('subcategory', locked.subcategory);

  function load() {
    setLoading(true);
    setError('');
    api(`/api/products?${qs.toString()}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [qs.toString()]);
  useEffect(() => {
    api('/api/facets').then(setFacets).catch(() => {});
    api('/api/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  function set(key, value) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key); else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  const filterBlock = (
    <aside className="filters">
      <h3>Availability</h3>
      {[['','Any'], ['in_stock','In stock'], ['low_stock','Low stock'], ['out_of_stock','Out of stock']].map(([value, label]) => (
        <label key={label}><input type="radio" name="availability" checked={(params.get('availability') || '') === value} onChange={() => set('availability', value)} />{label}</label>
      ))}
      {!locked.category && (
        <>
          <h3>Category</h3>
          <label><input type="radio" name="cat" checked={!params.get('category')} onChange={() => { set('category', ''); set('subcategory', ''); }} />All Categories</label>
          {categories.map((category) => {
            const isSelected = params.get('category') === category.slug;
            return (
              <div key={category.id}>
                <label>
                  <input type="radio" name="cat" checked={isSelected} onChange={() => { set('category', category.slug); set('subcategory', ''); }} />
                  {category.slug === 'indian-stamps' ? 'Stamps from India' : 'World Stamps'}
                </label>
                {isSelected && category.subcategories && (
                  <div style={{ paddingLeft: 16, margin: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 13, color: 'var(--muted)' }}>
                      <input type="radio" name="subcat" checked={!params.get('subcategory')} onChange={() => set('subcategory', '')} />
                      All {category.name}
                    </label>
                    {category.subcategories.map((sub) => (
                      <label key={sub.id} style={{ fontSize: 13 }}>
                        <input type="radio" name="subcat" checked={params.get('subcategory') === sub.slug} onChange={() => set('subcategory', sub.slug)} />
                        {sub.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
      {facets && [
        ['country', 'Country', facets.countries],
        ['year', 'Year', facets.years],
        ['stamp_type', 'Stamp type', facets.stamp_types],
        ['condition', 'Condition', facets.conditions],
        ['rarity', 'Rarity', facets.rarities],
        ['collection', 'Collection', facets.collections],
      ].map(([key, label, values]) => (
        <div key={key}>
          <h3>{label}</h3>
          <select aria-label={label} value={params.get(key) || ''} onChange={(e) => set(key, e.target.value)}>
            <option value="">Any</option>
            {values.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      ))}
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setParams(new URLSearchParams())}>Clear filters</button>
    </aside>
  );

  return (
    <div className="catalog" style={{ marginTop: locked.category ? 0 : 18 }}>
      <div className={filtersOpen ? '' : 'desk-filters'}>{filterBlock}</div>
      <div>
        <div className="toolbar">
          <div>
            <strong>{data ? `${data.meta.total} stamps` : 'Loading stamps...'}</strong>
            {query && <span> for “{query}”</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="chip" onClick={() => setFiltersOpen((v) => !v)}>Filters</button>
            <select aria-label="Sort" value={params.get('sort') || 'newest'} onChange={(e) => set('sort', e.target.value)}>
              {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <State loading={loading} error={error} empty={!loading && data && data.data.length === 0 ? 'No stamps match these filters.' : ''} onRetry={load}>
          <div className="grid">{data?.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          {data && data.meta.pages > 1 && (
            <div className="pager">
              {Array.from({ length: data.meta.pages }, (_, i) => (
                <button key={i} className={data.meta.page === i + 1 ? 'btn' : ''} onClick={() => set('page', String(i + 1))}>{i + 1}</button>
              ))}
            </div>
          )}
        </State>
      </div>
    </div>
  );
}

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  useMeta('Contact Us', 'Get in touch with our team for stamp inquiries, collection details, and order assistance.');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 500);
  }

  return (
    <div className="wrap contact-page-wrap">
      {/* 1. Header Section */}
      <div className="contact-hero-head">
        <span className="contact-kicker">Get in Touch</span>
        <h1 className="contact-main-title">Contact Our Team</h1>
        <p className="contact-main-desc">
          Have questions about our stamps, your order, or need help finding a specific collection? Our friendly support team is here to help.
        </p>
      </div>

      {/* 2. Top 3 Floating Info Cards */}
      <div className="contact-cards-grid">
        {/* Card 1: Phone */}
        <div className="contact-info-card">
          <div className="contact-card-icon-wrap">
            <Phone size={22} />
          </div>
          <div>
            <h3 className="contact-card-title">+91 98493 96820</h3>
            <p className="contact-card-text">
              Direct customer helpline for order assistance, stamp inquiries, and quick help.
            </p>
          </div>
          <a href="tel:+919849396820" className="contact-card-link">
            <span>Call Us Now</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {/* Card 2: Email (Featured Center Green Card) */}
        <div className="contact-info-card featured">
          <div className="contact-card-icon-wrap">
            <Mail size={22} />
          </div>
          <div>
            <h3 className="contact-card-title">heartsap@yahoo.in</h3>
            <p className="contact-card-text">
              Send us an email anytime for stamp inquiries, custom requests, or order support.
            </p>
          </div>
          <a href="mailto:heartsap@yahoo.in" className="contact-card-link">
            <span>Send An Email</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {/* Card 3: Location */}
        <div className="contact-info-card">
          <div className="contact-card-icon-wrap">
            <MapPin size={22} />
          </div>
          <div>
            <h3 className="contact-card-title">Bapatla, Andhra Pradesh</h3>
            <p className="contact-card-text">
              10-188/5, Maruprolu Vari Palem, Bapatla, Guntur District, Andhra Pradesh - 522101, India.
            </p>
          </div>
          <a href="https://maps.google.com/?q=Maruprolu+Vari+Palem,+Bapatla,+Andhra+Pradesh+522101" target="_blank" rel="noreferrer" className="contact-card-link">
            <span>View on Map</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* 3. Bottom 2-Column Section: Schedule & Map on Left, Contact Form on Right */}
      <div className="contact-body-grid">
        {/* LEFT COLUMN: Hours & Map */}
        <div className="contact-schedule-panel">
          <h2 className="contact-section-h2">Our Working Time</h2>
          <p className="contact-schedule-desc">
            Our customer support and order dispatch office operates on the following schedule:
          </p>

          <ul className="contact-hours-list">
            <li className="contact-hours-item open">
              <Clock size={17} />
              <span>Monday – Friday : <strong>9:30 AM – 6:30 PM IST</strong></span>
            </li>
            <li className="contact-hours-item open">
              <Clock size={17} />
              <span>Saturday : <strong>10:00 AM – 4:00 PM IST</strong></span>
            </li>
            <li className="contact-hours-item closed">
              <XCircle size={17} />
              <span>Sunday & Public Holidays : <strong>Closed</strong></span>
            </li>
          </ul>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={18} style={{ color: '#1e6b4f' }} />
              Location :
            </h3>
            <div className="contact-map-frame">
              <iframe
                title="Office Location"
                src="https://maps.google.com/maps?q=10-188/5,+Maruprolu+Vari+Palem,+Bapatla,+Andhra+Pradesh+522101&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Contact Form */}
        <div className="contact-form-panel">
          <span className="contact-form-kicker">Contact Us</span>
          <h2 className="contact-form-title">Get In Touch !</h2>

          {sent ? (
            <div style={{ background: '#eaf6ef', border: '1px solid #a3d8b8', color: '#165c3b', padding: '24px', borderRadius: 16, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ffffff', color: '#1e6b4f', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 size={26} />
              </div>
              <h3 style={{ fontSize: 20, marginBottom: 6 }}>Thank You!</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>
                Your message has been received successfully! Our team will reply to your registered email shortly.
              </p>
              <button
                type="button"
                className="btn light"
                style={{ marginTop: 18, borderColor: '#1e6b4f', color: '#1e6b4f' }}
                onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', message: '' }); }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3d3832', marginBottom: 6, display: 'block' }}>Email *</span>
                <input
                  type="email"
                  className="contact-input-styled"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3d3832', marginBottom: 6, display: 'block' }}>Name *</span>
                <input
                  type="text"
                  className="contact-input-styled"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3d3832', marginBottom: 6, display: 'block' }}>Phone / Subject (Optional)</span>
                <input
                  type="text"
                  className="contact-input-styled"
                  placeholder="e.g. Specimen Inquiry or Want-List"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3d3832', marginBottom: 6, display: 'block' }}>Message *</span>
                <textarea
                  rows={4}
                  className="contact-input-styled"
                  placeholder="Write your message here..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </label>

              <button
                type="submit"
                className="btn"
                disabled={loading}
                style={{
                  marginTop: 6,
                  height: 48,
                  fontSize: 15,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#1e6b4f',
                  borderColor: '#1e6b4f',
                  color: '#ffffff'
                }}
              >
                {loading ? 'Submitting Note...' : 'Submit Note →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/cms/${slug}`).then((res) => setPage(res.page)).catch((err) => setError(err.message));
  }, [slug]);

  if (slug === 'contact') {
    return <ContactPage />;
  }

  const title = page?.title.replace(/\bFolio\b/gi, 'Stamps from everywhere');
  const content = page?.content
    .replace(/Folio is a stamp desk\./gi, 'We are a stamp desk.')
    .replace(/desk@folio\.test/gi, 'desk@stampsfromeverywhere.test')
    .replace(/\bFolio\b/gi, 'Stamps from everywhere');
  const seoTitle = page?.seo_title?.replace(/\bFolio\b/gi, 'Stamps from everywhere');
  useMeta(seoTitle || title, page?.seo_description);

  if (error) return <div className="wrap"><State error /></div>;
  if (!page) return <div className="wrap"><State loading /></div>;

  const isAbout = slug === 'about-us';

  return (
    <div className="wrap" style={{ padding: '28px 0 54px', maxWidth: 820 }}>
      <h1 style={{ fontSize: 44, marginBottom: 12 }}>{title}</h1>
      {content.split('\n').filter(Boolean).map((para) => <p key={para} style={{ marginTop: 14, fontSize: 16, lineHeight: 1.6 }}>{para}</p>)}

      {isAbout && (
        <div style={{ marginTop: 36, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link to="/stamps/indian-stamps" className="btn" style={{ background: '#c45525', borderColor: '#c45525' }}>
            Explore Indian Stamps (5 Categories) →
          </Link>
          <Link to="/stamps/world-stamps" className="btn light" style={{ borderColor: '#1e6b4f', color: '#1e6b4f' }}>
            Explore World Stamps →
          </Link>
          <Link to="/stamps" className="btn ghost">
            View All Products
          </Link>
        </div>
      )}
    </div>
  );
}

export function TrackPage() {
  const [form, setForm] = useState({ order_number: '', email: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useMeta('Track an order');
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await api(`/api/track?order_number=${encodeURIComponent(form.order_number)}&email=${encodeURIComponent(form.email)}`);
      setResult(data);
    } catch (err) { setResult(null); setError(err.message); }
  }
  return (
    <div className="wrap" style={{ maxWidth: 680, padding: '28px 0 48px' }}>
      <h1>Track an order</h1>
      <p style={{ color: 'var(--muted)', margin: '8px 0 16px' }}>Use the order number and the email on the account.</p>
      <form onSubmit={submit}>
        <label className="field"><span>Order number</span><input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} required /></label>
        <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">Look up</button>
      </form>
      {result && (
        <div className="panel" style={{ marginTop: 18 }}>
          <strong>{result.order.order_number}</strong>
          <p className="status">{result.order.status.replaceAll('_', ' ')}</p>
          <ul className="timeline">
            {result.history.map((step) => (
              <li key={step.created_at + step.to_status}><span className="dot" /><div><strong>{step.to_status.replaceAll('_', ' ')}</strong><br /><small>{new Date(step.created_at).toLocaleString('en-IN')}</small></div></li>
            ))}
          </ul>
          {result.shipping?.tracking_number && <p>Tracking {result.shipping.tracking_number} {result.shipping.courier ? `· ${result.shipping.courier}` : ''}</p>}
        </div>
      )}
    </div>
  );
}
