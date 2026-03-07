import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiMail, FiSend, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './AuthPages.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Veuillez entrer votre email');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TekkiPro</div>
        
        {!sent ? (
          <>
            <h2>Mot de passe oublié</h2>
            <p className="auth-subtitle">Entrez votre adresse email pour recevoir un lien de réinitialisation.</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label><FiMail size={14} /> Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Envoi...' : <><FiSend size={14} /> Envoyer le lien</>}
              </button>
            </form>
            
            <Link to="/login" className="auth-link">Retour à la connexion</Link>
          </>
        ) : (
          <div className="auth-status success">
            <FiCheckCircle size={48} />
            <h2>Email envoyé !</h2>
            <p>Si un compte existe avec cette adresse, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception.</p>
            <Link to="/login" className="auth-btn">Retour à la connexion</Link>
          </div>
        )}
      </div>
    </div>
  );
}
