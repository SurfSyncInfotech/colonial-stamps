import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, inr } from './api';
import { Banner, Confirm, Modal, useDesk } from './kit';

async function download(path, filename, preview) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${localStorage.getItem('folio_admin_token')}` } });
  const blob = await response.blob();
  if (preview) {
    const win = window.open('');
    win.document.write(await blob.text());
    win.document.close();
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function useLoad(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  function load() {
    setLoading(true);
    api(path).then(setData).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }
  useEffect(load, [path]);
  return { data, error, loading, load, setError };
}

export function LoginPage() {
  const { persist } = useDesk();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@folio.test', password: '' });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    try {
      const res = await api('/api/admin/auth/login', { method: 'POST', body: form });
      persist(res.admin, res.token);
      navigate('/');
    } catch (err) { setError(err.message); }
  }
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div style={{ background: '#12261f', color: '#f6f1e7', padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <strong style={{ fontFamily: 'var(--serif)', letterSpacing: '0.14em', fontSize: 28 }}>FOLIO</strong>
        <h1 style={{ fontSize: 52, maxWidth: '10ch' }}>The desk, not a dashboard costume.</h1>
      </div>
      <form onSubmit={submit} style={{ maxWidth: 420, margin: 'auto', padding: 24 }}>
        <h2>Sign in</h2>
        <label className="field"><span>Email</span><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="field"><span>Password</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <Banner error={error} />
        <button className="btn" type="submit">Enter</button>
        <p className="note" style={{ marginTop: 12 }}>Sample desk: admin@folio.test / Admin@12345</p>
      </form>
    </div>
  );
}

export function DashboardPage() {
  const { data, error, loading, load } = useLoad('/api/admin/dashboard');
  if (loading) return <p className="loading">Loading the desk…</p>;
  if (error) return <div><Banner error={error} /><button className="btn" onClick={load}>Try again</button></div>;
  const m = data.metrics;
  const max = Math.max(...data.series.map((row) => Number(row.revenue)), 1);
  const cards = [
    ['Total revenue', inr(m.revenue)], ['Today', inr(m.today_revenue)], ['Orders', m.orders], ['Pending', m.pending_orders],
    ['Processing', m.processing_orders], ['Delivered', m.completed_orders], ['Cancelled', m.cancelled_orders], ['Customers', m.customers],
    ['New today', m.new_customers], ['Stamps', m.products], ['Low stock', m.low_stock], ['Out of stock', m.out_of_stock],
  ];
  return (
    <div>
      <div className="page-title"><h1>Today at the desk</h1></div>
      <div className="metrics">{cards.map(([label, value]) => <article key={label} className="metric"><span>{label}</span><strong>{value}</strong></article>)}</div>
      <div className="grid-2">
        <section className="panel">
          <h2>Revenue, 14 days</h2>
          <div className="bars" aria-label="Revenue chart">{data.series.map((row) => <i key={row.day} title={`${row.day}: ${inr(row.revenue)}`} style={{ height: `${Math.max(6, (Number(row.revenue) / max) * 100)}%` }} />)}</div>
        </section>
        <section className="panel">
          <h2>Recent activity</h2>
          {data.activity.map((row) => <p key={row.id}><strong>{row.full_name || 'System'}</strong> {row.description}<br /><small>{new Date(row.created_at).toLocaleString('en-IN')}</small></p>)}
          {data.activity.length === 0 && <p className="empty">No activity yet.</p>}
        </section>
      </div>
      <div className="grid-2">
        <Table title="Recent orders" rows={data.recentOrders} cols={['order_number','full_name','status','grand_total']} link={(row) => `/orders/${row.id}`} />
        <Table title="Low stock" rows={data.lowStock} cols={['name','sku','available']} />
      </div>
    </div>
  );
}

function Table({ title, rows, cols, link }) {
  return (
    <section>
      {title && <h2 style={{ margin: '12px 0' }}>{title}</h2>}
      <div className="table-wrap">
        <table>
          <thead><tr>{cols.map((col) => <th key={col}>{col.replaceAll('_', ' ')}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={cols.length}>Nothing here.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id || row.order_number || row.name}>
                {cols.map((col) => <td key={col}>{link && col === cols[0] ? <Link to={link(row)}>{String(row[col] ?? '')}</Link> : <span className={col.includes('status') ? `status ${row[col]}` : ''}>{String(row[col] ?? '')}</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AnalyticsPage() {
  const [range, setRange] = useState('monthly');
  const { data, error, loading } = useLoad(`/api/admin/analytics?range=${range}`);
  if (loading) return <p className="loading">Loading analytics…</p>;
  if (error) return <Banner error={error} />;
  return (
    <div>
      <div className="page-title">
        <h1>Analytics</h1>
        <div>
          <select aria-label="Range" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="daily">Today</option><option value="weekly">Week</option><option value="monthly">Month</option><option value="yearly">Year</option>
          </select>
          <button className="btn light" style={{ marginLeft: 8 }} onClick={() => download(`/api/admin/analytics/export?format=csv&range=${range}`, 'folio-sales.csv')}>CSV</button>
          <button className="btn light" style={{ marginLeft: 8 }} onClick={() => download(`/api/admin/analytics/export?format=xls&range=${range}`, 'folio-sales.xls')}>Excel</button>
        </div>
      </div>
      <div className="metrics">
        <article className="metric"><span>Revenue</span><strong>{inr(data.sales.revenue)}</strong></article>
        <article className="metric"><span>Orders</span><strong>{data.sales.orders}</strong></article>
        <article className="metric"><span>Average order</span><strong>{inr(data.sales.aov)}</strong></article>
        <article className="metric"><span>Units</span><strong>{data.sales.units}</strong></article>
      </div>
      <div className="grid-2">
        <Table title="Best sellers" rows={data.best} cols={['name','sku','units','revenue']} />
        <Table title="Least selling" rows={data.least} cols={['name','sku','units']} />
      </div>
      <div className="grid-2">
        <Table title="Most viewed" rows={data.viewed} cols={['name','sku','view_count']} />
        <Table title="Most wishlisted" rows={data.wished} cols={['name','sku','wishlist_count']} />
      </div>
      <Table title="Category performance" rows={data.categories} cols={['name','revenue','orders']} />
      <h2 style={{ marginTop: 16 }}>Customers</h2>
      <p>New {data.customers.new_customers} · Returning with more than one order {data.customers.returning}</p>
      <Table rows={data.customers.spenders} cols={['full_name','orders','spent']} />
    </div>
  );
}

const emptyProduct = {
  name: '', sku: '', category_id: '', subcategory_id: '', price: '', sale_price: '', stock: 0, low_stock_threshold: 3,
  short_description: '', description: '', country: 'India', issue_year: '', denomination: '', stamp_type: 'Commemorative',
  condition: 'Mint never hinged', grade: 'VF', rarity: 'Common', collection_name: '', catalogue_number: '', tags: '',
  status: 'draft', is_featured: false, is_new_arrival: false,
};

export function ProductsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { data, error, loading, load } = useLoad(`/api/admin/products?q=${encodeURIComponent(q)}&status=${status}`);
  const [confirm, setConfirm] = useState(null);
  return (
    <div>
      <div className="page-title"><h1>Stamps</h1><Link className="btn" to="/products/new">Add stamp</Link></div>
      <div className="filters">
        <input aria-label="Search products" placeholder="Name, SKU, catalogue" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option><option>draft</option><option>published</option><option>archived</option></select>
      </div>
      <Banner error={error} />
      {loading ? <p className="loading">Loading stamps…</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Stamp</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data?.data.length === 0 && <tr><td colSpan="6">No stamps found.</td></tr>}
            {data?.data.map((row) => (
              <tr key={row.id}>
                <td><Link to={`/products/${row.id}`}>{row.name}</Link>{row.is_sample ? ' · sample' : ''}</td>
                <td>{row.sku}</td><td>{inr(row.effective_price)}</td><td>{row.available}</td>
                <td><span className={`status ${row.status}`}>{row.status}</span></td>
                <td>
                  <button className="btn light" onClick={() => api(`/api/admin/products/${row.id}/duplicate`, { method: 'POST' }).then(load)}>Duplicate</button>
                  <button className="btn danger" onClick={() => setConfirm(row)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {confirm && <Confirm text={`Remove “${confirm.name}” from the shop? Past orders keep their own copy of the price.`} onNo={() => setConfirm(null)} onYes={() => api(`/api/admin/products/${confirm.id}`, { method: 'DELETE' }).then(() => { setConfirm(null); load(); })} />}
    </div>
  );
}

export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyProduct);
  const [categories, setCategories] = useState([]);
  const [subs, setSubs] = useState([]);
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/admin/categories').then((res) => setCategories(res.data)); }, []);
  useEffect(() => {
    if (!form.category_id) { setSubs([]); return; }
    api(`/api/admin/subcategories?category_id=${form.category_id}`).then((res) => setSubs(res.data));
  }, [form.category_id]);
  useEffect(() => {
    if (!id) return;
    api(`/api/admin/products/${id}`).then((res) => {
      const p = res.product;
      setForm({ ...p, tags: (p.tags || []).join(', '), sale_price: p.sale_price || '', issue_year: p.issue_year || '', stock: p.available });
      setImages(p.images || []);
    });
  }, [id]);
  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value, ...(key === 'category_id' ? { subcategory_id: '' } : {}) }));
  }
  async function save(event) {
    event.preventDefault();
    setError('');
    const body = { ...form, tags: String(form.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean), sale_price: form.sale_price || null, issue_year: form.issue_year || null };
    try {
      if (id) await api(`/api/admin/products/${id}`, { method: 'PUT', body });
      else {
        const created = await api('/api/admin/products', { method: 'POST', body });
        navigate(`/products/${created.id}`);
        return;
      }
      setError('');
      alert('Saved.');
    } catch (err) { setError(err.message); }
  }
  async function upload(event) {
    const data = new FormData();
    [...event.target.files].forEach((file) => data.append('images', file));
    await api(`/api/admin/products/${id}/images`, { method: 'POST', form: data });
    const res = await api(`/api/admin/products/${id}`);
    setImages(res.product.images);
  }
  return (
    <form onSubmit={save}>
      <div className="page-title"><h1>{id ? 'Edit stamp' : 'New stamp'}</h1><button className="btn">Save</button></div>
      <Banner error={error} />
      <div className="grid-2">
        <div className="panel">
          {['name','sku','price','sale_price','stock','low_stock_threshold','short_description'].map((key) => (
            <label key={key} className="field"><span>{key.replaceAll('_', ' ')}</span>
              <input value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} required={['name','sku','price'].includes(key)} />
            </label>
          ))}
          <label className="field"><span>Description</span><textarea rows={5} value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></label>
        </div>
        <div className="panel">
          <label className="field"><span>Category</span>
            <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)} required>
              <option value="">Select</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Subcategory</span>
            <select value={form.subcategory_id} onChange={(e) => set('subcategory_id', e.target.value)} required>
              <option value="">Select</option>
              {subs.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          </label>
          {['country','issue_year','denomination','stamp_type','condition','grade','rarity','collection_name','catalogue_number','tags'].map((key) => (
            <label key={key} className="field"><span>{key.replaceAll('_', ' ')}</span><input value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} /></label>
          ))}
          <label className="field"><span>Status</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}><option>draft</option><option>published</option><option>archived</option></select>
          </label>
          <label><input type="checkbox" checked={!!form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Featured</label><br />
          <label><input type="checkbox" checked={!!form.is_new_arrival} onChange={(e) => set('is_new_arrival', e.target.checked)} /> New arrival</label>
        </div>
      </div>
      {id && (
        <section className="panel" style={{ marginTop: 12 }}>
          <h2>Images</h2>
          <input type="file" accept="image/*" multiple aria-label="Upload images" onChange={upload} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {images.map((image) => (
              <div key={image.id}>
                <img src={image.url} alt={image.alt_text || ''} width="90" />
                <button type="button" className="btn light" onClick={() => api(`/api/admin/products/${id}/images/${image.id}/primary`, { method: 'POST' }).then(() => api(`/api/admin/products/${id}`).then((res) => setImages(res.product.images)))}>Primary</button>
                <button type="button" className="btn danger" onClick={() => api(`/api/admin/products/${id}/images/${image.id}`, { method: 'DELETE' }).then(() => setImages(images.filter((item) => item.id !== image.id)))}>Delete</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </form>
  );
}

export function CategoriesPage() {
  return <TaxonPage kind="categories" title="Categories" />;
}
export function SubcategoriesPage() {
  return <TaxonPage kind="subcategories" title="Subcategories" />;
}

function TaxonPage({ kind, title }) {
  const { data, error, loading, load } = useLoad(`/api/admin/${kind}`);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => { if (kind === 'subcategories') api('/api/admin/categories').then((res) => setCategories(res.data)); }, [kind]);
  async function save(event) {
    event.preventDefault();
    const dataForm = new FormData(event.target);
    const path = form.id ? `/api/admin/${kind}/${form.id}` : `/api/admin/${kind}`;
    await api(path, { method: form.id ? 'PUT' : 'POST', form: dataForm });
    setForm(null); load();
  }
  return (
    <div>
      <div className="page-title"><h1>{title}</h1><button className="btn" onClick={() => setForm({ status: 'active', display_order: 0, bullet_points: '' })}>Add</button></div>
      <Banner error={error} />
      {loading ? <p className="loading">Loading…</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th>{kind === 'subcategories' && <th>Category</th>}<th>Status</th><th>Order</th><th></th></tr></thead>
          <tbody>
            {data?.data.length === 0 && <tr><td colSpan="5">Nothing yet.</td></tr>}
            {data?.data.map((row) => (
              <tr key={row.id}>
                <td>{row.name}{row.is_sample ? ' · sample' : ''}</td>
                {kind === 'subcategories' && <td>{row.category_name}</td>}
                <td><span className={`status ${row.status}`}>{row.status}</span></td>
                <td>{row.display_order}</td>
                <td>
                  <button className="btn light" onClick={() => setForm({ ...row, bullet_points: parseBullets(row.bullet_points).join('\n') })}>Edit</button>
                  <button className="btn danger" onClick={() => setConfirm(row)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {form && (
        <Modal title={form.id ? 'Edit' : 'Create'} onClose={() => setForm(null)}>
          <form onSubmit={save}>
            {kind === 'subcategories' && (
              <label className="field"><span>Parent category</span>
                <select name="category_id" defaultValue={form.category_id} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              </label>
            )}
            <label className="field"><span>Name</span><input name="name" defaultValue={form.name} required /></label>
            <label className="field"><span>Description</span><textarea name="description" rows={3} defaultValue={form.description} /></label>
            <label className="field"><span>Bullet points, one per line</span><textarea name="bullet_points" rows={4} defaultValue={form.bullet_points} /></label>
            <label className="field"><span>Image</span><input name="image" type="file" accept="image/*" /></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={form.status}><option>active</option><option>inactive</option></select></label>
            <label className="field"><span>Display order</span><input name="display_order" type="number" defaultValue={form.display_order || 0} /></label>
            <label className="field"><span>SEO title</span><input name="seo_title" defaultValue={form.seo_title || ''} /></label>
            <label className="field"><span>SEO description</span><input name="seo_description" defaultValue={form.seo_description || ''} /></label>
            <button className="btn">Save</button>
          </form>
        </Modal>
      )}
      {confirm && <Confirm text={`Delete “${confirm.name}”? If it still has children, the desk will refuse and you should deactivate it instead.`} onNo={() => setConfirm(null)} onYes={() => api(`/api/admin/${kind}/${confirm.id}`, { method: 'DELETE' }).then(() => { setConfirm(null); load(); }).catch((err) => { setConfirm(null); alert(err.message); })} />}
    </div>
  );
}

function parseBullets(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : JSON.parse(value);
}

export function OrdersPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data, error, loading } = useLoad(`/api/admin/orders?q=${encodeURIComponent(q)}&status=${status}`);
  return (
    <div>
      <div className="page-title"><h1>Orders</h1></div>
      <div className="filters">
        <input aria-label="Search orders" placeholder="Order number or customer" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Order status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {['placed','under_review','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','rejected','on_hold','refund_requested','refunded'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <Banner error={error} />
      {loading ? <p className="loading">Loading orders…</p> : data?.data.length === 0 ? <p className="empty">No orders found.</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>{data.data.map((row) => (
            <tr key={row.id}><td><Link to={`/orders/${row.id}`}>{row.order_number}</Link></td><td>{row.full_name}</td><td>{inr(row.grand_total)}</td><td><span className={`status ${row.payment_status}`}>{row.payment_status}</span></td><td><span className={`status ${row.status}`}>{row.status.replaceAll('_', ' ')}</span></td><td>{new Date(row.created_at).toLocaleString('en-IN')}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

const nextStatus = {
  placed: ['under_review', 'confirmed', 'on_hold', 'cancelled', 'rejected'],
  payment_pending: ['placed', 'cancelled'],
  under_review: ['confirmed', 'on_hold', 'cancelled', 'rejected'],
  confirmed: ['processing', 'on_hold', 'cancelled'],
  processing: ['packed', 'on_hold', 'cancelled'],
  packed: ['shipped', 'on_hold'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  on_hold: ['confirmed', 'processing', 'cancelled'],
  delivered: ['refund_requested'],
  refund_requested: ['refunded'],
};

export function OrderDetailPage() {
  const { id } = useParams();
  const { data, error, loading, load } = useLoad(`/api/admin/orders/${id}`);
  const [note, setNote] = useState('');
  const [ship, setShip] = useState({ courier: '', tracking_number: '', tracking_url: '' });
  if (loading) return <p className="loading">Loading order…</p>;
  if (error) return <Banner error={error} />;
  const order = data.order;
  async function move(status) {
    const comment = window.prompt('Note for the timeline', '') || '';
    if (['cancelled', 'rejected'].includes(status) && !window.confirm(`Mark this order ${status}? Stock will be returned.`)) return;
    await api(`/api/admin/orders/${id}/status`, { method: 'PUT', body: { status, note: comment } });
    load();
  }
  return (
    <div>
      <div className="page-title"><h1>{order.order_number}</h1><span className={`status ${order.status}`}>{order.status.replaceAll('_', ' ')}</span></div>
      <p>{order.full_name} · {order.email} · {order.mobile}</p>
      <div className="buy-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {(nextStatus[order.status] || []).map((status) => <button key={status} className="btn light" onClick={() => move(status)}>{status.replaceAll('_', ' ')}</button>)}
        <button className="btn light" onClick={() => download(`/api/admin/orders/${id}/invoice`, `${order.order_number}.html`, true)}>Invoice</button>
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Stamp</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>{data.items.map((item) => <tr key={item.id}><td>{item.product_name}<br /><small>{item.sku}</small></td><td>{item.quantity}</td><td>{inr(item.unit_price)}</td><td>{inr(item.line_total)}</td></tr>)}</tbody>
      </table></div>
      <p style={{ marginTop: 8 }}>Total {inr(order.grand_total)} · Payment {order.payment_status}
        <select aria-label="Payment status" defaultValue={order.payment_status} onChange={(e) => api(`/api/admin/orders/${id}/payment`, { method: 'PUT', body: { payment_status: e.target.value } }).then(load)} style={{ marginLeft: 8 }}>
          {['pending','paid','failed','refunded','cod'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </p>
      <div className="grid-2">
        <section className="panel">
          <h2>Timeline</h2>
          {data.history.map((step) => <p key={step.id}><strong>{new Date(step.created_at).toLocaleString('en-IN')}</strong><br />{step.to_status.replaceAll('_', ' ')} {step.note ? `· ${step.note}` : ''}</p>)}
          <form onSubmit={(e) => { e.preventDefault(); api(`/api/admin/orders/${id}/notes`, { method: 'POST', body: { note } }).then(() => { setNote(''); load(); }); }}>
            <label className="field"><span>Internal note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} required /></label>
            <button className="btn">Add note</button>
          </form>
          {data.notes.map((item) => <p key={item.id}><small>{item.admin_name}</small> {item.note}</p>)}
        </section>
        <section className="panel">
          <h2>Shipping</h2>
          {['courier','tracking_number','tracking_url'].map((key) => (
            <label key={key} className="field"><span>{key.replaceAll('_', ' ')}</span><input value={ship[key]} onChange={(e) => setShip({ ...ship, [key]: e.target.value })} /></label>
          ))}
          <button className="btn" onClick={() => api(`/api/admin/orders/${id}/shipping`, { method: 'PUT', body: ship })}>Save shipping</button>
          {data.shipping && <p style={{ marginTop: 8 }}>{data.shipping.courier} {data.shipping.tracking_number}</p>}
        </section>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const [status, setStatus] = useState('');
  const { data, error, loading } = useLoad(`/api/admin/customers?status=${status}`);
  return (
    <div>
      <div className="page-title"><h1>Collectors</h1>
        <select aria-label="Customer status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option><option value="pending">Pending approval</option><option>approved</option><option>rejected</option><option>blocked</option>
        </select>
      </div>
      <Banner error={error} />
      {loading ? <p className="loading">Loading customers…</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Orders</th><th>Spent</th><th>Status</th></tr></thead>
          <tbody>{data.data.map((row) => <tr key={row.id}><td><Link to={`/customers/${row.id}`}>{row.full_name}</Link></td><td>{row.email}</td><td>{row.mobile}</td><td>{row.order_count}</td><td>{inr(row.spent)}</td><td><span className={`status ${row.status}`}>{row.status}</span></td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams();
  const { data, error, loading, load } = useLoad(`/api/admin/customers/${id}`);
  const [note, setNote] = useState('');
  if (loading) return <p className="loading">Loading customer…</p>;
  if (error) return <Banner error={error} />;
  async function status(next) {
    const reason = next === 'rejected' ? window.prompt('Reason') : '';
    if (next === 'blocked' && !window.confirm('Block this collector? They will not be able to sign in.')) return;
    await api(`/api/admin/customers/${id}/status`, { method: 'PUT', body: { status: next, reason } });
    load();
  }
  const person = data.customer;
  return (
    <div>
      <div className="page-title"><h1>{person.full_name}</h1><span className={`status ${person.status}`}>{person.status}</span></div>
      <p>{person.email} · {person.mobile}</p>
      <p>Spent {inr(data.spent)} · Joined {new Date(person.created_at).toLocaleDateString('en-IN')}</p>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <button className="btn" onClick={() => status('approved')}>Approve</button>
        <button className="btn light" onClick={() => status('rejected')}>Reject</button>
        <button className="btn danger" onClick={() => status('blocked')}>Block</button>
        <button className="btn light" onClick={() => status('approved')}>Unblock</button>
      </div>
      <h2>Addresses</h2>
      {data.addresses.map((row) => <p key={row.id}>{row.address_line}, {row.city} {row.pincode}</p>)}
      <h2>Orders</h2>
      {data.orders.map((row) => <p key={row.id}><Link to={`/orders/${row.id}`}>{row.order_number}</Link> · {row.status} · {inr(row.grand_total)}</p>)}
      <form onSubmit={(e) => { e.preventDefault(); api(`/api/admin/customers/${id}/notes`, { method: 'POST', body: { note } }).then(() => { setNote(''); load(); }); }}>
        <label className="field"><span>Internal note</span><textarea value={note} onChange={(e) => setNote(e.target.value)} required /></label>
        <button className="btn">Save note</button>
      </form>
      {data.notes.map((item) => <p key={item.id}>{item.note}</p>)}
    </div>
  );
}

export function InventoryPage() {
  const [status, setStatus] = useState('');
  const { data, error, loading, load } = useLoad(`/api/admin/inventory?status=${status}`);
  const [adjust, setAdjust] = useState(null);
  const [history, setHistory] = useState(null);
  return (
    <div>
      <div className="page-title"><h1>Inventory</h1>
        <select aria-label="Stock status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
        </select>
      </div>
      <Banner error={error} />
      {loading ? <p className="loading">Loading inventory…</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Stamp</th><th>SKU</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Sold</th><th>Status</th><th></th></tr></thead>
          <tbody>{data.data.map((row) => (
            <tr key={row.id}><td>{row.name}</td><td>{row.sku}</td><td>{row.stock_on_hand}</td><td>{row.reserved}</td><td>{row.available}</td><td>{row.sold_quantity}</td><td><span className={`status ${row.stock_status}`}>{row.stock_status.replaceAll('_', ' ')}</span></td>
              <td><button className="btn light" onClick={() => setAdjust(row)}>Adjust</button> <button className="btn light" onClick={() => api(`/api/admin/inventory/${row.id}/history`).then(setHistory)}>History</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {adjust && (
        <Modal title={`Adjust ${adjust.name}`} onClose={() => setAdjust(null)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(e.target));
            api(`/api/admin/inventory/${adjust.id}/adjust`, { method: 'POST', body: { ...body, quantity: Number(body.quantity) } }).then(() => { setAdjust(null); load(); });
          }}>
            <label className="field"><span>Action</span><select name="mode"><option value="add">Add stock</option><option value="remove">Remove stock</option><option value="set">Set stock</option></select></label>
            <label className="field"><span>Quantity</span><input name="quantity" type="number" min="0" required /></label>
            <label className="field"><span>Reason</span><input name="reason" required placeholder="Count correction" /></label>
            <button className="btn">Update stock</button>
          </form>
        </Modal>
      )}
      {history && (
        <Modal title="Stock history" onClose={() => setHistory(null)}>
          {history.data.map((row) => <p key={row.id}>{row.quantity > 0 ? '+' : ''}{row.quantity} {row.reason} · {row.previous_stock} → {row.new_stock}<br /><small>{new Date(row.created_at).toLocaleString('en-IN')} {row.admin_name || ''}</small></p>)}
        </Modal>
      )}
    </div>
  );
}

export function CouponsPage() {
  const { data, error, loading, load } = useLoad('/api/admin/coupons');
  const [form, setForm] = useState(null);
  const blank = { code: '', description: '', discount_type: 'percent', discount_value: 10, min_order_amount: 0, max_discount: '', usage_limit: '', per_customer_limit: 1, status: 'active' };
  return (
    <div>
      <div className="page-title"><h1>Coupons</h1><button className="btn" onClick={() => setForm(blank)}>New coupon</button></div>
      <Banner error={error} />
      {loading ? <p className="loading">Loading coupons…</p> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min</th><th>Used</th><th>Status</th><th></th></tr></thead>
          <tbody>{data.data.map((row) => <tr key={row.id}><td>{row.code}</td><td>{row.discount_type}</td><td>{row.discount_value}</td><td>{row.min_order_amount}</td><td>{row.used_count}</td><td>{row.status}</td><td><button className="btn danger" onClick={() => api(`/api/admin/coupons/${row.id}`, { method: 'DELETE' }).then(load)}>Delete</button></td></tr>)}</tbody>
        </table></div>
      )}
      {form && (
        <Modal title="Coupon" onClose={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); api('/api/admin/coupons', { method: 'POST', body: { ...form, max_discount: form.max_discount || null, usage_limit: form.usage_limit || null, per_customer_limit: form.per_customer_limit || null } }).then(() => { setForm(null); load(); }); }}>
            {Object.keys(blank).map((key) => <label key={key} className="field"><span>{key.replaceAll('_', ' ')}</span>{key === 'discount_type' || key === 'status' ? <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>{key === 'status' ? ['active','inactive'].map((item) => <option key={item}>{item}</option>) : ['percent','fixed'].map((item) => <option key={item}>{item}</option>)}</select> : <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}</label>)}
            <button className="btn">Create</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function ReviewsPage() {
  const [status, setStatus] = useState('pending');
  const { data, error, loading, load } = useLoad(`/api/admin/reviews?status=${status}`);
  return (
    <div>
      <div className="page-title"><h1>Reviews</h1>
        <select aria-label="Review status" value={status} onChange={(e) => setStatus(e.target.value)}><option>pending</option><option>approved</option><option>rejected</option><option>hidden</option></select>
      </div>
      <Banner error={error} />
      {loading ? <p className="loading">Loading reviews…</p> : data.data.length === 0 ? <p className="empty">No reviews in this tray.</p> : data.data.map((row) => (
        <article key={row.id} className="panel" style={{ marginBottom: 8 }}>
          <strong>{row.full_name}</strong> on {row.product_name} · {row.rating}/5
          <p>{row.body}</p>
          <button className="btn" onClick={() => api(`/api/admin/reviews/${row.id}`, { method: 'PUT', body: { status: 'approved' } }).then(load)}>Approve</button>
          <button className="btn light" onClick={() => api(`/api/admin/reviews/${row.id}`, { method: 'PUT', body: { status: 'rejected' } }).then(load)}>Reject</button>
          <button className="btn light" onClick={() => api(`/api/admin/reviews/${row.id}`, { method: 'PUT', body: { status: 'hidden' } }).then(load)}>Hide</button>
          <button className="btn danger" onClick={() => window.confirm('Delete this review?') && api(`/api/admin/reviews/${row.id}`, { method: 'DELETE' }).then(load)}>Delete</button>
        </article>
      ))}
    </div>
  );
}

export function BannersPage() {
  const { data, error, loading, load } = useLoad('/api/admin/banners');
  const [form, setForm] = useState(null);
  return (
    <div>
      <div className="page-title"><h1>Homepage</h1><button className="btn" onClick={() => setForm({ placement: 'promo', title: '', subtitle: '', button_text: '', button_url: '/stamps', status: 'active', display_order: 0 })}>Add banner</button></div>
      <Banner error={error} />
      {loading ? <p className="loading">Loading banners…</p> : data.data.map((row) => (
        <article key={row.id} className="panel" style={{ marginBottom: 8 }}>
          <strong>{row.placement}</strong> · {row.title}
          <p>{row.subtitle}</p>
          <button className="btn danger" onClick={() => api(`/api/admin/banners/${row.id}`, { method: 'DELETE' }).then(load)}>Remove</button>
        </article>
      ))}
      {form && (
        <Modal title="Banner" onClose={() => setForm(null)}>
          <form onSubmit={(e) => { e.preventDefault(); const body = new FormData(e.target); api('/api/admin/banners', { method: 'POST', form: body }).then(() => { setForm(null); load(); }); }}>
            <label className="field"><span>Placement</span><select name="placement" defaultValue="promo"><option>hero</option><option>promo</option><option>collection</option></select></label>
            {['title','subtitle','button_text','button_url','display_order'].map((key) => <label key={key} className="field"><span>{key}</span><input name={key} defaultValue={form[key]} required={key === 'title'} /></label>)}
            <label className="field"><span>Image</span><input name="image" type="file" accept="image/*" /></label>
            <label className="field"><span>Status</span><select name="status"><option>active</option><option>inactive</option></select></label>
            <button className="btn">Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function ShippingPage() {
  const { data, error, loading, load } = useLoad('/api/admin/shipping');
  const [form, setForm] = useState({ name: '', charge: 0, eta_label: '', description: '' });
  if (loading) return <p className="loading">Loading shipping…</p>;
  if (error) return <Banner error={error} />;
  return (
    <div>
      <h1>Shipping</h1>
      <p>Free over ₹{data.settings.free_shipping_threshold}. Methods are not tied to a courier API.</p>
      {data.methods.map((method) => <article key={method.id} className="panel" style={{ marginTop: 8 }}><strong>{method.name}</strong> · {inr(method.charge)} · {method.eta_label}<p>{method.description}</p>
        <button className="btn danger" onClick={() => api(`/api/admin/shipping/methods/${method.id}`, { method: 'DELETE' }).then(load)}>Remove</button>
      </article>)}
      <form className="panel" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); api('/api/admin/shipping/methods', { method: 'POST', body: form }).then(load); }}>
        <h2>New method</h2>
        {['name','description','charge','eta_label'].map((key) => <label key={key} className="field"><span>{key}</span><input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <button className="btn">Add method</button>
      </form>
      <h2 style={{ marginTop: 16 }}>Zones</h2>
      {data.zones.map((zone) => <p key={zone.id}>{zone.name} · {zone.countries} · extra {inr(zone.extra_charge)}</p>)}
    </div>
  );
}

export function CmsPage() {
  const { data, error, loading } = useLoad('/api/admin/cms');
  const [page, setPage] = useState(null);
  if (page) return (
    <form onSubmit={(e) => { e.preventDefault(); api(`/api/admin/cms/${page.id}`, { method: 'PUT', body: page }).then(() => setPage(null)); }}>
      <div className="page-title"><h1>{page.title}</h1><button className="btn">Save</button></div>
      <label className="field"><span>Title</span><input value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} /></label>
      <label className="field"><span>Content</span><textarea rows={14} value={page.content} onChange={(e) => setPage({ ...page, content: e.target.value })} /></label>
      <button type="button" className="btn light" onClick={() => setPage(null)}>Back</button>
    </form>
  );
  if (loading) return <p className="loading">Loading pages…</p>;
  if (error) return <Banner error={error} />;
  return (
    <div>
      <h1>Pages</h1>
      {data.data.map((row) => <p key={row.id}><button className="btn light" onClick={() => api(`/api/admin/cms/${row.id}`).then((res) => setPage(res.page))}>{row.title}</button></p>)}
    </div>
  );
}

export function NotificationsPage() {
  const { data, error, loading, load } = useLoad('/api/admin/notifications');
  if (loading) return <p className="loading">Loading notifications…</p>;
  if (error) return <Banner error={error} />;
  return (
    <div>
      <h1>Notifications</h1>
      {data.data.length === 0 && <p className="empty">The desk is quiet.</p>}
      {data.data.map((row) => (
        <article key={row.id} className="panel" style={{ marginTop: 8 }}>
          <strong>{row.title}</strong><p>{row.body}</p>
          {!row.is_read && <button className="btn light" onClick={() => api(`/api/admin/notifications/${row.id}/read`, { method: 'POST' }).then(load)}>Mark read</button>}
        </article>
      ))}
    </div>
  );
}

export function AdminsPage() {
  const { data, error, loading, load } = useLoad('/api/admin/admins');
  const [form, setForm] = useState({ full_name: '', email: '', mobile: '', password: '', role_id: '' });
  if (loading) return <p className="loading">Loading desk users…</p>;
  if (error) return <Banner error={error} />;
  return (
    <div>
      <h1>Desk users</h1>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>{data.admins.map((row) => <tr key={row.id}><td>{row.full_name}</td><td>{row.email}</td><td>{row.role_name}</td><td>{row.status}</td></tr>)}</tbody>
      </table></div>
      <form className="panel" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); api('/api/admin/admins', { method: 'POST', body: { ...form, role_id: Number(form.role_id) } }).then(() => load()); }}>
        <h2>Add a desk user</h2>
        {['full_name','email','mobile','password'].map((key) => <label key={key} className="field"><span>{key}</span><input type={key === 'password' ? 'password' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
        <label className="field"><span>Role</span><select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>{data.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
        <button className="btn">Create</button>
      </form>
    </div>
  );
}

export function ActivityPage() {
  const { data, error, loading } = useLoad('/api/admin/activity');
  if (loading) return <p className="loading">Loading the log…</p>;
  if (error) return <Banner error={error} />;
  return (
    <div>
      <h1>Activity</h1>
      <div className="table-wrap"><table>
        <thead><tr><th>When</th><th>Who</th><th>Module</th><th>What happened</th><th>IP</th></tr></thead>
        <tbody>{data.data.map((row) => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString('en-IN')}</td><td>{row.full_name || '—'}</td><td>{row.module}</td><td>{row.description}</td><td>{row.ip}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

export function SettingsPage() {
  const { data, error, loading, load } = useLoad('/api/admin/settings');
  const [form, setForm] = useState(null);
  useEffect(() => { if (data) setForm(data.settings); }, [data]);
  if (loading || !form) return <p className="loading">Loading settings…</p>;
  if (error) return <Banner error={error} />;
  return (
    <form onSubmit={(e) => { e.preventDefault(); api('/api/admin/settings', { method: 'PUT', body: form }).then(load); }}>
      <div className="page-title"><h1>Settings</h1><button className="btn">Save</button></div>
      <label className="field"><span>Require approval before ordering</span>
        <select value={form.require_customer_approval} onChange={(e) => setForm({ ...form, require_customer_approval: e.target.value })}><option value="true">Yes</option><option value="false">No</option></select>
      </label>
      {['gst_percent','free_shipping_threshold','store_name','support_email','currency'].map((key) => (
        <label key={key} className="field"><span>{key.replaceAll('_', ' ')}</span><input value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>
      ))}
    </form>
  );
}

export function ProfilePage() {
  const { admin, persist } = useDesk();
  const [form, setForm] = useState({ full_name: admin.full_name, mobile: admin.mobile || '', current_password: '', password: '' });
  const [message, setMessage] = useState('');
  return (
    <div>
      <h1>Profile</h1>
      <p>{admin.email} · {admin.role_name}</p>
      <p>Last login {admin.last_login_at ? new Date(admin.last_login_at).toLocaleString('en-IN') : 'this session'}</p>
      <form className="panel" onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.set('full_name', form.full_name);
        data.set('mobile', form.mobile);
        await api('/api/admin/auth/profile', { method: 'PUT', form: data });
        persist({ ...admin, full_name: form.full_name, mobile: form.mobile });
        setMessage('Profile saved.');
      }}>
        <label className="field"><span>Name</span><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
        <label className="field"><span>Mobile</span><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></label>
        <label className="field"><span>Photo</span><input name="profile_image" type="file" accept="image/*" /></label>
        <button className="btn">Save profile</button>
      </form>
      <form className="panel" style={{ marginTop: 12 }} onSubmit={async (e) => { e.preventDefault(); try { await api('/api/admin/auth/password', { method: 'PUT', body: { current_password: form.current_password, password: form.password } }); setMessage('Password updated.'); } catch (err) { setMessage(err.message); } }}>
        <label className="field"><span>Current password</span><input type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} /></label>
        <label className="field"><span>New password</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn">Change password</button>
      </form>
      <button className="btn light" style={{ marginTop: 12 }} onClick={() => api('/api/admin/auth/logout-others', { method: 'POST' }).then(() => setMessage('Other sessions signed out.'))}>Sign out other sessions</button>
      {message && <p>{message}</p>}
    </div>
  );
}
