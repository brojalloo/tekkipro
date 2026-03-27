import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FiLock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';

const PASSWORD_HELP_TEXT = 'Le mot de passe doit contenir au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial.';

const isStrongPassword = (value) => (
  typeof value === 'string'
  && value.length >= 8
  && /[a-z]/.test(value)
  && /[A-Z]/.test(value)
  && /[0-9]/.test(value)
  && /[^A-Za-z0-9]/.test(value)
);

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('form'); // form, success, error
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState(false);

  const passwordFieldStyle = {
    WebkitTextSecurity: showPasswords ? 'none' : 'disc',
  };

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setStatus('error');
      setMessage('Lien de réinitialisation invalide');
      return;
    }

    const nextErrors = { password: '', confirmPassword: '' };
    if (!isStrongPassword(password)) nextErrors.password = PASSWORD_HELP_TEXT;
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas';

    if (nextErrors.password || nextErrors.confirmPassword) {
      setErrors(nextErrors);
      if (nextErrors.password) toast.error(nextErrors.password);
      else toast.error(nextErrors.confirmPassword);
      return;
    }

    setLoading(true);
    setErrors({ password: '', confirmPassword: '' });
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setStatus('success');
      setMessage(res.data.message);
    } catch (err) {
      setStatus('error');
      setMessage(getApiErrorMessage(err, { fallback: 'Erreur lors de la réinitialisation' }));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex bg-[#FFFAF0] text-[#1A1C23] font-sans">
        <div className="bg-white rounded-[24px] shadow-2xl p-10 md:p-14 max-w-[480px] w-full text-center flex flex-col items-center mx-auto">
          <div className="auth-logo">TekkiPro</div>
          <div className="auth-status error" role="alert">
            <FiXCircle size={48} />
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Lien invalide</h2>
            <p className="text-[1.1rem] text-white/60 leading-[1.6] mb-12 max-w-[480px]">Ce lien de réinitialisation est invalide ou expiré.</p>
            <Link to="/forgot-password" className="auth-btn">Demander un nouveau lien</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FFFAF0] text-[#1A1C23] font-sans">
      <div className="flex-1 flex flex-col justify-center p-8 md:p-16 max-w-[580px] w-full mx-auto">
        <div className="auth-logo">TekkiPro</div>
        
        {status === 'form' && (
          <>
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Nouveau mot de passe</h2>
            <p className="auth-subtitle">Choisissez un nouveau mot de passe sécurisé.</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-checkbox-toggle">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={e => setShowPasswords(e.target.checked)}
                />
                <span>{showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}</span>
              </label>

              <div className="auth-field">
                <label className="block text-[0.9rem] font-bold text-gray-700 mb-2 pl-1" htmlFor="reset-password"><FiLock size={14} /> Nouveau mot de passe</label>
                <input
                  id="reset-password"
                  name="newPassword"
                  type="text"
                  data-visibility={showPasswords ? 'visible' : 'masked'}
                  style={passwordFieldStyle}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  minLength={8}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'reset-password-error reset-password-help' : 'reset-password-help'}
                  required
                />
                <div id="reset-password-help" className="auth-field-help">{PASSWORD_HELP_TEXT}</div>
                {errors.password && <div id="reset-password-error" className="auth-field-error" role="alert">{errors.password}</div>}
              </div>
              <div className="auth-field">
                <label className="block text-[0.9rem] font-bold text-gray-700 mb-2 pl-1" htmlFor="reset-confirm-password"><FiLock size={14} /> Confirmer le mot de passe</label>
                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type="text"
                  data-visibility={showPasswords ? 'visible' : 'masked'}
                  style={passwordFieldStyle}
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Confirmez votre mot de passe"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
                  required
                />
                {errors.confirmPassword && <div id="reset-confirm-error" className="auth-field-error" role="alert">{errors.confirmPassword}</div>}
              </div>
              <button type="submit" className="auth-btn" disabled={loading} aria-busy={loading}>
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}

        {status === 'success' && (
          <div className="auth-status success" role="status" aria-live="polite">
            <FiCheckCircle size={48} />
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Mot de passe modifié !</h2>
            <p className="text-[1.1rem] text-white/60 leading-[1.6] mb-12 max-w-[480px]">{message}</p>
            <Link to="/login" className="auth-btn">Se connecter</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="auth-status error" role="alert">
            <FiXCircle size={48} />
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Erreur</h2>
            <p className="text-[1.1rem] text-white/60 leading-[1.6] mb-12 max-w-[480px]">{message}</p>
            <Link to="/forgot-password" className="auth-link">Demander un nouveau lien</Link>
          </div>
        )}
      </div>
    </div>
  );
}
