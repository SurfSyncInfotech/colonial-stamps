import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import { catalogApi } from '../api/client';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    catalogApi.search(q).then(setResults).catch(() => {}).finally(() => setLoading(false));
  }, [q]);

  return (
    <Layout title={`Search: ${q}`}>
      <div className="container section">
        <h1 className="section-title">Search Results</h1>
        <p className="section-sub">Showing results for &ldquo;{q}&rdquo;</p>
        {loading ? <Loading /> : results?.data?.products ? (
          <>
            {results.data.categories?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <strong>Categories: </strong>
                {results.data.categories.map((c) => (
                  <Link key={c.id} to={`/stamps/${c.slug}`} style={{ marginRight: 12, color: 'var(--forest)' }}>{c.name}</Link>
                ))}
              </div>
            )}
            <div className="product-grid">
              {results.data.products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        ) : results?.data ? (
          <div className="product-grid">{results.data.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <p className="empty-state">No results found</p>
        )}
      </div>
    </Layout>
  );
}
