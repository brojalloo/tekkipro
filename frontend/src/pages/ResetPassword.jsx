import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FiLock, FiCheckCircle, FiXCircle, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';

const PASSWORD_HELP = 'Min. 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial.';
const isStrongPassword = (v) => (
  typeof v === 'string' && v.length >= 8
  && /[a-z]/.test(v) && /[A-Z]/.test(v)
  && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)
);

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('form');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { setStatus('error'); setMessage('Lien invalide ou expiré.'); return; }

    const nextErrors = { password: '', confirmPassword: '' };
    if (!isStrongPassword(password)) nextErrors.password = PASSWORD_HELP;
    if (password !== confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    if (nextErrors.password || nextErrors.confirmPassword) {
      setErrors(nextErrors);
      toast.error(nextErrors.password || nextErrors.confirmPassword);
      return;
    }

    setLoading(true);
    setErrors({ password: '', confirmPassword: '' });
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setStatus('success');
      setMessage(res.data.message || 'Mot de passe modifié avec succès.');
    } catch (err) {
      setStatus('error');
      setMessage(getApiErrorMessage(err, { fallback: 'Erreur lors de la réinitialisation.' }));
    } finally {
      setLoading(false);
    }
  };

  const leftPanel = (
    <div className="hidden md:flex flex-[0_0_42%] bg-[#071C08] text-white flex-col justify-center p-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gradient-to-b from-[#FFD600] via-[#1B5E20] to-[#D32F2F]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(27,94,32,0.4),transparent_50%)]" />
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-[18px] flex items-center justify-center text-2xl font-extrabold text-[#071C08]">T</div>
          <span className="text-2xl font-extrabold text-white">TekkiPro</span>
        </div>
        <h1 className="text-4xl font-extrabold leading-tight mb-4">Nouveau mot de passe</h1>
        <p className="text-white/60 text-lg leading-relaxed">Choisissez un mot de passe sécurisé pour protéger votre compte.</p>
      </div>
    </div>
  );

  if (!token || status === 'error') {
    return (
      <div className="min-h-screen flex bg-[#FFFAF0]">
        {leftPanel}
        <div className="flex-1 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-[420px] text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiXCircle size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1A1C23] mb-3">Lien invalide</h2>
            <p className="text-gray-500 mb-8">{message || 'Ce lien de réinitialisation est invalide ou expiré.'}</p>
            <Link to="/forgot-password" className="inline-flex items-center gap-2 bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold py-3 px-8 rounded-xl transition">
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex bg-[#FFFAF0]">
        {leftPanel}
        <div className="flex-1 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-[420px] text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1A1C23] mb-3">Mot de passe modifié !</h2>
            <p className="text-gray-500 mb-8">{message}</p>
            <Link to="/login" className="inline-flex items-center gap-2 bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold py-3 px-8 rounded-xl transition">
              <FiArrowLeft size={16} /> Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FFFAF0]">
      {leftPanel}
      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-3 mb-10 md:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-xl flex items-center justify-center font-extrabold text-[#071C08]">T</div>
            <span className="text-xl font-extrabold text-[#071C08]">TekkiPro</span>
          </div>

          <h2 className="text-3xl font-extrabold text-[#1A1C23] mb-2">Nouveau mot de passe</h2>
          <p className="text-gray-500 mb-8">Choisissez un mot de passe sécurisé.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><FiLock size={14} /> Nouveau mot de passe</span>
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: '' })); }}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-[#1A1C23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B5E20] focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{PASSWORD_HELP}</p>
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-semibold text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><FiLock size={14} /> Confirmer le mot de passe</span>
              </label>
              <input
                id="reset-confirm"
                type={showPwd ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: '' })); }}
                placeholder="Confirmez votre mot de passe"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1A1C23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B5E20] focus:border-transparent transition"
              />
              {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
            </button>
          </form>

          <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1B5E20] mt-6 transition">
            <FiArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
