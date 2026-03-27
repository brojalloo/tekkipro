import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import { FiArrowRight, FiEye, FiEyeOff, FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import api from '../services/api';
import { getApiErrorCode, getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activationNotice, setActivationNotice] = useState('');
  const [showResendActivation, setShowResendActivation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (location.state?.activationEmail) setEmail(location.state.activationEmail);
    if (location.state?.activationMessage) {
      setActivationNotice(location.state.activationMessage);
      setShowResendActivation(true);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    try {
      await login(email, password);
      toast.success(getLocalSuccessMessage({ entity: 'auth', action: 'login' }));
      navigate('/app', { replace: true });
    } catch (error) {
      const code = getApiErrorCode(error);
      const message = getApiErrorMessage(error, { fallback: 'Erreur de connexion' });
      setSubmitError(message);
      setShowResendActivation(code === 'EMAIL_NOT_VERIFIED');
      toast.error(message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-[#FFFAF0] text-[#1A1C23] font-sans">
      <div className="flex w-full min-h-screen bg-white md:bg-transparent">
        <div className="hidden md:flex flex-[0_0_42%] lg:flex-[0_0_42%] bg-[#071C08] text-white flex-col justify-center p-12 relative overflow-hidden">
          {/* Kente accent bar */}
          <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gradient-to-b from-[#FFD600] via-[#1B5E20] to-[#D32F2F]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(27,94,32,0.4),transparent_50%),radial-gradient(circle_at_85%_80%,rgba(255,214,0,0.1),transparent_45%)]" />

          <div className="relative z-[3] flex items-center gap-4 mb-16">
            <div className="w-14 h-14 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-[18px] flex items-center justify-center text-2xl font-extrabold text-[#071C08] shadow-[0_8px_28px_rgba(255,214,0,0.3)]" style={{fontFamily:'Sora,sans-serif'}}>T</div>
            <span className="text-[1.75rem] font-extrabold tracking-tight text-white" style={{fontFamily:'Sora,sans-serif'}}>TekkiPro</span>
          </div>

          <div className="relative z-[3]">
            <h2 className="text-[2.4rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white" style={{fontFamily:'Sora,sans-serif'}}>Gérez votre boutique comme un pro</h2>
            <p className="text-[1rem] text-white/55 leading-[1.7] mb-12 max-w-[440px]">La solution SaaS n°1 pour les commerçants en Afrique de l'Ouest. Suivi des ventes, gestion du stock et scanner intégré.</p>

            <div className="flex gap-10">
              <div className="flex flex-col gap-1">
                <strong className="text-[1.75rem] font-extrabold text-[#FFD600]" style={{fontFamily:'Sora,sans-serif'}}>5 000+</strong>
                <span className="text-[0.78rem] font-semibold text-white/40 uppercase tracking-widest">Boutiques</span>
              </div>
              <div className="flex flex-col gap-1">
                <strong className="text-[1.75rem] font-extrabold text-[#6EE77E]" style={{fontFamily:'Sora,sans-serif'}}>12 pays</strong>
                <span className="text-[0.78rem] font-semibold text-white/40 uppercase tracking-widest">Afrique</span>
              </div>
              <div className="flex flex-col gap-1">
                <strong className="text-[1.75rem] font-extrabold text-white" style={{fontFamily:'Sora,sans-serif'}}>99.9%</strong>
                <span className="text-[0.78rem] font-semibold text-white/40 uppercase tracking-widest">Uptime</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center p-8 md:p-16 max-w-[580px] w-full mx-auto">
          <h1 className="text-[2.1rem] font-extrabold mb-2 tracking-tight text-[#1B5E20]" style={{fontFamily:'Sora,sans-serif'}}>Connexion</h1>
          <p className="text-base text-gray-500 mb-10 font-medium">Heureux de vous revoir ! Entrez vos identifiants.</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5 text-left w-full">
              <label className="block text-[0.9rem] font-bold text-gray-700 mb-2 pl-1" htmlFor="login-email">Adresse email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex pointer-events-none"><FiMail size={18} /></span>
                <input id="login-email" type="email" className="w-full py-3.5 pr-5 pl-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm" value={email}
                  onChange={(e) => { setEmail(e.target.value); if (submitError) setSubmitError(''); }}
                  placeholder="mamadou@tekkipro.sn" required />
              </div>
            </div>

            <div className="mb-5 text-left w-full">
              <label className="block text-[0.9rem] font-bold text-gray-700 mb-2 pl-1" htmlFor="login-password">Mot de passe</label>
              <div className="relative">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex pointer-events-none"><FiLock size={18} /></span>
                  <input id="login-password" type={showPassword ? 'text' : 'password'}
                    className="w-full py-3.5 pl-12 pr-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm" value={password}
                    onChange={(e) => { setPassword(e.target.value); if (submitError) setSubmitError(''); }}
                    placeholder="••••••••" required />
                </div>
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-gray-400 cursor-pointer p-1 transition-colors hover:text-[#D32F2F]" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between my-6">
              <label className="flex items-center gap-2.5 text-[0.9rem] font-semibold text-gray-600 cursor-pointer [&>input]:w-[18px] [&>input]:h-[18px] [&>input]:accent-[#D32F2F]">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Se souvenir de moi
              </label>
              <Link to="/forgot-password" className="text-[0.9rem] font-bold text-[#D32F2F] no-underline hover:underline">Mot de passe oublié ?</Link>
            </div>

            {activationNotice && <div className="p-4 rounded-xl text-[0.95rem] font-semibold mb-6 flex items-center gap-3 bg-[#1B5E20]/10 text-[#1b5e20] border-l-4 border-[#1B5E20] text-left"><FiAlertCircle /> {activationNotice}</div>}
            {submitError && <div className="p-4 rounded-xl text-[0.95rem] font-semibold mb-6 flex items-center gap-3 bg-[#D32F2F]/10 text-[#b71c1c] border-l-4 border-[#D32F2F] text-left"><FiAlertCircle /> {submitError}</div>}

            {showResendActivation && (
              <button type="button" className="w-full p-4 rounded-2xl text-[1.05rem] font-extrabold font-sans cursor-pointer transition-all flex items-center justify-center gap-3 bg-white text-[#1A1C23] border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300" onClick={() => {}} disabled={resendLoading}>
                {resendLoading ? 'Renvoi...' : 'Renvoyer l\'activation'}
              </button>
            )}

            <button type="submit" className="w-full p-4 rounded-2xl text-[1rem] font-extrabold cursor-pointer transition-all border-none flex items-center justify-center gap-3 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white shadow-lg shadow-[#1B5E20]/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1B5E20]/35 disabled:opacity-70" style={{fontFamily:'Sora,sans-serif'}} disabled={loading}>
              {loading ? 'Connexion...' : <><span>Se connecter</span><FiArrowRight size={20} /></>}
            </button>
          </form>

          <div className="flex items-center gap-4 my-8 text-[0.85rem] font-bold text-gray-400 uppercase tracking-widest before:content-[''] before:flex-1 before:h-[2px] before:bg-gray-100 after:content-[''] after:flex-1 after:h-[2px] after:bg-gray-100">ou continuer avec</div>

          <button type="button" className="w-full p-4 rounded-2xl text-[1.05rem] font-extrabold font-sans cursor-pointer transition-all flex items-center justify-center gap-3 bg-white text-[#1A1C23] border-2 border-gray-100 mt-6 hover:bg-gray-50 hover:border-gray-200 hover:-translate-y-px">
            <svg viewBox="0 0 48 48" width="20" height="20">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.8 0 6.9 5.4 3 13.3l7.8 6C12.8 13.2 17.9 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
              <path fill="#FBBC05" d="M10.8 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7L2.5 13.3A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.3-5.9z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.7 2.3-6.1 0-11.2-3.7-13.2-9l-8.3 5.9C6.9 42.6 14.8 48 24 48z"/>
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center mt-8 font-semibold text-gray-500 [&>a]:text-[#D32F2F] [&>a]:font-extrabold [&>a]:no-underline hover:[&>a]:underline">Pas encore de compte ? <Link to="/register">Créer un compte</Link></p>
        </div>
      </div>
    </div>
  );
}
