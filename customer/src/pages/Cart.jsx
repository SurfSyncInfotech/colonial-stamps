import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { useCart } from '../context/CartContext';
import { cartApi } from '../api/client';

export default function Cart() {
  const { cart, refresh, updateQty } = useCart();
  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  const applyCoupon = async () => {
    try {
      await cartApi.applyCoupon(coupon);
      await refresh();
      setError('');
    } catch (e) { setError(e.message); }
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout title="Shopping Cart">
      <div className="container section">
        <h1 className="section-title">Your Cart</h1>
        {!cart?.items?.length ? (
          <EmptyState title="Cart is empty" message="Discover our curated stamp collection." action={<Link to="/stamps" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>Shop Stamps</Link>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
            <table className="cart-table">
              <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/product/${item.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={item.imageUrl} alt="" style={{ width: 60, height: 72, objectFit: 'contain' }} />
                        {item.name}
                      </Link>
                    </td>
                    <td>₹{item.price.toLocaleString('en-IN')}</td>
                    <td>
                      <select value={item.quantity} onChange={(e) => updateQty(item.id, +e.target.value)}>
                        {[...Array(Math.min(10, item.availableStock + item.quantity))].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                      </select>
                    </td>
                    <td>₹{item.lineTotal.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="cart-summary">
              <h3 style={{ fontFamily: 'var(--serif)', marginBottom: 16 }}>Order Summary</h3>
              <div className="row"><span>Subtotal</span><span>₹{cart.subtotal.toLocaleString('en-IN')}</span></div>
              {cart.discountAmount > 0 && <div className="row"><span>Discount</span><span>-₹{cart.discountAmount.toLocaleString('en-IN')}</span></div>}
              <div className="row"><span>GST (18%)</span><span>₹{cart.taxAmount.toLocaleString('en-IN')}</span></div>
              <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
                <input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid var(--border)' }} />
                <button className="btn btn-outline" onClick={applyCoupon}>Apply</button>
              </div>
              {error && <p className="error-msg">{error}</p>}
              {cart.coupon && <p className="success-msg">Coupon {cart.coupon.code} applied</p>}
              <div className="row total"><span>Total</span><span>₹{(cart.subtotal - cart.discountAmount + cart.taxAmount).toLocaleString('en-IN')}</span></div>
              <Link to="/checkout" className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>Proceed to Checkout</Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
