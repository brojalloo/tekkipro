import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FiMail, FiSend, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
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
    if (!email) { setError('Veuillez entrer votre email'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      const message = getApiErrorMessage(err, { fallback: 'Erreur lors de l\'envoi' });
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FFFAF0]">
      {/* Panneau gauche */}
      <div className="hidden md:flex flex-[0_0_42%] bg-[#071C08] text-white flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gradient-to-b from-[#FFD600] via-[#1B5E20] to-[#D32F2F]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(27,94,32,0.4),transparent_50%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-[18px] flex items-center justify-center text-2xl font-extrabold text-[#071C08]">T</div>
            <span className="text-2xl font-extrabold text-white">TekkiPro</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">Mot de passe oublié ?</h1>
          <p className="text-white/60 text-lg leading-relaxed">Pas de panique. Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-16">
        <div className="w-full max-w-[420px]">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 md:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-xl flex items-center justify-center font-extrabold text-[#071C08]">T</div>
            <span className="text-xl font-extrabold text-[#071C08]">TekkiPro</span>
          </div>

          {!sent ? (
            <>
              <h2 className="text-3xl font-extrabold text-[#1A1C23] mb-2">Réinitialiser</h2>
              <p className="text-gray-500 mb-8">Entrez votre adresse email pour recevoir un lien de réinitialisation.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><FiMail size={14} /> Adresse email</span>
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                    placeholder="votre@email.com"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#1A1C23] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B5E20] focus:border-transparent transition"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Un lien sera envoyé si un compte existe avec cet email.</p>
                </div>

                {error && (
                  <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {loading ? 'Envoi...' : <><FiSend size={16} /> Envoyer le lien</>}
                </button>
              </form>

              <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1B5E20] mt-6 transition">
                <FiArrowLeft size={14} /> Retour à la connexion
              </Link>
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle size={40} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#1A1C23] mb-3">Email envoyé !</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Si un compte existe avec <strong>{email}</strong>, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception et vos spams.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold py-3 px-8 rounded-xl transition"
              >
                <FiArrowLeft size={16} /> Retour à la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
