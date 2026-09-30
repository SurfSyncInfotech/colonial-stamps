import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/client';

export function Coupons() {
  const [items, setItems] = useState([]);
  useEffect(() => { adminApi.coupons().then((r) => setItems(r.data || [])); }, []);
  return (
    <AdminLayout title="Coupons">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Order</th><th>Used</th><th>Active</th></tr></thead>
          <tbody>{items.map((c) => <tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.discount_type}</td><td>{c.discount_value}</td><td>₹{c.min_order_amount}</td><td>{c.used_count}/{c.usage_limit || '∞'}</td><td>{c.is_active ? 'Yes' : 'No'}</td></tr>)}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function Reviews() {
  const [items, setItems] = useState([]);
  const load = () => adminApi.reviews().then((r) => setItems(r.data || []));
  useEffect(() => { load(); }, []);
  const approve = async (id, approved) => { await adminApi.updateReview(id, { isApproved: approved }); load(); };
  return (
    <AdminLayout title="Reviews">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Product</th><th>Customer</th><th>Rating</th><th>Title</th><th>Approved</th><th>Actions</th></tr></thead>
          <tbody>{items.map((r) => (
            <tr key={r.id}>
              <td>{r.product_name}</td><td>{r.customer_name}</td><td>{'★'.repeat(r.rating)}</td><td>{r.title}</td>
              <td>{r.is_approved ? <span className="badge badge-green">Yes</span> : <span className="badge badge-orange">Pending</span>}</td>
              <td><button className="btn btn-sm btn-primary" onClick={() => approve(r.id, !r.is_approved)}>{r.is_approved ? 'Unapprove' : 'Approve'}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function Banners() {
  const [items, setItems] = useState([]);
  useEffect(() => { adminApi.banners().then((r) => setItems(r.data || [])); }, []);
  return (
    <AdminLayout title="Banners">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Subtitle</th><th>Placement</th><th>Active</th></tr></thead>
          <tbody>{items.map((b) => <tr key={b.id}><td>{b.title}</td><td>{b.subtitle}</td><td>{b.placement}</td><td>{b.is_active ? 'Yes' : 'No'}</td></tr>)}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function Shipping() {
  const [items, setItems] = useState([]);
  useEffect(() => { adminApi.shipping().then((r) => setItems(r.data || [])); }, []);
  return (
    <AdminLayout title="Shipping Methods">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Carrier</th><th>Base Rate</th><th>Per Kg</th><th>Est. Days</th><th>Active</th></tr></thead>
          <tbody>{items.map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.carrier}</td><td>₹{s.base_rate}</td><td>₹{s.rate_per_kg}</td><td>{s.estimated_days_min}-{s.estimated_days_max}</td><td>{s.is_active ? 'Yes' : 'No'}</td></tr>)}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function CmsPages() {
  const [items, setItems] = useState([]);
  useEffect(() => { adminApi.cmsPages().then((r) => setItems(r.data || [])); }, []);
  return (
    <AdminLayout title="CMS Pages">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Slug</th><th>Published</th></tr></thead>
          <tbody>{items.map((p) => <tr key={p.id}><td>{p.title}</td><td>{p.slug}</td><td>{p.is_published ? 'Yes' : 'No'}</td></tr>)}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function Categories() {
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);
  useEffect(() => {
    adminApi.categories().then((r) => setCats(r.data || []));
    adminApi.subcategories().then((r) => setSubs(r.data || []));
  }, []);
  return (
    <AdminLayout title="Categories">
      <div className="panel"><div className="panel-header"><h2>Categories</h2></div><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Slug</th><th>Active</th></tr></thead>
          <tbody>{cats.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.slug}</td><td>{c.is_active ? 'Yes' : 'No'}</td></tr>)}</tbody>
        </table>
      </div></div>
      <div className="panel"><div className="panel-header"><h2>Subcategories</h2></div><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Slug</th></tr></thead>
          <tbody>{subs.map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.category_name}</td><td>{s.slug}</td></tr>)}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => { adminApi.adminUsers().then((r) => setUsers(r.data || [])); }, []);
  return (
    <AdminLayout title="Admin Users">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last Login</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role_name}</td><td>{u.is_active ? 'Yes' : 'No'}</td><td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td></tr>)}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { adminApi.activityLogs().then((r) => setLogs(r.data || [])); }, []);
  return (
    <AdminLayout title="Activity Logs">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Admin</th><th>Action</th><th>Entity</th><th>Date</th></tr></thead>
          <tbody>{logs.map((l) => <tr key={l.id}><td>{l.admin_name || '—'}</td><td>{l.action}</td><td>{l.entity_type} #{l.entity_id}</td><td>{new Date(l.created_at).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function Settings() {
  const [approval, setApproval] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { adminApi.settings().then((r) => setApproval(r.data?.customer_approval_required === true || r.data?.customer_approval_required === 'true')); }, []);
  const save = async () => {
    await adminApi.updateSettings({ customer_approval_required: approval });
    setSaved(true);
  };
  return (
    <AdminLayout title="Settings">
      <div className="panel"><div className="panel-body">
        <div className="form-group">
          <label><input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} /> Require customer approval before checkout</label>
        </div>
        <button className="btn btn-primary" onClick={save}>Save Settings</button>
        {saved && <p style={{ color: 'var(--forest)', marginTop: 8 }}>Settings saved</p>}
      </div></div>
    </AdminLayout>
  );
}

export function Analytics() {
  const [data, setData] = useState([]);
  useEffect(() => { adminApi.analytics(30).then((r) => setData(r.data || [])); }, []);
  return (
    <AdminLayout title="Analytics">
      <div className="panel">
        <div className="panel-header"><h2>Sales (Last 30 Days)</h2><a href="/api/admin/analytics/export/orders" className="btn btn-outline btn-sm" target="_blank" rel="noreferrer">Export CSV</a></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr></thead>
            <tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.orders}</td><td>₹{Number(d.revenue || 0).toLocaleString('en-IN')}</td></tr>)}</tbody>
          </table>
          {!data.length && <div className="empty">No sales data yet</div>}
        </div>
      </div>
    </AdminLayout>
  );
}

export function Inventory() {
  const [products, setProducts] = useState([]);
  useEffect(() => { adminApi.products().then((r) => setProducts(r.data || [])); }, []);
  const adjust = async (productId) => {
    const qty = prompt('Adjustment quantity (+ or -):');
    if (!qty) return;
    await adminApi.adjustInventory({ productId, quantityChange: parseInt(qty, 10), type: 'correction', reason: 'Manual adjustment' });
    const r = await adminApi.products();
    setProducts(r.data || []);
  };
  return (
    <AdminLayout title="Inventory">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Reserved</th><th>Actions</th></tr></thead>
          <tbody>{products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td><td>{p.sku}</td>
              <td style={{ color: p.stock < 5 ? 'var(--sale)' : 'inherit', fontWeight: p.stock < 5 ? 600 : 400 }}>{p.stock}</td>
              <td>{p.reserved_stock}</td>
              <td><button className="btn btn-sm btn-outline" onClick={() => adjust(p.id)}>Adjust</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function GlobalSearch() {
  const [results, setResults] = useState(null);
  const q = new URLSearchParams(window.location.search).get('q') || '';
  useEffect(() => { if (q) adminApi.search(q).then((r) => setResults(r.data)); }, [q]);
  return (
    <AdminLayout title={`Search: ${q}`}>
      {results ? (
        <>
          <div className="panel"><div className="panel-header"><h2>Products</h2></div><div className="panel-body" style={{ padding: 0 }}>
            <table className="data-table"><tbody>{results.products?.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.sku}</td></tr>)}</tbody></table>
          </div></div>
          <div className="panel"><div className="panel-header"><h2>Orders</h2></div><div className="panel-body" style={{ padding: 0 }}>
            <table className="data-table"><tbody>{results.orders?.map((o) => <tr key={o.id}><td>{o.order_number}</td><td>{o.status}</td></tr>)}</tbody></table>
          </div></div>
          <div className="panel"><div className="panel-header"><h2>Customers</h2></div><div className="panel-body" style={{ padding: 0 }}>
            <table className="data-table"><tbody>{results.customers?.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.email}</td></tr>)}</tbody></table>
          </div></div>
        </>
      ) : <div className="loading">Searching...</div>}
    </AdminLayout>
  );
}
