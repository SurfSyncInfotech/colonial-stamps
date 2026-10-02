import { useEffect, useRef, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Sparkles,
  Star,
  X,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { api, inr } from '../api';
import { Banner, Confirm, Modal } from '../kit';

/* ─── helpers ────────────────────────────────────────────── */
const CONDITION_LABELS = {
  mint_never_hinged: 'Mint Never Hinged (MNH)',
  mint_hinged: 'Mint Hinged (MH)',
  fine_used: 'Fine Used (FU)',
  used: 'Used',
  very_fine: 'Very Fine (VF)',
  extremely_fine: 'Extremely Fine (EF)',
  superb: 'Superb',
  poor: 'Poor',
};

const STAMP_TYPES = [
  'Definitive / Commemorative', 'Airmail', 'Express / Special Delivery',
  'Postage Due', 'Revenue / Fiscal', 'Miniature Sheet', 'First Day Cover',
  'Error / Variety', 'Overprint', 'Provisional', 'Military / War', 'Official',
  'Charity / Semi-Postal', 'Cinderella', 'Other',
];

const RARITY_OPTIONS = ['Common', 'Uncommon', 'Scarce', 'Rare', 'Very Rare', 'Unique'];
const GRADE_OPTIONS   = ['Poor', 'Fair', 'Good', 'Very Good', 'Fine', 'Very Fine', 'Extremely Fine', 'Superb'];

/* ═══════════════════════════════════════════════════════════
   PRODUCTS PAGE
═══════════════════════════════════════════════════════════ */
export function ProductsPage() {
  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [meta, setMeta]                 = useState({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  // Filters
  const [selectedCatId, setSelectedCatId]         = useState('all');
  const [selectedSubId, setSelectedSubId]         = useState('all');
  const [selectedStatus, setSelectedStatus]       = useState('all');
  const [searchQuery, setSearchQuery]             = useState('');
  const [page, setPage]                           = useState(1);

  // Modal State
  const [productModal, setProductModal] = useState({ open: false, product: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  async function loadData() {
    try {
      const [catsRes, subsRes] = await Promise.all([
        api('/api/admin/categories'),
        api('/api/admin/subcategories'),
      ]);
      setCategories(catsRes.data || []);
      setSubcategories(subsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    }
  }

  async function loadProducts() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (selectedCatId !== 'all') params.set('category_id', selectedCatId);
      if (selectedSubId !== 'all') params.set('subcategory_id', selectedSubId);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await api(`/api/admin/products?${params.toString()}`);
      setProducts(res.data || []);
      setMeta(res.meta || {});
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadProducts(); }, [selectedCatId, selectedSubId, selectedStatus, page]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadProducts();
  }

  const currentSubcategories = subcategories.filter(
    (s) => selectedCatId === 'all' || String(s.category_id) === String(selectedCatId),
  );

  function notify(msg, isErr = false) {
    if (isErr) { setError(msg); setTimeout(() => setError(''), 5000); }
    else        { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); }
  }

  async function handleDeleteProduct() {
    if (!deleteConfirm) return;
    try {
      await api(`/api/admin/products/${deleteConfirm.id}`, { method: 'DELETE' });
      notify(`Product "${deleteConfirm.name}" deleted.`);
      setDeleteConfirm(null);
      loadProducts();
    } catch (err) {
      notify(err.message || 'Failed to delete product.', true);
      setDeleteConfirm(null);
    }
  }

  async function handleDuplicate(productId) {
    try {
      await api(`/api/admin/products/${productId}/duplicate`, { method: 'POST' });
      notify('Product duplicated as draft.');
      loadProducts();
    } catch (err) {
      notify(err.message || 'Failed to duplicate product.', true);
    }
  }

  const totalValue      = products.reduce((s, p) => s + (Number(p.price || 0) * Number(p.stock || 1)), 0);
  const publishedCount  = products.filter((p) => p.status === 'published').length;
  const featuredCount   = products.filter((p) => p.is_featured).length;
  const lowStockCount   = products.filter((p) => (p.stock || 0) <= 2).length;

  return (
    <div>
      <Banner error={error} success={success} />

      {/* STAT CARDS */}
      <div className="mf-stats-row">
        <div className="mf-stat-card">
          <div className="mf-stat-top"><div className="mf-icon-bubble purple"><Package size={22} /></div></div>
          <div className="mf-stat-label purple">Total Stamp Specimens</div>
          <div className="mf-stat-val">{meta.total || products.length}</div>
          <div className="mf-stat-trend purple"><span>{publishedCount} Published &amp; Live</span></div>
        </div>
        <div className="mf-stat-card">
          <div className="mf-stat-top"><div className="mf-icon-bubble green"><Sparkles size={22} /></div></div>
          <div className="mf-stat-label green">Featured Specimens</div>
          <div className="mf-stat-val">{featuredCount}</div>
          <div className="mf-stat-trend green"><span>Homepage showcases</span></div>
        </div>
        <div className="mf-stat-card">
          <div className="mf-stat-top"><div className="mf-icon-bubble orange"><AlertTriangle size={22} /></div></div>
          <div className="mf-stat-label orange">Low Stock Alerts</div>
          <div className="mf-stat-val">{lowStockCount}</div>
          <div className="mf-stat-trend orange"><span>Stock &lt; 3 units</span></div>
        </div>
        <div className="mf-stat-card">
          <div className="mf-stat-top"><div className="mf-icon-bubble blue"><Tag size={22} /></div></div>
          <div className="mf-stat-label blue">Catalog Value</div>
          <div className="mf-stat-val">{inr(totalValue)}</div>
          <div className="mf-progress-bg"><div className="mf-progress-fill" style={{ width: '80%' }} /></div>
          <div className="mf-progress-sub">Inventory asset worth</div>
        </div>
      </div>

      {/* FILTER & ACTION BAR */}
      <div className="mf-card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="form-control" style={{ width: 'auto', height: 38 }} value={selectedCatId}
              onChange={(e) => { setSelectedCatId(e.target.value); setSelectedSubId('all'); setPage(1); }}>
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto', height: 38 }} value={selectedSubId}
              onChange={(e) => { setSelectedSubId(e.target.value); setPage(1); }}>
              <option value="all">All Subcategories</option>
              {currentSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto', height: 38 }} value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
              <div className="search-box" style={{ width: 220 }}>
                <Search size={15} />
                <input placeholder="Search name, SKU, catalogue…" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} style={{ height: 38 }} />
              </div>
              <button type="submit" className="btn-secondary" style={{ height: 38 }}>Search</button>
            </form>
            <button type="button" className="btn-primary"
              onClick={() => setProductModal({ open: true, product: null })}>
              <Plus size={16} /><span>+ Add Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="mf-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mf-card-title">Stamp Products Catalog</div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Showing <strong>{products.length}</strong> items
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="mf-tx-table">
            <thead>
              <tr>
                <th>Stamp Specimen</th>
                <th>SKU</th>
                <th>Category / Subcategory</th>
                <th>Price (₹)</th>
                <th>Condition</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading stamp products…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No products found. Click <strong>+ Add Product</strong> to create your first stamp specimen.
                </td></tr>
              ) : products.map((prod) => (
                <tr key={prod.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {prod.image ? (
                        <img src={prod.image} alt={prod.name}
                          style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-card)' }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', color: 'var(--purple)', display: 'grid', placeItems: 'center' }}>
                          <Package size={20} />
                        </div>
                      )}
                      <div>
                        <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-main)' }}>{prod.name}</strong>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                          <span>Year: {prod.issue_year || '—'}</span>
                          {prod.is_featured && <span style={{ color: '#d97706', fontWeight: 700 }}>★ Featured</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{prod.sku}</td>
                  <td>
                    <span className="status-pill confirmed" style={{ marginRight: 4 }}>{prod.category_name}</span>
                    {prod.subcategory_name && <span className="status-pill neutral">{prod.subcategory_name}</span>}
                  </td>
                  <td>
                    <strong style={{ fontSize: 14.5 }}>{inr(prod.price)}</strong>
                    {prod.sale_price && <div style={{ fontSize: 11.5, color: '#ef4444', textDecoration: 'line-through' }}>{inr(prod.sale_price)}</div>}
                  </td>
                  <td>
                    <span className="status-pill neutral" style={{ textTransform: 'capitalize' }}>
                      {CONDITION_LABELS[prod.condition] || prod.condition?.replace(/_/g, ' ') || 'Mint'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: 14.5, color: (prod.stock || 0) <= 0 ? 'var(--red)' : (prod.stock || 0) <= 2 ? '#d97706' : '#059669' }}>
                      {prod.stock || 0} Units
                    </strong>
                  </td>
                  <td>
                    <span className={`status-pill ${prod.status || 'published'}`}>
                      {prod.status || 'Published'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button type="button" className="btn-icon" title="Edit Product"
                        onClick={() => setProductModal({ open: true, product: prod })}>
                        <Edit2 size={14} />
                      </button>
                      <button type="button" className="btn-icon" title="Duplicate as Copy"
                        onClick={() => handleDuplicate(prod.id)}>
                        <Copy size={14} />
                      </button>
                      <button type="button" className="btn-icon" style={{ color: 'var(--red)' }} title="Delete Product"
                        onClick={() => setDeleteConfirm({ id: prod.id, name: prod.name })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Page {meta.page} of {meta.totalPages} ({meta.total} Records)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn-secondary" style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
              <button type="button" className="btn-secondary" style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {productModal.open && (
        <ProductFormModal
          productId={productModal.product?.id || null}
          productRow={productModal.product}
          categories={categories}
          subcategories={subcategories}
          onClose={() => setProductModal({ open: false, product: null })}
          onSaved={() => {
            setProductModal({ open: false, product: null });
            notify(productModal.product ? 'Product updated successfully.' : 'New product created successfully.');
            loadProducts();
          }}
        />
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirm && (
        <Confirm
          title="Delete Stamp Product"
          text={`Are you sure you want to delete "${deleteConfirm.name}"? This will remove it from your store.`}
          danger
          confirmText="Yes, Delete"
          onYes={handleDeleteProduct}
          onNo={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPREHENSIVE PRODUCT FORM MODAL (CREATE / EDIT)
═══════════════════════════════════════════════════════════ */
function ProductFormModal({ productId, productRow, categories, subcategories, onClose, onSaved }) {
  const isEdit = Boolean(productId);

  /* ── form fields ── */
  const [categoryId,        setCategoryId]        = useState(productRow?.category_id    || categories[0]?.id || '');
  const [subcategoryId,     setSubcategoryId]     = useState(productRow?.subcategory_id || '');
  const [name,              setName]              = useState(productRow?.name            || '');
  const [sku,               setSku]               = useState(productRow?.sku             || `STMP-${Date.now().toString().slice(-6)}`);
  const [price,             setPrice]             = useState(productRow?.price           || '');
  const [salePrice,         setSalePrice]         = useState(productRow?.sale_price      || '');
  const [stock,             setStock]             = useState(String(productRow?.stock    ?? '1'));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(productRow?.low_stock_threshold || '2'));
  const [condition,         setCondition]         = useState(productRow?.condition       || 'mint_never_hinged');
  const [year,              setYear]              = useState(productRow?.issue_year      || '');
  const [issueDate,         setIssueDate]         = useState(productRow?.issue_date      || '');
  const [country,           setCountry]           = useState(productRow?.country         || 'India');
  const [denomination,      setDenomination]      = useState(productRow?.denomination    || '');
  const [stampType,         setStampType]         = useState(productRow?.stamp_type      || 'Definitive / Commemorative');
  const [grade,             setGrade]             = useState(productRow?.grade           || '');
  const [rarity,            setRarity]            = useState(productRow?.rarity          || '');
  const [collectionName,    setCollectionName]    = useState(productRow?.collection_name || '');
  const [catalogueNumber,   setCatalogueNumber]   = useState(productRow?.catalogue_number || '');
  const [shortDescription,  setShortDescription]  = useState(productRow?.short_description || '');
  const [description,       setDescription]       = useState(productRow?.description     || '');
  const [tags,              setTags]              = useState('');
  const [status,            setStatus]            = useState(productRow?.status          || 'published');
  const [isFeatured,        setIsFeatured]        = useState(!!productRow?.is_featured);
  const [isNewArrival,      setIsNewArrival]      = useState(!!productRow?.is_new_arrival);

  /* ── image management ── */
  const [existingImages,  setExistingImages]  = useState([]);   // from DB
  const [newFiles,        setNewFiles]        = useState([]);   // File objects to upload
  const [newPreviews,     setNewPreviews]     = useState([]);   // objectURL previews
  const fileInputRef = useRef();

  /* ── state ── */
  const [loadingDetail, setLoadingDetail] = useState(isEdit);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [imgBusy,       setImgBusy]       = useState(false);  // during image ops

  const currentSubs = subcategories.filter(
    (s) => String(s.category_id) === String(categoryId),
  );

  /* ── on open in EDIT mode: fetch full product with images[] ── */
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoadingDetail(true);
        const res = await api(`/api/admin/products/${productId}`);
        const p = res.product;
        // populate all fields with real data
        setCategoryId(p.category_id || '');
        setSubcategoryId(p.subcategory_id || '');
        setName(p.name || '');
        setSku(p.sku || '');
        setPrice(p.price || '');
        setSalePrice(p.sale_price || '');
        setStock(String(p.stock ?? '1'));
        setLowStockThreshold(String(p.low_stock_threshold || '2'));
        setCondition(p.condition || 'mint_never_hinged');
        setYear(p.issue_year || '');
        setIssueDate(p.issue_date ? p.issue_date.slice(0, 10) : '');
        setCountry(p.country || 'India');
        setDenomination(p.denomination || '');
        setStampType(p.stamp_type || 'Definitive / Commemorative');
        setGrade(p.grade || '');
        setRarity(p.rarity || '');
        setCollectionName(p.collection_name || '');
        setCatalogueNumber(p.catalogue_number || '');
        setShortDescription(p.short_description || '');
        setDescription(p.description || '');
        setTags((p.tags || []).join(', '));
        setStatus(p.status || 'published');
        setIsFeatured(!!p.is_featured);
        setIsNewArrival(!!p.is_new_arrival);
        setExistingImages(p.images || []);
      } catch (err) {
        setError('Could not load product details: ' + (err.message || ''));
      } finally {
        setLoadingDetail(false);
      }
    })();
  }, [productId]);

  /* ── auto-select first subcategory when category changes ── */
  useEffect(() => {
    if (!subcategoryId && currentSubs.length > 0) {
      setSubcategoryId(currentSubs[0].id);
    }
  }, [categoryId]);

  /* ── new file selection → generate previews ── */
  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles((prev) => [...prev, ...files]);
    const urls = files.map((f) => URL.createObjectURL(f));
    setNewPreviews((prev) => [...prev, ...urls]);
  }

  function removeNewFile(idx) {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  /* ── existing image ops (only possible in edit mode) ── */
  async function setPrimary(imageId) {
    try {
      setImgBusy(true);
      await api(`/api/admin/products/${productId}/images/${imageId}/primary`, { method: 'POST' });
      setExistingImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imageId ? 1 : 0 })));
    } catch (err) {
      setError(err.message || 'Failed to set primary image.');
    } finally {
      setImgBusy(false);
    }
  }

  async function deleteExistingImage(imageId) {
    if (!window.confirm('Remove this image?')) return;
    try {
      setImgBusy(true);
      await api(`/api/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' });
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err.message || 'Failed to delete image.');
    } finally {
      setImgBusy(false);
    }
  }

  /* ── submit ── */
  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !price || !subcategoryId || !categoryId) {
      setError('Product Name, Price, Category, and Subcategory are required.');
      return;
    }
    const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      setSaving(true);
      setError('');
      const payload = {
        category_id:       Number(categoryId),
        subcategory_id:    Number(subcategoryId),
        name:              name.trim(),
        sku:               sku.trim(),
        price:             Number(price),
        sale_price:        salePrice ? Number(salePrice) : null,
        stock:             Number(stock) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 2,
        condition,
        issue_year:        year ? Number(year) : null,
        issue_date:        issueDate || null,
        country,
        denomination,
        stamp_type:        stampType,
        grade:             grade || null,
        rarity:            rarity || null,
        collection_name:   collectionName || null,
        catalogue_number:  catalogueNumber || null,
        description,
        short_description: shortDescription,
        status,
        is_featured:       isFeatured,
        is_new_arrival:    isNewArrival,
        tags:              parsedTags,
      };

      let savedId = productId;
      if (savedId) {
        await api(`/api/admin/products/${savedId}`, { method: 'PUT', body: payload });
      } else {
        const res = await api('/api/admin/products', { method: 'POST', body: payload });
        savedId = res.id;
      }

      // Upload new images
      if (newFiles.length > 0 && savedId) {
        const fd = new FormData();
        newFiles.forEach((f) => fd.append('images', f));
        await api(`/api/admin/products/${savedId}/images`, { method: 'POST', form: fd });
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <Modal
      title={isEdit ? 'Edit Stamp Specimen' : 'Add New Stamp Specimen'}
      onClose={onClose}
      maxWidth={860}
    >
      {loadingDetail ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
          <div>Loading product details…</div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <Banner error={error} />

          {/* ── SECTION 1: Category & Subcategory ── */}
          <SectionTitle>Classification</SectionTitle>
          <div style={grid2}>
            <FormGroup label="Category *">
              <select className="form-control" value={categoryId} required
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  const nextSubs = subcategories.filter((s) => String(s.category_id) === String(e.target.value));
                  setSubcategoryId(nextSubs[0]?.id || '');
                }}>
                <option value="">— Select Category —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Subcategory *">
              <select className="form-control" value={subcategoryId} required
                onChange={(e) => setSubcategoryId(e.target.value)}>
                <option value="">— Select Subcategory —</option>
                {currentSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormGroup>
          </div>

          {/* ── SECTION 2: Basic Info ── */}
          <SectionTitle>Basic Information</SectionTitle>
          <div style={{ ...grid2, gridTemplateColumns: '1.7fr 1fr' }}>
            <FormGroup label="Stamp / Specimen Title *">
              <input className="form-control" placeholder="e.g. 1854 Half Anna Blue Queen Victoria Lithograph"
                value={name} onChange={(e) => setName(e.target.value)} required />
            </FormGroup>
            <FormGroup label="SKU Code *">
              <input className="form-control" value={sku} onChange={(e) => setSku(e.target.value)} required />
            </FormGroup>
          </div>

          {/* ── SECTION 3: Pricing & Stock ── */}
          <SectionTitle>Pricing &amp; Stock</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
            <FormGroup label="Price (₹) *">
              <input type="number" className="form-control" placeholder="e.g. 3990"
                value={price} onChange={(e) => setPrice(e.target.value)} required min="0" step="0.01" />
            </FormGroup>
            <FormGroup label="Sale Price (₹)">
              <input type="number" className="form-control" placeholder="Optional discount"
                value={salePrice} onChange={(e) => setSalePrice(e.target.value)} min="0" step="0.01" />
            </FormGroup>
            <FormGroup label="Stock on Hand *">
              <input type="number" className="form-control" min="0"
                value={stock} onChange={(e) => setStock(e.target.value)} required />
            </FormGroup>
            <FormGroup label="Low Stock Alert">
              <input type="number" className="form-control" min="0"
                value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
            </FormGroup>
          </div>

          {/* ── SECTION 4: Philatelic Details ── */}
          <SectionTitle>Philatelic Details</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
            <FormGroup label="Year of Issue">
              <input className="form-control" placeholder="e.g. 1947"
                value={year} onChange={(e) => setYear(e.target.value)} />
            </FormGroup>
            <FormGroup label="Issue Date">
              <input type="date" className="form-control"
                value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </FormGroup>
            <FormGroup label="Country / Territory">
              <input className="form-control" placeholder="e.g. India"
                value={country} onChange={(e) => setCountry(e.target.value)} />
            </FormGroup>
            <FormGroup label="Denomination">
              <input className="form-control" placeholder="e.g. ½ Anna, 1p"
                value={denomination} onChange={(e) => setDenomination(e.target.value)} />
            </FormGroup>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
            <FormGroup label="Stamp Type">
              <select className="form-control" value={stampType} onChange={(e) => setStampType(e.target.value)}>
                {STAMP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Condition">
              <select className="form-control" value={condition} onChange={(e) => setCondition(e.target.value)}>
                {Object.entries(CONDITION_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </FormGroup>
            <FormGroup label="Grade">
              <select className="form-control" value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">— None —</option>
                {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Rarity">
              <select className="form-control" value={rarity} onChange={(e) => setRarity(e.target.value)}>
                <option value="">— None —</option>
                {RARITY_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormGroup>
          </div>

          <div style={grid2}>
            <FormGroup label="Collection / Series Name">
              <input className="form-control" placeholder="e.g. Princely States Collection"
                value={collectionName} onChange={(e) => setCollectionName(e.target.value)} />
            </FormGroup>
            <FormGroup label="Catalogue Reference #">
              <input className="form-control" placeholder="e.g. SG #1, Scott #2, Michel #3"
                value={catalogueNumber} onChange={(e) => setCatalogueNumber(e.target.value)} />
            </FormGroup>
          </div>

          {/* ── SECTION 5: Images ── */}
          <SectionTitle>Specimen Images</SectionTitle>

          {/* Existing images (edit mode only) */}
          {isEdit && existingImages.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                Existing images — click <Star size={11} style={{ verticalAlign: 'middle' }} /> to set as primary, <X size={11} style={{ verticalAlign: 'middle' }} /> to remove.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {existingImages.map((img) => (
                  <div key={img.id} style={{ position: 'relative', width: 96, height: 96 }}>
                    <img src={img.url} alt={img.alt_text || ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10,
                        border: img.is_primary ? '2.5px solid var(--purple)' : '1px solid var(--border-card)' }} />
                    {img.is_primary && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: 'var(--purple)', color: '#fff',
                        fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>PRIMARY</span>
                    )}
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {!img.is_primary && (
                        <button type="button" title="Set as Primary"
                          disabled={imgBusy}
                          onClick={() => setPrimary(img.id)}
                          style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 5, padding: 3, cursor: 'pointer', color: '#7c3aed' }}>
                          <Star size={12} />
                        </button>
                      )}
                      <button type="button" title="Delete Image"
                        disabled={imgBusy}
                        onClick={() => deleteExistingImage(img.id)}
                        style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 5, padding: 3, cursor: 'pointer', color: '#ef4444' }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload new images */}
          <div style={{ border: '1.5px dashed var(--border-card)', borderRadius: 14, padding: 16, background: '#f8fafc', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--purple)', color: '#fff',
                  border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <Upload size={14} /> Choose Images
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {newFiles.length > 0
                  ? `${newFiles.length} file(s) selected — will upload on Save`
                  : 'PNG, JPG, WebP — high-res scans preferred. Up to 8 images.'}
              </span>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*"
              onChange={handleFileSelect} style={{ display: 'none' }} />

            {/* New file previews */}
            {newPreviews.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                {newPreviews.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                    <img src={url} alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8,
                        border: '1px solid var(--border-card)' }} />
                    <button type="button" onClick={() => removeNewFile(idx)}
                      style={{ position: 'absolute', top: 2, right: 2, background: '#ef4444', color: '#fff',
                        border: 'none', borderRadius: 4, padding: '1px 4px', cursor: 'pointer', lineHeight: 1 }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── SECTION 6: Descriptions ── */}
          <SectionTitle>Descriptions</SectionTitle>
          <FormGroup label="Short Description (shown in listings)">
            <input className="form-control" placeholder="Brief 1-line philatelic summary…"
              value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
          </FormGroup>
          <FormGroup label="Full Description (Watermark, Perforation, History, Provenance…)">
            <textarea className="form-control" rows={5}
              placeholder="Describe watermark, perforation gauge, gum condition, historical background, ownership provenance…"
              value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical', minHeight: 110 }} />
          </FormGroup>

          {/* ── SECTION 7: Tags ── */}
          <SectionTitle>Tags</SectionTitle>
          <FormGroup label="Tags (comma-separated)">
            <input className="form-control" placeholder="e.g. colonial, rare, victoria, 1854"
              value={tags} onChange={(e) => setTags(e.target.value)} />
            <small style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
              Tags help with search and filtering on the storefront.
            </small>
          </FormGroup>

          {/* ── SECTION 8: Visibility Toggles ── */}
          <SectionTitle>Visibility &amp; Flags</SectionTitle>
          <div style={{ display: 'flex', gap: 24, padding: '14px 16px', background: '#f8fafc',
            borderRadius: 12, border: '1px solid var(--border-card)', marginBottom: 24 }}>
            <label style={toggleLabel}>
              <input type="checkbox" checked={status === 'published'}
                onChange={(e) => setStatus(e.target.checked ? 'published' : 'draft')} />
              <CheckCircle2 size={15} style={{ color: status === 'published' ? '#059669' : 'var(--text-muted)' }} />
              <span>Publish Immediately</span>
            </label>
            <label style={toggleLabel}>
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <Sparkles size={15} style={{ color: isFeatured ? '#d97706' : 'var(--text-muted)' }} />
              <span>Feature on Homepage</span>
            </label>
            <label style={toggleLabel}>
              <input type="checkbox" checked={isNewArrival} onChange={(e) => setIsNewArrival(e.target.checked)} />
              <Tag size={15} style={{ color: isNewArrival ? 'var(--purple)' : 'var(--text-muted)' }} />
              <span>Mark as New Arrival</span>
            </label>
          </div>

          {/* ── FOOTER BUTTONS ── */}
          <div className="modal-footer" style={{ margin: '0 -28px -24px', padding: '16px 28px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Specimen' : 'Add Stamp Specimen'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ─── tiny helper components ─────────────────────────────── */
function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--purple)',
      textTransform: 'uppercase', margin: '20px 0 10px', paddingBottom: 6,
      borderBottom: '1px solid var(--border-light)' }}>
      {children}
    </div>
  );
}

function FormGroup({ label, children }) {
  return (
    <div className="form-group" style={{ margin: '0 0 14px' }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 5, display: 'block' }}>{label}</label>
      {children}
    </div>
  );
}

const grid2    = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 };
const toggleLabel = { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
