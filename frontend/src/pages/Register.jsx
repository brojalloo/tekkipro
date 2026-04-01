import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import { FiArrowRight, FiArrowLeft, FiEye, FiEyeOff, FiPackage, FiZap, FiBarChart2, FiMail, FiPhone, FiShoppingBag, FiUser, FiLock, FiAlertCircle } from 'react-icons/fi';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nomBoutique: '', slug: '', nom: '', prenom: '', email: '', password: '', telephone: ''
  });
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    if (submitError) setSubmitError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBoutiqueNameChange = (e) => {
    const nom = e.target.value;
    const slug = nom.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    if (submitError) setSubmitError('');
    setForm({ ...form, nomBoutique: nom, slug });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await register(form);
      if (response?.data?.requiresEmailVerification) {
        toast.success(response.message);
        navigate('/login', { replace: true, state: { activationMessage: response.message, activationEmail: form.email } });
        return;
      }
      toast.success(getLocalSuccessMessage({ entity: 'boutique', action: 'create' }));
      navigate('/app', { replace: true });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-[#FFFAF0] text-[#1A1C23] font-sans">
      <div className="flex w-full min-h-screen bg-white md:bg-transparent">
        <div className="hidden md:flex flex-[0_0_42%] lg:flex-[0_0_42%] bg-[#071C08] text-white flex-col justify-center p-12 relative overflow-hidden">
          {/* Kente bar */}
          <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gradient-to-b from-[#FFD600] via-[#1B5E20] to-[#D32F2F]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(27,94,32,0.45),transparent_50%),radial-gradient(circle_at_85%_75%,rgba(255,214,0,0.08),transparent_45%)]" />

          <Link to="/" className="relative z-[3] flex items-center gap-1.5 text-white/50 hover:text-white/90 transition-colors text-[0.82rem] font-medium mb-8 w-fit">
            <FiArrowLeft size={13} />
            Retour à l'accueil
          </Link>

          <div className="relative z-[3] flex items-center gap-4 mb-14">
            <div className="w-14 h-14 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-[18px] flex items-center justify-center text-2xl font-extrabold text-[#071C08] shadow-[0_8px_28px_rgba(255,214,0,0.3)]" style={{fontFamily:'Sora,sans-serif'}}>T</div>
            <span className="text-[1.75rem] font-extrabold tracking-tight text-white" style={{fontFamily:'Sora,sans-serif'}}>TekkiPro</span>
          </div>

          <div className="relative z-[3]">
            <h2 className="text-[2.3rem] font-extrabold leading-[1.1] mb-5 tracking-tight text-white" style={{fontFamily:'Sora,sans-serif'}}>Rejoignez des milliers de commerçants</h2>
            <p className="text-[0.95rem] text-white/55 leading-[1.7] mb-12 max-w-[440px]">Créez votre compte et gérez votre boutique plus efficacement dès aujourd'hui.</p>

            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4 text-[0.95rem] font-medium text-white/80">
                <div className="w-10 h-10 bg-[#1B5E20]/50 border border-[#1B5E20]/60 rounded-xl flex items-center justify-center text-[#FFD600] shrink-0"><FiPackage size={17} /></div>
                <span>Gestion de stock en temps réel</span>
              </div>
              <div className="flex items-center gap-4 text-[0.95rem] font-medium text-white/80">
                <div className="w-10 h-10 bg-[#1B5E20]/50 border border-[#1B5E20]/60 rounded-xl flex items-center justify-center text-[#FFD600] shrink-0"><FiZap size={17} /></div>
                <span>Scanner de codes-barres ultra rapide</span>
              </div>
              <div className="flex items-center gap-4 text-[0.95rem] font-medium text-white/80">
                <div className="w-10 h-10 bg-[#1B5E20]/50 border border-[#1B5E20]/60 rounded-xl flex items-center justify-center text-[#FFD600] shrink-0"><FiBarChart2 size={17} /></div>
                <span>Analyses de ventes détaillées</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center p-8 md:p-16 max-w-[580px] w-full mx-auto">
          <Link to="/" className="md:hidden flex items-center gap-1.5 text-[#1B5E20] hover:text-[#071C08] transition-colors text-[0.82rem] font-medium mb-8 w-fit">
            <FiArrowLeft size={13} />
            Retour à l'accueil
          </Link>
          <h1 className="text-[2rem] font-extrabold mb-2 tracking-tight text-[#1B5E20]" style={{fontFamily:'Sora,sans-serif'}}>Créer un compte</h1>
          <p className="text-base text-gray-500 mb-10 font-medium">Remplissez les informations ci-dessous pour commencer.</p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="mb-5 text-left w-full">
                <label htmlFor="r-prenom">Prénom</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex pointer-events-none"><FiUser size={18} /></span>
                  <input id="r-prenom" type="text" name="prenom" className="w-full py-3.5 pr-5 pl-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm" value={form.prenom} onChange={handleChange} placeholder="Amadou" required />
                </div>
              </div>
              <div className="mb-5 text-left w-full">
                <label htmlFor="r-nom">Nom</label>
                <input id="r-nom" type="text" name="nom" className="w-full py-3.5 pr-5 pl-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm" value={form.nom} onChange={handleChange} placeholder="Diallo" required />
              </div>
            </div>

            <div className="mb-5 text-left w-full">
              <label htmlFor="r-email">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex pointer-events-none"><FiMail size={18} /></span>
                <input id="r-email" type="email" name="email" className="w-full py-3.5 pr-5 pl-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm" value={form.email} onChange={handleChange} placeholder="amadou@exemple.com" required />
              </div>
            </div>

            <div className="mb-5 text-left w-full">
              <label htmlFor="r-tel">Téléphone</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex pointer-events-none"><FiPhone size={18} /></span>
                <input id="r-tel" type="tel" name="telephone" className="w-full py-3.5 pr-5 pl-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm" value={form.telephone} onChange={handleChange} placeholder="+221 77 123 45 67" />
              </div>
            </div>

            <div className="mb-5 text-left w-full">
              <label htmlFor="r-boutique">Nom de la boutique</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex pointer-events-none"><FiShoppingBag size={18} /></span>
                <input type="text" className="w-full py-3.5 pr-5 pl-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm" id="r-boutique" value={form.nomBoutique} onChange={handleBoutiqueNameChange} placeholder="Ma Boutique" required />
              </div>
              {form.slug && <span style={{ fontSize: 13, color: 'var(--auth-primary)', fontWeight: 700, marginTop: 4, display: 'block' }}>{form.slug}.tekkipro.com</span>}
            </div>

            <div className="mb-5 text-left w-full">
              <label htmlFor="r-password">Mot de passe</label>
              <div className="relative">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex pointer-events-none"><FiLock size={18} /></span>
                  <input id="r-password" type={showPassword ? 'text' : 'password'} name="password" 
                    className="w-full py-3.5 pl-12 pr-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm" value={form.password} onChange={handleChange} placeholder="Min. 8 caractères" required />
                </div>
                <button type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-gray-400 cursor-pointer p-1 transition-colors hover:text-[#D32F2F]" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex gap-3 text-[0.9rem] font-semibold text-gray-600 my-6 leading-relaxed cursor-pointer [&>input]:w-[18px] [&>input]:h-[18px] [&>input]:mt-[2px] [&>input]:accent-[#D32F2F] [&>input]:shrink-0 [&_a]:text-[#D32F2F] [&_a]:font-bold [&_a]:no-underline hover:[&_a]:underline">
              <input type="checkbox" checked={acceptCgu} onChange={(e) => setAcceptCgu(e.target.checked)} />
              J'accepte les <Link to="/cgu">conditions d'utilisation</Link>
            </label>

            {submitError && <div className="p-4 rounded-xl text-[0.95rem] font-semibold mb-6 flex items-center gap-3 bg-[#D32F2F]/10 text-[#b71c1c] border-l-4 border-[#D32F2F] text-left"><FiAlertCircle /> {submitError}</div>}

            <button type="submit" className="w-full p-4 rounded-2xl text-[1rem] font-extrabold cursor-pointer transition-all border-none flex items-center justify-center gap-3 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white shadow-lg shadow-[#1B5E20]/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1B5E20]/35 disabled:opacity-70" style={{fontFamily:'Sora,sans-serif'}} disabled={loading}>
              {loading ? 'Création...' : <><span>Créer ma boutique</span><FiArrowRight size={20} /></>}
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

          <p className="text-center mt-8 font-semibold text-gray-500 [&>a]:text-[#D32F2F] [&>a]:font-extrabold [&>a]:no-underline hover:[&>a]:underline">Déjà un compte ? <Link to="/login">Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
}
