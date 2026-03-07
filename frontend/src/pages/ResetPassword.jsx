import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FiLock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('form'); // form, success, error
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setStatus('error');
      setMessage('Lien de réinitialisation invalide');
      return;
    }
    if (password.length < 6) return toast.error('Le mot de passe doit contenir au moins 6 caractères');
    if (password !== confirmPassword) return toast.error('Les mots de passe ne correspondent pas');

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setStatus('success');
      setMessage(res.data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">TekkiPro</div>
          <div className="auth-status error">
            <FiXCircle size={48} />
            <h2>Lien invalide</h2>
            <p>Ce lien de réinitialisation est invalide ou expiré.</p>
            <Link to="/forgot-password" className="auth-btn">Demander un nouveau lien</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TekkiPro</div>
        
        {status === 'form' && (
          <>
            <h2>Nouveau mot de passe</h2>
            <p className="auth-subtitle">Choisissez un nouveau mot de passe sécurisé.</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label><FiLock size={14} /> Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                  required
                />
              </div>
              <div className="auth-field">
                <label><FiLock size={14} /> Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez votre mot de passe"
                  required
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}

        {status === 'success' && (
          <div className="auth-status success">
            <FiCheckCircle size={48} />
            <h2>Mot de passe modifié !</h2>
            <p>{message}</p>
            <Link to="/login" className="auth-btn">Se connecter</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="auth-status error">
            <FiXCircle size={48} />
            <h2>Erreur</h2>
            <p>{message}</p>
            <Link to="/forgot-password" className="auth-link">Demander un nouveau lien</Link>
          </div>
        )}
      </div>
    </div>
  );
}
