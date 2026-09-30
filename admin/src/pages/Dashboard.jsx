import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard().then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout title="Dashboard"><div className="loading">Loading metrics...</div></AdminLayout>;

  return (
    <AdminLayout title="Dashboard">
      <div className="stats-grid">
        <div className="stat-card"><div className="label">Total Revenue</div><div className="value">₹{Number(data?.totalRevenue || 0).toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="label">Total Orders</div><div className="value">{data?.totalOrders || 0}</div></div>
        <div className="stat-card"><div className="label">Today&apos;s Revenue</div><div className="value">₹{Number(data?.todayRevenue || 0).toLocaleString('en-IN')}</div></div>
        <div className="stat-card"><div className="label">Customers</div><div className="value">{data?.totalCustomers || 0}</div></div>
        <div className="stat-card"><div className="label">Pending Approval</div><div className="value">{data?.pendingApproval || 0}</div></div>
        <div className="stat-card"><div className="label">Low Stock</div><div className="value">{data?.lowStock || 0}</div></div>
      </div>
      <div className="panel">
        <div className="panel-header"><h2>Recent Orders</h2></div>
        <div className="panel-body" style={{ padding: 0 }}>
          {data?.recentOrders?.length ? (
            <table className="data-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{o.customer_name}</td>
                    <td>₹{Number(o.total_amount).toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${o.status === 'delivered' ? 'green' : 'orange'}`}>{o.status}</span></td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">No orders yet</div>}
        </div>
      </div>
    </AdminLayout>
  );
}
