import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import {
  AVAILABLE_PAYMENT_MODE_OPTIONS,
  DEFAULT_PAYMENT_MODE,
  PAYMENT_MODE_ICONS,
  PAYMENT_MODE_LABELS,
  requiresPhoneForPaymentMode,
} from '../config/paymentOptions';
import {
  FiCreditCard, FiCheck, FiStar, FiZap, FiShield, FiClock,
  FiUsers, FiPackage, FiArrowRight, FiRefreshCw, FiXCircle, FiPhone,
  FiTrendingUp, FiCalendar, FiX, FiLock, FiChevronRight, FiExternalLink,
  FiShoppingCart, FiGrid
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';

export default function Abonnement() {
  const { isAdmin, refreshBoutique } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paiement, setPaiement] = useState({ modePaiement: DEFAULT_PAYMENT_MODE, reference: '', telephone: '' });
  const [submitting, setSubmitting] = useState(false);
  const paymentStatus = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');
  const paymentProvider = searchParams.get('provider');

  const resetPaiement = useCallback(() => {
    setPaiement({ modePaiement: DEFAULT_PAYMENT_MODE, reference: '', telephone: '' });
  }, []);

  const loadAbonnement = useCallback(async () => {
    try {
      const res = await api.get('/abonnements');
      setData(res.data.data);
    } catch {
      toast.error('Erreur chargement abonnement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAbonnement(); }, [loadAbonnement]);

  useEffect(() => {
    if (!showModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal]);

  useEffect(() => {
    if (!showModal || !AVAILABLE_PAYMENT_MODE_OPTIONS.length) return;
    const currentModeIsAvailable = AVAILABLE_PAYMENT_MODE_OPTIONS.some(({ key }) => key === paiement.modePaiement);
    if (!currentModeIsAvailable) {
      resetPaiement();
    }
  }, [paiement.modePaiement, resetPaiement, showModal]);

  // Gérer le retour de paiement Stripe / Wave
  useEffect(() => {
    if (paymentStatus === 'success') {
      if (sessionId) {
        // Vérifier la session Stripe
        api.get(`/payments/stripe/verify/${sessionId}`).then(res => {
          if (res.data.data?.status === 'paid') {
            toast.success(getLocalSuccessMessage({ entity: 'subscription', action: 'stripePaymentConfirmed' }));
          } else {
            toast.success(getLocalSuccessMessage({ entity: 'subscription', action: 'paymentProcessing' }));
          }
          loadAbonnement();
          refreshBoutique();
        }).catch(() => {
          toast.success(getLocalSuccessMessage({ entity: 'subscription', action: 'paymentReceivedRefreshing' }));
          loadAbonnement();
          refreshBoutique();
        });
      } else if (paymentProvider === 'wave' || paymentProvider === 'orange-money') {
        // Paiement mobile money — en attente de confirmation webhook
        toast.success(getLocalSuccessMessage({ entity: 'subscription', action: 'paymentProcessing' }));
        loadAbonnement();
        refreshBoutique();
      } else {
        toast.success(getLocalSuccessMessage({ entity: 'subscription', action: 'paymentConfirmed' }));
        loadAbonnement();
        refreshBoutique();
      }
      // Nettoyer l'URL
      setSearchParams({});
    } else if (paymentStatus === 'cancel' || paymentStatus === 'error') {
      toast.error('Paiement annulé ou échoué.');
      setSearchParams({});
    }
  }, [loadAbonnement, paymentStatus, refreshBoutique, sessionId, setSearchParams]);

  const handleSouscrire = (plan) => {
    if (!AVAILABLE_PAYMENT_MODE_OPTIONS.length) {
      toast.error('Aucun mode de paiement n’est disponible actuellement.');
      return;
    }
    setSelectedPlan(plan);
    resetPaiement();
    setShowModal(true);
  };

  const handleOpenRenewalModal = () => {
    if (!AVAILABLE_PAYMENT_MODE_OPTIONS.length) {
      toast.error('Aucun mode de paiement n’est disponible actuellement.');
      return;
    }
    setSelectedPlan(null);
    resetPaiement();
    setShowModal(true);
  };

  const submitHostedPayment = async ({ plan, type, mode, telephone }) => {
    if (mode === 'STRIPE') {
      const res = await api.post('/payments/stripe/create-session', { plan, type });
      if (res.data.data?.url) {
        window.location.href = res.data.data.url;
        return true;
      }
      throw new Error('Erreur Stripe : pas d\'URL de paiement');
    }

    if (mode === 'WAVE') {
      const res = await api.post('/payments/wave/initiate', { plan, type, telephone });
      if (res.data.data?.paymentUrl) {
        window.location.href = res.data.data.paymentUrl;
        return true;
      }
      toast.success(getApiSuccessMessage(res, { action: 'save' }));
      return false;
    }

    if (mode === 'ORANGE_MONEY') {
      const res = await api.post('/payments/orange-money/initiate', { plan, type, telephone });
      toast.success(getApiSuccessMessage(res, { action: 'save' }));
      return false;
    }

    if (mode === 'FREE_MONEY') {
      const res = await api.post('/payments/free-money/initiate', { plan, type, telephone });
      toast.success(getApiSuccessMessage(res, { action: 'save' }));
      return false;
    }

    return false;
  };

  const handleSubmit = async () => {
    if (!paiement.modePaiement) return toast.error('Choisissez un mode de paiement');
    setSubmitting(true);
    try {
      const plan = selectedPlan;
      const mode = paiement.modePaiement;

      if (['STRIPE', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY'].includes(mode)) {
        const redirected = await submitHostedPayment({
          plan,
          type: 'souscrire',
          mode,
          telephone: paiement.telephone,
        });
        if (redirected) {
          return;
        }
        setShowModal(false);
        loadAbonnement();
        refreshBoutique();
        return;
      }

      // Fallback — ancienne API (VIREMENT, CASH)
      const res = await api.post('/abonnements/souscrire', {
        plan: selectedPlan,
        ...paiement,
      });
      toast.success(getApiSuccessMessage(res, { action: 'save' }));
      setShowModal(false);
      loadAbonnement();
      refreshBoutique();
    } catch (error) {
      toast.error(getApiErrorMessage(error, { fallback: 'Erreur abonnement' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenouveler = async () => {
    if (!paiement.modePaiement) return toast.error('Choisissez un mode de paiement');
    setSubmitting(true);
    try {
      const plan = data?.abonnementActif?.plan || data?.plan;
      const mode = paiement.modePaiement;

      if (!plan || plan === 'GRATUIT') {
        toast.error('Aucun abonnement payant actif à renouveler');
        return;
      }

      if (['STRIPE', 'WAVE', 'ORANGE_MONEY', 'FREE_MONEY'].includes(mode)) {
        const redirected = await submitHostedPayment({
          plan,
          type: 'renouveler',
          mode,
          telephone: paiement.telephone,
        });
        if (redirected) {
          return;
        }
        setShowModal(false);
        loadAbonnement();
        refreshBoutique();
        return;
      }

      const res = await api.post('/abonnements/renouveler', paiement);
      toast.success(getApiSuccessMessage(res, { action: 'save' }));
      setShowModal(false);
      loadAbonnement();
      refreshBoutique();
    } catch (error) {
      toast.error(getApiErrorMessage(error, { fallback: 'Erreur abonnement' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnnuler = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Vous repasserez au plan Gratuit.')) return;
    try {
      const res = await api.post('/abonnements/annuler');
      toast.success(getApiSuccessMessage(res, { action: 'cancel' }));
      loadAbonnement();
      refreshBoutique();
    } catch (error) {
      toast.error(getApiErrorMessage(error, { fallback: 'Erreur abonnement' }));
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
    <div className="max-w-[1180px] mx-auto p-5 md:p-8 flex flex-col gap-5 font-sans">
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-muted-foreground">
        <div className="w-9 h-9 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
        <p>Chargement de votre abonnement...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="max-w-[1180px] mx-auto p-5 md:p-8 flex flex-col gap-5 font-sans">
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-muted-foreground">
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
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">

      {/* ===== HERO HEADER ===== */}
      <div className="relative p-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071C08] via-[#0D2710] to-[#071C08] shadow-[0_8px_32px_rgba(7,28,8,0.35)]">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1B5E20] via-[#FFD600] to-[#D32F2F] rounded-t-[28px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(27,94,32,0.35),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(255,214,0,0.06),transparent_40%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] rounded-xl shadow-[0_6px_20px_rgba(255,214,0,0.3)] shrink-0"><FiCreditCard size={22} /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight m-0 mb-0.5 leading-tight" style={{fontFamily:'Sora,sans-serif'}}>Abonnement</h1>
              <p className="text-[0.85rem] font-medium text-white/55 m-0">Gérez votre plan et vos fonctionnalités</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CURRENT PLAN STATUS ===== */}
      <div className="relative p-6 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] rounded-[22px] text-white shadow-[0_8px_24px_rgba(27,94,32,0.3)]">
        <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-gradient-to-r from-[#FFD600] to-[#F9A825]" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center shrink-0 ${data.plan === 'GRATUIT' ? 'bg-white/10 text-white/70' : data.plan === 'PRO' ? 'bg-[#FFD600]/15 text-[#FFD600]' : 'bg-[#FFD600]/20 text-[#FFD600]'}`}>
              {data.plan === 'GRATUIT' ? <FiZap size={28} /> : data.plan === 'PRO' ? <FiStar size={28} /> : <FiShield size={28} />}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[0.78rem] font-semibold text-white/60 uppercase tracking-widest">Plan actuel</span>
              <h2 className="text-2xl font-extrabold text-white m-0 leading-tight">{data.planNom}</h2>
              {data.abonnementActif ? (
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1.5 text-[0.82rem] text-white/70">
                    <FiCalendar size={13} />
                    Expire le {formatDate(data.abonnementActif.dateFin)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[0.75rem] font-bold ${daysRemaining <= 7 ? 'bg-[#D32F2F]/20 text-red-200 animate-pulse' : daysRemaining <= 15 ? 'bg-[#FFD600]/20 text-[#FFD600]' : 'bg-white/15 text-white'}`}>
                    {daysRemaining} jours restants
                  </span>
                </div>
              ) : (
                <span className="text-[0.85rem] text-white/60">Plan gratuit — sans limite de durée</span>
              )}
            </div>
          </div>

          {data.plan !== 'GRATUIT' && data.abonnementActif && (
            <div className="shrink-0">
              <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] border-none rounded-xl text-[0.88rem] font-bold cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg" onClick={handleOpenRenewalModal}>
                <FiRefreshCw size={15} /> Renouveler
              </button>
            </div>
          )}
        </div>

        {/* Usage meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-white/15 bg-[rgba(0,0,0,0.15)] mt-6 rounded-[16px]">
          <div className="p-6 relative border-b sm:border-b-0 sm:border-r border-white/10 last:border-0">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FFD600]/15 text-[#FFD600]">
                <FiUsers size={18} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white">{data.utilisation.utilisateurs.actuel}</span>
                <span className="text-base text-white/40 mx-0.5">/</span>
                <span className="text-base text-white/70 font-semibold">{data.utilisation.utilisateurs.limite === 999999 ? '∞' : data.utilisation.utilisateurs.limite}</span>
              </div>
            </div>
            <div className="text-[0.82rem] text-white/60 mb-3">Utilisateurs</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#FFD600] to-[#F9A825]" style={{ width: `${userPercent}%` }} />
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[0.75rem] text-white/60 font-semibold bg-white/10">{userPercent}% utilisé</span>
          </div>

          <div className="p-6 relative border-b sm:border-b-0 sm:border-r border-white/10 last:border-0">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FFD600]/15 text-[#FFD600]">
                <FiPackage size={18} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white">{data.utilisation.produits.actuel}</span>
                <span className="text-base text-white/40 mx-0.5">/</span>
                <span className="text-base text-white/70 font-semibold">{data.utilisation.produits.limite === 999999 ? '∞' : data.utilisation.produits.limite}</span>
              </div>
            </div>
            <div className="text-[0.82rem] text-white/60 mb-3">Produits</div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#FFD600] to-[#F9A825]" style={{ width: `${prodPercent}%` }} />
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[0.75rem] text-white/60 font-semibold bg-white/10">{prodPercent}% utilisé</span>
          </div>

          {data.utilisation.clients && (
            <div className="p-6 relative border-b sm:border-b-0 sm:border-r border-white/10 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#D32F2F]/20 text-red-300">
                  <FiUsers size={18} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-white">{data.utilisation.clients.actuel}</span>
                  <span className="text-base text-white/40 mx-0.5">/</span>
                  <span className="text-base text-white/70 font-semibold">{data.utilisation.clients.limite === 999999 ? '∞' : data.utilisation.clients.limite}</span>
                </div>
              </div>
              <div className="text-[0.82rem] text-white/60 mb-3">Clients</div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#D32F2F] to-red-400" style={{ width: `${clientPercent}%` }} />
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-[0.75rem] text-white/60 font-semibold bg-white/10">{clientPercent}% utilisé</span>
            </div>
          )}

          {data.utilisation.ventesParMois && (
            <div className="p-6 relative border-b sm:border-b-0 sm:border-r border-white/10 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FFD600]/15 text-[#FFD600]">
                  <FiShoppingCart size={18} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-white">{data.utilisation.ventesParMois.actuel}</span>
                  <span className="text-base text-white/40 mx-0.5">/</span>
                  <span className="text-base text-white/70 font-semibold">{data.utilisation.ventesParMois.limite === 999999 ? '∞' : data.utilisation.ventesParMois.limite}</span>
                </div>
              </div>
              <div className="text-[0.82rem] text-white/60 mb-3">Ventes ce mois</div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#FFD600] to-[#F9A825]" style={{ width: `${ventesPercent}%` }} />
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-[0.75rem] text-white/60 font-semibold bg-white/10">{ventesPercent}% utilisé</span>
            </div>
          )}

          {data.utilisation.categories && (
            <div className="p-6 relative border-b sm:border-b-0 sm:border-r border-white/10 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FFD600]/15 text-[#FFD600]">
                  <FiGrid size={18} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-white">{data.utilisation.categories.actuel}</span>
                  <span className="text-base text-white/40 mx-0.5">/</span>
                  <span className="text-base text-white/70 font-semibold">{data.utilisation.categories.limite === 999999 ? '∞' : data.utilisation.categories.limite}</span>
                </div>
              </div>
              <div className="text-[0.82rem] text-white/60 mb-3">Catégories</div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#FFD600] to-[#F9A825]" style={{ width: `${catPercent}%` }} />
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-[0.75rem] text-white/60 font-semibold bg-white/10">{catPercent}% utilisé</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== PLANS SECTION ===== */}
      {isAdmin && (
        <div className="mt-0">
          <div className="mb-5 p-6 bg-gradient-to-b from-white/98 to-slate-50/96 border border-border/80 rounded-[22px] shadow-sm">
            <div>
              <h3 className="text-xl font-extrabold text-foreground m-0 mb-1">Choisissez votre plan</h3>
              <p className="text-[0.9rem] text-muted-foreground m-0">Sélectionnez le plan qui correspond le mieux à votre activité.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            {plans.map(p => {
              const isCurrent = data.plan === p.key;
              return (
                <div key={p.key} className={`bg-gradient-to-b from-white/98 to-slate-50/96 border-[1.5px] rounded-3xl flex flex-col relative transition-all duration-300 overflow-hidden backdrop-blur-md hover:-translate-y-1.5 hover:shadow-xl before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-primary before:to-secondary before:opacity-85 ${p.popular ? 'border-primary shadow-[0_8px_30px_rgba(27,94,32,0.12)]' : isCurrent ? 'border-[#1B6B3A] shadow-sm' : 'border-border/80 shadow-sm'}`} aria-label={`Plan ${p.nom}`}>
                  {p.popular && !isCurrent && <div className="absolute top-0 inset-x-0 text-center p-1.5 text-[0.72rem] font-extrabold uppercase tracking-widest bg-gradient-to-r from-primary to-secondary text-white">Le plus populaire</div>}
                  {isCurrent && <div className="absolute top-0 inset-x-0 text-center p-1.5 text-[0.72rem] font-extrabold uppercase tracking-widest bg-gradient-to-r from-primary to-secondary text-white">Plan actuel</div>}

                  <div className="p-9 pb-6 text-center pt-8">
                    <div className="w-[52px] h-[52px] rounded-2xl inline-flex items-center justify-center mb-4" style={{ background: `${p.color}12`, color: p.color }}>
                      {p.icon}
                    </div>
                    <h4 className="text-xl font-extrabold text-foreground m-0 mb-1">{p.nom}</h4>
                    <p className="text-[0.82rem] text-muted-foreground m-0 mb-5">{p.desc}</p>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-4xl font-extrabold text-foreground leading-none tracking-tight">{p.prix}</span>
                      <span className="text-[0.82rem] text-muted-foreground font-medium">{p.key === 'GRATUIT' ? 'Gratuit pour toujours' : 'FCFA / mois'}</span>
                    </div>
                  </div>

                  <div className="h-[1px] bg-border/80 mx-7" />

                  <ul className="list-none p-6 mx-0 flex-1 flex flex-col gap-0">
                    {p.features.map((f, i) => (
                      <li key={i}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-current text-white" style={{ color: p.color }}><FiCheck size={14} strokeWidth={3} /></span>
                        {f}
                      </li>
                    ))}
                    {p.locked?.map((f, i) => (
                      <li key={`locked-${i}`} className="flex items-center gap-2.5 py-2 text-[0.86rem] text-muted-foreground/60 opacity-75">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center bg-muted text-muted-foreground/80 shrink-0"><FiLock size={12} /></span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="px-6 pb-6">
                    {isAdmin && !isCurrent && p.key !== 'GRATUIT' && (
                      <button type="button" className={`flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl text-[0.9rem] font-bold cursor-pointer transition-all shadow-sm hover:-translate-y-0.5 ${p.popular ? 'border-none bg-primary text-white hover:bg-accent' : 'border-[1.5px] border-border bg-transparent text-foreground hover:border-primary hover:text-primary hover:bg-primary/5'}`} onClick={() => handleSouscrire(p.key)} aria-label={`${data.plan === 'GRATUIT' ? 'Passer au plan' : 'Changer pour le plan'} ${p.nom}`}>
                        {data.plan === 'GRATUIT' ? 'Passer à ' : 'Changer pour '}{p.nom}
                        <FiChevronRight size={16} />
                      </button>
                    )}
                    {isAdmin && !isCurrent && p.key === 'GRATUIT' && data.plan !== 'GRATUIT' && (
                      <button type="button" className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl text-[0.9rem] font-bold cursor-pointer transition-all border-[1.5px] border-border bg-transparent text-muted-foreground shadow-sm hover:border-destructive hover:text-destructive hover:bg-destructive/10 hover:-translate-y-0.5" onClick={handleAnnuler} aria-label="Repasser au plan Gratuit">
                        Repasser en Gratuit
                      </button>
                    )}
                    {isCurrent && p.key !== 'GRATUIT' && (
                      <button type="button" className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl text-[0.9rem] font-bold cursor-pointer transition-all border-[1.5px] border-[#a7f3d0] bg-emerald-50 text-[#155230] shadow-sm hover:bg-emerald-100/80 hover:-translate-y-0.5" onClick={handleOpenRenewalModal} aria-label={`Renouveler le plan ${p.nom}`}>
                        <FiRefreshCw size={14} /> Renouveler
                      </button>
                    )}
                    {isCurrent && p.key === 'GRATUIT' && (
                      <div className="flex items-center justify-center gap-1.5 p-3 text-[#155230] text-[0.88rem] font-semibold rounded-xl bg-emerald-600/10 border border-emerald-600/15">
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
        <div className="bg-gradient-to-b from-white/98 to-slate-50/96 border border-border/80 rounded-3xl overflow-hidden shadow-sm backdrop-blur-md mt-6">
          <div className="padding-6 border-b border-border/60 p-6">
            <h3 className="flex items-center gap-2 text-[1.05rem] font-bold text-foreground m-0"><FiClock size={18} /> Historique des paiements</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="visually-hidden">
                Historique des abonnements avec plan, montant, période, statut et détails de paiement.
              </caption>
              <thead className="bg-slate-50 border-b border-border">
                <tr>
                  <th scope="col" className="px-4 py-3 text-[0.75rem] font-bold text-muted-foreground uppercase tracking-widest">Plan</th>
                  <th scope="col" className="px-4 py-3 text-[0.75rem] font-bold text-muted-foreground uppercase tracking-widest">Montant</th>
                  <th scope="col" className="px-4 py-3 text-[0.75rem] font-bold text-muted-foreground uppercase tracking-widest">Période</th>
                  <th scope="col" className="px-4 py-3 text-[0.75rem] font-bold text-muted-foreground uppercase tracking-widest">Statut</th>
                  <th scope="col" className="px-4 py-3 text-[0.75rem] font-bold text-muted-foreground uppercase tracking-widest">Paiement</th>
                </tr>
              </thead>
              <tbody>
                {data.historique.map(abo => (
                  <tr key={abo.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <th scope="row" className="px-4 py-3.5 font-normal">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${abo.plan === 'GRATUIT' ? 'bg-muted-foreground' : abo.plan === 'PRO' ? 'bg-primary' : 'bg-secondary'}`} />
                        <strong className="font-[600] text-[0.88rem] text-foreground">{abo.plan}</strong>
                      </div>
                    </th>
                    <td className="px-4 py-3.5 font-bold text-[0.88rem] text-foreground tabular-nums">{formatCFA(abo.montant)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-[0.82rem] text-muted-foreground">
                        <span>{formatDate(abo.dateDebut)}</span>
                        <FiArrowRight size={12} />
                        <span>{formatDate(abo.dateFin)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[0.72rem] font-bold uppercase tracking-wide ${abo.statut === 'ACTIF' ? 'bg-emerald-50 text-emerald-700' : abo.statut === 'EXPIRE' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                        {abo.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {abo.paiements.map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[0.82rem] text-muted-foreground">
                          <span>{PAYMENT_MODE_LABELS[p.modePaiement] || p.modePaiement}</span>
                          {p.reference && <span className="px-2 py-0.5 bg-muted rounded text-[0.75rem] font-mono text-muted-foreground">#{p.reference}</span>}
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
        <div className="fixed inset-0 bg-slate-900/56 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200" aria-hidden="true" onClick={() => setShowModal(false)}>
          <div className="bg-gradient-to-b from-white/99 to-slate-50/98 border border-border/80 rounded-[28px] w-full max-w-[490px] max-h-[90vh] overflow-y-auto relative shadow-[0_28px_80px_rgba(15,23,42,0.24)] animate-in zoom-in-95 duration-300" role="dialog" aria-modal="true" aria-labelledby="abonnement-modal-title" onClick={e => e.stopPropagation()}>
            <button type="button" className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-transparent border-none rounded-full text-muted-foreground hover:bg-muted cursor-pointer transition-colors z-10" onClick={() => setShowModal(false)} aria-label="Fermer la fenêtre de paiement">
              <FiX size={20} />
            </button>

            <div className="flex flex-col items-center pt-8 pb-6 px-6 relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white shadow-md mb-4">
                <FiCreditCard size={24} />
              </div>
              <h3 id="abonnement-modal-title" className="text-xl font-extrabold text-foreground m-0 mb-1.5 text-center">{selectedPlan ? `Passer au plan ${selectedPlan}` : 'Renouveler l\'abonnement'}</h3>
              <div className="text-2xl font-extrabold text-foreground tracking-tight flex items-baseline gap-1">
                {selectedPlan ? formatCFA(data.plans[selectedPlan]?.prix) : formatCFA(data.abonnementActif?.montant)}
                <span className="text-[0.85rem] font-medium text-muted-foreground">/ mois</span>
              </div>
            </div>

            <div className="px-6 pb-2 space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-[0.82rem] font-bold text-foreground flex items-center gap-1.5">Mode de paiement</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {AVAILABLE_PAYMENT_MODE_OPTIONS.map(({ key, label }) => (
                    <button
                      type="button"
                      key={key}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-[0.85rem] font-bold cursor-pointer transition-all ${paiement.modePaiement === key ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-transparent bg-white shadow-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground'}`}
                      onClick={() => setPaiement({ ...paiement, modePaiement: key })}
                      aria-pressed={paiement.modePaiement === key}
                      aria-label={`Choisir ${label} comme mode de paiement`}
                    >
                      <span className="text-lg shrink-0">{PAYMENT_MODE_ICONS[key]}</span>
                      <span className="flex-1 text-left">{label}</span>
                      {paiement.modePaiement === key && (
                        <span className="shrink-0 text-primary"><FiCheck size={14} /></span>
                      )}
                    </button>
                  ))}
                </div>
                {!AVAILABLE_PAYMENT_MODE_OPTIONS.length && (
                  <p className="text-[0.82rem] text-muted-foreground mt-1">Aucun moyen de paiement n’est activé pour cet environnement.</p>
                )}
              </div>

              {requiresPhoneForPaymentMode(paiement.modePaiement) && (
                <div className="flex flex-col gap-2">
                  <label className="text-[0.82rem] font-bold text-foreground flex items-center gap-1.5">
                    <FiPhone size={13} /> Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 bg-white border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground"
                    placeholder="77 123 45 67"
                    value={paiement.telephone}
                    onChange={e => setPaiement({ ...paiement, telephone: e.target.value })}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[0.82rem] font-bold text-foreground flex items-center gap-1.5">Référence de paiement <span className="font-normal text-muted-foreground">(optionnel)</span></label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground"
                  placeholder="N° transaction..."
                  value={paiement.reference}
                  onChange={e => setPaiement({ ...paiement, reference: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 pt-4 flex flex-col gap-2.5">
              <button type="button" className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-br from-primary to-secondary text-white border-none rounded-xl text-[0.95rem] font-bold cursor-pointer transition-all shadow-[0_8px_20px_rgba(27,94,32,0.2)] hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none" disabled={submitting || !AVAILABLE_PAYMENT_MODE_OPTIONS.length} onClick={selectedPlan ? handleSubmit : handleRenouveler} aria-busy={submitting}>
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Traitement...</>
                ) : (
                  <><FiLock size={15} /> Confirmer le paiement</>
                )}
              </button>
              <button type="button" className="w-full py-3 bg-transparent border-none text-muted-foreground font-bold cursor-pointer text-[0.9rem] hover:text-foreground" onClick={() => setShowModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
