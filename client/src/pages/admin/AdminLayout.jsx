import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <main className="wrap pad">
      <div className="admin-head">
        <h1>Store admin</h1>
        <nav className="tabs" aria-label="Admin">
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/products">Products</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
        </nav>
      </div>
      <Outlet />
    </main>
  );
}
