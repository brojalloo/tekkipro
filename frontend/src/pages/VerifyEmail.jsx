import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Lien de vérification invalide. Aucun token fourni.');

  useEffect(() => {
    if (!token) {
      return;
    }

    api.post('/auth/verify-email', { token })
      .then(res => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch(err => {
        setStatus('error');
        setMessage(getApiErrorMessage(err, { fallback: 'Erreur lors de la vérification' }));
      });
  }, [token]);

  return (
    <div className="min-h-screen flex bg-[#FFFAF0] text-[#1A1C23] font-sans">
      <div className="bg-white rounded-[24px] shadow-2xl p-10 md:p-14 max-w-[480px] w-full text-center flex flex-col items-center mx-auto">
        <div className="auth-logo">TekkiPro</div>
        
        {status === 'loading' && (
          <div className="auth-status loading">
            <FiLoader size={48} className="auth-spinner" />
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Vérification en cours...</h2>
            <p className="text-[1.1rem] text-white/60 leading-[1.6] mb-12 max-w-[480px]">Veuillez patienter pendant que nous vérifions votre adresse email.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="auth-status success">
            <FiCheckCircle size={48} />
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Email vérifié !</h2>
            <p className="text-[1.1rem] text-white/60 leading-[1.6] mb-12 max-w-[480px]">{message}</p>
            <Link to="/login" className="auth-btn">Se connecter</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="auth-status error">
            <FiXCircle size={48} />
            <h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">Erreur de vérification</h2>
            <p className="text-[1.1rem] text-white/60 leading-[1.6] mb-12 max-w-[480px]">{message}</p>
            <Link to="/login" className="auth-link">Retour à la connexion</Link>
          </div>
        )}
      </div>
    </div>
  );
}
