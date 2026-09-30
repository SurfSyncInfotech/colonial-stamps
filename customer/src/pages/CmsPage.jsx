import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { catalogApi } from '../api/client';

export default function CmsPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogApi.page(slug).then((r) => setPage(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Layout><Loading /></Layout>;
  if (!page) return <Layout><div className="empty-state">Page not found</div></Layout>;

  return (
    <Layout title={page.meta_title || page.title} description={page.meta_description}>
      <div className="container section">
        <h1 className="section-title">{page.title}</h1>
        <div style={{ background: 'white', border: '1px solid var(--border)', padding: 32 }} dangerouslySetInnerHTML={{ __html: page.content }} />
      </div>
    </Layout>
  );
}
