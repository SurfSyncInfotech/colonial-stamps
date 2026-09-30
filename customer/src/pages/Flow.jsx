import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, inr } from '../api';
import { State, useAuth, useMeta } from '../shell';

export function CartPage() {
  const auth = useAuth();
  const [cart, setCart] = useState(null);
  const [error, setError] = useState('');
  useMeta('Cart');
  function load() {
    api('/api/cart').then(setCart).catch((err) => setError(err.message));
  }
  useEffect(() => { if (auth.user) load(); }, [auth.user]);
  if (!auth.user) return <Gate title="Your cart lives with your account" />;
  if (error) return <div className="wrap"><State error onRetry={load} /></div>;
  if (!cart) return <div className="wrap"><State loading /></div>;
  const subtotal = cart.items.reduce((sum, item) => sum + item.effective_price * item.quantity, 0);

  async function update(id, quantity) {
    try { setCart(await api(`/api/cart/items/${id}`, { method: 'PUT', body: { quantity } })); auth.refreshCart(); }
    catch (err) { setError(err.message); }
  }
  async function remove(id) {
    setCart(await api(`/api/cart/items/${id}`, { method: 'DELETE' }));
    auth.refreshCart();
  }

  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      <h1>Cart</h1>
      {cart.items.length === 0 ? <State empty="The cart is empty. The cabinet is not." /> : (
        <div className="cart-layout">
          <div className="panel">
            {cart.items.map((item) => (
              <div className="line" key={item.cart_item_id}>
                <img src={item.image} alt="" />
                <div>
                  <Link to={`/product/${item.slug}`}><strong>{item.name}</strong></Link>
                  <p>{item.available < 1 ? 'Out of stock' : item.quantity > item.available ? `Only ${item.available} remain` : `${inr(item.effective_price)} each`}</p>
                  <div className="qty">
                    <button aria-label="Decrease" onClick={() => update(item.cart_item_id, item.quantity - 1)} disabled={item.quantity <= 1}>−</button>
                    <span>{item.quantity}</span>
                    <button aria-label="Increase" onClick={() => update(item.cart_item_id, item.quantity + 1)}>+</button>
                  </div>
                  <button className="btn ghost" onClick={() => remove(item.cart_item_id)}>Remove</button>
                </div>
                <strong>{inr(item.effective_price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <aside className="summary">
            <h2>Summary</h2>
            <div className="sum-row"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Shipping, GST, and coupons are calculated when you check out. The server sets the final amount.</p>
            {error && <p className="error">{error}</p>}
            <Link className="btn" to="/checkout" style={{ width: '100%', marginTop: 12 }}>Checkout</Link>
          </aside>
        </div>
      )}
    </div>
  );
}

export function WishlistPage() {
  const auth = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  useMeta('Wishlist');
  function load() { api('/api/wishlist').then((res) => setItems(res.data)).catch((err) => setError(err.message)); }
  useEffect(() => { if (auth.user) load(); }, [auth.user]);
  if (!auth.user) return <Gate title="The wishlist asks you to sign in" />;
  if (error) return <div className="wrap"><State error onRetry={load} /></div>;
  if (!items) return <div className="wrap"><State loading /></div>;
  return (
    <div className="wrap" style={{ padding: '20px 0 40px' }}>
      <h1>Wishlist</h1>
      {items.length === 0 ? <State empty="Nothing saved yet." /> : (
        <div className="grid">
          {items.map((item) => (
            <article key={item.id} className="panel">
              <img src={item.image} alt="" style={{ height: 180, margin: '0 auto' }} />
              <h3 style={{ fontFamily: 'var(--sans)', fontSize: 16 }}>{item.name}</h3>
              <p>{inr(item.effective_price)} · {item.available > 0 ? 'Available' : 'Out of stock'}</p>
              <div className="buy-row">
                <button className="btn" disabled={item.available < 1} onClick={() => api(`/api/wishlist/items/${item.id}/move`, { method: 'POST' }).then(() => { auth.refreshCart(); load(); })}>Move to cart</button>
                <button className="btn ghost" onClick={() => api(`/api/wishlist/items/${item.id}`, { method: 'DELETE' }).then(load)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function CheckoutPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [billingSame, setBillingSame] = useState(true);
  const [methods, setMethods] = useState([]);
  const [methodId, setMethodId] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState(null);
  const [payment, setPayment] = useState('card');
  const [note, setNote] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ full_name: auth.user?.full_name || '', phone: auth.user?.mobile || '', address_line: '', apartment: '', area: '', city: '', state: '', pincode: '', country: 'India' });
  useMeta('Checkout');

  useEffect(() => {
    if (!auth.user) return;
    api('/api/addresses').then((res) => {
      setAddresses(res.data);
      const def = res.data.find((a) => a.is_default) || res.data[0];
      if (def) setAddressId(def.id);
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

  if (!auth.user) return <Gate title="Sign in to check out" />;
  const labels = ['Address', 'Delivery', 'Payment', 'Review'];

  async function saveAddress(event) {
    event.preventDefault();
    const created = await api('/api/addresses', { method: 'POST', body: { ...form, is_default: addresses.length === 0 } });
    const res = await api('/api/addresses');
    setAddresses(res.data);
    setAddressId(created.id);
  }

  async function place() {
    setError('');
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
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="wrap" style={{ paddingTop: 18 }}>
      <h1>Checkout</h1>
      {auth.user.status !== 'approved' && <p className="note">Your account is {auth.user.status}. The desk has to approve it before an order can be placed. You can still prepare the cart.</p>}
      <div className="steps">{labels.map((label, index) => <span key={label} className={index === step ? 'on' : ''}>{index + 1}. {label}</span>)}</div>
      <div className="check-layout">
        <div>
          {step === 0 && (
            <div>
              {addresses.map((address) => (
                <label key={address.id} className={`addr ${addressId === address.id ? 'on' : ''}`}>
                  <input type="radio" name="addr" checked={addressId === address.id} onChange={() => setAddressId(address.id)} />
                  <strong> {address.full_name}</strong>
                  <p>{address.address_line}{address.apartment ? `, ${address.apartment}` : ''}, {address.area} {address.city}, {address.state} {address.pincode}</p>
                </label>
              ))}
              <form onSubmit={saveAddress} className="panel">
                <h3>New address</h3>
                {['full_name','phone','address_line','apartment','area','city','state','pincode','country'].map((key) => (
                  <label key={key} className="field"><span>{key.replace('_', ' ')}</span>
                    <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={!['apartment','area'].includes(key)} />
                  </label>
                ))}
                <button className="btn" type="submit">Save address</button>
              </form>
              <label style={{ display: 'flex', gap: 8, margin: '12px 0' }}><input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} /> Billing address is the same</label>
              <button className="btn" disabled={!addressId} onClick={() => setStep(1)}>Continue</button>
            </div>
          )}
          {step === 1 && (
            <div>
              {methods.map((method) => (
                <label key={method.id} className={`addr ${methodId === method.id ? 'on' : ''}`}>
                  <input type="radio" name="ship" checked={methodId === method.id} onChange={() => setMethodId(method.id)} />
                  <strong> {method.name}</strong> · {inr(method.charge)} · {method.eta_label}
                  <p>{method.description}</p>
                </label>
              ))}
              <button className="btn" onClick={() => setStep(2)}>Continue</button>
            </div>
          )}
          {step === 2 && (
            <div className="panel">
              {['card','upi','cod'].map((method) => (
                <label key={method} className="addr"><input type="radio" name="pay" checked={payment === method} onChange={() => setPayment(method)} /> {method === 'cod' ? 'Cash on delivery' : method === 'upi' ? 'UPI (test)' : 'Card (test)'}</label>
              ))}
              <p className="note">Card and UPI use the dummy payment provider. No charge is sent to a bank. A real gateway can replace the provider later.</p>
              <label className="field"><span>Coupon</span><input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="WELCOME10" /></label>
              <button className="btn" onClick={() => setStep(3)}>Review order</button>
            </div>
          )}
          {step === 3 && (
            <div className="panel">
              <p>Payment: {payment}. Delivery method is confirmed on the summary.</p>
              <label className="field"><span>Note for the desk</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
              <label style={{ display: 'flex', gap: 8 }}><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I accept the terms and the cancellation policy.</label>
              <button className="btn" style={{ marginTop: 12 }} disabled={!terms} onClick={place}>Place order</button>
            </div>
          )}
          {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}
          {step > 0 && <button className="btn ghost" onClick={() => setStep((n) => n - 1)}>Back</button>}
        </div>
        <aside className="summary">
          <h2>Order summary</h2>
          {quote?.items.map((item) => <div className="sum-row" key={item.id}><span>{item.name} × {item.quantity}</span><span>{inr(item.line_total)}</span></div>)}
          <div className="sum-row"><span>Subtotal</span><span>{inr(quote?.subtotal || 0)}</span></div>
          <div className="sum-row"><span>Discount</span><span>{inr(quote?.discount || 0)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>{inr(quote?.shipping || 0)}</span></div>
          <div className="sum-row"><span>GST {quote?.gst_percent || 0}%</span><span>{inr(quote?.tax || 0)}</span></div>
          <div className="sum-row"><strong>Total</strong><strong>{inr(quote?.grand || 0)}</strong></div>
          {quote?.problems?.map((problem) => <p key={problem} className="error">{problem}</p>)}
        </aside>
      </div>
    </div>
  );
}

export function ConfirmationPage() {
  const auth = useAuth();
  useMeta('Order placed');
  return (
    <div className="wrap" style={{ padding: '48px 0', maxWidth: 680 }}>
      <div className="eyebrow">Order received</div>
      <h1 style={{ fontSize: 48 }}>The desk has it.</h1>
      <p style={{ margin: '12px 0 20px' }}>You can follow the status from your account. A dummy payment was recorded if you chose card or UPI.</p>
      <Link className="btn" to="/account/orders">View orders</Link>
      {!auth.user && null}
    </div>
  );
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('password');
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  useMeta('Sign in');
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'password') {
        const res = await api('/api/auth/login', { method: 'POST', body: form });
        auth.persist(res.user, res.token);
        navigate('/account');
      } else {
        const res = await api('/api/auth/send-otp', { method: 'POST', body: { destination: form.identifier, purpose: 'login' } });
        navigate('/verify', { state: res });
      }
    } catch (err) { setError(err.message); }
  }
  return (
    <div className="auth">
      <div className="auth-panel"><h1>The desk knows your name.</h1><p>Sign in to save stamps, follow orders, and write after a delivery.</p></div>
      <form onSubmit={submit}>
        <h2>Sign in</h2>
        <label className="field"><span>Email or mobile</span><input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required /></label>
        {mode === 'password' && <label className="field"><span>Password</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>}
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">{mode === 'password' ? 'Sign in' : 'Send code'}</button>
        <p style={{ marginTop: 12 }}><button type="button" className="btn ghost" onClick={() => setMode(mode === 'password' ? 'otp' : 'password')}>{mode === 'password' ? 'Use a one-time code' : 'Use a password'}</button></p>
        <p>New here? <Link to="/signup">Create an account</Link></p>
        <p className="note">Sample accounts: meera.iyer@folio.test / Customer@12345. Development OTP is 123456.</p>
      </form>
    </div>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', mobile: '', password: '', confirm_password: '' });
  const [error, setError] = useState('');
  useMeta('Create an account');
  async function submit(event) {
    event.preventDefault();
    try {
      const res = await api('/api/auth/signup', { method: 'POST', body: form });
      navigate('/verify', { state: res });
    } catch (err) { setError(err.message); }
  }
  return (
    <div className="auth">
      <div className="auth-panel"><h1>Open an account with the house.</h1><p>We verify the mobile number, then the desk reads the account before the first order.</p></div>
      <form onSubmit={submit}>
        <h2>Create account</h2>
        {['full_name','email','mobile','password','confirm_password'].map((key) => (
          <label key={key} className="field"><span>{key.replaceAll('_', ' ')}</span>
            <input type={key.includes('password') ? 'password' : key === 'email' ? 'email' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
          </label>
        ))}
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">Continue to verification</button>
      </form>
    </div>
  );
}

export function VerifyPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const [otpId, setOtpId] = useState(state.otp_id);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [wait, setWait] = useState(state.resend_seconds || 0);
  useMeta('Verify code');
  useEffect(() => {
    if (!wait) return undefined;
    const timer = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  async function submit(event) {
    event.preventDefault();
    try {
      const res = await api('/api/auth/verify-otp', { method: 'POST', body: { otp_id: otpId, code } });
      auth.persist(res.user, res.token);
      navigate('/account');
    } catch (err) { setError(err.message); }
  }
  async function resend() {
    const res = await api('/api/auth/resend-otp', { method: 'POST', body: { otp_id: otpId } });
    setOtpId(res.otp_id);
    setWait(res.resend_seconds);
  }
  return (
    <div className="auth">
      <div className="auth-panel"><h1>Enter the code.</h1><p>It expires in ten minutes. Five attempts, then ask for another.</p></div>
      <form onSubmit={submit}>
        <h2>Verification</h2>
        <p>Sent to {state.destination || 'your number'}.</p>
        <label className="field"><span>Code</span><input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">Verify</button>
        <button className="btn ghost" type="button" disabled={wait > 0 || !otpId} onClick={resend}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button>
        <p className="note">Development code: 123456</p>
      </form>
    </div>
  );
}

function Gate({ title }) {
  return (
    <div className="wrap" style={{ padding: '48px 0' }}>
      <h1>{title}</h1>
      <Link className="btn" to="/login" style={{ marginTop: 12 }}>Sign in</Link>
    </div>
  );
}
