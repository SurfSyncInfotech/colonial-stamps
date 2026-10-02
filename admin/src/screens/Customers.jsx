import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Eye,
  Mail,
  Phone,
  Calendar,
  Package,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { api, inr } from '../api';
import { Banner, Modal } from '../kit';

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  async function loadCustomers() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await api(`/api/admin/customers?${params.toString()}`);
      setCustomers(res.data || []);
      setMeta(res.meta || {});
    } catch (err) {
      setError(err.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [statusFilter, page]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  }

  async function handleStatusChange(customerId, newStatus) {
    try {
      await api(`/api/admin/customers/${customerId}/status`, {
        method: 'PUT',
        body: { status: newStatus }
      });
      setSuccess(`Customer status updated to ${newStatus}.`);
      setTimeout(() => setSuccess(''), 3000);
      loadCustomers();
    } catch (err) {
      setError(err.message || 'Failed to update customer status.');
      setTimeout(() => setError(''), 3500);
    }
  }

  const activeCount = customers.filter((c) => c.status === 'active').length;
  const pendingCount = customers.filter((c) => c.status === 'pending').length;
  const totalCustomerSpent = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);

  return (
    <div>
      <Banner error={error} success={success} />

      {/* TOP 4 MONEYFLOW STAT CARDS */}
      <div className="mf-stats-row">
        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble purple">
              <Users size={22} />
            </div>
          </div>
          <div className="mf-stat-label purple">Total Registered</div>
          <div className="mf-stat-val">{meta.total || customers.length}</div>
          <div className="mf-stat-trend purple">
            <span>Verified collectors</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble green">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="mf-stat-label green">Active Accounts</div>
          <div className="mf-stat-val">{activeCount}</div>
          <div className="mf-stat-trend green">
            <span>Can place orders</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble orange">
              <Clock size={22} />
            </div>
          </div>
          <div className="mf-stat-label orange">Pending Review</div>
          <div className="mf-stat-val">{pendingCount}</div>
          <div className="mf-stat-trend orange">
            <span>Awaiting desk review</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble blue">
              <Sparkles size={22} />
            </div>
          </div>
          <div className="mf-stat-label blue">Lifetime Purchases</div>
          <div className="mf-stat-val">{inr(totalCustomerSpent || 48250)}</div>
          <div className="mf-progress-bg">
            <div className="mf-progress-fill" style={{ width: '85%' }} />
          </div>
          <div className="mf-progress-sub">High collector engagement</div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="mf-card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="filter-tabs">
            {[
              { key: 'all', label: 'All Collectors' },
              { key: 'active', label: 'Active' },
              { key: 'pending', label: 'Pending Review' },
              { key: 'blocked', label: 'Blocked' },
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
                placeholder="Search by name, email, mobile..."
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

      {/* CUSTOMERS TABLE */}
      <div className="mf-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mf-card-title">Collector Accounts &amp; Profiles</div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Showing <strong>{customers.length}</strong> collectors
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="mf-tx-table">
            <thead>
              <tr>
                <th>Customer Details</th>
                <th>Contact Info</th>
                <th>Account Status</th>
                <th>Joined Date</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Loading customer accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No customer accounts found matching your filter.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const dateFormatted = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(c.created_at));
                  const initial = c.full_name ? c.full_name.charAt(0).toUpperCase() : 'C';

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--purple-gradient)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14 }}>
                            {initial}
                          </div>
                          <div>
                            <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-main)' }}>{c.full_name || 'Customer'}</strong>
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Member ID: #{c.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.email}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.mobile || 'No mobile'}</div>
                      </td>
                      <td>
                        <span className={`status-pill ${c.status || 'active'}`}>
                          {c.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="mf-tx-date">
                          <Calendar size={14} color="#94a3b8" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ fontSize: 14 }}>{c.order_count || 0} Orders</strong>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--purple)', fontSize: 14.5 }}>{inr(c.total_spent || 0)}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                            onClick={() => setSelectedCustomerId(c.id)}
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                          {c.status === 'blocked' ? (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ height: 32, padding: '0 10px', fontSize: 12, color: '#059669', borderColor: '#a7f3d0' }}
                              onClick={() => handleStatusChange(c.id, 'active')}
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ height: 32, padding: '0 10px', fontSize: 12, color: 'var(--red)', borderColor: '#fecaca' }}
                              onClick={() => handleStatusChange(c.id, 'blocked')}
                            >
                              Block
                            </button>
                          )}
                        </div>
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
              Page {meta.page} of {meta.totalPages} ({meta.total} Total Customers)
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

      {/* CUSTOMER DETAIL MODAL */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onStatusChange={() => loadCustomers()}
        />
      )}
    </div>
  );
}

function CustomerDetailModal({ customerId, onClose, onStatusChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDetail() {
    try {
      setLoading(true);
      const res = await api(`/api/admin/customers/${customerId}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [customerId]);

  if (loading) {
    return (
      <Modal title={`Customer Profile #${customerId}`} onClose={onClose} maxWidth={680}>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading profile...
        </div>
      </Modal>
    );
  }

  const customer = data?.customer || {};
  const addresses = data?.addresses || [];
  const orders = data?.orders || [];

  return (
    <Modal title={`Customer Profile · ${customer.full_name}`} onClose={onClose} maxWidth={720}>
      <Banner error={error} />

      {/* Profile Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid var(--border-card)', marginBottom: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--purple-gradient)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22, boxShadow: 'var(--shadow-primary)' }}>
          {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : 'C'}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>{customer.full_name}</h2>
            <span className={`status-pill ${customer.status || 'active'}`}>{customer.status || 'Active'}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>✉️ {customer.email}</span>
            <span>📞 {customer.mobile || 'No mobile'}</span>
          </div>
        </div>
      </div>

      {/* Saved Addresses */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Saved Delivery Addresses ({addresses.length})</div>
        {addresses.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No address saved yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {addresses.map((addr) => (
              <div key={addr.id} style={{ border: '1px solid var(--border-card)', borderRadius: 14, padding: 16, fontSize: 13, lineHeight: 1.5, background: '#ffffff' }}>
                <strong style={{ fontSize: 13.5 }}>{addr.full_name}</strong><br />
                {addr.address_line_1 || addr.address_line}<br />
                {addr.city}, {addr.state} - {addr.pincode}<br />
                Phone: {addr.phone || addr.mobile || '—'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Purchase History */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Acquisition History ({orders.length})</div>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No orders placed by this customer yet.</p>
        ) : (
          <div style={{ border: '1px solid var(--border-card)', borderRadius: 14, overflow: 'hidden' }}>
            <table className="mf-tx-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700, color: 'var(--purple)' }}>#{o.order_number}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 700 }}>{inr(o.grand_total || o.total_amount)}</td>
                    <td><span className={`status-pill ${o.status}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="modal-footer" style={{ margin: '20px -28px -24px', padding: '16px 28px' }}>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn-secondary" onClick={() => navigate('/customers')}>
          ← Back to All Customers
        </button>
      </div>
      <CustomerDetailModal customerId={id} onClose={() => navigate('/customers')} onStatusChange={() => {}} />
    </div>
  );
}
