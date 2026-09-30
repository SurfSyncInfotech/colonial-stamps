import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/client';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { adminApi.orders().then((r) => setOrders(r.data || [])); }, []);
  return (
    <AdminLayout title="Orders">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Payment</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.order_number}</td><td>{o.customer_name}</td>
                <td>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                <td><span className="badge badge-orange">{o.status}</span></td>
                <td>{o.payment_status}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td><Link to={`/orders/${o.id}`} className="btn btn-sm btn-outline">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState('');

  useEffect(() => { adminApi.order(id).then((r) => { setOrder(r.data); setStatus(r.data.status); setTracking(r.data.tracking_number || ''); }); }, [id]);

  const update = async () => {
    await adminApi.updateOrderStatus(id, { status, note, trackingNumber: tracking });
    const r = await adminApi.order(id);
    setOrder(r.data);
  };

  if (!order) return <AdminLayout title="Order"><div className="loading">Loading...</div></AdminLayout>;

  return (
    <AdminLayout title={`Order ${order.order_number}`}>
      <div className="panel"><div className="panel-body">
        <p><strong>Customer:</strong> {order.customer?.name} ({order.customer?.email})</p>
        <p><strong>Total:</strong> ₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
        <table className="data-table" style={{ marginTop: 16 }}>
          <thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>{order.items?.map((i) => <tr key={i.id}><td>{i.product_name}</td><td>{i.product_sku}</td><td>{i.quantity}</td><td>₹{Number(i.line_total).toLocaleString('en-IN')}</td></tr>)}</tbody>
        </table>
        <h3 style={{ marginTop: 24, fontFamily: 'var(--serif)' }}>Update Status</h3>
        <div className="form-row">
          <div className="form-group"><label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {['pending','confirmed','processing','shipped','delivered','cancelled','refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Tracking #</label><input value={tracking} onChange={(e) => setTracking(e.target.value)} /></div>
        </div>
        <div className="form-group"><label>Note</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <button className="btn btn-primary" onClick={update}>Update Order</button>
        <h3 style={{ marginTop: 24, fontFamily: 'var(--serif)' }}>Timeline</h3>
        {order.history?.map((h) => <div key={h.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}><strong>{h.status}</strong> — {h.note} <small style={{ color: 'var(--muted)' }}>{new Date(h.created_at).toLocaleString()}</small></div>)}
      </div></div>
    </AdminLayout>
  );
}
