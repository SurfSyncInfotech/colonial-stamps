import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  FileText,
  User,
  MapPin,
  CreditCard,
  PackageCheck,
  ChevronRight,
  Send,
  AlertCircle,
  Calendar,
  MoreVertical,
  ArrowUpRight
} from 'lucide-react';
import { api, inr } from '../api';
import { Banner, Modal } from '../kit';

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [selectedOrderId, setSelectedOrderId] = useState(null);

  async function loadOrders() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') params.set('status', 'placed');
        else if (statusFilter === 'shipping') params.set('status', 'shipped');
        else params.set('status', statusFilter);
      }
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await api(`/api/admin/orders?${params.toString()}`);
      setOrders(res.data || []);
      setMeta(res.meta || {});
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [statusFilter, page]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadOrders();
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      await api(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: { status: newStatus, note: `Status manually updated to ${newStatus} by admin.` }
      });
      setSuccess(`Order #${orderId} marked as ${newStatus}.`);
      setTimeout(() => setSuccess(''), 3500);
      loadOrders();
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
      setTimeout(() => setError(''), 4000);
    }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grand_total || o.total_amount || 0), 0);
  const pendingCount = orders.filter((o) => ['placed', 'under_review', 'pending'].includes(o.status)).length;
  const shippedCount = orders.filter((o) => ['shipped', 'out_for_delivery', 'in_transit'].includes(o.status)).length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <div>
      <Banner error={error} success={success} />

      {/* TOP 4 MONEYFLOW STAT CARDS */}
      <div className="mf-stats-row">
        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble purple">
              <ShoppingCart size={22} />
            </div>
          </div>
          <div className="mf-stat-label purple">Total Orders Placed</div>
          <div className="mf-stat-val">{meta.total || orders.length}</div>
          <div className="mf-stat-trend purple">
            <span>Customer acquisitions</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble orange">
              <Clock size={22} />
            </div>
          </div>
          <div className="mf-stat-label orange">Pending Dispatch</div>
          <div className="mf-stat-val">{pendingCount}</div>
          <div className="mf-stat-trend orange">
            <span>Awaiting packing/seal</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble blue">
              <Truck size={22} />
            </div>
          </div>
          <div className="mf-stat-label blue">In Transit / Courier</div>
          <div className="mf-stat-val">{shippedCount}</div>
          <div className="mf-stat-trend blue">
            <span>Dispatched via EMS</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble green">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="mf-stat-label green">Delivered &amp; Paid</div>
          <div className="mf-stat-val">{deliveredCount}</div>
          <div className="mf-progress-bg">
            <div className="mf-progress-fill" style={{ width: `${Math.min(100, Math.max(20, (deliveredCount / (orders.length || 1)) * 100))}%`, background: '#10b981' }} />
          </div>
          <div className="mf-progress-sub">Orders fulfilled successfully</div>
        </div>
      </div>

      {/* FILTER BAR & SEARCH */}
      <div className="mf-card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="filter-tabs">
            {[
              { key: 'all', label: 'All Orders' },
              { key: 'pending', label: 'Pending' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'shipping', label: 'Shipping / Dispatched' },
              { key: 'delivered', label: 'Delivered' },
              { key: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`filter-tab ${statusFilter === tab.key ? 'active' : ''}`}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <div className="search-box" style={{ width: 280 }}>
              <Search size={15} />
              <input
                placeholder="Search order #, customer, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: 38 }}
              />
            </div>
            <button type="submit" className="btn-secondary" style={{ height: 38 }}>
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="mf-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mf-card-title">Order Shipments &amp; Transactions</div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Showing <strong>{orders.length}</strong> orders
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="mf-tx-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Date &amp; Time</th>
                <th>Customer Details</th>
                <th>Payment Method</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Manual Status Manager</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No orders found matching this filter.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const dateFormatted = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(order.created_at));

                  return (
                    <tr key={order.id}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--purple)', fontWeight: 800, fontSize: 14, cursor: 'pointer', textAlign: 'left' }}
                        >
                          #{order.order_number}
                        </button>
                      </td>
                      <td>
                        <div className="mf-tx-date">
                          <Calendar size={14} color="#94a3b8" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{order.full_name || 'Collector'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.email}</div>
                      </td>
                      <td>
                        <div className="mf-pay-pill">
                          <CreditCard size={15} color="#64748b" />
                          <span style={{ textTransform: 'uppercase' }}>{order.payment_status || 'Paid'}</span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: 14.5, color: 'var(--text-main)' }}>
                          {inr(order.grand_total || order.total_amount)}
                        </strong>
                      </td>
                      <td>
                        <span className={`status-pill ${order.status}`}>
                          {order.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ height: 34, padding: '0 10px', fontSize: 12.5, width: 150, fontWeight: 600 }}
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        >
                          <option value="placed">Pending (Placed)</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipping (Dispatched)</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Page {meta.page} of {meta.totalPages} ({meta.total} Total Records)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ORDER DETAIL MODAL */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusUpdated={() => loadOrders()}
        />
      )}
    </div>
  );
}

function OrderDetailModal({ orderId, onClose, onStatusUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courier, setCourier] = useState('India Post EMS / Insured Dispatch');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  async function loadDetail() {
    try {
      setLoading(true);
      const res = await api(`/api/admin/orders/${orderId}`);
      setData(res);
      setStatus(res.order?.status || 'placed');
      setTrackingNumber(res.shipping?.tracking_number || '');
      setCourier(res.shipping?.courier || 'India Post EMS / Insured Dispatch');
    } catch (err) {
      setError(err.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [orderId]);

  async function handleSaveStatus(e) {
    e.preventDefault();
    try {
      setUpdating(true);
      await api(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        body: { status, note: note.trim() || `Status manually set to ${status}` }
      });

      if (trackingNumber.trim()) {
        await api(`/api/admin/orders/${orderId}/shipping`, {
          method: 'PUT',
          body: {
            courier,
            tracking_number: trackingNumber.trim(),
            shipping_status: status === 'delivered' ? 'delivered' : 'in_transit'
          }
        });
      }

      setUpdateMsg('Order status and dispatch details saved.');
      setTimeout(() => setUpdateMsg(''), 3000);
      onStatusUpdated();
      loadDetail();
    } catch (err) {
      setError(err.message || 'Failed to update order.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <Modal title={`Order #${orderId}`} onClose={onClose} maxWidth={720}>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading order details...
        </div>
      </Modal>
    );
  }

  const order = data?.order || {};
  const items = data?.items || [];
  const shipping = data?.shipping || {};

  return (
    <Modal title={`Order #${order.order_number || orderId}`} onClose={onClose} maxWidth={760}>
      <Banner error={error} success={updateMsg} />

      {/* Header Info Banner */}
      <div style={{ background: '#f8fafc', border: '1px solid var(--border-card)', borderRadius: 16, padding: 20, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Date Placed</span>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>
            {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Current Status</span>
          <div style={{ marginTop: 4 }}>
            <span className={`status-pill ${order.status}`}>{order.status?.replace('_', ' ')}</span>
          </div>
        </div>
        <div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Payment Method</span>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, textTransform: 'uppercase' }}>
            {order.payment_method || 'Online'}
          </div>
        </div>
        <div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Grand Total</span>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--purple)', marginTop: 2 }}>
            {inr(order.grand_total || order.total_amount)}
          </div>
        </div>
      </div>

      {/* 2-Column: Customer & Shipping Address */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ border: '1px solid var(--border-card)', borderRadius: 14, padding: 18, background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text-main)' }}>
            <User size={16} color="var(--purple)" />
            <span>Customer Information</span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            <strong>{order.full_name}</strong><br />
            Email: <a href={`mailto:${order.email}`} style={{ color: 'var(--purple)', fontWeight: 600 }}>{order.email}</a><br />
            Phone: {order.mobile || '—'}
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-card)', borderRadius: 14, padding: 18, background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--purple)' }}>
            <MapPin size={16} color="var(--purple)" />
            <span>Shipping Destination</span>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-main)' }}>{order.shipping_name || order.full_name}</strong><br />
            {order.shipping_address_1 || order.shipping_address}<br />
            {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode || order.shipping_postal_code}<br />
            {order.shipping_country || 'India'}
          </div>
        </div>
      </div>

      {/* Ordered Items Table */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Purchased Stamp Specimens ({items.length})</div>
        <div style={{ border: '1px solid var(--border-card)', borderRadius: 14, overflow: 'hidden' }}>
          <table className="mf-tx-table">
            <thead>
              <tr>
                <th>Stamp Details</th>
                <th>Unit Price</th>
                <th>Qty</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.product_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU: {item.sku || '—'}</div>
                  </td>
                  <td>{inr(item.unit_price)}</td>
                  <td><strong>× {item.quantity}</strong></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{inr(item.line_total || item.unit_price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status & Tracking Manager Form */}
      <div style={{ background: '#f8fafc', border: '1px solid var(--border-card)', borderRadius: 16, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={16} color="var(--purple)" />
          <span>Manual Status &amp; Tracking Update</span>
        </div>

        <form onSubmit={handleSaveStatus}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Delivery Status *</label>
              <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="placed">Pending (Placed)</option>
                <option value="confirmed">Confirmed / Processing</option>
                <option value="shipped">Shipping (Dispatched / In Transit)</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Courier Tracking Number</label>
              <input
                className="form-control"
                placeholder="e.g. IN73829104829"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Admin Internal Note / Dispatch Remark (Optional)</label>
            <input
              className="form-control"
              placeholder="e.g. Moisture-proof archival packaging completed."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn-primary" disabled={updating}>
              <Send size={14} />
              <span>{updating ? 'Saving...' : 'Save Order Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn-secondary" onClick={() => navigate('/orders')}>
          ← Back to All Orders
        </button>
      </div>
      <OrderDetailModal orderId={id} onClose={() => navigate('/orders')} onStatusUpdated={() => {}} />
    </div>
  );
}
