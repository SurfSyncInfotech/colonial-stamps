import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { accountApi, catalogApi, cartApi } from '../api/client';

const STEPS = ['Address', 'Delivery', 'Payment', 'Review'];

export default function Checkout() {
  const { isAuthenticated } = useAuth();
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [shipping, setShipping] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [selectedShip, setSelectedShip] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('dummy_card');
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login?redirect=/checkout'); return; }
    Promise.all([accountApi.addresses(), catalogApi.shipping(), refresh()])
      .then(([addr, ship]) => {
        setAddresses(addr.data || []);
        setShipping(ship.data || []);
        const def = addr.data?.find((a) => a.is_default);
        if (def) setSelectedAddr(def.id);
      }).finally(() => setLoading(false));
  }, [isAuthenticated, navigate, refresh]);

  const nextStep = async () => {
    setError('');
    if (step === 1 && selectedShip) {
      const est = await cartApi.shippingEstimate(selectedShip);
      setEstimate(est.data);
    }
    if (step === 3) {
      try {
        const res = await accountApi.placeOrder({
          addressId: selectedAddr,
          shippingMethodId: selectedShip,
          paymentMethod,
        });
        setOrderResult(res.data);
        setStep(4);
        return;
      } catch (e) { setError(e.message); return; }
    }
    setStep(step + 1);
  };

  if (loading) return <Layout><Loading /></Layout>;

  if (step === 4 && orderResult) {
    return (
      <Layout title="Order Confirmed">
        <div className="container section" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Thank You!</h1>
          <p>Order <strong>{orderResult.orderNumber}</strong> confirmed.</p>
          <p>Total: ₹</p>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/account/orders')}>View Orders</button>
        </div>
      </Layout>
    );
  }

  const total = estimate ? estimate.total : (cart ? cart.subtotal - cart.discountAmount + cart.taxAmount : 0);

  return (
    <Layout title="Checkout">
      <div className="container section">
        <h1 className="section-title">Checkout</h1>
        <div className="checkout-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`checkout-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>{s}</div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Select Address</h3>
            {addresses.length ? addresses.map((a) => (
              <label key={a.id} style={{ display: 'block', padding: 16, border: '1px solid var(--border)', marginBottom: 8, cursor: 'pointer', background: selectedAddr === a.id ? 'var(--cream)' : 'white' }}>
                <input type="radio" name="addr" checked={selectedAddr === a.id} onChange={() => setSelectedAddr(a.id)} style={{ marginRight: 8 }} />
                <strong>{a.full_name}</strong> — {a.address_line1}, {a.city}, {a.state} {a.pincode}
              </label>
            )) : <p>No saved addresses. <a href="/account/addresses">Add one</a></p>}
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Delivery Method</h3>
            {shipping.map((s) => (
              <label key={s.id} style={{ display: 'block', padding: 16, border: '1px solid var(--border)', marginBottom: 8, cursor: 'pointer' }}>
                <input type="radio" name="ship" checked={selectedShip === s.id} onChange={() => setSelectedShip(s.id)} style={{ marginRight: 8 }} />
                <strong>{s.name}</strong> — ₹ · {s.estimated_days_min}-{s.estimated_days_max} days
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Payment</h3>
            <label style={{ display: 'block', padding: 16, border: '1px solid var(--border)', marginBottom: 8 }}>
              <input type="radio" checked={paymentMethod === 'dummy_card'} onChange={() => setPaymentMethod('dummy_card')} style={{ marginRight: 8 }} />
              Credit / Debit Card (Demo)
            </label>
            <label style={{ display: 'block', padding: 16, border: '1px solid var(--border)' }}>
              <input type="radio" checked={paymentMethod === 'dummy_upi'} onChange={() => setPaymentMethod('dummy_upi')} style={{ marginRight: 8 }} />
              UPI (Demo)
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="cart-summary" style={{ maxWidth: 480 }}>
            <h3 style={{ fontFamily: 'var(--serif)', marginBottom: 16 }}>Review Order</h3>
            {cart?.items?.map((i) => <div key={i.id} className="row"><span>{i.name} × {i.quantity}</span><span>₹</span></div>)}
            <div className="row"><span>Subtotal</span><span>₹</span></div>
            {cart?.discountAmount > 0 && <div className="row"><span>Discount</span><span>₹</span></div>}
            <div className="row"><span>GST</span><span>₹</span></div>
            {estimate && <div className="row"><span>Shipping</span><span>₹</span></div>}
            <div className="row total"><span>Total</span><span>₹</span></div>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          {step > 0 && step < 4 && <button className="btn btn-outline" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 4 && (
            <button className="btn btn-primary" onClick={nextStep}
              disabled={(step === 0 && !selectedAddr) || (step === 1 && !selectedShip)}>
              {step === 3 ? 'Place Order' : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
