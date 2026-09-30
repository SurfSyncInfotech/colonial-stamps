import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import { catalogApi } from '../api/client';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) { setLoading(false); return; }
    catalogApi.search(q).then((res) => setResults(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [q]);

  return (
    <Layout title={`Search: ${q}`}>
      <div className="container section">
        <h1 className="section-title">Search Results</h1>
        <p className="section-sub">Showing results for &ldquo;{q}&rdquo;</p>
        {loading ? <Loading /> : results?.products ? (
          <>
            {results.categories?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <strong>Categories: </strong>
                {results.categories.map((c) => (
                  <Link key={c.id} to={`/stamps/${c.slug}`} style={{ marginRight: 12, color: 'var(--forest)' }}>{c.name}</Link>
                ))}
              </div>
            )}
            <div className="product-grid">
              {results.products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            {results.products.length === 0 && <p className="empty-state">No stamps found</p>}
          </>
        ) : (
          <div className="product-grid">
            {(results || []).map?.((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
