import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, discountOf, inr, media } from '../api';
import { ProductCard, Stars, State, useAuth, useMeta } from '../shell';

export default function ProductPage() {
  const { slug } = useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [image, setImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [note, setNote] = useState('');
  const [review, setReview] = useState({ rating: 5, title: '', body: '' });

  function load() {
    setError('');
    setData(null);
    api(`/api/products/${slug}`).then((res) => {
      setData(res);
      const viewed = JSON.parse(localStorage.getItem('folio_viewed') || '[]').filter((item) => item.slug !== res.product.slug);
      localStorage.setItem('folio_viewed', JSON.stringify([res.product, ...viewed].slice(0, 8)));
    }).catch((err) => setError(err.message));
  }
  useEffect(() => {
    window.scrollTo(0, 0);
    load();
  }, [slug]);
  useMeta(data?.product?.name, data?.product?.short_description);

  if (error) return <div className="wrap"><State error onRetry={load} /></div>;
  if (!data) return <div className="wrap section"><State loading /></div>;
  const product = data.product;
  const off = discountOf(product.price, product.sale_price);
  const current = product.images[image] || { url: product.image, alt_text: product.name };

  async function add(buyNow) {
    if (!auth.user) {
      auth.requireAuth({
        type: buyNow ? 'buy_now' : 'cart',
        product_id: product.id,
        quantity: qty,
        product_slug: product.slug,
      }, `/product/${product.slug}`);
      return;
    }
    try {
      await api('/api/cart/items', { method: 'POST', body: { product_id: product.id, quantity: qty } });
      auth.refreshCart();
      if (buyNow) navigate('/checkout');
      else setNote('Added to the cart.');
    } catch (err) { setNote(err.message); }
  }

  async function wish() {
    if (!auth.user) {
      auth.requireAuth({
        type: 'wishlist',
        product_id: product.id,
        product_slug: product.slug,
      }, `/product/${product.slug}`);
      return;
    }
    try {
      if (product.wished) await api(`/api/wishlist/items/${product.id}`, { method: 'DELETE' });
      else await api('/api/wishlist/items', { method: 'POST', body: { product_id: product.id } });
      load();
    } catch (err) { setNote(err.message); }
  }

  async function sendReview(event) {
    event.preventDefault();
    if (!auth.user) {
      auth.requireAuth(null, `/product/${product.slug}`);
      return;
    }
    const form = new FormData();
    form.set('product_id', String(product.id));
    form.set('rating', String(review.rating));
    form.set('title', review.title);
    form.set('body', review.body);
    try {
      await api('/api/reviews', { method: 'POST', form });
      setNote('Review sent to the desk.');
    } catch (err) { setNote(err.message); }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    image: current.url,
    description: product.short_description,
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: product.effective_price, availability: product.available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
  };

  const facts = [
    ['Country', product.country], ['Issue year', product.issue_year], ['Denomination', product.denomination],
    ['Type', product.stamp_type], ['Condition', product.condition], ['Grade', product.grade],
    ['Rarity', product.rarity], ['Collection', product.collection_name], ['Catalogue', product.catalogue_number],
  ];

  return (
    <div className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs">
        <Link to="/">Home</Link> / <Link to={`/stamps/${product.category_slug}`}>{product.category_name}</Link> / <Link to={`/stamps/${product.category_slug}/${product.subcategory_slug}`}>{product.subcategory_name}</Link> / {product.name}
      </nav>
      <article className="product">
        <div className="gallery">
          <button className="stage" onClick={() => setZoom(true)} aria-label="Zoom image"><img src={media(current.url)} alt={current.alt_text || product.name} /></button>
          <div className="thumbs">
            {product.images.map((item, index) => (
              <button key={item.id} className={index === image ? 'on' : ''} onClick={() => setImage(index)}><img src={media(item.url)} alt={item.alt_text || ''} /></button>
            ))}
          </div>
        </div>
        <div>
          <div className="kicker">{product.category_name} · {product.subcategory_name}</div>
          <h1>{product.name}</h1>
          <Stars value={product.rating} />
          <div className="price-lg">
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{inr(product.effective_price)}</span>
            {off > 0 && <s>{inr(product.price)}</s>}
            {off > 0 && <span className="chip" style={{ background: '#fce8e6', color: 'var(--sale)', borderColor: 'transparent', marginLeft: 8, fontSize: 12 }}>{off}% OFF</span>}
          </div>
          <p>{product.available <= 0 ? 'Out of stock' : product.availability === 'low_stock' ? `Only ${product.available} left in the cabinet` : `${product.available} available`}</p>
          <p style={{ margin: '12px 0' }}>{product.short_description}</p>
          <div className="meta-grid">
            <div><small>SKU</small>{product.sku}</div>
            <div><small>Catalogue</small>{product.catalogue_number || '—'}</div>
          </div>
          <div className="buy-row">
            <div className="qty" aria-label="Quantity">
              <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((n) => Math.min(product.available || 1, n + 1))} aria-label="Increase">+</button>
            </div>
            <button className="btn" disabled={product.available < 1} onClick={() => add(false)}>Add to cart</button>
            <button className="btn light" disabled={product.available < 1} onClick={() => add(true)}>Buy now</button>
            <button className="btn ghost" onClick={wish}>{product.wished ? 'Saved' : 'Wishlist'}</button>
            <button className="btn ghost" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => setNote('Link copied.'))}>Share</button>
          </div>
          {note && <p className="note">{note}</p>}
          <div className="meta-grid" style={{ marginTop: 18 }}>
            {facts.filter(([, value]) => value).map(([label, value]) => <div key={label}><small>{label}</small>{value}</div>)}
          </div>
          {product.tags?.length > 0 && <p style={{ marginTop: 8 }}>{product.tags.map((tag) => <span key={tag} className="chip" style={{ marginRight: 6 }}>{tag}</span>)}</p>}
        </div>
      </article>
      <section className="specs">
        <div className="panel"><h2>Description</h2><p style={{ marginTop: 8 }}>{product.description}</p></div>
        <div className="panel">
          <h2>Specifications</h2>
          {product.attributes?.map((attr) => <div className="sum-row" key={attr.attr_name}><span>{attr.attr_name}</span><span>{attr.attr_value}</span></div>)}
        </div>
      </section>
      <section className="section">
        <h2>Reviews</h2>
        {data.reviews.length === 0 && <p className="state">No approved reviews yet.</p>}
        <div className="review-row" style={{ marginTop: 12 }}>
          {data.reviews.map((item) => (
            <article key={item.id} className="review"><strong>{item.full_name}</strong><Stars value={item.rating} /><p>{item.body}</p></article>
          ))}
        </div>
        {product.can_review && (
          <form className="panel" style={{ marginTop: 16 }} onSubmit={sendReview}>
            <h3>Write a note</h3>
            <label className="field"><span>Rating</span>
              <select value={review.rating} onChange={(e) => setReview({ ...review, rating: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select>
            </label>
            <label className="field"><span>Title</span><input value={review.title} onChange={(e) => setReview({ ...review, title: e.target.value })} /></label>
            <label className="field"><span>Review</span><textarea rows={4} value={review.body} onChange={(e) => setReview({ ...review, body: e.target.value })} required /></label>
            <button className="btn" type="submit">Submit for review</button>
          </form>
        )}
      </section>
      {data.related.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Related stamps</h2></div>
          <div className="rail">{data.related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
        </section>
      )}
      {zoom && <div className="lightbox" onClick={() => setZoom(false)}><img src={current.url} alt={product.name} /></div>}
    </div>
  );
}
