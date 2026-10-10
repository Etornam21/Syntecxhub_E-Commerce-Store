import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { StatusBadge } from '../Orders';
import { money, dateTime, STATUS_LABEL } from '../../format';

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/orders/admin/stats').then(setS).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="alert alert-error">{error}</p>;
  if (!s) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="stats">
        <div className="stat"><span>{money(s.revenue)}</span><small>Revenue from paid orders</small></div>
        <div className="stat"><span>{s.orders}</span><small>Orders</small></div>
        <div className="stat"><span>{s.products}</span><small>Products</small></div>
        <div className="stat"><span>{s.customers}</span><small>Customers</small></div>
      </div>

      <div className="two-col even">
        <section className="panel">
          <h2 className="h-sm">Orders by status</h2>
          <dl className="plain">
            {Object.keys(STATUS_LABEL).map((k) => (
              <div key={k}><dt><StatusBadge status={k} /></dt><dd>{s.statusCounts[k] || 0}</dd></div>
            ))}
          </dl>
        </section>
        <section className="panel">
          <h2 className="h-sm">Low or out of stock</h2>
          {s.lowStock.length === 0 ? <p className="muted">Everything is well stocked.</p> : (
            <dl className="plain">
              {s.lowStock.map((p) => <div key={p._id}><dt>{p.name}</dt><dd className={p.stock === 0 ? 'text-bad' : ''}>{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</dd></div>)}
            </dl>
          )}
          <Link to="/admin/products" className="small">Manage products</Link>
        </section>
      </div>

      <section className="panel">
        <h2 className="h-sm">Recent orders</h2>
        {s.recent.length === 0 ? <p className="muted">No orders yet.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Status</th><th className="num">Total</th></tr></thead>
              <tbody>
                {s.recent.map((o) => (
                  <tr key={o._id}>
                    <td><Link to={`/orders/${o._id}`}>#{o._id.slice(-6).toUpperCase()}</Link></td>
                    <td>{o.user?.name || 'Deleted user'}</td>
                    <td>{dateTime(o.createdAt)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="num">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
