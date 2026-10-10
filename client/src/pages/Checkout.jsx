import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { money, REGIONS } from '../format';

const METHODS = [
  { id: 'momo', label: 'Mobile money', hint: 'MTN, Telecel or AirtelTigo' },
  { id: 'card', label: 'Card', hint: 'Visa or Mastercard' },
  { id: 'cod', label: 'Pay on delivery', hint: 'Cash or mobile money to the rider' },
];

export default function Checkout() {
  const { user } = useAuth();
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: user.name, phone: '', address: '', city: '', region: 'Greater Accra' });
  const [method, setMethod] = useState('momo');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!cart.items.length) {
    return (
      <main className="wrap pad empty">
        <h1>Nothing to check out</h1>
        <Link to="/" className="btn btn-primary">Browse the shop</Link>
      </main>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { order } = await api.post('/orders', { shippingAddress: form, paymentMethod: method });
      await refresh();
      navigate(`/orders/${order._id}`, { state: { placed: true }, replace: true });
    } catch (err) {
      setError(err.message);
      if (err.status === 409) refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="wrap pad">
      <h1>Checkout</h1>
      <form className="two-col" onSubmit={submit}>
        <div className="stack">
          <fieldset className="panel">
            <legend>Delivery details</legend>
            <label className="field"><span>Full name</span><input className="input" required value={form.fullName} onChange={on('fullName')} autoComplete="name" /></label>
            <label className="field"><span>Phone number</span><input className="input" required inputMode="tel" placeholder="024 000 0000" value={form.phone} onChange={on('phone')} autoComplete="tel" /></label>
            <label className="field"><span>Street address or landmark</span><input className="input" required value={form.address} onChange={on('address')} autoComplete="street-address" /></label>
            <div className="row2">
              <label className="field"><span>Town or city</span><input className="input" required value={form.city} onChange={on('city')} autoComplete="address-level2" /></label>
              <label className="field"><span>Region</span>
                <select className="input" value={form.region} onChange={on('region')}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
              </label>
            </div>
          </fieldset>
          <fieldset className="panel">
            <legend>Payment</legend>
            {METHODS.map((m) => (
              <label key={m.id} className={method === m.id ? 'radio on' : 'radio'}>
                <input type="radio" name="pay" checked={method === m.id} onChange={() => setMethod(m.id)} />
                <span><strong>{m.label}</strong><br /><span className="muted small">{m.hint}</span></span>
              </label>
            ))}
            {method !== 'cod' && <p className="muted small">You will confirm payment on the next screen. This demo store does not charge real money.</p>}
          </fieldset>
        </div>
        <aside className="summary">
          <h2 className="h-sm">Your order</h2>
          <ul className="mini">
            {cart.items.map(({ product, quantity, lineTotal }) => (
              <li key={product._id}><span>{quantity} × {product.name}</span><span>{money(lineTotal)}</span></li>
            ))}
          </ul>
          <dl>
            <div><dt>Items</dt><dd>{money(cart.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{cart.shippingFee ? money(cart.shippingFee) : 'Free'}</dd></div>
            <div className="sum-total"><dt>Total</dt><dd>{money(cart.total)}</dd></div>
          </dl>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
        </aside>
      </form>
    </main>
  );
}
