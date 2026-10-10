import { useCallback, useEffect, useRef, useState } from 'react';
import { api, qs } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import { money } from '../../format';

const BLANK = { name: '', description: '', price: '', category: '', image: '', stock: '', featured: false, active: true };

function ProductForm({ initial, onClose, onSaved, categories }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const first = useRef();
  const editing = Boolean(initial?._id);
  const on = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  useEffect(() => {
    first.current?.focus();
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
    try {
      const d = editing ? await api.put(`/products/${initial._id}`, body) : await api.post('/products', body);
      onSaved(d.product, editing);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="pf-title" onSubmit={submit}>
        <h2 id="pf-title">{editing ? 'Edit product' : 'Add a product'}</h2>
        <label className="field"><span>Name</span><input ref={first} className="input" required value={form.name} onChange={on('name')} /></label>
        <label className="field"><span>Description</span><textarea className="input" rows="3" value={form.description} onChange={on('description')} /></label>
        <div className="row3">
          <label className="field"><span>Price (GH₵)</span><input className="input" type="number" min="0" step="0.01" required value={form.price} onChange={on('price')} /></label>
          <label className="field"><span>Stock</span><input className="input" type="number" min="0" step="1" required value={form.stock} onChange={on('stock')} /></label>
          <label className="field"><span>Category</span><input className="input" list="cats" required value={form.category} onChange={on('category')} /><datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></label>
        </div>
        <label className="field"><span>Image URL (optional)</span><input className="input" type="url" placeholder="https://…" value={form.image} onChange={on('image')} /></label>
        <div className="checks">
          <label><input type="checkbox" checked={form.featured} onChange={on('featured')} /> Featured</label>
          <label><input type="checkbox" checked={form.active} onChange={on('active')} /> Visible in the shop</label>
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <div className="actions end">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminProducts() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | {} (new) | product
  const [categories, setCategories] = useState([]);

  const load = useCallback(() => {
    api.get('/products/admin/all' + qs({ q, page, limit: 10, sort: 'name' })).then(setData).catch((e) => toast(e.message, 'error'));
    api.get('/products/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, [q, page, toast]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone. Past orders keep their record of it.`)) return;
    try {
      await api.del(`/products/${p._id}`);
      toast('Product deleted.');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search products" aria-label="Search products" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <button className="btn btn-primary" onClick={() => setEditing({})}>Add product</button>
      </div>
      {!data ? <p className="muted">Loading…</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th>Visibility</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p._id}>
                  <td><strong>{p.name}</strong>{p.featured && <span className="tag-inline">Featured</span>}</td>
                  <td>{p.category}</td>
                  <td className="num">{money(p.price)}</td>
                  <td className={`num ${p.stock === 0 ? 'text-bad' : ''}`}>{p.stock}</td>
                  <td>{p.active ? 'Visible' : <span className="muted">Hidden</span>}</td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => setEditing(p)}>Edit</button>
                    <button className="link-btn danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan="6" className="muted">No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      {editing && (
        <ProductForm
          initial={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(_p, wasEdit) => {
            setEditing(null);
            toast(wasEdit ? 'Product updated.' : 'Product added.');
            load();
          }}
        />
      )}
    </>
  );
}
