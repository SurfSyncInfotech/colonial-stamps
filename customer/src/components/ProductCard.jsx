import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : null;

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="img-wrap">
        {discount && <span className="discount-badge">-{discount}%</span>}
        <img src={product.image_url || '/placeholder-stamp.svg'} alt={product.name} loading="lazy" />
      </div>
      <div className="info">
        <h3>{product.name}</h3>
        <div className="meta">{product.stamp_country} · {product.stamp_year}</div>
        <div>
          <span className="price">₹{Number(product.price).toLocaleString('en-IN')}</span>
          {product.compare_at_price && (
            <span className="compare">₹{Number(product.compare_at_price).toLocaleString('en-IN')}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
