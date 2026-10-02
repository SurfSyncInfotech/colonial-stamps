import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, KeyRound, ShieldCheck, CheckCircle2, Lock, Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { api, inr, media } from '../api';
import { State, useAuth, useMeta } from '../shell';

export function CartPage() {
  const auth = useAuth();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useMeta('Your Cart');

  function load() {
    setError('');
    api('/api/cart')
      .then((data) => {
        setCart(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    if (auth.user) load();
  }, [auth.user]);

  if (!auth.user) {
    return (
      <div className="wrap" style={{ padding: '60px 0', maxWidth: 560, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 16px', background: 'var(--sage)', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 32, marginBottom: 10 }}>Sign in to view your cart</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
          Your philatelic cart is securely tied to your collector account so your selected items remain safely reserved across your devices.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link className="btn" to="/login?redirect=/cart">Sign in</Link>
          <Link className="btn ghost" to="/signup?redirect=/cart">Create account</Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="wrap section"><State loading /></div>;
  if (error) return <div className="wrap section"><State error onRetry={load} /></div>;
  if (!cart || cart.items.length === 0) {
    return (
      <div className="wrap" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>Your cart is empty</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Explore rare historical issues, mint sheets, and postal covers.</p>
        <Link className="btn" to="/stamps">Browse stamps</Link>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.effective_price * item.quantity, 0);

  async function update(id, quantity) {
    try {
      const updated = await api(`/api/cart/items/${id}`, { method: 'PUT', body: { quantity } });
      setCart(updated);
      auth.refreshCart();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    try {
      const updated = await api(`/api/cart/items/${id}`, { method: 'DELETE' });
      setCart(updated);
      auth.refreshCart();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>Shopping Cart ({cart.items.length} {cart.items.length === 1 ? 'item' : 'items'})</h1>
      <div className="cart-layout">
        <div className="panel" style={{ padding: '0 20px' }}>
          {cart.items.map((item) => (
            <div className="line" key={item.cart_item_id} style={{ alignItems: 'center', padding: '18px 0' }}>
              <div
                style={{
                  width: 96,
                  height: 84,
                  borderRadius: 10,
                  border: '1px solid #e2ece9',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  flexShrink: 0
                }}
              >
                <img
                  src={media(item.image)}
                  alt={item.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>
              <div>
                <Link to={`/product/${item.slug}`} style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  {item.name}
                </Link>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Price: <strong>{inr(item.effective_price)}</strong> {item.available < 1 ? <span style={{ color: 'var(--sale)', marginLeft: 8 }}>Out of stock</span> : null}
                </p>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 10 }}>
                  <div className="qty">
                    <button type="button" aria-label="Decrease" onClick={() => update(item.cart_item_id || item.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label="Increase" onClick={() => update(item.cart_item_id || item.id, item.quantity + 1)} disabled={item.quantity >= (item.available || 99)}>+</button>
                  </div>
                  <button type="button" className="btn ghost" style={{ padding: '4px 10px', fontSize: 13 }} onClick={() => remove(item.cart_item_id || item.id)}>Remove</button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: 17, color: 'var(--ink)' }}>{inr(item.effective_price * item.quantity)}</strong>
              </div>
            </div>
          ))}
        </div>
        <aside className="summary" style={{ alignSelf: 'start', position: 'sticky', top: 20 }}>
          <h2 style={{ fontSize: 20, marginBottom: 14 }}>Order Summary</h2>
          <div className="sum-row"><span>Item Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="sum-row"><span>Estimated Shipping</span><span style={{ color: 'var(--ink)' }}>Calculated at checkout</span></div>
          <div className="sum-row"><span>Estimated Tax</span><span style={{ color: 'var(--ink)' }}>Included</span></div>
          <div className="sum-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 8, fontSize: 17 }}>
            <strong>Subtotal</strong>
            <strong style={{ color: 'var(--ink)' }}>{inr(subtotal)}</strong>
          </div>
          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
          <Link className="btn" to="/checkout" style={{ width: '100%', marginTop: 16, textAlign: 'center' }}>
            Proceed to Checkout
          </Link>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12, textAlign: 'center', lineHeight: 1.4 }}>
            Insured tamper-evident dispatch with authenticity certificate.
          </p>
        </aside>
      </div>
    </div>
  );
}

export function WishlistPage() {
  const auth = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useMeta('Wishlist');

  function load() {
    api('/api/wishlist').then((res) => setItems(res.data)).catch((err) => setError(err.message));
  }

  useEffect(() => {
    if (auth.user) load();
  }, [auth.user]);

  if (!auth.user) {
    return (
      <div className="wrap" style={{ padding: '60px 0', maxWidth: 560, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, marginBottom: 10 }}>Sign in to view your wishlist</h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 24 }}>
          Save rare pieces and track collection availability with your account.
        </p>
        <Link className="btn" to="/login?redirect=/wishlist">Sign in</Link>
      </div>
    );
  }

  if (error) return <div className="wrap section"><State error onRetry={load} /></div>;
  if (!items) return <div className="wrap section"><State loading /></div>;

  return (
    <div className="wrap" style={{ padding: '24px 0 48px' }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>Saved Items ({items.length})</h1>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--muted)', marginBottom: 20 }}>No items saved to your wishlist yet.</p>
          <Link className="btn" to="/stamps">Explore stamps</Link>
        </div>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <article key={item.id} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <img src={media(item.image)} alt={item.name} style={{ height: 180, margin: '0 auto 12px', objectFit: 'contain' }} />
                <h3 style={{ fontFamily: 'var(--sans)', fontSize: 16, fontWeight: 600 }}>{item.name}</h3>
                <p style={{ marginTop: 4, color: 'var(--muted)', fontSize: 14 }}>
                  <strong style={{ color: 'var(--ink)' }}>{inr(item.effective_price)}</strong> · {item.available > 0 ? `${item.available} in stock` : 'Out of stock'}
                </p>
              </div>
              <div className="buy-row" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="btn"
                  disabled={item.available < 1}
                  onClick={() => api(`/api/wishlist/items/${item.id}/move`, { method: 'POST' }).then(() => { auth.refreshCart(); load(); })}
                >
                  Move to cart
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => api(`/api/wishlist/items/${item.id}`, { method: 'DELETE' }).then(load)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyAddress = {
  full_name: '',
  phone: '',
  address_line: '',
  apartment: '',
  area: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  address_type: 'home',
  is_default: false,
};

export function CheckoutPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addrForm, setAddrForm] = useState(emptyAddress);
  const [addrError, setAddrError] = useState('');
  const [addrSaving, setAddrSaving] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [methods, setMethods] = useState([]);
  const [methodId, setMethodId] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState(null);
  const [payment, setPayment] = useState('card');
  const [note, setNote] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  useMeta('Checkout');

  useEffect(() => {
    if (!auth.user) return;
    setAddrForm((f) => ({ ...f, full_name: auth.user.full_name || '', phone: auth.user.mobile || '' }));
    api('/api/addresses').then((res) => {
      setAddresses(res.data);
      if (res.data.length > 0) {
        const def = res.data.find((a) => a.is_default) || res.data[0];
        setAddressId(def.id);
        setShowAddForm(false);
      } else {
        setShowAddForm(true);
      }
    }).catch((err) => setError(err.message));

    api('/api/shipping/methods').then((res) => {
      setMethods(res.methods);
      if (res.methods[0]) setMethodId(res.methods[0].id);
    }).catch(() => {});
  }, [auth.user]);

  useEffect(() => {
    if (!auth.user || !methodId) return;
    api('/api/checkout/quote', { method: 'POST', body: { shipping_method_id: methodId, coupon_code: coupon || null } })
      .then((res) => setQuote(res.quote))
      .catch((err) => setError(err.message));
  }, [auth.user, methodId, coupon, step]);

  if (!auth.user) {
    return (
      <div className="wrap" style={{ padding: '60px 0', maxWidth: 560, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>Sign in to Checkout</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Please sign in to your collector account to complete this order.</p>
        <Link className="btn" to="/login?redirect=/checkout">Sign in</Link>
      </div>
    );
  }

  const stepLabels = ['Delivery Address', 'Shipping Method', 'Payment & Coupon', 'Review & Place'];

  async function handleSaveNewAddress(e) {
    e.preventDefault();
    setAddrError('');
    if (!/^[6-9]\d{9}$/.test(addrForm.phone.replace(/\D/g, '').slice(-10))) {
      return setAddrError('Please enter a valid 10-digit Indian mobile number.');
    }
    if (!/^\d{6}$/.test(addrForm.pincode.trim())) {
      return setAddrError('Please enter a valid 6-digit Indian PIN code.');
    }
    setAddrSaving(true);
    try {
      const created = await api('/api/addresses', {
        method: 'POST',
        body: {
          ...addrForm,
          is_default: addresses.length === 0 ? true : addrForm.is_default,
        },
      });
      const res = await api('/api/addresses');
      setAddresses(res.data);
      setAddressId(created.id);
      setShowAddForm(false);
      setAddrForm(emptyAddress);
    } catch (err) {
      setAddrError(err.message);
    } finally {
      setAddrSaving(false);
    }
  }

  async function place() {
    setError('');
    setPlacing(true);
    try {
      const order = await api('/api/orders', {
        method: 'POST',
        body: {
          address_id: addressId,
          billing_same: billingSame,
          shipping_method_id: methodId,
          coupon_code: quote?.coupon ? coupon : null,
          payment_method: payment,
          customer_note: note,
          terms_accepted: true,
        },
      });
      auth.refreshCart();
      navigate(`/confirmation/${order.order_id}`, { state: order });
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  const selectedAddress = addresses.find((a) => a.id === addressId);

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Checkout</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Secure Order & Certificate of Authenticity Dispatch</p>

      <div className="steps" style={{ marginBottom: 24 }}>
        {stepLabels.map((label, index) => (
          <span key={label} className={index === step ? 'on' : ''} style={{ cursor: index < step ? 'pointer' : 'default' }} onClick={() => index < step && setStep(index)}>
            {index + 1}. {label}
          </span>
        ))}
      </div>

      <div className="check-layout">
        <div>
          {/* STEP 0: ADDRESS */}
          {step === 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 20 }}>Select Delivery Address</h2>
                {addresses.length > 0 && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ fontSize: 13, padding: '6px 12px' }}
                    onClick={() => setShowAddForm((v) => !v)}
                  >
                    {showAddForm ? 'Cancel' : '+ Add New Address'}
                  </button>
                )}
              </div>

              {!showAddForm && addresses.map((address) => (
                <label
                  key={address.id}
                  className={`addr ${addressId === address.id ? 'on' : ''}`}
                  style={{ display: 'block', cursor: 'pointer', padding: 16, marginBottom: 12, border: addressId === address.id ? '2px solid var(--ink)' : '1px solid var(--line)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="radio"
                        name="addr"
                        checked={addressId === address.id}
                        onChange={() => setAddressId(address.id)}
                        style={{ width: 18, height: 18, accentColor: 'var(--ink)' }}
                      />
                      <strong style={{ fontSize: 16 }}>{address.full_name}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="chip" style={{ textTransform: 'capitalize', fontSize: 11, padding: '3px 8px' }}>
                        {address.address_type || 'Home'}
                      </span>
                      {address.is_default ? (
                        <span className="chip on" style={{ fontSize: 11, padding: '3px 8px', background: 'var(--sage)', color: 'var(--text)', borderColor: 'var(--ink)' }}>
                          Default
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p style={{ margin: '8px 0 4px 28px', color: 'var(--text)', fontSize: 14 }}>
                    {address.address_line_1 || address.address_line}
                    {(address.address_line_2 || address.apartment) ? `, ${address.address_line_2 || address.apartment}` : ''}
                    {address.landmark ? ` (Landmark: ${address.landmark})` : ''}
                    <br />
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p style={{ margin: '4px 0 0 28px', color: 'var(--muted)', fontSize: 13 }}>
                    Mobile: {address.phone || address.mobile}
                  </p>
                </label>
              ))}

              {showAddForm && (
                <form onSubmit={handleSaveNewAddress} className="panel" style={{ padding: 20, marginBottom: 16, border: '1.5px solid var(--ink)' }}>
                  <h3 style={{ fontSize: 18, marginBottom: 16 }}>Add New Delivery Address</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label className="field">
                      <span>Full Name *</span>
                      <input value={addrForm.full_name} onChange={(e) => setAddrForm({ ...addrForm, full_name: e.target.value })} placeholder="Full Name" required />
                    </label>
                    <label className="field">
                      <span>10-Digit Mobile Number *</span>
                      <input value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} placeholder="9876543210" required />
                    </label>
                  </div>
                  <label className="field">
                    <span>House / Flat / Street (Address Line 1) *</span>
                    <input value={addrForm.address_line} onChange={(e) => setAddrForm({ ...addrForm, address_line: e.target.value })} placeholder="House/Flat No., Building Name, Street" required />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label className="field">
                      <span>Apartment / Suite (Address Line 2)</span>
                      <input value={addrForm.apartment} onChange={(e) => setAddrForm({ ...addrForm, apartment: e.target.value })} placeholder="Apartment / Unit (Optional)" />
                    </label>
                    <label className="field">
                      <span>Landmark</span>
                      <input value={addrForm.landmark} onChange={(e) => setAddrForm({ ...addrForm, landmark: e.target.value })} placeholder="Near Post Office, Opposite Park" />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <label className="field">
                      <span>City *</span>
                      <input value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} placeholder="City" required />
                    </label>
                    <label className="field">
                      <span>State *</span>
                      <input value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} placeholder="State" required />
                    </label>
                    <label className="field">
                      <span>PIN Code *</span>
                      <input value={addrForm.pincode} onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })} placeholder="6-digit PIN" maxLength={6} required />
                    </label>
                  </div>
                  <div style={{ margin: '12px 0' }}>
                    <span style={{ fontSize: 13, color: '#3d3832', display: 'block', marginBottom: 6 }}>Address Type:</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {['home', 'work', 'other'].map((type) => (
                        <label key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', textTransform: 'capitalize' }}>
                          <input type="radio" name="addr_type" checked={addrForm.address_type === type} onChange={() => setAddrForm({ ...addrForm, address_type: type })} />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
                    <input type="checkbox" checked={addrForm.is_default} onChange={(e) => setAddrForm({ ...addrForm, is_default: e.target.checked })} />
                    Set as default address
                  </label>
                  {addrError && <p className="error" style={{ marginBottom: 12 }}>{addrError}</p>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn" type="submit" disabled={addrSaving}>{addrSaving ? 'Saving...' : 'Save & Deliver Here'}</button>
                    {addresses.length > 0 && <button className="btn ghost" type="button" onClick={() => setShowAddForm(false)}>Cancel</button>}
                  </div>
                </form>
              )}

              <label style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'center' }}>
                <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />
                Billing address matches delivery address
              </label>
              <button className="btn" style={{ minWidth: 180 }} disabled={!addressId} onClick={() => setStep(1)}>
                Continue to Delivery
              </button>
            </div>
          )}

          {/* STEP 1: DELIVERY METHOD */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 20, marginBottom: 14 }}>Select Dispatch Method</h2>
              {methods.map((method) => (
                <label
                  key={method.id}
                  className={`addr ${methodId === method.id ? 'on' : ''}`}
                  style={{ display: 'block', cursor: 'pointer', padding: 16, marginBottom: 12, border: methodId === method.id ? '2px solid var(--ink)' : '1px solid var(--line)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="radio"
                        name="ship"
                        checked={methodId === method.id}
                        onChange={() => setMethodId(method.id)}
                        style={{ width: 18, height: 18, accentColor: 'var(--ink)' }}
                      />
                      <strong style={{ fontSize: 16 }}>{method.name}</strong>
                    </div>
                    <strong style={{ color: 'var(--ink)' }}>{method.charge === 0 ? 'FREE' : inr(method.charge)}</strong>
                  </div>
                  <p style={{ margin: '6px 0 0 28px', color: 'var(--muted)', fontSize: 13 }}>
                    {method.description} · <em>{method.eta_label}</em>
                  </p>
                </label>
              ))}
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
                <button className="btn" onClick={() => setStep(2)}>Continue to Payment</button>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT & COUPON */}
          {step === 2 && (
            <div className="panel" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 20, marginBottom: 14 }}>Payment Option</h2>
              {['card', 'upi', 'cod'].map((method) => (
                <label
                  key={method}
                  className={`addr ${payment === method ? 'on' : ''}`}
                  style={{ display: 'block', cursor: 'pointer', padding: 14, marginBottom: 10, border: payment === method ? '2px solid var(--ink)' : '1px solid var(--line)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      name="pay"
                      checked={payment === method}
                      onChange={() => setPayment(method)}
                      style={{ width: 18, height: 18, accentColor: 'var(--ink)' }}
                    />
                    <strong>
                      {method === 'card' ? 'Credit / Debit Card / NetBanking' : method === 'upi' ? 'UPI (Instant QR / VPA)' : 'Cash on Delivery (Verified)'}
                    </strong>
                  </div>
                  <p style={{ margin: '4px 0 0 28px', fontSize: 13, color: 'var(--muted)' }}>
                    {method === 'cod' ? 'Pay upon physical receipt & philatelic seal verification.' : 'Production-grade sandbox gateway integration.'}
                  </p>
                </label>
              ))}

              <div style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>Have a Promotional / Member Voucher?</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ maxWidth: 240, textTransform: 'uppercase' }}
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME10"
                  />
                  <button type="button" className="btn ghost" onClick={() => setStep(2)}>Apply</button>
                </div>
                {quote?.coupon && <p className="note" style={{ marginTop: 8 }}>Voucher applied: <strong>{quote.coupon.code}</strong> ({quote.coupon.type === 'percentage' ? `${quote.coupon.value}% off` : inr(quote.coupon.value)})</p>}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button className="btn ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn" onClick={() => setStep(3)}>Review Order</button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & PLACE */}
          {step === 3 && (
            <div className="panel" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 20, marginBottom: 14 }}>Review & Confirm Order</h2>
              
              <div style={{ background: '#fcfbf8', border: '1px solid var(--line)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, marginBottom: 6 }}>Delivery Address</h3>
                {selectedAddress && (
                  <p style={{ fontSize: 14, color: 'var(--text)' }}>
                    <strong>{selectedAddress.full_name}</strong> · {selectedAddress.phone || selectedAddress.mobile}<br />
                    {selectedAddress.address_line_1 || selectedAddress.address_line}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}
                  </p>
                )}
                <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 13, color: 'var(--muted)' }}>
                  <span>Payment: <strong style={{ color: 'var(--text)', textTransform: 'uppercase' }}>{payment}</strong></span>
                  <span>Dispatch: <strong style={{ color: 'var(--text)' }}>{methods.find((m) => m.id === methodId)?.name}</strong></span>
                </div>
              </div>

              <label className="field">
                <span>Special Instructions / Order Note (Optional)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please add extra protective cardboard packing for safety." />
              </label>

              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '14px 0' }}>
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3 }} />
                <span style={{ fontSize: 13 }}>
                  I confirm this order and accept the Folio authenticity guarantee, insured shipping conditions, and returns policy.
                </span>
              </label>

              {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn ghost" onClick={() => setStep(2)}>Back</button>
                <button className="btn" disabled={!terms || placing} onClick={place}>
                  {placing ? 'Placing Order...' : `Place Order · ${inr(quote?.grand || 0)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ORDER SUMMARY ASIDE */}
        <aside className="summary" style={{ alignSelf: 'start', position: 'sticky', top: 20 }}>
          <h2 style={{ fontSize: 20, marginBottom: 14 }}>Order Summary</h2>
          {quote?.items?.map((item) => (
            <div className="sum-row" key={item.id} style={{ fontSize: 13 }}>
              <span>{item.name} × {item.quantity}</span>
              <span>{inr(item.line_total)}</span>
            </div>
          ))}
          <div className="sum-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 8 }}>
            <span>Items Subtotal</span>
            <span>{inr(quote?.subtotal || 0)}</span>
          </div>
          {quote?.discount > 0 && (
            <div className="sum-row" style={{ color: 'var(--ink)' }}>
              <span>Discount</span>
              <span>−{inr(quote?.discount || 0)}</span>
            </div>
          )}
          <div className="sum-row">
            <span>Insured Dispatch</span>
            <span>{quote?.shipping === 0 ? 'FREE' : inr(quote?.shipping || 0)}</span>
          </div>
          <div className="sum-row">
            <span>GST (18% inclusive)</span>
            <span>{inr(quote?.tax || 0)}</span>
          </div>
          <div className="sum-row" style={{ borderTop: '2px solid var(--line)', paddingTop: 12, marginTop: 8, fontSize: 18 }}>
            <strong>Total Amount</strong>
            <strong style={{ color: 'var(--ink)' }}>{inr(quote?.grand || 0)}</strong>
          </div>
          {quote?.problems?.map((problem) => (
            <p key={problem} className="error" style={{ marginTop: 10 }}>{problem}</p>
          ))}
        </aside>
      </div>
    </div>
  );
}

export function ConfirmationPage() {
  const auth = useAuth();
  const location = useLocation();
  const order = location.state;
  useMeta('Order Confirmed');

  return (
    <div className="wrap" style={{ padding: '60px 0', maxWidth: 680, textAlign: 'center' }}>
      <div style={{ width: 68, height: 68, margin: '0 auto 20px', background: 'var(--sage)', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div className="kicker" style={{ color: 'var(--ink)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Order Confirmed
      </div>
      <h1 style={{ fontSize: 42, margin: '8px 0 16px' }}>Your order is confirmed!</h1>
      <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
        Thank you for your order. Our team will carefully inspect, safely pack, and dispatch your stamps soon.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link className="btn" to="/account/orders">View My Orders</Link>
        <Link className="btn ghost" to="/stamps">Continue Browsing</Link>
      </div>
    </div>
  );
}

/* =========================================================================
   AUTHENTICATION PAGES
   ========================================================================= */

function AuthCabinet({ title, lines }) {
  return (
    <div className="auth-panel auth-visual">
      <p className="auth-kicker">From the cabinet</p>
      <figure className="auth-frame">
        <img
          src="/stamps/hero_collection.jpg"
          alt="Framed stamps from the cabinet: a Gandhi memorial, British India, the 1947 Independence issue, Hyderabad, and an Australian kookaburra."
        />
      </figure>
      <div className="auth-caption">
        <h1>{title}</h1>
        {lines.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';

  const [mode, setMode] = useState('password');
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useMeta('Sign In');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'password') {
        const res = await api('/api/auth/login', { method: 'POST', body: form });
        if (res.requires_otp) {
          const pendingData = {
            otp_id: res.otp_id,
            destination: res.destination,
            raw_destination: res.raw_destination || form.identifier,
            user_id: res.user_id,
            purpose: 'login',
            redirect,
          };
          sessionStorage.setItem('folio_pending_otp', JSON.stringify(pendingData));
          navigate('/verify', { state: pendingData });
          return;
        }

        auth.persist(res.user, res.token);
        await auth.executeIntendedAction();
        navigate(redirect || '/account', { replace: true });
      } else {
        const res = await api('/api/auth/send-otp', {
          method: 'POST',
          body: { destination: form.identifier, purpose: 'login' },
        });
        const pendingData = {
          otp_id: res.otp_id,
          destination: res.destination,
          raw_destination: res.raw_destination || form.identifier,
          user_id: res.user_id,
          purpose: 'login',
          redirect,
        };
        sessionStorage.setItem('folio_pending_otp', JSON.stringify(pendingData));
        navigate('/verify', { state: pendingData });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <AuthCabinet
        title="Welcome back to your cabinet"
        lines={[
          'Sign in to open saved stamps, your want-list, and the orders already on their way.',
          'Return to the pieces you set aside and follow each delivery from the desk.',
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontSize: 30, marginBottom: 8 }}>Sign In</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
            {mode === 'password' ? 'Enter your registered email address or mobile number.' : 'Enter your mobile number or email to receive a sign-in OTP.'}
          </p>

          <label className="field">
            <span>Email or Mobile Number *</span>
            <input
              type="text"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              placeholder="Enter email or mobile number"
              required
              autoFocus
            />
          </label>

          {mode === 'password' && (
            <label className="field" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password *</span>
                <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--ink)' }}>Forgot Password?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter password"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--muted)', fontSize: 12 }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
          )}

          {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? (mode === 'password' ? 'Signing In...' : 'Sending Code...') : mode === 'password' ? 'Sign In' : 'Send One-Time Code'}
          </button>

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <button
              type="button"
              className="btn ghost"
              style={{ fontSize: 13, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                setMode(mode === 'password' ? 'otp' : 'password');
                setError('');
              }}
            >
              {mode === 'password' ? (
                <>
                  <Zap size={14} style={{ color: '#c45525' }} />
                  <span>Sign in with OTP instead</span>
                </>
              ) : (
                <>
                  <KeyRound size={14} style={{ color: '#1e6b4f' }} />
                  <span>Sign in with Password instead</span>
                </>
              )}
            </button>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <span>Don't have an account? </span>
            <Link to={`/signup${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>
              Create Account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91 (India)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+1', label: '🇺🇸 +1 (USA)' },
  { code: '+971', label: '🇦🇪 +971 (UAE)' },
  { code: '+65', label: '🇸🇬 +65 (Singapore)' },
  { code: '+61', label: '🇦🇺 +61 (Australia)' },
  { code: '+1', label: '🇨🇦 +1 (Canada)' },
  { code: '+49', label: '🇩🇪 +49 (Germany)' },
];

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    country_code: '+91',
    mobile: '',
    password: '',
    confirm_password: '',
    address_line: '',
    apartment: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    address_type: 'home',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useMeta('Create Account');

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (form.full_name.trim().length < 2) {
      return setError('Please enter your full name (at least 2 characters).');
    }
    const cleanMobile = form.mobile.replace(/\D/g, '');
    if (form.country_code === '+91') {
      const ind10 = cleanMobile.slice(-10);
      if (!/^[6-9]\d{9}$/.test(ind10)) {
        return setError('Please enter a valid 10-digit Indian mobile number.');
      }
    } else if (cleanMobile.length < 7) {
      return setError('Please enter a valid mobile number.');
    }

    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters long.');
    }
    if (form.password !== form.confirm_password) {
      return setError('Passwords do not match.');
    }
    if (!form.address_line.trim()) {
      return setError('Please enter your street address.');
    }
    if (!form.city.trim()) {
      return setError('Please enter your city.');
    }
    if (!form.state.trim()) {
      return setError('Please enter your state.');
    }
    if (!form.pincode.trim() || form.pincode.trim().length < 3) {
      return setError('Please enter a valid postal / PIN code.');
    }

    setLoading(true);
    try {
      const res = await api('/api/auth/signup', { method: 'POST', body: form });
      const pendingData = {
        otp_id: res.otp_id,
        destination: res.destination,
        raw_destination: res.raw_destination || form.mobile,
        user_id: res.user_id,
        purpose: 'signup',
        redirect,
      };
      sessionStorage.setItem('folio_pending_otp', JSON.stringify(pendingData));
      navigate('/verify', { state: pendingData });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <AuthCabinet
        title="Create your collector profile"
        lines={[
          'Sign up to save stamps, keep a want-list, and follow your orders.',
          'Create an account to hold your cabinet, track deliveries, and come back to the pieces you set aside.',
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px 24px' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 480 }}>
          <h2 style={{ fontSize: 30, marginBottom: 6 }}>Create Account</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
            Enter your details and delivery address to create your collector profile.
          </p>

          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Personal Credentials
            </h3>

            <label className="field">
              <span>Full Name *</span>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </label>

            <label className="field">
              <span>Email Address *</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Enter email address"
                required
              />
            </label>

            <label className="field">
              <span>Mobile Number *</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select
                  value={form.country_code}
                  onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                  style={{
                    width: 130,
                    height: 42,
                    background: '#f8fafc',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    padding: '0 8px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="Enter mobile number"
                  maxLength={14}
                  style={{ flex: 1 }}
                  required
                />
              </div>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>Password (min 8 chars) *</span>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Enter password"
                    minLength={8}
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--muted)', fontSize: 11 }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Confirm Password *</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  placeholder="Confirm password"
                  required
                />
              </label>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Delivery Address
            </h3>

            <label className="field">
              <span>House / Flat / Street (Address Line 1) *</span>
              <input
                value={form.address_line}
                onChange={(e) => setForm({ ...form, address_line: e.target.value })}
                placeholder="House/Flat No., Building Name, Street"
                required
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="field">
                <span>Apartment / Suite (Line 2)</span>
                <input
                  value={form.apartment}
                  onChange={(e) => setForm({ ...form, apartment: e.target.value })}
                  placeholder="Apartment / Suite / Unit (Optional)"
                />
              </label>
              <label className="field">
                <span>Landmark</span>
                <input
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  placeholder="Landmark (Optional)"
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <label className="field">
                <span>City *</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                  required
                />
              </label>
              <label className="field">
                <span>State *</span>
                <input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="State"
                  required
                />
              </label>
              <label className="field">
                <span>PIN Code *</span>
                <input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  placeholder="PIN code"
                  maxLength={8}
                  required
                />
              </label>
            </div>

            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 13, color: '#3d3832', display: 'block', marginBottom: 6 }}>Address Type:</span>
              <div style={{ display: 'flex', gap: 14 }}>
                {['home', 'work', 'other'].map((type) => (
                  <label key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', textTransform: 'capitalize', fontSize: 13 }}>
                    <input type="radio" name="signup_addr_type" checked={form.address_type === type} onChange={() => setForm({ ...form, address_type: type })} />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Sending Verification OTP...' : 'Continue to Mobile Verification'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
            <span>Already have an account? </span>
            <Link to={`/login${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export function VerifyPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const savedPending = JSON.parse(sessionStorage.getItem('folio_pending_otp') || '{}');

  const [otpId, setOtpId] = useState(state.otp_id || savedPending.otp_id);
  const [destination, setDestination] = useState(state.destination || savedPending.destination || '');
  const [rawDestination, setRawDestination] = useState(state.raw_destination || savedPending.raw_destination || '');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(state.resend_seconds || 30);
  const inputRefs = useRef([]);

  useMeta('Verify Security Code');

  useEffect(() => {
    if (!wait) return undefined;
    const timer = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  function handleDigitChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    
    // Handle paste of 6 digits
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      if (inputRefs.current[5]) inputRefs.current[5].focus();
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  }

  async function submit(event) {
    if (event) event.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      return setError('Please enter all 6 digits of the OTP.');
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const activeOtpId = otpId || savedPending.otp_id;
      const activeDest = destination || rawDestination || savedPending.raw_destination || savedPending.destination;
      const res = await api('/api/auth/verify-otp', {
        method: 'POST',
        body: { otp_id: activeOtpId, destination: activeDest, code },
      });
      sessionStorage.removeItem('folio_pending_otp');
      auth.persist(res.user, res.token);
      await auth.executeIntendedAction();
      const targetUrl = state.redirect || savedPending.redirect || '/account';
      navigate(targetUrl, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    setSuccess('');
    setResending(true);
    try {
      const activeOtpId = otpId || savedPending.otp_id;
      const activeDest = destination || rawDestination || savedPending.raw_destination || savedPending.destination;
      const res = await api('/api/auth/resend-otp', {
        method: 'POST',
        body: { otp_id: activeOtpId, destination: activeDest },
      });
      setOtpId(res.otp_id);
      setDestination(res.destination || destination);
      setWait(res.resend_seconds || 60);
      setDigits(['', '', '', '', '', '']);
      setSuccess('A new 6-digit OTP code has been sent.');
      sessionStorage.setItem('folio_pending_otp', JSON.stringify({ ...savedPending, otp_id: res.otp_id, destination: res.destination || destination }));
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 160px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: '#faf8f5' }}>
      <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.06)', width: '100%', maxWidth: 460, padding: '36px 28px', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, margin: '0 auto 18px', background: 'var(--sage)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--ink)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--serif)' }}>Verification Code</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.5, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
          Enter the 6-digit code sent to <strong style={{ color: 'var(--ink)' }}>{destination || rawDestination || 'your mobile number'}</strong>
        </p>

        <form onSubmit={submit}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                style={{
                  width: 48,
                  height: 54,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  borderRadius: 12,
                  border: digit ? '2px solid var(--ink)' : '1.5px solid #dcd7cc',
                  background: digit ? '#fbfdfc' : '#ffffff',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                required
                autoFocus={idx === 0}
              />
            ))}
          </div>

          {error && <p className="error" style={{ marginBottom: 16, textAlign: 'left', fontSize: 13.5 }}>{error}</p>}
          {success && <p className="note" style={{ marginBottom: 16, textAlign: 'left', fontSize: 13.5, background: '#eaf6ef', borderColor: '#a3d8b8', color: '#165c3b' }}>{success}</p>}

          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', height: 46, fontSize: 15, fontWeight: 600 }}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <button
              type="button"
              className="btn ghost"
              disabled={wait > 0 || resending}
              onClick={resend}
              style={{ fontSize: 13, padding: '6px 12px' }}
            >
              {resending ? 'Sending...' : wait > 0 ? `Resend OTP in ${wait}s` : 'Resend OTP'}
            </button>
            <Link
              to={state.purpose === 'signup' ? '/signup' : '/login'}
              style={{ color: 'var(--ink)', fontWeight: 500, fontSize: 13 }}
            >
              Change Number
            </Link>
          </div>

          <div style={{ marginTop: 18, background: '#f5f3ef', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#685e50', textAlign: 'center' }}>
            💡 Development Mode: Default OTP is <strong>123456</strong>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useMeta('Forgot Password');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/api/auth/forgot-password', { method: 'POST', body: { identifier } });
      const pendingData = {
        otp_id: res.otp_id,
        destination: res.destination,
        identifier,
      };
      sessionStorage.setItem('folio_pending_otp', JSON.stringify(pendingData));
      navigate('/reset-password', { state: pendingData });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <AuthCabinet
        title="Get back into your cabinet"
        lines={[
          'Enter the email or mobile number on your account and we will send a reset code.',
          'Use that code to choose a new password and return to your saved stamps and orders.',
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontSize: 30, marginBottom: 8 }}>Forgot Password</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
            Enter your registered email address or mobile number.
          </p>

          <label className="field">
            <span>Email or Mobile Number *</span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter email or mobile number"
              required
              autoFocus
            />
          </label>

          {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Sending Code...' : 'Send Reset Code'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14 }}>
            <Link to="/login" style={{ color: 'var(--ink)' }}>← Back to Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const savedPending = JSON.parse(sessionStorage.getItem('folio_pending_otp') || '{}');

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useMeta('Reset Password');

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (code.trim().length !== 6) {
      return setError('Please enter the 6-digit OTP.');
    }
    if (password.length < 8) {
      return setError('New password must be at least 8 characters long.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      const activeOtpId = state.otp_id || savedPending.otp_id;
      const activeDest = state.destination || savedPending.destination || state.identifier || savedPending.identifier;
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: {
          otp_id: activeOtpId,
          destination: activeDest,
          code: code.trim(),
          password,
          confirm_password: confirmPassword,
        },
      });
      sessionStorage.removeItem('folio_pending_otp');
      alert('Password reset successfully. You may now sign in with your new password.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <AuthCabinet
        title="Choose a new password"
        lines={[
          'Set a password of at least 8 characters to lock your collector profile.',
          'After it is saved, sign in again to reach your stamps and orders.',
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 420 }}>
          <h2 style={{ fontSize: 30, marginBottom: 8 }}>Reset Password</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
            Enter OTP sent to <strong>{state.destination || savedPending.destination || 'your number'}</strong>
          </p>

          <label className="field">
            <span>6-Digit Verification Code *</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit OTP"
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>New Password (min 8 chars) *</span>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={8}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--muted)', fontSize: 12 }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="field">
            <span>Confirm New Password *</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </label>

          {error && <p className="error" style={{ marginBottom: 16 }}>{error}</p>}

          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Resetting...' : 'Reset Password & Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

