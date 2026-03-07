import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Connexion réussie !');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>TekkiPro</h1>
        <p className="subtitle">Connectez-vous à votre boutique</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-control" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="admin@tekkipro.com" required />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" className="form-control" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="link" style={{ marginTop: '0.5rem' }}>
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </p>
        <p className="link">
          Pas encore de boutique ? <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
