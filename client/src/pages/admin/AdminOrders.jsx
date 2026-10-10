import { Fragment, useCallback, useEffect, useState } from 'react';
import { api, qs } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Pagination from '../../components/Pagination';
import { StatusBadge } from '../Orders';
import { money, dateTime, STATUS_LABEL, PAYMENT_LABEL } from '../../format';

// Mirrors the server's allowed transitions; the server stays the authority.
const NEXT = {
  pending: (o) => (o.paymentMethod === 'cod' ? ['shipped', 'cancelled'] : ['paid', 'cancelled']),
  paid: () => ['shipped', 'cancelled'],
  shipped: () => ['delivered'],
  delivered: () => [],
  cancelled: () => [],
};
const ACTION = { paid: 'Mark paid', shipped: 'Mark shipped', delivered: 'Mark delivered', cancelled: 'Cancel order' };

export default function AdminOrders() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    api.get('/orders/admin/all' + qs({ status, page, limit: 15 })).then(setData).catch((e) => toast(e.message, 'error'));
  }, [status, page, toast]);
  useEffect(load, [load]);

  const move = async (o, next) => {
    if (next === 'cancelled' && !window.confirm('Cancel this order and return the items to stock?')) return;
    try {
      await api.patch(`/orders/${o._id}/status`, { status: next });
      toast(`Order marked ${STATUS_LABEL[next].toLowerCase()}.`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <div className="toolbar">
        <label className="field inline"><span>Status</span>
          <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All orders</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {!data ? <p className="muted">Loading…</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Status</th><th className="num">Total</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {data.orders.map((o) => (
                <Fragment key={o._id}>
                  <tr>
                    <td><button className="link-btn" aria-expanded={open === o._id} onClick={() => setOpen(open === o._id ? null : o._id)}>#{o._id.slice(-6).toUpperCase()}</button></td>
                    <td>{o.user?.name || 'Deleted user'}</td>
                    <td>{dateTime(o.createdAt)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="num">{money(o.total)}</td>
                    <td className="row-actions">
                      {NEXT[o.status](o).map((n) => (
                        <button key={n} className={n === 'cancelled' ? 'link-btn danger' : 'btn btn-sm'} onClick={() => move(o, n)}>{ACTION[n]}</button>
                      ))}
                    </td>
                  </tr>
                  {open === o._id && (
                    <tr className="detail-row">
                      <td colSpan="6">
                        <div className="two-col even">
                          <div>
                            {o.items.map((i) => <p key={i.product || i.name}>{i.quantity} × {i.name} <span className="muted">({money(i.price)})</span></p>)}
                          </div>
                          <div>
                            <p>{o.shippingAddress.fullName}, {o.shippingAddress.phone}<br />{o.shippingAddress.address}, {o.shippingAddress.city}{o.shippingAddress.region && `, ${o.shippingAddress.region}`}</p>
                            <p className="muted">{PAYMENT_LABEL[o.paymentMethod]} · {o.isPaid ? 'paid' : 'not paid'} · {o.user?.email}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {data.orders.length === 0 && <tr><td colSpan="6" className="muted">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </>
  );
}
