import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import { StatusBadge } from './Orders';
import { money, dateTime, PAYMENT_LABEL } from '../format';

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { state } = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <main className="wrap pad"><h1>Order not found</h1><p className="muted">{error}</p><Link to="/orders" className="btn">My orders</Link></main>;
  if (!order) return <main className="wrap pad muted">Loading…</main>;

  const isOwner = String(order.user?._id || order.user) === user._id;
  const act = async (path, done) => {
    setBusy(true);
    try {
      const d = await api.post(`/orders/${id}/${path}`);
      setOrder({ ...order, ...d.order });
      toast(done);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const a = order.shippingAddress;

  return (
    <main className="wrap pad narrow">
      {state?.placed && (
        <div className="alert alert-ok" role="status">
          <strong>Thank you, your order is in.</strong>{' '}
          {order.status === 'pending' && order.paymentMethod !== 'cod' ? 'Confirm payment below to get it moving.' : 'We will contact you when it ships.'}
        </div>
      )}
      <div className="title-row">
        <h1>Order #{order._id.slice(-6).toUpperCase()}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="muted">Placed {dateTime(order.createdAt)}</p>

      {isOwner && order.status === 'pending' && (
        <div className="actions">
          {order.paymentMethod !== 'cod' && (
            <button className="btn btn-primary" disabled={busy} onClick={() => act('pay', 'Payment confirmed.')}>
              Pay {money(order.total)} now (demo)
            </button>
          )}
          <button className="btn" disabled={busy} onClick={() => window.confirm('Cancel this order?') && act('cancel', 'Order cancelled.')}>Cancel order</button>
        </div>
      )}

      <ul className="lines">
        {order.items.map((i) => (
          <li key={i.product || i.name} className="line line-simple">
            <ProductImage product={{ name: i.name, image: i.image, category: '' }} className="line-img" />
            <div className="line-info"><strong>{i.name}</strong><span className="muted small">{i.quantity} × {money(i.price)}</span></div>
            <strong className="line-total">{money(i.price * i.quantity)}</strong>
          </li>
        ))}
      </ul>

      <div className="two-col even">
        <section className="panel">
          <h2 className="h-sm">Delivery</h2>
          <p>{a.fullName}<br />{a.address}<br />{a.city}{a.region && `, ${a.region}`}<br />{a.phone}</p>
        </section>
        <section className="panel">
          <h2 className="h-sm">Payment</h2>
          <p>{PAYMENT_LABEL[order.paymentMethod]} · {order.isPaid ? `paid ${dateTime(order.paidAt)}` : 'not paid yet'}</p>
          <dl className="plain">
            <div><dt>Items</dt><dd>{money(order.itemsTotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{order.shippingFee ? money(order.shippingFee) : 'Free'}</dd></div>
            <div className="sum-total"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
        </section>
      </div>
    </main>
  );
}
