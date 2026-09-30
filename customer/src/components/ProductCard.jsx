import { Link } from 'react-router-dom';

export default function ProductCard({ product }) {
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : null;

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="img-wrap">
        <img src={product.image_url || '/placeholder-stamp.svg'} alt={product.name} loading="lazy" />
      </div>
      <div className="info">
        <h3>{product.name}</h3>
        <div className="meta">{product.stamp_country} · {product.stamp_year}</div>
        <div>
          <span className="price">₹</span>
        </div>
      </div>
    </Link>
  );
}
