import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/client';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const load = () => adminApi.customers().then((r) => setCustomers(r.data || []));
  useEffect(() => { load(); }, []);

  const approve = async (id, approved) => { await adminApi.approveCustomer(id, approved); load(); };
  const block = async (id, blocked) => { await adminApi.blockCustomer(id, blocked); load(); };

  return (
    <AdminLayout title="Customers">
      <div className="panel"><div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Verified</th><th>Approved</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.email}</td><td>{c.mobile}</td>
                <td>{c.is_verified ? '✓' : '—'}</td>
                <td>{c.is_approved ? <span className="badge badge-green">Yes</span> : <span className="badge badge-orange">Pending</span>}</td>
                <td>{c.is_blocked ? <span className="badge badge-orange">Blocked</span> : <span className="badge badge-green">Active</span>}</td>
                <td>
                  {!c.is_approved && <button className="btn btn-sm btn-primary" style={{ marginRight: 4 }} onClick={() => approve(c.id, true)}>Approve</button>}
                  {c.is_approved && <button className="btn btn-sm btn-outline" style={{ marginRight: 4 }} onClick={() => approve(c.id, false)}>Revoke</button>}
                  <button className="btn btn-sm btn-danger" onClick={() => block(c.id, !c.is_blocked)}>{c.is_blocked ? 'Unblock' : 'Block'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </AdminLayout>
  );
}
