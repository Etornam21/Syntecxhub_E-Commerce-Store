import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Link to="/" className="brand">
          Sankofa Goods
        </Link>
        <nav aria-label="Main" className="nav">
          <NavLink to="/" end>Shop</NavLink>
          {user && <NavLink to="/orders">My orders</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="header-actions">
          <Link to="/cart" className="cart-link" aria-label={`Cart, ${cart.count} items`}>
            Cart
            {cart.count > 0 && <span className="badge">{cart.count}</span>}
          </Link>
          {user ? (
            <>
              <span className="hello">{user.name.split(' ')[0]}</span>
              <button
                className="btn btn-quiet"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-quiet">Log in</Link>
              <Link to="/register" className="btn btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </div>
      <div className="kente" aria-hidden="true" />
    </header>
  );
}
