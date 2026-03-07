import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import './AuthPages.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide. Aucun token fourni.');
      return;
    }

    api.post('/auth/verify-email', { token })
      .then(res => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Erreur lors de la vérification');
      });
  }, [searchParams]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TekkiPro</div>
        
        {status === 'loading' && (
          <div className="auth-status loading">
            <FiLoader size={48} className="auth-spinner" />
            <h2>Vérification en cours...</h2>
            <p>Veuillez patienter pendant que nous vérifions votre adresse email.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="auth-status success">
            <FiCheckCircle size={48} />
            <h2>Email vérifié !</h2>
            <p>{message}</p>
            <Link to="/login" className="auth-btn">Se connecter</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="auth-status error">
            <FiXCircle size={48} />
            <h2>Erreur de vérification</h2>
            <p>{message}</p>
            <Link to="/login" className="auth-link">Retour à la connexion</Link>
          </div>
        )}
      </div>
    </div>
  );
}
