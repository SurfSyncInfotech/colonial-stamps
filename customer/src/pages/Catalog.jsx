import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { catalogApi } from '../api/client';

export default function Catalog() {
  const { category, subcategory } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const page = searchParams.get('page') || '1';
  const sort = searchParams.get('sort') || 'newest';

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = { page, sort, limit: 20 };
    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;

    const metaPromise = subcategory
      ? catalogApi.subcategory(category, subcategory)
      : category
        ? catalogApi.category(category)
        : Promise.resolve({ data: { name: 'All Stamps' } });

    Promise.all([catalogApi.products(params), metaPromise])
      .then(([prods, m]) => {
        setProducts(prods.data || []);
        setPagination(prods.pagination || {});
        setMeta(m.data || {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, subcategory, page, sort]);

  const title = meta.name || (subcategory ? meta.name : category ? meta.name : 'Shop All Stamps');

  return (
    <Layout title={title}>
      <div className="container">
        <div className="breadcrumbs">
          <Link to="/">Home</Link><span>/</span>
          <Link to="/stamps">Stamps</Link>
          {category && <><span>/</span><Link to={`/stamps/${category}`}>{meta.category_name || category}</Link></>}
          {subcategory && <><span>/</span><span>{meta.name}</span></>}
        </div>

        <h1 className="section-title">{title}</h1>
        {meta.description && <p className="section-sub">{meta.description}</p>}

        <div className="filters-bar">
          <select value={sort} onChange={(e) => setSearchParams({ page: '1', sort: e.target.value })}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name</option>
          </select>
        </div>

        {loading ? <Loading /> : error ? (
          <p className="error-msg">{error}</p>
        ) : products.length ? (
          <>
            <div className="product-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button disabled={pagination.page <= 1} onClick={() => setSearchParams({ page: pagination.page - 1, sort })}>Prev</button>
                <button className="active">{pagination.page}</button>
                <button disabled={pagination.page >= pagination.totalPages} onClick={() => setSearchParams({ page: pagination.page + 1, sort })}>Next</button>
              </div>
            )}
          </>
        ) : (
          <EmptyState title="No stamps found" message="Try a different category or check back soon." action={<Link to="/stamps" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>Browse All</Link>} />
        )}
      </div>
    </Layout>
  );
}
