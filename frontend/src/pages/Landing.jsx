import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiShoppingCart, FiPackage, FiUsers, FiDollarSign, FiBarChart2,
  FiSliders, FiCheckCircle, FiArrowRight, FiStar, FiPhone,
  FiMail, FiShield, FiZap, FiClock, FiTrendingUp,
  FiPlay, FiCheck, FiMenu, FiX, FiTarget, FiGlobe, FiCamera
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const features = [
  { icon: <FiPackage />, title: 'Gestion d\'inventaire', desc: 'Suivez vos stocks en temps réel avec alertes de niveau bas et réapprovisionnement automatique.', color: '#1B5E20' },
  { icon: <FiCamera />, title: 'Scanner de codes-barres', desc: 'Scannez et ajoutez des produits instantanément. Compatible avec tous les formats de codes-barres.', color: '#FFD600' },
  { icon: <FiBarChart2 />, title: 'Rapports & Analytics', desc: 'Visualisez vos performances avec des tableaux de bord interactifs et rapports détaillés.', color: '#D32F2F' },
  { icon: <FiDollarSign />, title: 'Point de vente', desc: 'Encaissez rapidement avec Wave, Orange Money ou espèces. Reçus digitaux automatiques.', color: '#1B5E20' },
  { icon: <FiUsers />, title: 'Gestion d\'équipe', desc: 'Gérez les rôles et permissions de vos employés. Suivi des performances individuelles.', color: '#FFD600' },
  { icon: <FiGlobe />, title: 'Mobile & Cloud', desc: 'Accédez à votre boutique depuis n\'importe où. Synchronisation en temps réel sur tous vos appareils.', color: '#D32F2F' },
];

const formatNumber = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M+';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+';
  return n.toString() + '+';
};

const formatCurrencyCompact = (n = 0) => {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + ' Md';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + ' M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + ' K';
  return n.toString();
};

const steps = [
  { num: '1', title: 'Créez votre compte', desc: 'Inscription gratuite en moins de 2 minutes. Aucune carte bancaire requise.', icon: <FiTarget />, color: '#1B5E20' },
  { num: '2', title: 'Ajoutez vos produits', desc: 'Importez votre catalogue ou scannez vos produits un par un avec la caméra.', icon: <FiPackage />, color: '#FFD600' },
  { num: '3', title: 'Commencez à vendre', desc: 'Encaissez vos clients et suivez vos ventes en temps réel depuis votre tableau de bord.', icon: <FiTrendingUp />, color: '#D32F2F' },
];

const plans = [
  {
    name: 'Starter',
    price: 'Gratuit',
    period: '',
    desc: 'Parfait pour démarrer votre activité',
    features: ['50 produits maximum', 'Rapports de vente basiques', '1 utilisateur'],
    cta: 'Commencer',
    popular: false,
  },
  {
    name: 'Pro',
    price: '9 900',
    period: 'FCFA / mois',
    desc: 'Pour les boutiques en croissance',
    features: ['Produits illimités', 'Rapports avancés & analytics', '5 utilisateurs', 'Scanner de codes-barres'],
    cta: 'Choisir Pro',
    popular: true,
  },
  {
    name: 'Business',
    price: '24 900',
    period: 'FCFA / mois',
    desc: 'Pour les grandes entreprises',
    features: ['Tout dans Pro +', 'Utilisateurs illimités', 'Multi-boutiques', 'Support prioritaire 24/7'],
    cta: 'Contacter l\'équipe',
    popular: false,
  },
];

const testimonials = [
  { name: 'Amadou Diallo', role: 'Boutique Électronique, Dakar', text: 'TekkiPro a transformé ma boutique. Je sais exactement ce que j\'ai en stock et mes ventes ont augmenté de 30%.', avatar: 'AD', color: '#1B5E20' },
  { name: 'Fatou Ndiaye', role: 'Superette Teranga, Thiès', text: 'Le scanner de codes-barres me fait gagner un temps fou. Je recommande à tous les commerçants du marché Sandaga.', avatar: 'FN', color: '#FFD600' },
  { name: 'Moussa Konaté', role: 'Quincaillerie Bamako, Mali', text: 'Grâce aux rapports, j\'ai identifié mes produits les plus rentables. Mon chiffre d\'affaires a doublé en 6 mois.', avatar: 'MK', color: '#D32F2F' },
];

const showcaseScreens = [
  { src: '/screen-dashboard.png', label: 'Tableau de bord' },
  { src: '/screen-ventes.png', label: 'Historique ventes' },
  { src: '/screen-scanner.png', label: 'Point de vente' },
  { src: '/screen-inventaire.png', label: 'Inventaire' },
  { src: '/screen-parametres.png', label: 'Paramètres' },
];

const KENTE_COLORS = ['#1B5E20', '#FFD600', '#D32F2F', '#1B5E20', '#FFD600', '#D32F2F'];

function KenteStrip() {
  return (
    <div className="flex h-1.5 w-full" aria-hidden="true">
      {KENTE_COLORS.map((c, i) => <div key={i} style={{ background: c }} />)}
    </div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeScreen, setActiveScreen] = useState(2);
  const [stats, setStats] = useState({
    boutiques: 0, ventes: 0, produits: 0, utilisateurs: 0, chiffreAffaires: 0
  });

  useEffect(() => {
    axios.get(`${API_URL}/public-stats`)
      .then(res => { if (res.data.success) setStats(res.data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScreen(prev => (prev + 1) % showcaseScreens.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mobileMenu) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenu]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenu(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative overflow-x-clip bg-[#FFFAF0] text-[#1a1a1a] font-sans before:absolute before:rounded-full before:pointer-events-none before:blur-[36px] before:opacity-45 before:w-[320px] before:h-[320px] before:top-32 before:-right-[120px] before:bg-[rgba(211,47,47,0.1)] after:absolute after:rounded-full after:pointer-events-none after:blur-[36px] after:opacity-45 after:w-[260px] after:h-[260px] after:bottom-64 after:-left-[90px] after:bg-[rgba(27,94,32,0.08)]">
      <a href="#landing-main" className="skip-link skip-link-light">Aller au contenu principal</a>

      {/* ========== NAV ========== */}
      <nav className={`fixed inset-x-0 top-0 z-[60] py-4 transition-all duration-300 ${scrolled ? 'py-2.5 bg-white/80 backdrop-blur-md border-b border-slate-400/10' : ''}`} aria-label="Navigation principale TekkiPro">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto flex items-center justify-between gap-8 min-h-[72px] relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 text-[1.02rem] font-bold text-[#1a1a1a] relative z-20">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#D32F2F] to-[#FFD600] text-white font-extrabold shadow-[0_14px_28px_rgba(27,94,32,0.2)]">T</div>
            <span>TekkiPro</span>
          </Link>
          <div className={`flex items-center gap-6 max-md:fixed max-md:inset-x-0 max-md:top-[72px] max-md:flex-col max-md:bg-white max-md:p-6 max-md:shadow-lg max-md:transition-all max-md:duration-300 ${mobileMenu ? 'max-md:opacity-100 max-md:translate-y-0' : 'max-md:opacity-0 max-md:-translate-y-4 max-md:pointer-events-none'}`} id="landing-nav-links">
            <a href="#features" onClick={() => setMobileMenu(false)}>Fonctionnalités</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)}>Tarifs</a>
            <a href="#testimonials" onClick={() => setMobileMenu(false)}>Témoignages</a>
            <a href="mailto:ibrahimadiallo0899@gmail.com" onClick={() => setMobileMenu(false)}>Contact</a>
            <div className="flex items-center gap-3 ml-2 flex-wrap">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[0.9rem] font-semibold bg-transparent border border-[#1a1a2e]/10 text-[#1a1a1a] transition-all hover:-translate-y-0.5" onClick={() => setMobileMenu(false)}>Se connecter</Link>
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[0.9rem] font-semibold bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white shadow-[0_16px_28px_rgba(211,47,47,0.2)] transition-all hover:-translate-y-0.5" onClick={() => setMobileMenu(false)}>Essai gratuit <FiArrowRight size={15} /></Link>
            </div>
          </div>
          <button className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center border border-slate-400/20 bg-white/90 backdrop-blur-md shadow-sm text-[#1a1a1a] transition-all hover:bg-white hover:border-[#D32F2F]/20 cursor-pointer" onClick={() => setMobileMenu(!mobileMenu)} aria-label={mobileMenu ? 'Fermer la navigation' : 'Ouvrir la navigation'} aria-expanded={mobileMenu} aria-controls="landing-nav-links">
            {mobileMenu ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <main id="landing-main">
      <section className="relative overflow-hidden pt-36 pb-20 bg-white">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
          <div className="hero-content">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/10 text-[#D32F2F] text-[0.82rem] font-bold mb-5">
              <FiZap size={13} />
              <span>#1 en Afrique du Cloud</span>
            </div>
            <h1 className="text-[clamp(2.8rem,5vw,4.8rem)] leading-[1.02] tracking-tight max-w-[11ch] mb-4 font-extrabold">
              Gérez votre boutique comme un <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#FFD600] to-[#D32F2F]">pro.</span>
            </h1>
            <p className="max-w-[58ch] text-[#5e5b56] text-[1.08rem] leading-[1.75]">
              TekkiPro est la solution SaaS tout-en-un pour les commerçants d'Afrique de l'Ouest.
              Inventaire, ventes, rapports — tout est là.
            </p>
            <div className="flex flex-wrap gap-4 my-7">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white shadow-[0_14px_28px_rgba(211,47,47,0.22)] transition-all hover:-translate-y-0.5">
                Commencer gratuitement
                <FiArrowRight size={18} />
              </Link>
              <a href="#screenshots" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold bg-transparent border border-[#1a1a2e]/20 text-[#1a1a1a] transition-all hover:-translate-y-0.5">
                <FiPlay size={16} />
                Voir la démo
              </a>
            </div>
            <div className="flex items-center gap-6 mt-8 pt-7 border-t border-[#1a1a2e]/10 flex-wrap">
              <div className="flex flex-col [&>strong]:text-[1.5rem] [&>strong]:font-extrabold [&>strong]:tracking-tight [&>strong]:text-[#1a1a1a] [&>span]:text-[0.82rem] [&>span]:text-[#5e5b56] [&>span]:mt-0.5">
                <strong>{formatNumber(stats.boutiques)}</strong>
                <span>Boutiques en Afrique</span>
              </div>
              <div className="w-px h-9 bg-[#1a1a2e]/10 shrink-0 hidden sm:block" />
              <div className="flex flex-col [&>strong]:text-[1.5rem] [&>strong]:font-extrabold [&>strong]:tracking-tight [&>strong]:text-[#1a1a1a] [&>span]:text-[0.82rem] [&>span]:text-[#5e5b56] [&>span]:mt-0.5">
                <strong>12</strong>
                <span>Pays en Afrique</span>
              </div>
              <div className="w-px h-9 bg-[#1a1a2e]/10 shrink-0 hidden sm:block" />
              <div className="flex flex-col [&>strong]:text-[1.5rem] [&>strong]:font-extrabold [&>strong]:tracking-tight [&>strong]:text-[#1a1a1a] [&>span]:text-[0.82rem] [&>span]:text-[#5e5b56] [&>span]:mt-0.5">
                <strong>2M+</strong>
                <span>Transactions traitées</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="rounded-3xl overflow-hidden border border-white/60 shadow-[0_28px_90px_rgba(27,94,32,0.16),0_0_0_1px_rgba(211,47,47,0.06)] bg-white/85 backdrop-blur-md">
              <img src="/dashboard-preview.png" alt="TekkiPro Web Dashboard" />
            </div>
          </div>
        </div>
      </section>

      <KenteStrip />

      {/* ========== FEATURES ========== */}
      <section className="relative py-20" id="features">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
          <div className="max-w-[740px] mx-auto text-center mb-11">
            <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/10 text-[#D32F2F] text-[0.75rem] font-bold tracking-widest uppercase mb-4">Fonctionnalités</span>
            <h2 className="text-[clamp(2rem,3vw,3rem)] leading-[1.1] tracking-tight mb-3 font-extrabold">Tout ce dont votre boutique a besoin</h2>
            <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">Une plateforme complète pensée pour les réalités du commerce africain.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div className="relative overflow-hidden p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/55 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all hover:-translate-y-1.5 hover:border-[#D32F2F]/20 hover:shadow-[0_18px_50px_rgba(27,94,32,0.1)] hover:bg-white/90 cursor-pointer" key={i}>
                <div className="w-14 h-14 rounded-[18px] flex items-center justify-center text-xl mb-4" style={{ background: `${f.color}12`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="text-[1.15rem] mb-2 tracking-tight font-extrabold">{f.title}</h3>
                <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">{f.desc}</p>
                <div className="w-12 h-1 rounded-full mt-4" style={{ background: f.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SHOWCASE ========== */}
      <section className="relative py-20" id="screenshots">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
          <div className="max-w-[740px] mx-auto text-center mb-11">
            <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/10 text-[#D32F2F] text-[0.75rem] font-bold tracking-widest uppercase mb-4">Aperçu de l'application</span>
            <h2 className="text-[clamp(2rem,3vw,3rem)] leading-[1.1] tracking-tight mb-3 font-extrabold">Une interface pensée pour vous</h2>
            <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">Découvrez les écrans clés de TekkiPro, conçus pour les commerçants d'Afrique de l'Ouest.</p>
          </div>
          <div className="flex gap-4 items-end justify-center flex-wrap">
            {showcaseScreens.map((screen, i) => (
              <button
                key={i}
                type="button"
                className={`flex-1 min-w-0 max-w-[220px] flex flex-col items-center gap-3 p-0 bg-transparent border-none cursor-pointer transition-all duration-300 [&.active>div]:border-[#D32F2F] [&.active>div]:shadow-[0_16px_40px_rgba(232,98,58,0.2)] [&.active>div]:-translate-y-2 [&.active>span]:text-[#D32F2F] [&.active>span]:font-bold ${activeScreen === i ? 'active' : ''}`}
                onClick={() => setActiveScreen(i)}
                aria-pressed={activeScreen === i}
                aria-label={`Afficher ${screen.label}`}
              >
                <div className="w-full rounded-2xl overflow-hidden border-2 border-[#1a1a2e]/10 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all duration-300 bg-white">
                  <img src={screen.src} alt={screen.label} />
                </div>
                <span className="text-[0.82rem] font-semibold text-[#5e5b56] transition-colors duration-300">{screen.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <KenteStrip />

      {/* ========== HOW IT WORKS ========== */}
      <section className="relative py-20">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
          <div className="max-w-[740px] mx-auto text-center mb-11">
            <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/10 text-[#D32F2F] text-[0.75rem] font-bold tracking-widest uppercase mb-4">Comment ça marche</span>
            <h2 className="text-[clamp(2rem,3vw,3rem)] leading-[1.1] tracking-tight mb-3 font-extrabold">Démarrez en 3 étapes simples</h2>
            <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">Aucune formation requise. Aucune installation. Commencez immédiatement.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((s, i) => (
              <div className="relative p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/55 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(27,94,32,0.1)]" key={i}>
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#D32F2F]/10 text-[#D32F2F] text-[0.9rem] font-extrabold mb-4" style={{ background: s.color, color: '#fff' }}>{s.num}</div>
                <div className="w-14 h-14 rounded-[18px] flex items-center justify-center bg-gradient-to-br from-[#D32F2F]/10 to-[#FFD600]/10 text-[#D32F2F] text-2xl mb-4" style={{ background: `${s.color}15`, color: s.color }}>{s.icon}</div>
                <h3 className="text-[1.15rem] mb-2 tracking-tight font-extrabold">{s.title}</h3>
                <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="mt-4 w-16 h-1 rounded-full bg-gradient-to-r from-[#D32F2F]/35 to-[#FFD600]/10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section className="relative py-20" id="pricing">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
          <div className="max-w-[740px] mx-auto text-center mb-11">
            <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/10 text-[#D32F2F] text-[0.75rem] font-bold tracking-widest uppercase mb-4">Tarifs</span>
            <h2 className="text-[clamp(2rem,3vw,3rem)] leading-[1.1] tracking-tight mb-3 font-extrabold">Un prix simple, sans surprise</h2>
            <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">Commencez gratuitement. Évoluez quand votre business grandit.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p, i) => (
              <div className={`relative p-7 rounded-[26px] bg-white/70 backdrop-blur-md border border-white/55 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(27,94,32,0.1)] cursor-pointer ${p.popular ? 'bg-[#1A1A2E] border-transparent shadow-[0_28px_90px_rgba(27,94,32,0.16)] -translate-y-2.5 text-white [&>div>h3]:text-white [&>div>.price-amount]:text-white [&>div>.pricing-desc]:text-slate-300 [&>div>.price-period]:text-slate-300 [&>ul>li]:text-slate-300 [&>ul>li>.check-icon]:text-[#4ade80]' : ''}`} key={i}>
                {p.popular && <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white text-[0.74rem] font-bold uppercase tracking-widest">Recommandé</div>}
                <div className="pricing-header">
                  <h3 className="text-[1.15rem] mb-2 tracking-tight font-extrabold">{p.name}</h3>
                  <p className="text-[#5e5b56] min-h-[46px] text-sm">{p.desc}</p>
                </div>
                <div className="flex items-baseline gap-1.5 my-5">
                  <span className="text-[2.6rem] leading-none font-extrabold tracking-tight">{p.price}</span>
                  <span className="text-[#5e5b56] text-[0.95rem]">{p.period}</span>
                </div>
                <ul className="grid gap-3 mb-6">
                  {p.features.map((f, j) => (
                    <li key={j}><FiCheck className="text-[#1B5E20] mt-1 shrink-0" /> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className={`inline-flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-full font-bold transition-all hover:-translate-y-0.5 ${p.popular ? 'bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white shadow-[0_18px_30px_rgba(211,47,47,0.22)]' : 'bg-slate-50/5 border border-slate-400/20 text-[#1a1a1a]'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="relative py-20" id="testimonials">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
          <div className="max-w-[740px] mx-auto text-center mb-11">
            <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/10 text-[#D32F2F] text-[0.75rem] font-bold tracking-widest uppercase mb-4">Témoignages</span>
            <h2 className="text-[clamp(2rem,3vw,3rem)] leading-[1.1] tracking-tight mb-3 font-extrabold">Ce que disent nos commerçants</h2>
            <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">Découvrez ce que disent les commerçants qui utilisent TekkiPro au quotidien.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div className="relative p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/55 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(27,94,32,0.1)]" key={i}>
                <div className="testimonial-stars" style={{ color: '#F4A020', marginBottom: '0.75rem' }}>
                  {[...Array(5)].map((_, j) => <FiStar key={j} />)}
                </div>
                <p className="text-[#5e5b56] leading-[1.8] mt-1.5 min-h-[128px]">"{t.text}"</p>
                <div className="flex items-center gap-4 mt-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#D32F2F] to-[#FFD600] text-white font-bold" style={{ background: t.color }}>{t.avatar}</div>
                  <div>
                    <div className="font-bold tracking-tight">{t.name}</div>
                    <div className="text-[#5e5b56] text-[0.86rem]">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="relative py-20">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto text-center">
          <h2 className="text-[clamp(2rem,3vw,3rem)] leading-[1.1] tracking-tight mb-3 font-extrabold">Prêt à transformer votre commerce ?</h2>
          <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">Rejoignez plus de 5 000 commerçants qui font confiance à TekkiPro.<br />Essai gratuit de 14 jours, sans engagement.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white shadow-[0_14px_28px_rgba(211,47,47,0.22)] transition-all hover:-translate-y-0.5">
              <FiZap size={16} />
              Démarrer maintenant
            </Link>
            <a href="mailto:ibrahimadiallo0899@gmail.com" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold bg-transparent border border-[#1a1a2e]/20 text-[#1a1a1a] transition-all hover:-translate-y-0.5">
              Parler à un conseiller
            </a>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-[#FFFAF0] pt-16 pb-8 border-t border-slate-400/10">
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-12 mb-12">
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-3 text-[1.02rem] font-bold text-[#1a1a1a] relative z-20">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#D32F2F] to-[#FFD600] text-white font-extrabold shadow-[0_14px_28px_rgba(27,94,32,0.15)]">T</div>
                <span>TekkiPro</span>
              </div>
              <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">La solution de gestion #1 pour les commerçants africains. Simple, rapide, efficace.</p>
              <div className="flex items-center gap-4 mt-2">
                <a href="#" aria-label="Globe" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#D32F2F] hover:text-white transition-colors"><FiGlobe size={18} /></a>
                <a href="mailto:ibrahimadiallo0899@gmail.com" aria-label="Mail" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#D32F2F] hover:text-white transition-colors"><FiMail size={18} /></a>
                <a href="tel:+221768815972" aria-label="Phone" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#D32F2F] hover:text-white transition-colors"><FiPhone size={18} /></a>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div className="flex flex-col gap-3 [&>h4]:font-bold [&>h4]:mb-2 [&>a]:text-[#5e5b56] [&>a]:text-[0.95rem] [&>a]:font-medium hover:[&>a]:text-[#D32F2F] [&>a]:transition-colors">
                <h4>Produit</h4>
                <a href="#features">Fonctionnalités</a>
                <a href="#pricing">Tarifs</a>
                <a href="#">Intégrations</a>
                <a href="#">Mises à jour</a>
              </div>
              <div className="flex flex-col gap-3 [&>h4]:font-bold [&>h4]:mb-2 [&>a]:text-[#5e5b56] [&>a]:text-[0.95rem] [&>a]:font-medium hover:[&>a]:text-[#D32F2F] [&>a]:transition-colors">
                <h4>Entreprise</h4>
                <a href="#">À propos</a>
                <a href="#">Blog</a>
                <a href="#">Carrières</a>
                <a href="mailto:ibrahimadiallo0899@gmail.com">Contact</a>
              </div>
              <div className="flex flex-col gap-3 [&>h4]:font-bold [&>h4]:mb-2 [&>a]:text-[#5e5b56] [&>a]:text-[0.95rem] [&>a]:font-medium hover:[&>a]:text-[#D32F2F] [&>a]:transition-colors">
                <h4>Support</h4>
                <a href="#">Centre d'aide</a>
                <a href="#">Documentation</a>
                <a href="#">Communauté</a>
                <a href="tel:+221768815972">+221 76 881 59 72</a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-400/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[0.9rem] text-[#5e5b56]">
            <p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">© {new Date().getFullYear()} TekkiPro. Tous droits réservés.</p>
            <div className="flex gap-6 hover:[&>a]:text-[#D32F2F] [&>a]:font-medium">
              <a href="#">Conditions</a>
              <a href="#">Confidentialité</a>
            </div>
          </div>
        </div>
      </footer>
      </main>
    </div>
  );
}
