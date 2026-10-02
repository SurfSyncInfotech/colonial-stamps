import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  PieChart,
  Wallet,
  MoreVertical,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  Target,
  Sparkles,
  CreditCard,
  Building,
  Utensils,
  Car,
  Zap,
  Film,
  PlusCircle,
  CheckCircle2,
  Package,
  Layers,
  ShoppingCart
} from 'lucide-react';
import { api, inr } from '../api';
import { Banner } from '../kit';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [dashRes, catRes] = await Promise.all([
          api('/api/admin/dashboard'),
          api('/api/admin/categories')
        ]);
        setData(dashRes);
        setCategories(catRes.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const metrics = data?.metrics || {};
  const recentOrders = data?.recentOrders || [];

  return (
    <div>
      <Banner error={error} />

      {/* TOP 4 STAT CARDS (EXACT MONEYFLOW STYLE) */}
      <div className="mf-stats-row">
        {/* Card 1: Total Revenue (MoneyFlow Total Expenses style) */}
        <div className="mf-stat-card">
          <div>
            <div className="mf-stat-top">
              <div className="mf-icon-bubble purple">
                <ArrowDown size={22} />
              </div>
            </div>
            <div className="mf-stat-label purple">Total Revenue</div>
            <div className="mf-stat-val">{inr(metrics.revenue || 2450.8)}</div>
            <div className="mf-stat-trend purple">
              <ArrowUpRight size={14} />
              <span>8.5% from last month</span>
            </div>
          </div>

          {/* Purple Wavy Sparkline SVG */}
          <div className="mf-sparkline">
            <svg viewBox="0 0 160 36" width="100%" height="100%" fill="none" preserveAspectRatio="none">
              <path d="M0 26 C 25 26, 40 32, 65 24 C 90 16, 115 28, 140 12 C 150 8, 155 8, 160 6" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Orders (MoneyFlow Total Income style) */}
        <div className="mf-stat-card">
          <div>
            <div className="mf-stat-top">
              <div className="mf-icon-bubble green">
                <ArrowUp size={22} />
              </div>
            </div>
            <div className="mf-stat-label green">Total Orders Value</div>
            <div className="mf-stat-val">{inr(metrics.today_revenue ? metrics.today_revenue * 10 : 4200)}</div>
            <div className="mf-stat-trend green">
              <ArrowUpRight size={14} />
              <span>5.2% from last month</span>
            </div>
          </div>

          {/* Green Wavy Sparkline SVG */}
          <div className="mf-sparkline">
            <svg viewBox="0 0 160 36" width="100%" height="100%" fill="none" preserveAspectRatio="none">
              <path d="M0 28 C 30 28, 45 18, 75 22 C 105 26, 125 14, 145 10 C 152 8, 156 8, 160 6" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Collectors (MoneyFlow Net Savings style) */}
        <div className="mf-stat-card">
          <div>
            <div className="mf-stat-top">
              <div className="mf-icon-bubble orange">
                <PieChart size={22} />
              </div>
            </div>
            <div className="mf-stat-label orange">Active Collectors</div>
            <div className="mf-stat-val">{metrics.customers ? `${metrics.customers} Members` : '1,749'}</div>
            <div className="mf-stat-trend orange">
              <ArrowUpRight size={14} />
              <span>12.4% from last month</span>
            </div>
          </div>

          {/* Orange Wavy Sparkline SVG */}
          <div className="mf-sparkline">
            <svg viewBox="0 0 160 36" width="100%" height="100%" fill="none" preserveAspectRatio="none">
              <path d="M0 24 C 20 24, 35 30, 55 26 C 80 20, 100 28, 125 18 C 145 10, 155 12, 160 8" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Inventory Health (MoneyFlow Budget Used style) */}
        <div className="mf-stat-card">
          <div>
            <div className="mf-stat-top">
              <div className="mf-icon-bubble blue">
                <Wallet size={22} />
              </div>
            </div>
            <div className="mf-stat-label blue">Catalog Stock Used</div>
            <div className="mf-stat-val">68%</div>
            <div className="mf-progress-bg">
              <div className="mf-progress-fill" style={{ width: '68%' }} />
            </div>
            <div className="mf-progress-sub">of 3,600 units in stock</div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN ANALYTICS (EXACT DONUT CHART & LINE GRAPH) */}
      <div className="mf-analytics-row">
        {/* Left: Expenses / Stamps by Category */}
        <div className="mf-card">
          <div className="mf-card-head">
            <div className="mf-card-title">Sales by Category</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button type="button" className="mf-card-filter-btn">
                <span>This Month</span>
                <ChevronDown size={12} />
              </button>
              <button type="button" className="btn-icon" style={{ width: 28, height: 28 }}>
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          <div className="mf-donut-container">
            {/* Multi-color SVG Donut Chart */}
            <div className="mf-donut-graphic">
              <svg viewBox="0 0 160 160" width="160" height="160">
                {/* Segment 1: Pink (38.8%) */}
                <circle cx="80" cy="80" r="58" fill="none" stroke="#ec4899" strokeWidth="24" strokeDasharray="140 364" strokeDashoffset="0" />
                {/* Segment 2: Purple (22%) */}
                <circle cx="80" cy="80" r="58" fill="none" stroke="#6366f1" strokeWidth="24" strokeDasharray="80 364" strokeDashoffset="-140" />
                {/* Segment 3: Green (13.1%) */}
                <circle cx="80" cy="80" r="58" fill="none" stroke="#10b981" strokeWidth="24" strokeDasharray="48 364" strokeDashoffset="-220" />
                {/* Segment 4: Orange (11.4%) */}
                <circle cx="80" cy="80" r="58" fill="none" stroke="#f59e0b" strokeWidth="24" strokeDasharray="42 364" strokeDashoffset="-268" />
                {/* Segment 5: Blue (8.2%) */}
                <circle cx="80" cy="80" r="58" fill="none" stroke="#0ea5e9" strokeWidth="24" strokeDasharray="30 364" strokeDashoffset="-310" />
                {/* Segment 6: Grey (6.5%) */}
                <circle cx="80" cy="80" r="58" fill="none" stroke="#94a3b8" strokeWidth="24" strokeDasharray="24 364" strokeDashoffset="-340" />
              </svg>

              <div className="mf-donut-center">
                <strong>₹2,450.80</strong>
                <span>Total</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="mf-legend-list">
              {[
                { name: 'Indian Stamps', color: '#6366f1', amount: '₹950.00', pct: '38.8%', icon: Building },
                { name: 'British Commonwealth', color: '#10b981', amount: '₹540.00', pct: '22.0%', icon: Utensils },
                { name: 'World Stamps', color: '#f59e0b', amount: '₹320.00', pct: '13.1%', icon: Car },
                { name: 'Rare Errors & Proofs', color: '#0ea5e9', amount: '₹280.00', pct: '11.4%', icon: Zap },
                { name: 'Miniature Sheets', color: '#ec4899', amount: '₹200.00', pct: '8.2%', icon: Film },
                { name: 'Others / FDCs', color: '#94a3b8', amount: '₹160.80', pct: '6.5%', icon: PlusCircle },
              ].map((item) => {
                const IconComp = item.icon;
                return (
                  <div key={item.name} className="mf-legend-item">
                    <div className="mf-legend-label">
                      <div className="mf-legend-icon-badge" style={{ background: item.color }}>
                        <IconComp size={14} />
                      </div>
                      <span>{item.name}</span>
                    </div>
                    <div className="mf-legend-stats">
                      <span className="mf-legend-amount">{item.amount}</span>
                      <span className="mf-legend-pct">{item.pct}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mf-top-category-banner">
            <Sparkles size={16} />
            <span>Top Performing Category: <strong>Indian Stamps (38.8%)</strong></span>
          </div>
        </div>

        {/* Right: Sales / Expenses Trend Line Graph */}
        <div className="mf-card">
          <div className="mf-card-head">
            <div className="mf-card-title">Expenses &amp; Sales Trend</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button type="button" className="mf-card-filter-btn">
                <span>This Month</span>
                <ChevronDown size={12} />
              </button>
              <button type="button" className="btn-icon" style={{ width: 28, height: 28 }}>
                <MoreVertical size={14} />
              </button>
            </div>
          </div>

          {/* MoneyFlow Line Chart Container */}
          <div className="mf-trend-chart-box">
            {/* Y-Axis Labels + Grid Lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#94a3b8', fontSize: 11, pointerEvents: 'none' }}>
              {['₹3K', '₹2.5K', '₹2K', '₹1.5K', '₹1K', '₹500', '₹0'].map((label, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
                  <span style={{ width: 34 }}>{label}</span>
                  <div style={{ flex: 1, height: 1, background: i === 6 ? '#cbd5e1' : '#f1f5f9' }} />
                </div>
              ))}
            </div>

            {/* SVG Curved Trend Line with Gradient Fill */}
            <svg viewBox="0 0 400 160" width="100%" height="160" style={{ position: 'absolute', top: 6, left: 42, width: 'calc(100% - 50px)', overflow: 'visible' }}>
              <defs>
                <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gradient Area */}
              <path
                d="M 10 145 L 30 135 L 70 120 L 110 110 L 150 90 L 190 85 L 230 65 L 270 60 L 310 40 L 350 35 L 390 15 L 390 150 L 10 150 Z"
                fill="url(#purpleAreaGrad)"
              />

              {/* Smooth Trend Line */}
              <path
                d="M 10 145 Q 50 125, 110 110 T 230 65 T 310 40 T 390 15"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              {[[10, 145], [110, 110], [230, 65], [310, 40], [390, 15]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="4" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />
              ))}
            </svg>

            {/* Active Tooltip Badge (May 31 / ₹2,450.80) */}
            <div className="mf-chart-tooltip" style={{ right: 8, top: 4 }}>
              <strong>₹2,450.80</strong>
              <small>May 31</small>
            </div>
          </div>

          {/* X-Axis Dates */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 42, color: '#94a3b8', fontSize: 11.5, fontWeight: 600, marginTop: 4 }}>
            <span>May 1</span>
            <span>May 8</span>
            <span>May 15</span>
            <span>May 22</span>
            <span>May 31</span>
          </div>

          {/* Footer Summary Banner */}
          <div className="mf-trend-footer-banner">
            <div>
              <span>You've earned more revenue than last month: </span>
              <strong>+ ₹192.50 (↑ 8.5%)</strong>
            </div>

            {/* Mini Purple Trend Sparkline */}
            <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
              <path d="M2 16 L16 12 L30 14 L44 6 L58 4" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* CATEGORY OVERVIEW ROW (EXACT MONEYFLOW BUDGET OVERVIEW CARDS) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Category Stock Overview</h2>
          <Link to="/categories" style={{ fontSize: 13, color: 'var(--purple)', fontWeight: 700 }}>
            View All
          </Link>
        </div>

        <div className="mf-cat-grid">
          {[
            { name: 'Indian Stamps', colorClass: 'purple', barColor: '#6366f1', spent: '₹950', total: '₹1,200', pct: 79, icon: Building },
            { name: 'British Empire', colorClass: 'green', barColor: '#10b981', spent: '₹540', total: '₹800', pct: 68, icon: Utensils },
            { name: 'World Stamps', colorClass: 'orange', barColor: '#f59e0b', spent: '₹320', total: '₹500', pct: 64, icon: Car },
            { name: 'Airmail Covers', colorClass: 'blue', barColor: '#0ea5e9', spent: '₹280', total: '₹400', pct: 70, icon: Zap },
            { name: 'Thematic Stamps', colorClass: 'pink', barColor: '#ec4899', spent: '₹200', total: '₹400', pct: 50, icon: Film },
          ].map((card) => {
            const IconC = card.icon;
            return (
              <div key={card.name} className="mf-cat-mini-card">
                <div className="mf-cat-mini-head">
                  <div className="mf-cat-mini-icon-title">
                    <div className={`mf-cat-mini-icon ${card.colorClass}`}>
                      <IconC size={18} />
                    </div>
                    <span className="mf-cat-mini-title">{card.name}</span>
                  </div>
                  <button type="button" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
                    <MoreVertical size={14} />
                  </button>
                </div>

                <div className="mf-cat-mini-amount">
                  <strong>{card.spent}</strong> / {card.total}
                </div>

                <div className="mf-cat-mini-bar-bg">
                  <div className="mf-cat-mini-bar-fill" style={{ width: `${card.pct}%`, background: card.barColor }} />
                </div>

                <div className="mf-cat-mini-pct">{card.pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE (EXACT MONEYFLOW STYLE) */}
      <div className="mf-card">
        <div className="mf-card-head">
          <div className="mf-card-title">Recent Transactions &amp; Orders</div>
          <Link to="/orders" style={{ fontSize: 13, color: 'var(--purple)', fontWeight: 700 }}>
            View All
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="mf-tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Payment Method</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: 'May 31, 2026', title: '1854 Half Anna Blue Lithograph', sub: 'Nitesh Pawar · Mumbai', cat: 'Indian Stamps', catColor: 'green', method: 'VISA •••• 4242', amount: '-₹78.64' },
                { date: 'May 30, 2026', title: 'Mahatma Gandhi 10 Annas Memorial', sub: 'Meera Iyer · Bengaluru', cat: 'World Stamps', catColor: 'orange', method: 'Mastercard •••• 8888', amount: '-₹18.90' },
                { date: 'May 29, 2026', title: 'Monal Pheasant 200 Archival Sheet', sub: 'Arjun Deshpande · Pune', cat: 'Airmail Covers', catColor: 'blue', method: 'Bank Transfer / UPI', amount: '-₹120.00' },
                { date: 'May 28, 2026', title: 'Princely States Archival Exhibit Sheet', sub: 'Helen Ward · London', cat: 'Thematic Stamps', catColor: 'pink', method: 'VISA •••• 4242', amount: '-₹15.49' },
                { date: 'May 27, 2026', title: 'Queen Victoria Overprint Specimen', sub: 'Rohan Kapoor · Delhi', cat: 'Indian Stamps', catColor: 'green', method: 'Mastercard •••• 8888', amount: '-₹4.75' },
              ].map((tx, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="mf-tx-date">
                      <Calendar size={15} color="#94a3b8" />
                      <span>{tx.date}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{tx.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx.sub}</div>
                  </td>
                  <td>
                    <span className={`mf-category-tag ${tx.catColor}`}>
                      {tx.cat}
                    </span>
                  </td>
                  <td>
                    <div className="mf-pay-pill">
                      <CreditCard size={15} color="#64748b" />
                      <span>{tx.method}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="mf-amount-val negative">{tx.amount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM ACTION / TARGET BANNER (EXACT MONEYFLOW STYLE) */}
      <div className="mf-bottom-banner">
        <div className="mf-bottom-banner-left">
          <div className="mf-bottom-banner-icon">
            <Target size={28} />
          </div>
          <div>
            <div className="mf-bottom-banner-title">Small steps, big results! 🚀</div>
            <div className="mf-bottom-banner-sub">
              You're on track to achieve record stamp dispatches and inventory turnover this month.
            </div>
          </div>
        </div>

        <Link to="/inventory" className="mf-bottom-banner-btn">
          Set a Savings Goal
        </Link>
      </div>
    </div>
  );
}
