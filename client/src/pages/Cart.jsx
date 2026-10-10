import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import { money } from '../format';

export default function Cart() {
  const { cart, setQuantity, remove } = useCart();
  const toast = useToast();
  const guard = (fn) => fn().catch((e) => toast(e.message, 'error'));

  if (!cart.items.length) {
    return (
      <main className="wrap pad empty">
        <h1>Your cart is empty</h1>
        <p className="muted">Add something you like and it will wait for you here.</p>
        <Link to="/" className="btn btn-primary">Browse the shop</Link>
      </main>
    );
  }

  const toFree = cart.freeShippingFrom - cart.subtotal;
  return (
    <main className="wrap pad">
      <h1>Your cart</h1>
      <div className="two-col">
        <ul className="lines">
          {cart.items.map(({ product, quantity, lineTotal }) => (
            <li key={product._id} className="line">
              <Link to={`/products/${product._id}`}><ProductImage product={product} className="line-img" /></Link>
              <div className="line-info">
                <Link to={`/products/${product._id}`} className="line-name">{product.name}</Link>
                <span className="muted small">{money(product.price)} each</span>
                <button className="link-btn" onClick={() => guard(() => remove(product._id))}>Remove</button>
              </div>
              <div className="stepper" role="group" aria-label={`Quantity for ${product.name}`}>
                <button aria-label="Decrease" onClick={() => guard(() => setQuantity(product._id, quantity - 1))}>−</button>
                <span aria-live="polite">{quantity}</span>
                <button aria-label="Increase" disabled={quantity >= product.stock} onClick={() => guard(() => setQuantity(product._id, quantity + 1))}>+</button>
              </div>
              <strong className="line-total">{money(lineTotal)}</strong>
            </li>
          ))}
        </ul>
        <aside className="summary">
          <h2 className="h-sm">Order summary</h2>
          <dl>
            <div><dt>Items ({cart.count})</dt><dd>{money(cart.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{cart.shippingFee ? money(cart.shippingFee) : 'Free'}</dd></div>
            <div className="sum-total"><dt>Total</dt><dd>{money(cart.total)}</dd></div>
          </dl>
          {toFree > 0 && <p className="muted small">Add {money(toFree)} more for free delivery.</p>}
          <Link to="/checkout" className="btn btn-primary btn-lg block">Go to checkout</Link>
        </aside>
      </div>
    </main>
  );
}
