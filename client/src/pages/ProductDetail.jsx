import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ProductImage from '../components/ProductImage';
import { money } from '../format';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setProduct(null);
    api.get(`/products/${id}`).then((d) => setProduct(d.product)).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="wrap pad">
        <h1>We could not find that product</h1>
        <p className="muted">{error}</p>
        <Link to="/" className="btn btn-primary">Back to the shop</Link>
      </main>
    );
  }
  if (!product) return <main className="wrap pad muted">Loading…</main>;

  const soldOut = product.stock < 1;
  const addToCart = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    try {
      await add(product._id, qty);
      toast(`Added ${qty} to your cart.`);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <main className="wrap pad">
      <p className="small"><Link to="/">Shop</Link> / <Link to={`/?category=${encodeURIComponent(product.category)}`}>{product.category}</Link></p>
      <div className="detail">
        <ProductImage product={product} className="detail-img" />
        <div>
          <h1>{product.name}</h1>
          <p className="price price-lg">{money(product.price)}</p>
          <p className="desc">{product.description}</p>
          <p className={soldOut ? 'stock out' : product.stock <= 5 ? 'stock low' : 'stock'}>
            {soldOut ? 'Sold out' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
          </p>
          {!soldOut && (
            <div className="buy-row">
              <label className="field qty-field">
                <span>Quantity</span>
                <input className="input" type="number" min="1" max={product.stock} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))} />
              </label>
              <button className="btn btn-primary btn-lg" onClick={addToCart}>Add to cart</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
