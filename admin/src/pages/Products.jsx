import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/client';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.products().then((r) => setProducts(r.data || [])).finally(() => setLoading(false));
  }, []);

  const duplicate = async (id) => {
    await adminApi.duplicateProduct(id);
    const r = await adminApi.products();
    setProducts(r.data || []);
  };

  return (
    <AdminLayout title="Products">
      <div className="panel">
        <div className="panel-header">
          <h2>All Products</h2>
          <Link to="/products/new" className="btn btn-primary">Add Product</Link>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {loading ? <div className="loading">Loading...</div> : (
            <table className="data-table">
              <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/products/${p.id}`} style={{ color: 'var(--forest)', fontWeight: 500 }}>{p.name}</Link></td>
                    <td>{p.sku}</td>
                    <td>{p.category_name} / {p.subcategory_name}</td>
                    <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
                    <td>{p.stock}</td>
                    <td>
                      {p.is_published ? <span className="badge badge-green">Published</span> : <span className="badge badge-gray">Draft</span>}
                      {p.is_featured ? <span className="badge badge-orange" style={{ marginLeft: 4 }}>Featured</span> : null}
                    </td>
                    <td>
                      <Link to={`/products/${p.id}`} className="btn btn-sm btn-outline" style={{ marginRight: 4 }}>Edit</Link>
                      <button className="btn btn-sm btn-outline" onClick={() => duplicate(p.id)}>Duplicate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
