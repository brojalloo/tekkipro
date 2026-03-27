import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiMail, FiSend, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Veuillez entrer votre email');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      const message = getApiErrorMessage(err, { fallback: 'Erreur' });
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FFFAF0] text-[#1A1C23] font-sans">
      <div className="bg-white rounded-[24px] shadow-2xl p-10 md:p-14 max-w-[480px] w-full text-center flex flex-col items-center mx-auto">
        <div className="auth-logo">TekkiPro</div>
        
        {!sent ? (
          <>
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Mot de passe oublié</h2>
            <p className="auth-subtitle">Entrez votre adresse email pour recevoir un lien de réinitialisation.</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="block text-[0.9rem] font-bold text-gray-700 mb-2 pl-1" htmlFor="forgot-email"><FiMail size={14} /> Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="votre@email.com"
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'forgot-error' : 'forgot-help'}
                  required
                />
                <div id="forgot-help" className="auth-field-help">Nous enverrons un lien de réinitialisation à cette adresse si un compte existe.</div>
              </div>

              {error && (
                <div id="forgot-error" className="auth-form-status error" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" className="auth-btn" disabled={loading} aria-busy={loading}>
                {loading ? 'Envoi...' : <><FiSend size={14} /> Envoyer le lien</>}
              </button>
            </form>
            
            <Link to="/login" className="auth-link">Retour à la connexion</Link>
          </>
        ) : (
          <div className="auth-status success" role="status" aria-live="polite">
            <FiCheckCircle size={48} />
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Email envoyé !</h2>
            <p className="text-[1.1rem] text-white/60 leading-[1.6] mb-12 max-w-[480px]">Si un compte existe avec cette adresse, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception.</p>
            <Link to="/login" className="auth-btn">Retour à la connexion</Link>
          </div>
        )}
      </div>
    </div>
  );
}
