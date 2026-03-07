import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiCreditCard, FiCheck, FiStar, FiZap, FiShield, FiClock,
  FiUsers, FiPackage, FiArrowRight, FiRefreshCw, FiXCircle, FiPhone,
  FiTrendingUp, FiCalendar, FiX, FiLock, FiChevronRight, FiExternalLink,
  FiShoppingCart, FiGrid
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Abonnement.css';

const MODE_LABELS = {
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  FREE_MONEY: 'Free Money',
  STRIPE: 'Carte bancaire',
  VIREMENT: 'Virement bancaire',
  CASH: 'Espèces',
};

const MODE_ICONS = {
  WAVE: '🌊',
  ORANGE_MONEY: '🟠',
  FREE_MONEY: '🟢',
  STRIPE: '💳',
  VIREMENT: '🏦',
  CASH: '💵',
};

export default function Abonnement() {
  const { isAdmin, refreshBoutique } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paiement, setPaiement] = useState({ modePaiement: 'WAVE', reference: '', telephone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => { loadAbonnement(); }, []);

  // Gérer le retour de paiement Stripe / Wave
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success') {
      if (sessionId) {
        // Vérifier la session Stripe
        api.get(`/payments/stripe/verify/${sessionId}`).then(res => {
          if (res.data.data?.status === 'paid') {
            toast.success('Paiement Stripe confirmé ! Votre abonnement est activé.');
          } else {
            toast.success('Paiement en cours de traitement...');
          }
          loadAbonnement();
          refreshBoutique();
        }).catch(() => {
          toast.success('Paiement reçu ! Actualisation...');
          loadAbonnement();
          refreshBoutique();
        });
      } else {
        toast.success('Paiement confirmé ! Votre abonnement est activé.');
        loadAbonnement();
        refreshBoutique();
      }
      // Nettoyer l'URL
      setSearchParams({});
    } else if (paymentStatus === 'cancel' || paymentStatus === 'error') {
      toast.error('Paiement annulé ou échoué.');
      setSearchParams({});
    }
  }, [searchParams]);

  const loadAbonnement = async () => {
    try {
      const res = await api.get('/abonnements');
      setData(res.data.data);
    } catch (error) {
      toast.error('Erreur chargement abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleSouscrire = (plan) => {
    setSelectedPlan(plan);
    setPaiement({ modePaiement: 'WAVE', reference: '', telephone: '' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!paiement.modePaiement) return toast.error('Choisissez un mode de paiement');
    setSubmitting(true);
    try {
      const plan = selectedPlan;
      const mode = paiement.modePaiement;

      // Stripe — redirection vers Stripe Checkout
      if (mode === 'STRIPE') {
        const res = await api.post('/payments/stripe/create-session', { plan, type: 'souscrire' });
        if (res.data.data?.url) {
          window.location.href = res.data.data.url;
          return;
        }
        toast.error('Erreur Stripe : pas d\'URL de paiement');
        setSubmitting(false);
        return;
      }

      // Wave
      if (mode === 'WAVE') {
        const res = await api.post('/payments/wave/initiate', { plan, type: 'souscrire', telephone: paiement.telephone });
        if (res.data.data?.paymentUrl) {
          window.location.href = res.data.data.paymentUrl;
          return;
        }
        toast.success(res.data.message);
        setShowModal(false);
        loadAbonnement();
        refreshBoutique();
        setSubmitting(false);
        return;
      }

      // Orange Money
      if (mode === 'ORANGE_MONEY') {
        const res = await api.post('/payments/orange-money/initiate', { plan, type: 'souscrire', telephone: paiement.telephone });
        toast.success(res.data.message);
        setShowModal(false);
        loadAbonnement();
        refreshBoutique();
        setSubmitting(false);
        return;
      }

      // Free Money
      if (mode === 'FREE_MONEY') {
        const res = await api.post('/payments/free-money/initiate', { plan, telephone: paiement.telephone });
        toast.success(res.data.message);
        setShowModal(false);
        loadAbonnement();
        refreshBoutique();
        setSubmitting(false);
        return;
      }

      // Fallback — ancienne API (VIREMENT, CASH)
      const res = await api.post('/abonnements/souscrire', {
        plan: selectedPlan,
        ...paiement,
      });
      toast.success(res.data.message);
      setShowModal(false);
      loadAbonnement();
      refreshBoutique();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenouveler = async () => {
    if (!paiement.modePaiement) return toast.error('Choisissez un mode de paiement');
    setSubmitting(true);
    try {
      const res = await api.post('/abonnements/renouveler', paiement);
      toast.success(res.data.message);
      setShowModal(false);
      loadAbonnement();
      refreshBoutique();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnnuler = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Vous repasserez au plan Gratuit.')) return;
    try {
      const res = await api.post('/abonnements/annuler');
      toast.success(res.data.message);
      loadAbonnement();
      refreshBoutique();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const formatCFA = (n) => n?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

  const daysLeft = (dateFin) => {
    const diff = new Date(dateFin) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const usagePercent = (actuel, limite) => Math.min(100, Math.round((actuel / limite) * 100));

  if (loading) return (
    <div className="abo-page">
      <div className="abo-loading">
        <div className="abo-loading-spinner" />
        <p>Chargement de votre abonnement...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="abo-page">
      <div className="abo-loading">
        <FiXCircle size={32} />
        <p>Erreur de chargement</p>
      </div>
    </div>
  );

  const plans = [
    {
      key: 'GRATUIT', nom: 'Starter', prix: '0', icon: <FiZap size={22} />,
      desc: 'Pour démarrer et tester la plateforme',
      color: '#6b7280',
      features: [
        '1 utilisateur (admin seul)',
        '50 produits maximum',
        '30 clients maximum',
        '100 ventes par mois',
        '5 catégories maximum',
        'Tableau de bord basique',
        'Gestion des ventes & stock',
        'Suivi clients & dettes',
      ],
      locked: [
        'Gestion des fournisseurs',
        'Gestion des employés',
        'Export factures PDF',
        'Statistiques avancées',
        'Multi-boutiques',
      ],
    },
    {
      key: 'PRO', nom: 'Pro', prix: '5 000', icon: <FiStar size={22} />, popular: true,
      desc: 'Pour les commerces en croissance',
      color: '#4f46e5',
      features: [
        'Jusqu\'à 5 utilisateurs',
        'Produits illimités',
        'Clients illimités',
        'Ventes illimitées',
        'Catégories illimitées',
        'Tout dans Starter +',
        'Gestion des fournisseurs',
        'Gestion des employés',
        'Export factures PDF',
        'Statistiques avancées',
        'Support prioritaire',
      ],
      locked: [
        'Multi-boutiques',
      ],
    },
    {
      key: 'BUSINESS', nom: 'Business', prix: '10 000', icon: <FiShield size={22} />,
      desc: 'Pour les grandes entreprises',
      color: '#b45309',
      features: [
        'Utilisateurs illimités',
        'Produits illimités',
        'Ventes illimitées',
        'Tout dans Pro +',
        'Multi-boutiques (plusieurs points de vente)',
        'Gestion centralisée multi-sites',
        'Tableau de bord consolidé',
        'Support dédié 24/7',
      ],
      locked: [],
    },
  ];

  const daysRemaining = data.abonnementActif ? daysLeft(data.abonnementActif.dateFin) : 0;
  const userPercent = usagePercent(data.utilisation.utilisateurs.actuel, data.utilisation.utilisateurs.limite);
  const prodPercent = usagePercent(data.utilisation.produits.actuel, data.utilisation.produits.limite);
  const clientPercent = data.utilisation.clients ? usagePercent(data.utilisation.clients.actuel, data.utilisation.clients.limite) : 0;
  const ventesPercent = data.utilisation.ventesParMois ? usagePercent(data.utilisation.ventesParMois.actuel, data.utilisation.ventesParMois.limite) : 0;
  const catPercent = data.utilisation.categories ? usagePercent(data.utilisation.categories.actuel, data.utilisation.categories.limite) : 0;

  return (
    <div className="abo-page">

      {/* ===== HERO HEADER ===== */}
      <div className="abo-hero">
        <div className="abo-hero-content">
          <div className="abo-hero-badge">
            <FiCreditCard size={14} />
            Gestion d'abonnement
          </div>
          <h1>Votre abonnement</h1>
          <p>Gérez votre plan, suivez votre utilisation et optimisez votre expérience TekkiPro.</p>
        </div>
      </div>

      {/* ===== CURRENT PLAN STATUS ===== */}
      <div className="abo-status-section">
        <div className="abo-status-main">
          <div className="abo-status-plan">
            <div className={`abo-plan-icon-lg plan-icon-${data.plan.toLowerCase()}`}>
              {data.plan === 'GRATUIT' ? <FiZap size={28} /> : data.plan === 'PRO' ? <FiStar size={28} /> : <FiShield size={28} />}
            </div>
            <div className="abo-status-info">
              <span className="abo-status-label">Plan actuel</span>
              <h2 className="abo-status-plan-name">{data.planNom}</h2>
              {data.abonnementActif ? (
                <div className="abo-status-meta">
                  <span className="abo-meta-item">
                    <FiCalendar size={13} />
                    Expire le {formatDate(data.abonnementActif.dateFin)}
                  </span>
                  <span className={`abo-days-pill ${daysRemaining <= 7 ? 'urgent' : daysRemaining <= 15 ? 'warning' : ''}`}>
                    {daysRemaining} jours restants
                  </span>
                </div>
              ) : (
                <span className="abo-status-free">Plan gratuit — sans limite de durée</span>
              )}
            </div>
          </div>

          {data.plan !== 'GRATUIT' && data.abonnementActif && (
            <div className="abo-status-actions">
              <button className="abo-renew-btn" onClick={() => { setSelectedPlan(null); setShowModal(true); }}>
                <FiRefreshCw size={15} /> Renouveler
              </button>
            </div>
          )}
        </div>

        {/* Usage meters */}
        <div className="abo-usage-grid">
          <div className="abo-usage-card">
            <div className="abo-usage-card-header">
              <div className="abo-usage-icon users">
                <FiUsers size={18} />
              </div>
              <div className="abo-usage-values">
                <span className="abo-usage-current">{data.utilisation.utilisateurs.actuel}</span>
                <span className="abo-usage-sep">/</span>
                <span className="abo-usage-limit">{data.utilisation.utilisateurs.limite === 999999 ? '∞' : data.utilisation.utilisateurs.limite}</span>
              </div>
            </div>
            <div className="abo-usage-label">Utilisateurs</div>
            <div className="abo-usage-track">
              <div className="abo-usage-fill users" style={{ width: `${userPercent}%` }} />
            </div>
            <span className="abo-usage-pct">{userPercent}% utilisé</span>
          </div>

          <div className="abo-usage-card">
            <div className="abo-usage-card-header">
              <div className="abo-usage-icon products">
                <FiPackage size={18} />
              </div>
              <div className="abo-usage-values">
                <span className="abo-usage-current">{data.utilisation.produits.actuel}</span>
                <span className="abo-usage-sep">/</span>
                <span className="abo-usage-limit">{data.utilisation.produits.limite === 999999 ? '∞' : data.utilisation.produits.limite}</span>
              </div>
            </div>
            <div className="abo-usage-label">Produits</div>
            <div className="abo-usage-track">
              <div className="abo-usage-fill products" style={{ width: `${prodPercent}%` }} />
            </div>
            <span className="abo-usage-pct">{prodPercent}% utilisé</span>
          </div>

          {data.utilisation.clients && (
            <div className="abo-usage-card">
              <div className="abo-usage-card-header">
                <div className="abo-usage-icon clients">
                  <FiUsers size={18} />
                </div>
                <div className="abo-usage-values">
                  <span className="abo-usage-current">{data.utilisation.clients.actuel}</span>
                  <span className="abo-usage-sep">/</span>
                  <span className="abo-usage-limit">{data.utilisation.clients.limite === 999999 ? '∞' : data.utilisation.clients.limite}</span>
                </div>
              </div>
              <div className="abo-usage-label">Clients</div>
              <div className="abo-usage-track">
                <div className="abo-usage-fill clients" style={{ width: `${clientPercent}%` }} />
              </div>
              <span className="abo-usage-pct">{clientPercent}% utilisé</span>
            </div>
          )}

          {data.utilisation.ventesParMois && (
            <div className="abo-usage-card">
              <div className="abo-usage-card-header">
                <div className="abo-usage-icon sales">
                  <FiShoppingCart size={18} />
                </div>
                <div className="abo-usage-values">
                  <span className="abo-usage-current">{data.utilisation.ventesParMois.actuel}</span>
                  <span className="abo-usage-sep">/</span>
                  <span className="abo-usage-limit">{data.utilisation.ventesParMois.limite === 999999 ? '∞' : data.utilisation.ventesParMois.limite}</span>
                </div>
              </div>
              <div className="abo-usage-label">Ventes ce mois</div>
              <div className="abo-usage-track">
                <div className="abo-usage-fill sales" style={{ width: `${ventesPercent}%` }} />
              </div>
              <span className="abo-usage-pct">{ventesPercent}% utilisé</span>
            </div>
          )}

          {data.utilisation.categories && (
            <div className="abo-usage-card">
              <div className="abo-usage-card-header">
                <div className="abo-usage-icon categories">
                  <FiGrid size={18} />
                </div>
                <div className="abo-usage-values">
                  <span className="abo-usage-current">{data.utilisation.categories.actuel}</span>
                  <span className="abo-usage-sep">/</span>
                  <span className="abo-usage-limit">{data.utilisation.categories.limite === 999999 ? '∞' : data.utilisation.categories.limite}</span>
                </div>
              </div>
              <div className="abo-usage-label">Catégories</div>
              <div className="abo-usage-track">
                <div className="abo-usage-fill categories" style={{ width: `${catPercent}%` }} />
              </div>
              <span className="abo-usage-pct">{catPercent}% utilisé</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== PLANS SECTION ===== */}
      {isAdmin && (
        <div className="abo-plans-section">
          <div className="abo-plans-header">
            <div>
              <h3>Choisissez votre plan</h3>
              <p>Sélectionnez le plan qui correspond le mieux à votre activité.</p>
            </div>
          </div>

          <div className="abo-plans-grid">
            {plans.map(p => {
              const isCurrent = data.plan === p.key;
              return (
                <div key={p.key} className={`abo-plan-card ${p.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}>
                  {p.popular && !isCurrent && <div className="abo-popular-ribbon">Le plus populaire</div>}
                  {isCurrent && <div className="abo-current-ribbon">Plan actuel</div>}

                  <div className="abo-plan-card-top">
                    <div className="abo-plan-icon-wrap" style={{ background: `${p.color}12`, color: p.color }}>
                      {p.icon}
                    </div>
                    <h4 className="abo-plan-name">{p.nom}</h4>
                    <p className="abo-plan-desc">{p.desc}</p>
                    <div className="abo-plan-pricing">
                      <span className="abo-plan-amount">{p.prix}</span>
                      <span className="abo-plan-period">{p.key === 'GRATUIT' ? 'Gratuit pour toujours' : 'FCFA / mois'}</span>
                    </div>
                  </div>

                  <div className="abo-plan-divider" />

                  <ul className="abo-plan-features">
                    {p.features.map((f, i) => (
                      <li key={i}>
                        <span className="abo-feature-check" style={{ color: p.color }}><FiCheck size={14} strokeWidth={3} /></span>
                        {f}
                      </li>
                    ))}
                    {p.locked?.map((f, i) => (
                      <li key={`locked-${i}`} className="abo-feature-locked">
                        <span className="abo-feature-lock"><FiLock size={12} /></span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="abo-plan-card-bottom">
                    {isAdmin && !isCurrent && p.key !== 'GRATUIT' && (
                      <button className={`abo-plan-cta ${p.popular ? 'primary' : 'outline'}`} onClick={() => handleSouscrire(p.key)}>
                        {data.plan === 'GRATUIT' ? 'Passer à ' : 'Changer pour '}{p.nom}
                        <FiChevronRight size={16} />
                      </button>
                    )}
                    {isAdmin && !isCurrent && p.key === 'GRATUIT' && data.plan !== 'GRATUIT' && (
                      <button className="abo-plan-cta downgrade" onClick={handleAnnuler}>
                        Repasser en Gratuit
                      </button>
                    )}
                    {isCurrent && p.key !== 'GRATUIT' && (
                      <button className="abo-plan-cta current-btn" onClick={() => { setSelectedPlan(null); setShowModal(true); }}>
                        <FiRefreshCw size={14} /> Renouveler
                      </button>
                    )}
                    {isCurrent && p.key === 'GRATUIT' && (
                      <div className="abo-plan-current-label">
                        <FiCheck size={14} /> Votre plan actuel
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== HISTORIQUE ===== */}
      {data.historique.length > 0 && (
        <div className="abo-history-section">
          <div className="abo-history-header">
            <h3><FiClock size={18} /> Historique des paiements</h3>
          </div>
          <div className="abo-history-table-wrap">
            <table className="abo-history-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Montant</th>
                  <th>Période</th>
                  <th>Statut</th>
                  <th>Paiement</th>
                </tr>
              </thead>
              <tbody>
                {data.historique.map(abo => (
                  <tr key={abo.id}>
                    <td>
                      <div className="abo-hist-plan">
                        <span className={`abo-hist-dot dot-${abo.plan.toLowerCase()}`} />
                        <strong>{abo.plan}</strong>
                      </div>
                    </td>
                    <td className="abo-hist-amount">{formatCFA(abo.montant)}</td>
                    <td>
                      <div className="abo-hist-dates">
                        <span>{formatDate(abo.dateDebut)}</span>
                        <FiArrowRight size={12} />
                        <span>{formatDate(abo.dateFin)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`abo-hist-status status-${abo.statut.toLowerCase()}`}>
                        {abo.statut}
                      </span>
                    </td>
                    <td>
                      {abo.paiements.map((p, i) => (
                        <div key={i} className="abo-hist-payment">
                          <span>{MODE_LABELS[p.modePaiement]}</span>
                          {p.reference && <span className="abo-hist-ref">#{p.reference}</span>}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== MODAL PAIEMENT ===== */}
      {showModal && (
        <div className="abo-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="abo-modal" onClick={e => e.stopPropagation()}>
            <button className="abo-modal-close" onClick={() => setShowModal(false)}>
              <FiX size={20} />
            </button>

            <div className="abo-modal-header">
              <div className="abo-modal-icon">
                <FiCreditCard size={24} />
              </div>
              <h3>{selectedPlan ? `Passer au plan ${selectedPlan}` : 'Renouveler l\'abonnement'}</h3>
              <div className="abo-modal-price">
                {selectedPlan ? formatCFA(data.plans[selectedPlan]?.prix) : formatCFA(data.abonnementActif?.montant)}
                <span>/ mois</span>
              </div>
            </div>

            <div className="abo-modal-body">
              <div className="abo-modal-field">
                <label className="abo-modal-label">Mode de paiement</label>
                <div className="abo-pay-grid">
                  {Object.entries(MODE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      className={`abo-pay-option ${paiement.modePaiement === key ? 'selected' : ''}`}
                      onClick={() => setPaiement({ ...paiement, modePaiement: key })}
                    >
                      <span className="abo-pay-emoji">{MODE_ICONS[key]}</span>
                      <span className="abo-pay-name">{label}</span>
                      {paiement.modePaiement === key && (
                        <span className="abo-pay-check"><FiCheck size={14} /></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {['WAVE', 'ORANGE_MONEY', 'FREE_MONEY'].includes(paiement.modePaiement) && (
                <div className="abo-modal-field">
                  <label className="abo-modal-label">
                    <FiPhone size={13} /> Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    className="abo-modal-input"
                    placeholder="77 123 45 67"
                    value={paiement.telephone}
                    onChange={e => setPaiement({ ...paiement, telephone: e.target.value })}
                  />
                </div>
              )}

              <div className="abo-modal-field">
                <label className="abo-modal-label">Référence de paiement <span className="optional">(optionnel)</span></label>
                <input
                  type="text"
                  className="abo-modal-input"
                  placeholder="N° transaction..."
                  value={paiement.reference}
                  onChange={e => setPaiement({ ...paiement, reference: e.target.value })}
                />
              </div>
            </div>

            <div className="abo-modal-footer">
              <button className="abo-modal-confirm" disabled={submitting} onClick={selectedPlan ? handleSubmit : handleRenouveler}>
                {submitting ? (
                  <><div className="abo-btn-spinner" /> Traitement...</>
                ) : (
                  <><FiLock size={15} /> Confirmer le paiement</>
                )}
              </button>
              <button className="abo-modal-cancel" onClick={() => setShowModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
