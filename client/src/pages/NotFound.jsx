import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="wrap pad empty">
      <h1>That page does not exist</h1>
      <p className="muted">The link may be old or mistyped.</p>
      <Link to="/" className="btn btn-primary">Back to the shop</Link>
    </main>
  );
}
