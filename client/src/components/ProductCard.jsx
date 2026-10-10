import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import ProductImage from './ProductImage';
import { money } from '../format';

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { add } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const soldOut = product.stock < 1;

  const addToCart = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname + location.search } });
    try {
      await add(product._id, 1);
      toast(`${product.name} added to your cart.`);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <article className="card">
      <Link to={`/products/${product._id}`} className="card-media">
        <ProductImage product={product} />
        {soldOut && <span className="tag tag-out">Sold out</span>}
        {!soldOut && product.stock <= 5 && <span className="tag tag-low">Only {product.stock} left</span>}
      </Link>
      <div className="card-body">
        <p className="muted small">{product.category}</p>
        <h3 className="card-title"><Link to={`/products/${product._id}`}>{product.name}</Link></h3>
        <div className="card-foot">
          <strong className="price">{money(product.price)}</strong>
          <button className="btn btn-primary btn-sm" disabled={soldOut} onClick={addToCart}>
            {soldOut ? 'Sold out' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
