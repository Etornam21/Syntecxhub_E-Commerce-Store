import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthForm({ mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';
  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = isLogin ? await login(form.email, form.password) : await register(form.name, form.email, form.password);
      navigate(from === '/' && u.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="wrap pad auth">
      <form className="panel" onSubmit={submit}>
        <h1>{isLogin ? 'Log in' : 'Create your account'}</h1>
        {!isLogin && <label className="field"><span>Full name</span><input className="input" required value={form.name} onChange={on('name')} autoComplete="name" /></label>}
        <label className="field"><span>Email</span><input className="input" type="email" required value={form.email} onChange={on('email')} autoComplete="email" /></label>
        <label className="field"><span>Password</span>
          <input className="input" type="password" required minLength={isLogin ? undefined : 8} value={form.password} onChange={on('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} />
          {!isLogin && <small className="muted">At least 8 characters.</small>}
        </label>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</button>
        <p className="muted small center">
          {isLogin ? <>New here? <Link to="/register" state={{ from }}>Create an account</Link></> : <>Already have an account? <Link to="/login" state={{ from }}>Log in</Link></>}
        </p>
      </form>
    </main>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
