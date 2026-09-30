import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../api/client';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [form, setForm] = useState({
    name: '', sku: '', description: '', shortDescription: '', price: '', compareAtPrice: '',
    stock: 0, categoryId: '', subcategoryId: '', stampYear: '', stampCountry: '', stampCondition: 'mint',
    stampTheme: '', isFeatured: false, isNew: false, isPublished: false,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.categories().then((r) => setCategories(r.data || []));
    if (!isNew) {
      adminApi.product(id).then((r) => {
        const p = r.data;
        setForm({
          name: p.name, sku: p.sku, description: p.description || '', shortDescription: p.short_description || '',
          price: p.price, compareAtPrice: p.compare_at_price || '', stock: p.stock,
          categoryId: p.categoryId, subcategoryId: p.subcategory_id,
          stampYear: p.stamp_year || '', stampCountry: p.stamp_country || '', stampCondition: p.stamp_condition || 'mint',
          stampTheme: p.stamp_theme || '', isFeatured: !!p.is_featured, isNew: !!p.is_new, isPublished: !!p.is_published,
        });
        if (p.categoryId) adminApi.subcategories(p.categoryId).then((s) => setSubcategories(s.data || []));
      });
    }
  }, [id, isNew]);

  const onCategoryChange = (catId) => {
    setForm({ ...form, categoryId: catId, subcategoryId: '' });
    adminApi.subcategories(catId).then((r) => setSubcategories(r.data || []));
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...form, price: parseFloat(form.price), compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : null, subcategoryId: parseInt(form.subcategoryId, 10), categoryId: parseInt(form.categoryId, 10) };
      if (isNew) await adminApi.createProduct(body);
      else await adminApi.updateProduct(id, body);
      navigate('/products');
    } catch (err) { setError(err.message); }
  };

  return (
    <AdminLayout title={isNew ? 'New Product' : 'Edit Product'}>
      <form onSubmit={save} className="panel">
        <div className="panel-body">
          <div className="form-row">
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>SKU</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={form.categoryId} onChange={(e) => onCategoryChange(e.target.value)} required>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Subcategory</label>
              <select value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} required>
                <option value="">Select subcategory</option>
                {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Price (₹)</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
            <div className="form-group"><label>Compare at Price</label><input type="number" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Stock</label><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div className="form-group"><label>Condition</label>
              <select value={form.stampCondition} onChange={(e) => setForm({ ...form, stampCondition: e.target.value })}>
                <option value="mint">Mint</option><option value="near_mint">Near Mint</option><option value="used">Used</option><option value="fine_used">Fine Used</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Year</label><input value={form.stampYear} onChange={(e) => setForm({ ...form, stampYear: e.target.value })} /></div>
            <div className="form-group"><label>Country</label><input value={form.stampCountry} onChange={(e) => setForm({ ...form, stampCountry: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Theme</label><input value={form.stampTheme} onChange={(e) => setForm({ ...form, stampTheme: e.target.value })} /></div>
          <div className="form-group"><label>Description</label><textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <label><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label>
            <label><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
            <label><input type="checkbox" checked={form.isNew} onChange={(e) => setForm({ ...form, isNew: e.target.checked })} /> New</label>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary">Save Product</button>
        </div>
      </form>
    </AdminLayout>
  );
}
