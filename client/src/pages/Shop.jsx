import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';
  const maxPrice = params.get('maxPrice') || '';
  const page = Number(params.get('page')) || 1;

  const [search, setSearch] = useState(q);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...changes }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.get('/products/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  // Debounce typing in the search box.
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => set({ q: search.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    let live = true;
    setError('');
    api
      .get('/products' + qs({ q, category, sort, maxPrice, page, limit: 12 }))
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [q, category, sort, maxPrice, page]);

  const filtered = q || category || maxPrice;

  return (
    <main>
      <section className="hero">
        <div className="wrap">
          <h1>Made in Ghana, delivered to your door.</h1>
          <p className="lead">Fashion, home goods, beauty and pantry staples from makers in Accra, Kumasi and Bolgatanga.</p>
          <input
            className="input hero-search"
            type="search"
            placeholder="Search for shea butter, kente, baskets…"
            aria-label="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <div className="wrap shop-layout">
        <aside className="filters" aria-label="Filters">
          <h2 className="h-sm">Category</h2>
          <ul className="chips">
            <li><button className={!category ? 'chip on' : 'chip'} onClick={() => set({ category: '' })}>All</button></li>
            {categories.map((c) => (
              <li key={c}><button className={category === c ? 'chip on' : 'chip'} onClick={() => set({ category: c })}>{c}</button></li>
            ))}
          </ul>
          <label className="field">
            <span>Sort by</span>
            <select className="input" value={sort} onChange={(e) => set({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className="field">
            <span>Maximum price (GH₵)</span>
            <input className="input" type="number" min="0" placeholder="Any" value={maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} />
          </label>
          {filtered && (
            <button className="btn btn-quiet" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>
              Clear filters
            </button>
          )}
        </aside>

        <section aria-live="polite">
          {error && <p className="alert alert-error">{error}</p>}
          {!data && !error && <div className="grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="card skeleton" />)}</div>}
          {data && (
            <>
              <p className="muted small results">{data.total} {data.total === 1 ? 'product' : 'products'}</p>
              {data.items.length === 0 ? (
                <div className="empty">
                  <h2>No products match that search</h2>
                  <p className="muted">Try a different word or clear the filters.</p>
                </div>
              ) : (
                <div className="grid">{data.items.map((p) => <ProductCard key={p._id} product={p} />)}</div>
              )}
              <Pagination page={data.page} pages={data.pages} onChange={(p) => { set({ page: p > 1 ? String(p) : '' }); window.scrollTo({ top: 0 }); }} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
