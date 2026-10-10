import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { money, dateTime, STATUS_LABEL } from '../format';

export const StatusBadge = ({ status }) => <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>;

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/orders/mine').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, []);

  return (
    <main className="wrap pad">
      <h1>My orders</h1>
      {error && <p className="alert alert-error">{error}</p>}
      {!orders && !error && <p className="muted">Loading…</p>}
      {orders && orders.length === 0 && (
        <div className="empty"><p className="muted">You have not placed an order yet.</p><Link to="/" className="btn btn-primary">Start shopping</Link></div>
      )}
      <ul className="order-list">
        {orders?.map((o) => (
          <li key={o._id}>
            <Link to={`/orders/${o._id}`} className="order-row">
              <div>
                <strong>Order #{o._id.slice(-6).toUpperCase()}</strong>
                <span className="muted small">{dateTime(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} items</span>
              </div>
              <StatusBadge status={o.status} />
              <strong>{money(o.total)}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
