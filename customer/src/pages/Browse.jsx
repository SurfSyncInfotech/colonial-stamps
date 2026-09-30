import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { ProductCard, State, useMeta } from '../shell';

const sorts = [
  ['newest', 'Newest'],
  ['price_asc', 'Price, low to high'],
  ['price_desc', 'Price, high to low'],
  ['popular', 'Popular'],
  ['bestselling', 'Best selling'],
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
  return (
    <header className="page-intro">
      {item.image && <img src={item.image} alt="" />}
      <div>
        <h1>{item.name}</h1>
        <p>{item.description}</p>
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
  useMeta(locked.category ? '' : (query ? `Search: ${query}` : 'Shop stamps'), locked.category ? '' : 'Browse the Folio cabinet by country, year, condition, and rarity.');

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
      <h3>Price</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <input aria-label="Minimum price" type="number" placeholder="Min" defaultValue={params.get('min_price') || ''} onBlur={(e) => set('min_price', e.target.value)} />
        <input aria-label="Maximum price" type="number" placeholder="Max" defaultValue={params.get('max_price') || ''} onBlur={(e) => set('max_price', e.target.value)} />
      </div>
      <h3>Availability</h3>
      {[['','Any'], ['in_stock','In stock'], ['low_stock','Low stock'], ['out_of_stock','Out of stock']].map(([value, label]) => (
        <label key={label}><input type="radio" name="availability" checked={(params.get('availability') || '') === value} onChange={() => set('availability', value)} />{label}</label>
      ))}
      {!locked.category && (
        <>
          <h3>Category</h3>
          {categories.map((category) => (
            <label key={category.id}><input type="radio" name="cat" checked={params.get('category') === category.slug} onChange={() => set('category', category.slug)} />{category.name}</label>
          ))}
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

export function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/api/cms/${slug}`).then((res) => setPage(res.page)).catch((err) => setError(err.message));
  }, [slug]);
  useMeta(page?.seo_title || page?.title, page?.seo_description);
  if (error) return <div className="wrap"><State error /></div>;
  if (!page) return <div className="wrap"><State loading /></div>;
  return (
    <div className="wrap" style={{ padding: '24px 0 48px', maxWidth: 760 }}>
      <h1 style={{ fontSize: 48 }}>{page.title}</h1>
      {page.content.split('\n').filter(Boolean).map((para) => <p key={para} style={{ marginTop: 14 }}>{para}</p>)}
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
