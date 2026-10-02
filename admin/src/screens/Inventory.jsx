import { useEffect, useState } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Layers,
  FolderTree,
  Plus,
  Minus,
  Edit3,
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  TrendingUp,
  RefreshCw,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { api, inr } from '../api';
import { Banner, Modal } from '../kit';

export function InventoryPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [adjustModal, setAdjustModal] = useState({ open: false, product: null });
  const [historyModal, setHistoryModal] = useState({ open: false, product: null, logs: [] });

  useEffect(() => {
    async function loadCats() {
      try {
        const [catsRes, subsRes] = await Promise.all([
          api('/api/admin/categories'),
          api('/api/admin/subcategories')
        ]);
        const catList = catsRes.data || [];
        const subList = subsRes.data || [];
        setCategories(catList);
        setSubcategories(subList);

        if (catList.length > 0) {
          setSelectedCatId(String(catList[0].id));
          const firstSubs = subList.filter((s) => s.category_id === catList[0].id);
          if (firstSubs.length > 0) {
            setSelectedSubId(String(firstSubs[0].id));
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load categories.');
      }
    }
    loadCats();
  }, []);

  const currentSubcategories = subcategories.filter(
    (s) => String(s.category_id) === String(selectedCatId)
  );

  async function loadInventory() {
    if (!selectedCatId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (selectedCatId) params.set('category_id', selectedCatId);
      if (selectedSubId && selectedSubId !== 'all') params.set('subcategory_id', selectedSubId);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await api(`/api/admin/inventory?${params.toString()}`);
      setProducts(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load inventory products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, [selectedCatId, selectedSubId, statusFilter]);

  function handleSearch(e) {
    e.preventDefault();
    loadInventory();
  }

  async function quickAdjustStock(productId, change, currentStock) {
    if (currentStock + change < 0) return;
    try {
      await api(`/api/admin/inventory/${productId}/adjust`, {
        method: 'POST',
        body: {
          mode: change > 0 ? 'add' : 'remove',
          quantity: Math.abs(change),
          reason: change > 0 ? 'Quick inline stock addition' : 'Quick inline stock deduction'
        }
      });
      setSuccess('Stock updated successfully.');
      setTimeout(() => setSuccess(''), 2500);
      loadInventory();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock.');
      setTimeout(() => setError(''), 3500);
    }
  }

  async function viewHistory(product) {
    try {
      const res = await api(`/api/admin/inventory/${product.id}/history`);
      setHistoryModal({ open: true, product, logs: res.data || [] });
    } catch (err) {
      setError(err.message || 'Failed to fetch inventory history.');
    }
  }

  const inStockCount = products.filter((p) => p.stock_status === 'in_stock').length;
  const lowStockCount = products.filter((p) => p.stock_status === 'low_stock').length;
  const outStockCount = products.filter((p) => p.stock_status === 'out_of_stock').length;
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stock_on_hand || 0), 0);

  return (
    <div>
      <Banner error={error} success={success} />

      {/* TOP 4 MONEYFLOW STAT CARDS */}
      <div className="mf-stats-row">
        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble green">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="mf-stat-label green">Items In Stock</div>
          <div className="mf-stat-val">{inStockCount} Stamps</div>
          <div className="mf-stat-trend green">
            <span>Healthy catalog levels</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble orange">
              <AlertTriangle size={22} />
            </div>
          </div>
          <div className="mf-stat-label orange">Low Stock Alerts</div>
          <div className="mf-stat-val">{lowStockCount} Items</div>
          <div className="mf-stat-trend orange">
            <span>Stock &lt; 3 units</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble purple">
              <Boxes size={22} />
            </div>
          </div>
          <div className="mf-stat-label purple">Total Physical Units</div>
          <div className="mf-stat-val">{totalStockUnits} Units</div>
          <div className="mf-stat-trend purple">
            <span>Available in vault</span>
          </div>
        </div>

        <div className="mf-stat-card">
          <div className="mf-stat-top">
            <div className="mf-icon-bubble blue">
              <Sparkles size={22} />
            </div>
          </div>
          <div className="mf-stat-label blue">Catalog Stock Health</div>
          <div className="mf-stat-val">{products.length ? Math.round((inStockCount / products.length) * 100) : 100}%</div>
          <div className="mf-progress-bg">
            <div className="mf-progress-fill" style={{ width: `${products.length ? Math.round((inStockCount / products.length) * 100) : 100}%` }} />
          </div>
          <div className="mf-progress-sub">Synchronized with customer cart</div>
        </div>
      </div>

      {/* STEP 1 & 2 SELECTION FILTER CARD */}
      <div className="mf-card" style={{ marginBottom: 24, padding: '22px 26px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} />
          <span>Step 1 &amp; 2: Filter by Category ➔ Subcategory</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} color="var(--purple)" />
              <span>Select Category</span>
            </label>
            <select
              className="form-control"
              value={selectedCatId}
              onChange={(e) => {
                const newCatId = e.target.value;
                setSelectedCatId(newCatId);
                const nextSubs = subcategories.filter((s) => String(s.category_id) === String(newCatId));
                setSelectedSubId(nextSubs[0]?.id ? String(nextSubs[0].id) : 'all');
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.product_count || 0} items)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FolderTree size={15} color="var(--purple)" />
              <span>Select Subcategory</span>
            </label>
            <select
              className="form-control"
              value={selectedSubId}
              onChange={(e) => setSelectedSubId(e.target.value)}
            >
              <option value="all">All Subcategories in this Category</option>
              {currentSubcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.product_count || 0} items)
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, margin: 0 }}>
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={15} />
              <input
                placeholder="Search stamp name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: 42 }}
              />
            </div>
            <button type="submit" className="btn-secondary" style={{ height: 42 }}>
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="filter-tabs">
          {[
            { key: 'all', label: 'All Items' },
            { key: 'in', label: 'In Stock' },
            { key: 'low', label: 'Low Stock (<3)' },
            { key: 'out', label: 'Out of Stock (0)' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab ${statusFilter === tab.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button type="button" className="btn-secondary" style={{ height: 34, fontSize: 12.5 }} onClick={loadInventory}>
          <RefreshCw size={14} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* PRODUCTS INVENTORY TABLE */}
      <div className="mf-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mf-card-title">Live Product Inventory</div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Showing <strong>{products.length}</strong> stamp specimens
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="mf-tx-table">
            <thead>
              <tr>
                <th>Stamp Specimen</th>
                <th>SKU</th>
                <th>Category / Subcategory</th>
                <th>Price</th>
                <th>Stock On Hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Stock Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Loading products for this subcategory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No stamps found under this subcategory. Try selecting another subcategory or add new products.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-card)' }} />
                        ) : (
                          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f1f5f9', color: 'var(--purple)', display: 'grid', placeItems: 'center' }}>
                            <Package size={18} />
                          </div>
                        )}
                        <div>
                          <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-main)' }}>{prod.name}</strong>
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Threshold: {prod.low_stock_threshold || 2} units</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{prod.sku}</td>
                    <td>
                      <div>
                        <span className="status-pill confirmed" style={{ marginRight: 4 }}>{prod.category_name}</span>
                        {prod.subcategory_name && <span className="status-pill neutral">{prod.subcategory_name}</span>}
                      </div>
                    </td>
                    <td><strong style={{ fontSize: 14 }}>{inr(prod.price)}</strong></td>
                    <td>
                      <strong style={{ fontSize: 15 }}>{prod.stock_on_hand}</strong>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{prod.reserved || 0}</td>
                    <td>
                      <strong style={{ fontSize: 15, color: prod.available <= 0 ? 'var(--red)' : prod.available <= 2 ? '#d97706' : '#059669' }}>
                        {prod.available}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-pill ${prod.stock_status}`}>
                        {prod.stock_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', border: '1.5px solid var(--border-card)', borderRadius: 8, overflow: 'hidden' }}>
                          <button
                            type="button"
                            title="Decrease stock by 1"
                            style={{ width: 28, height: 28, background: '#ffffff', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                            onClick={() => quickAdjustStock(prod.id, -1, prod.stock_on_hand)}
                            disabled={prod.stock_on_hand <= 0}
                          >
                            <Minus size={12} />
                          </button>
                          <button
                            type="button"
                            title="Increase stock by 1"
                            style={{ width: 28, height: 28, background: '#ffffff', border: 'none', borderLeft: '1px solid var(--border-card)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                            onClick={() => quickAdjustStock(prod.id, 1, prod.stock_on_hand)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ height: 28, padding: '0 8px', fontSize: 12, fontWeight: 700 }}
                          onClick={() => setAdjustModal({ open: true, product: prod })}
                        >
                          <Edit3 size={12} />
                          <span>Set Stock</span>
                        </button>

                        <button
                          type="button"
                          className="btn-icon"
                          style={{ width: 28, height: 28 }}
                          title="View Stock History"
                          onClick={() => viewHistory(prod)}
                        >
                          <History size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST STOCK MODAL */}
      {adjustModal.open && (
        <AdjustStockModal
          product={adjustModal.product}
          onClose={() => setAdjustModal({ open: false, product: null })}
          onSaved={() => {
            setAdjustModal({ open: false, product: null });
            setSuccess('Stock updated successfully.');
            setTimeout(() => setSuccess(''), 3000);
            loadInventory();
          }}
        />
      )}

      {/* STOCK HISTORY MODAL */}
      {historyModal.open && (
        <Modal
          title={`Inventory Audit History · ${historyModal.product?.name}`}
          onClose={() => setHistoryModal({ open: false, product: null, logs: [] })}
          maxWidth={680}
        >
          <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            Audit log of all stock changes for <strong>{historyModal.product?.name}</strong> ({historyModal.product?.sku})
          </div>

          <div style={{ border: '1px solid var(--border-card)', borderRadius: 14, overflow: 'hidden' }}>
            <table className="mf-tx-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Action Type</th>
                  <th>Change</th>
                  <th>Stock After</th>
                  <th>Reason / Note</th>
                </tr>
              </thead>
              <tbody>
                {historyModal.logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No manual stock adjustment logs found for this item.
                    </td>
                  </tr>
                ) : (
                  historyModal.logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className="status-pill neutral">{log.txn_type?.replace('_', ' ')}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: log.quantity > 0 ? '#059669' : '#dc2626' }}>
                        {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                      </td>
                      <td style={{ fontWeight: 700 }}>{log.new_stock}</td>
                      <td style={{ fontSize: 12.5 }}>{log.reason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="modal-footer" style={{ margin: '20px -28px -24px', padding: '16px 28px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setHistoryModal({ open: false, product: null, logs: [] })}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AdjustStockModal({ product, onClose, onSaved }) {
  const [mode, setMode] = useState('set');
  const [quantity, setQuantity] = useState(String(product?.stock_on_hand || 0));
  const [reason, setReason] = useState('Stock count verification');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setError('Please enter a valid non-negative quantity.');
      return;
    }
    try {
      setLoading(true);
      await api(`/api/admin/inventory/${product.id}/adjust`, {
        method: 'POST',
        body: {
          mode,
          quantity: qtyNum,
          reason: reason.trim() || 'Inventory adjustment'
        }
      });
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to update stock.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={`Manage Stock · ${product?.name}`} onClose={onClose}>
      <Banner error={error} />
      <form onSubmit={submit}>
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid var(--border-card)', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{product?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU: {product?.sku}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Current Stock</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--purple)' }}>{product?.stock_on_hand} Units</div>
          </div>
        </div>

        <div className="form-group">
          <label>Adjustment Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { key: 'set', label: 'Set Exact Stock (=)' },
              { key: 'add', label: 'Add Stock (+)' },
              { key: 'remove', label: 'Remove Stock (-)' },
            ].map((m) => (
              <button
                key={m.key}
                type="button"
                className={`btn-secondary ${mode === m.key ? 'active' : ''}`}
                style={{
                  height: 38,
                  fontSize: 12.5,
                  fontWeight: mode === m.key ? 700 : 500,
                  borderColor: mode === m.key ? 'var(--purple)' : 'var(--border-card)',
                  background: mode === m.key ? 'var(--purple-soft)' : '#ffffff',
                  color: mode === m.key ? 'var(--purple)' : 'var(--text-main)',
                }}
                onClick={() => {
                  setMode(m.key);
                  if (m.key === 'add' || m.key === 'remove') setQuantity('1');
                  else setQuantity(String(product?.stock_on_hand || 0));
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>
            {mode === 'set' ? 'New Total Stock Quantity' : mode === 'add' ? 'Quantity to Add' : 'Quantity to Remove'} *
          </label>
          <input
            type="number"
            min="0"
            className="form-control"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Reason / Audit Note</label>
          <select
            className="form-control"
            style={{ marginBottom: 8 }}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="Stock count verification">Stock count verification</option>
            <option value="New philatelic shipment received">New philatelic shipment received</option>
            <option value="Damaged / specimen defect removal">Damaged / specimen defect removal</option>
            <option value="Customer return / order restock">Customer return / order restock</option>
            <option value="Other / Correction">Other / Custom note</option>
          </select>
          <input
            className="form-control"
            placeholder="Custom reason note..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="modal-footer" style={{ margin: '20px -28px -24px', padding: '16px 28px' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Apply Stock Change'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
