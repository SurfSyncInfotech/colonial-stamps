import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import { catalogApi, accountApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    catalogApi.product(slug).then((res) => setProduct(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  const handleAdd = async () => {
    try {
      await addToCart(product.id, qty);
      setMsg('Added to cart');
    } catch (e) { setMsg(e.message); }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) return;
    try {
      await accountApi.addWishlist(product.id);
      setMsg('Added to wishlist');
    } catch (e) { setMsg(e.message); }
  };

  if (loading) return <Layout><Loading /></Layout>;
  if (!product) return <Layout><EmptyState title="Product not found" message="This stamp may no longer be available." /></Layout>;

  const img = product.images?.[0]?.image_url;
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100) : null;

  return (
    <Layout title={product.name} description={product.short_description || product.description}>
      <div className="container">
        <div className="breadcrumbs">
          <Link to="/">Home</Link><span>/</span>
          <Link to={`/stamps/${product.category_slug}`}>{product.category_name}</Link><span>/</span>
          <Link to={`/stamps/${product.category_slug}/${product.subcategory_slug}`}>{product.subcategory_name}</Link><span>/</span>
          <span>{product.name}</span>
        </div>
        <div className="pdp-grid">
          <div className="pdp-image" onClick={() => setZoomed(!zoomed)}>
            <img src={img} alt={product.name} style={zoomed ? { transform: 'scale(1.5)', transition: '0.3s' } : {}} />
          </div>
          <div className="pdp-info">
            <h1>{product.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{product.stamp_country} · {product.stamp_year} · {product.stamp_condition?.replace('_', ' ')}</p>
            <div className="pdp-price">
              ₹
            </div>
            <p style={{ marginBottom: 16 }}>{product.short_description}</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <label>Qty:</label>
              <select value={qty} onChange={(e) => setQty(+e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)' }}>
                {[...Array(Math.min(10, product.stock))].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
              </select>
              <span style={{ fontSize: '0.85rem', color: product.stock > 0 ? 'var(--forest)' : 'var(--sale)' }}>
                {product.stock > 0 ? `${product.stock - product.reserved_stock} available` : 'Out of stock'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={product.stock <= 0}>Add to Cart</button>
              <Link to="/checkout" className="btn btn-sale" onClick={handleAdd}>Buy Now</Link>
              {isAuthenticated && <button className="btn btn-outline" onClick={handleWishlist}>Wishlist</button>}
            </div>
            {msg && <p className="success-msg">{msg}</p>}
            <table className="specs-table">
              <tbody>
                <tr><td>SKU</td><td>{product.sku}</td></tr>
                <tr><td>Year</td><td>{product.stamp_year}</td></tr>
                <tr><td>Country</td><td>{product.stamp_country}</td></tr>
                <tr><td>Condition</td><td>{product.stamp_condition}</td></tr>
                <tr><td>Theme</td><td>{product.stamp_theme}</td></tr>
                {product.stamp_catalog_ref && <tr><td>Catalog Ref</td><td>{product.stamp_catalog_ref}</td></tr>}
              </tbody>
            </table>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{product.description}</p>
          </div>
        </div>

        {product.reviews?.length > 0 && (
          <section className="section">
            <h2 className="section-title">Reviews</h2>
            {product.reviews.map((r) => (
              <div key={r.id} className="review-card">
                <div className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                <strong>{r.title}</strong>
                <p style={{ fontSize: '0.85rem', marginTop: 4 }}>{r.body}</p>
                <small style={{ color: 'var(--text-muted)' }}>— {r.customer_name}</small>
              </div>
            ))}
          </section>
        )}

        {product.related?.length > 0 && (
          <section className="section">
            <h2 className="section-title">Related Stamps</h2>
            <div className="product-grid">{product.related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>
        )}
      </div>
    </Layout>
  );
}

function EmptyState({ title, message }) {
  return <div className="empty-state"><h3>{title}</h3><p>{message}</p></div>;
}
