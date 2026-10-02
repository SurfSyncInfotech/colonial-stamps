import { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  ChevronRight,
  FolderTree,
  FolderPlus,
  PackagePlus,
  Boxes,
  Search,
  CheckCircle2,
  AlertTriangle,
  Upload,
  MoreVertical,
  Building,
  Sparkles,
  Package,
  TrendingUp,
  X
} from 'lucide-react';
import { api, inr } from '../api';
import { Banner, Confirm, Modal } from '../kit';

export function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'categories' | 'subcategories'
  const [filterCatId, setFilterCatId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [catModal, setCatModal] = useState({ open: false, item: null });
  const [subModal, setSubModal] = useState({ open: false, item: null, parentId: null });
  const [prodModal, setProdModal] = useState({ open: false, categoryId: '', subcategoryId: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const [catsRes, subsRes] = await Promise.all([
        api('/api/admin/categories'),
        api('/api/admin/subcategories')
      ]);
      setCategories(catsRes.data || []);
      setSubcategories(subsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function notifyMsg(msg, isErr = false) {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(''), 4000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 4000);
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'cat') {
        await api(`/api/admin/categories/${deleteConfirm.id}`, { method: 'DELETE' });
        notifyMsg(`Category "${deleteConfirm.name}" deleted successfully.`);
      } else {
        await api(`/api/admin/subcategories/${deleteConfirm.id}`, { method: 'DELETE' });
        notifyMsg(`Subcategory "${deleteConfirm.name}" deleted successfully.`);
      }
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      notifyMsg(err.message || 'Failed to delete record.', true);
      setDeleteConfirm(null);
    }
  }

  const totalStamps = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);

  const filteredSubs = subcategories.filter((s) => {
    const matchCat = filterCatId === 'all' || String(s.category_id) === String(filterCatId);
    const matchQ = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div>
      <Banner error={error} success={success} />

      {/* TOP 4 MONEYFLOW STAT CARDS */}
      <div className="mf-stats-row">
        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble purple">
              <Layers size={22} />
            </div>
          </div>
          <div className="mf-stat-label purple">Total Categories</div>
          <div className="mf-stat-val">{categories.length}</div>
          <div className="mf-stat-trend purple">
            <span>Primary Stamp Groups</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble green">
              <FolderTree size={22} />
            </div>
          </div>
          <div className="mf-stat-label green">Total Subcategories</div>
          <div className="mf-stat-val">{subcategories.length}</div>
          <div className="mf-stat-trend green">
            <span>Unlimited nesting enabled</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble orange">
              <Package size={22} />
            </div>
          </div>
          <div className="mf-stat-label orange">Total Stamp Items</div>
          <div className="mf-stat-val">{totalStamps}</div>
          <div className="mf-stat-trend orange">
            <span>Across all subcategories</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble blue">
              <Sparkles size={22} />
            </div>
          </div>
          <div className="mf-stat-label blue">Catalog Status</div>
          <div className="mf-stat-val">100%</div>
          <div className="mf-progress-bg">
            <div className="mf-progress-fill" style={{ width: '100%' }} />
          </div>
          <div className="mf-progress-sub">All categories synchronized</div>
        </div>
      </div>

      {/* HEADER & ACTION BAR */}
      <div className="mf-card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-tab ${activeTab === 'tree' ? 'active' : ''}`}
              onClick={() => setActiveTab('tree')}
            >
              Catalog Hierarchy
            </button>
            <button
              type="button"
              className={`filter-tab ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              All Categories ({categories.length})
            </button>
            <button
              type="button"
              className={`filter-tab ${activeTab === 'subcategories' ? 'active' : ''}`}
              onClick={() => setActiveTab('subcategories')}
            >
              All Subcategories ({subcategories.length})
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {activeTab === 'subcategories' && (
              <select
                className="form-control"
                style={{ width: 'auto', height: 38 }}
                value={filterCatId}
                onChange={(e) => setFilterCatId(e.target.value)}
              >
                <option value="all">All Parent Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCatModal({ open: true, item: null })}
            >
              <FolderPlus size={16} color="var(--purple)" />
              <span>+ New Category</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() => setSubModal({ open: true, item: null, parentId: categories[0]?.id || '' })}
            >
              <Plus size={16} />
              <span>+ New Subcategory</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: CATALOG HIERARCHY TREE */}
      {activeTab === 'tree' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {categories.map((cat) => {
            const catSubs = subcategories.filter((s) => s.category_id === cat.id);
            return (
              <div key={cat.id} className="mf-card" style={{ padding: '22px 26px' }}>
                {/* Category Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 18, borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover', border: '1.5px solid var(--border-card)' }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--purple-gradient)', color: 'white', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' }}>
                        <Layers size={24} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ fontSize: 19, fontWeight: 800 }}>{cat.name}</h2>
                        <span className={`status-pill ${cat.status || 'active'}`}>{cat.status || 'Active'}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, maxWidth: 540 }}>
                        {cat.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ height: 36, fontSize: 13 }}
                      onClick={() => setSubModal({ open: true, item: null, parentId: cat.id })}
                    >
                      <Plus size={14} />
                      <span>+ Subcategory</span>
                    </button>

                    <button
                      type="button"
                      className="btn-icon"
                      title="Edit Category"
                      onClick={() => setCatModal({ open: true, item: cat })}
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn-icon"
                      style={{ color: 'var(--red)' }}
                      title="Delete Category"
                      onClick={() => setDeleteConfirm({ type: 'cat', id: cat.id, name: cat.name })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Subcategories Grid inside this category */}
                <div style={{ paddingTop: 18 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                    Subcategories in {cat.name} ({catSubs.length})
                  </div>

                  {catSubs.length === 0 ? (
                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: 16, textAlign: 'center', border: '1.5px dashed var(--border-card)' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: 0 }}>
                        No subcategories created under <strong>{cat.name}</strong> yet.
                      </p>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ height: 34, fontSize: 12.5, marginTop: 12 }}
                        onClick={() => setSubModal({ open: true, item: null, parentId: cat.id })}
                      >
                        <Plus size={14} /> Add First Subcategory
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                      {catSubs.map((sub) => (
                        <div
                          key={sub.id}
                          style={{
                            background: '#ffffff',
                            border: '1px solid var(--border-card)',
                            borderRadius: 14,
                            padding: '14px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            {sub.image ? (
                              <img src={sub.image} alt={sub.name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-card)' }} />
                            ) : (
                              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f1f5f9', color: 'var(--purple)', display: 'grid', placeItems: 'center' }}>
                                <FolderTree size={18} />
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sub.name}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                {sub.product_count || 0} stamp items
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: 32, height: 32 }}
                              title="Add product to this subcategory"
                              onClick={() => setProdModal({ open: true, categoryId: cat.id, subcategoryId: sub.id })}
                            >
                              <PackagePlus size={15} color="var(--purple)" />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: 32, height: 32 }}
                              title="Edit Subcategory"
                              onClick={() => setSubModal({ open: true, item: sub, parentId: cat.id })}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: 32, height: 32, color: 'var(--red)' }}
                              title="Delete Subcategory"
                              onClick={() => setDeleteConfirm({ type: 'sub', id: sub.id, name: sub.name })}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: ALL CATEGORIES TABLE */}
      {activeTab === 'categories' && (
        <div className="mf-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="mf-tx-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Subcategories</th>
                <th>Stamps</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--purple-gradient)', color: 'white', display: 'grid', placeItems: 'center' }}>
                          <Layers size={18} />
                        </div>
                      )}
                      <strong style={{ fontSize: 14 }}>{cat.name}</strong>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{cat.slug}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 280, fontSize: 13 }}>
                    {cat.description || '—'}
                  </td>
                  <td>
                    <span className="status-pill confirmed">{cat.subcategory_count || 0} Subs</span>
                  </td>
                  <td>
                    <strong style={{ fontSize: 14 }}>{cat.product_count || 0}</strong>
                  </td>
                  <td>
                    <span className={`status-pill ${cat.status || 'active'}`}>{cat.status || 'Active'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Add Subcategory"
                        onClick={() => setSubModal({ open: true, item: null, parentId: cat.id })}
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit"
                        onClick={() => setCatModal({ open: true, item: cat })}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ color: 'var(--red)' }}
                        title="Delete"
                        onClick={() => setDeleteConfirm({ type: 'cat', id: cat.id, name: cat.name })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ALL SUBCATEGORIES TABLE */}
      {activeTab === 'subcategories' && (
        <div className="mf-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="mf-tx-table">
            <thead>
              <tr>
                <th>Subcategory</th>
                <th>Parent Category</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Stamps</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {sub.image ? (
                        <img src={sub.image} alt={sub.name} style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f1f5f9', color: 'var(--purple)', display: 'grid', placeItems: 'center' }}>
                          <FolderTree size={16} />
                        </div>
                      )}
                      <strong style={{ fontSize: 14 }}>{sub.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill confirmed">{sub.category_name || 'Category'}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{sub.slug}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 260, fontSize: 13 }}>
                    {sub.description || '—'}
                  </td>
                  <td>
                    <strong style={{ fontSize: 14 }}>{sub.product_count || 0}</strong>
                  </td>
                  <td>
                    <span className={`status-pill ${sub.status || 'active'}`}>{sub.status || 'Active'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Add Product"
                        onClick={() => setProdModal({ open: true, categoryId: sub.category_id, subcategoryId: sub.id })}
                      >
                        <PackagePlus size={15} color="var(--purple)" />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Edit"
                        onClick={() => setSubModal({ open: true, item: sub, parentId: sub.category_id })}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ color: 'var(--red)' }}
                        title="Delete"
                        onClick={() => setDeleteConfirm({ type: 'sub', id: sub.id, name: sub.name })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT CATEGORY MODAL */}
      {catModal.open && (
        <CategoryModal
          item={catModal.item}
          onClose={() => setCatModal({ open: false, item: null })}
          onSaved={() => {
            setCatModal({ open: false, item: null });
            notifyMsg(catModal.item ? 'Category updated successfully.' : 'New category created successfully.');
            loadData();
          }}
        />
      )}

      {/* CREATE / EDIT SUBCATEGORY MODAL */}
      {subModal.open && (
        <SubcategoryModal
          item={subModal.item}
          categories={categories}
          defaultParentId={subModal.parentId}
          onClose={() => setSubModal({ open: false, item: null, parentId: null })}
          onSaved={() => {
            setSubModal({ open: false, item: null, parentId: null });
            notifyMsg(subModal.item ? 'Subcategory updated successfully.' : 'New subcategory created successfully.');
            loadData();
          }}
        />
      )}

      {/* ADD PRODUCT MODAL */}
      {prodModal.open && (
        <AddProductModal
          categories={categories}
          subcategories={subcategories}
          defaultCategoryId={prodModal.categoryId}
          defaultSubcategoryId={prodModal.subcategoryId}
          onClose={() => setProdModal({ open: false, categoryId: '', subcategoryId: '' })}
          onSaved={() => {
            setProdModal({ open: false, categoryId: '', subcategoryId: '' });
            notifyMsg('New product added to subcategory successfully.');
            loadData();
          }}
        />
      )}

      {/* DELETE CONFIRM DIALOG */}
      {deleteConfirm && (
        <Confirm
          title={`Delete ${deleteConfirm.type === 'cat' ? 'Category' : 'Subcategory'}`}
          text={`Are you sure you want to delete "${deleteConfirm.name}"? This cannot be undone.`}
          danger
          confirmText="Yes, Delete"
          onYes={confirmDelete}
          onNo={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function CategoryModal({ item, onClose, onSaved }) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [status, setStatus] = useState(item?.status || 'active');
  const [displayOrder, setDisplayOrder] = useState(item?.display_order || 0);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(item?.image || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description);
      fd.append('status', status);
      fd.append('display_order', String(displayOrder));
      if (imageFile) fd.append('image', imageFile);

      if (item?.id) {
        await api(`/api/admin/categories/${item.id}`, { method: 'PUT', form: fd });
      } else {
        await api('/api/admin/categories', { method: 'POST', form: fd });
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save category.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={item ? 'Edit Category' : 'Create New Category'} onClose={onClose}>
      <Banner error={error} />
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Category Name *</label>
          <input
            className="form-control"
            placeholder="e.g. Indian Stamps, British Commonwealth"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Category Image</label>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {previewUrl ? (
              <div style={{ width: 70, height: 70, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: 70, height: 70, borderRadius: 12, background: '#f1f5f9', border: '1.5px dashed var(--border-card)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                <ImageIcon size={22} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <input type="file" accept="image/*" onChange={handleFile} style={{ fontSize: 13 }} />
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                Upload JPEG, PNG, or WebP image.
              </p>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Category Description</label>
          <textarea
            className="form-control"
            placeholder="Describe the stamps covered in this collection..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active (Visible)</option>
              <option value="inactive">Inactive (Hidden)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Display Order</label>
            <input
              type="number"
              className="form-control"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ margin: '20px -28px -24px', padding: '16px 28px' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : item ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SubcategoryModal({ item, categories, defaultParentId, onClose, onSaved }) {
  const [categoryId, setCategoryId] = useState(item?.category_id || defaultParentId || categories[0]?.id || '');
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [status, setStatus] = useState(item?.status || 'active');
  const [displayOrder, setDisplayOrder] = useState(item?.display_order || 0);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(item?.image || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!categoryId) {
      setError('Please select a parent category.');
      return;
    }
    if (!name.trim()) {
      setError('Subcategory name is required.');
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('category_id', String(categoryId));
      fd.append('name', name.trim());
      fd.append('description', description);
      fd.append('status', status);
      fd.append('display_order', String(displayOrder));
      if (imageFile) fd.append('image', imageFile);

      if (item?.id) {
        await api(`/api/admin/subcategories/${item.id}`, { method: 'PUT', form: fd });
      } else {
        await api('/api/admin/subcategories', { method: 'POST', form: fd });
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save subcategory.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={item ? 'Edit Subcategory' : 'Create New Subcategory'} onClose={onClose}>
      <Banner error={error} />
      <form onSubmit={submit}>
        <div className="form-group">
          <label>Parent Category * (Unlimited Subcategories Allowed)</label>
          <select
            className="form-control"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Subcategory Name *</label>
          <input
            className="form-control"
            placeholder="e.g. Victorian Era, Wildlife, Airmail, Miniature Sheets"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Subcategory Image</label>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {previewUrl ? (
              <div style={{ width: 70, height: 70, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: 70, height: 70, borderRadius: 12, background: '#f1f5f9', border: '1.5px dashed var(--border-card)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                <FolderTree size={22} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <input type="file" accept="image/*" onChange={handleFile} style={{ fontSize: 13 }} />
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                Upload an image representative of this subcategory.
              </p>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Subcategory Description</label>
          <textarea
            className="form-control"
            placeholder="Details about stamps in this subcategory..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label>Status</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="form-group">
            <label>Display Order</label>
            <input
              type="number"
              className="form-control"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ margin: '20px -28px -24px', padding: '16px 28px' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : item ? 'Update Subcategory' : 'Create Subcategory'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddProductModal({ categories, subcategories, defaultCategoryId, defaultSubcategoryId, onClose, onSaved }) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId || categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState(defaultSubcategoryId || '');
  const [name, setName] = useState('');
  const [sku, setSku] = useState(`STMP-${Date.now().toString().slice(-6)}`);
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('1');
  const [condition, setCondition] = useState('mint_never_hinged');
  const [year, setYear] = useState('');
  const [country, setCountry] = useState('India');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentSubs = subcategories.filter((s) => String(s.category_id) === String(categoryId));

  useEffect(() => {
    if (!subcategoryId && currentSubs.length > 0) {
      setSubcategoryId(currentSubs[0].id);
    }
  }, [categoryId, currentSubs]);

  function handleFiles(e) {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !price || !subcategoryId) {
      setError('Product Name, Price, and Subcategory are required.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        category_id: Number(categoryId),
        subcategory_id: Number(subcategoryId),
        name: name.trim(),
        sku: sku.trim(),
        price: Number(price),
        sale_price: salePrice ? Number(salePrice) : null,
        stock_quantity: Number(stock) || 0,
        condition,
        issue_year: year ? Number(year) : null,
        country,
        description,
        status: 'published',
        low_stock_threshold: 2,
      };

      const res = await api('/api/admin/products', { method: 'POST', body: payload });
      const newId = res.id;

      if (images.length > 0 && newId) {
        const fd = new FormData();
        images.forEach((file) => fd.append('images', file));
        await api(`/api/admin/products/${newId}/images`, { method: 'POST', form: fd });
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Product to Subcategory" onClose={onClose} maxWidth={640}>
      <Banner error={error} />
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label>Category *</label>
            <select
              className="form-control"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                const nextSubs = subcategories.filter((s) => String(s.category_id) === String(e.target.value));
                setSubcategoryId(nextSubs[0]?.id || '');
              }}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subcategory *</label>
            <select
              className="form-control"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              required
            >
              {currentSubs.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Stamp Name *</label>
          <input
            className="form-control"
            placeholder="e.g. 1854 Half Anna Blue Queen Victoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>Price (₹) *</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. 1250"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Sale Price (₹)</label>
            <input
              type="number"
              className="form-control"
              placeholder="Optional discount"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Initial Stock *</label>
            <input
              type="number"
              className="form-control"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label>SKU Code</label>
            <input className="form-control" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Year</label>
            <input className="form-control" placeholder="e.g. 1947" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Condition</label>
            <select className="form-control" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="mint_never_hinged">Mint Never Hinged (MNH)</option>
              <option value="mint_hinged">Mint Hinged (MH)</option>
              <option value="fine_used">Fine Used (FU)</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Product Images</label>
          <input type="file" multiple accept="image/*" onChange={handleFiles} style={{ fontSize: 13 }} />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            className="form-control"
            placeholder="Details, provenance, perforation..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="modal-footer" style={{ margin: '20px -28px -24px', padding: '16px 28px' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Adding Product...' : 'Save Product to Subcategory'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
