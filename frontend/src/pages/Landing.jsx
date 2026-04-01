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
  { icon: FiPackage, title: 'Gestion d\'inventaire', desc: 'Suivez vos stocks en temps réel avec alertes de niveau bas et réapprovisionnement automatique.', accent: '#FFD600' },
  { icon: FiCamera, title: 'Scanner codes-barres', desc: 'Scannez et ajoutez des produits instantanément. Compatible avec tous les formats de codes-barres.', accent: '#D32F2F' },
  { icon: FiBarChart2, title: 'Rapports & Analytics', desc: 'Visualisez vos performances avec des tableaux de bord interactifs et rapports détaillés.', accent: '#FFD600' },
  { icon: FiDollarSign, title: 'Point de vente', desc: 'Encaissez rapidement avec Wave, Orange Money ou espèces. Reçus digitaux automatiques.', accent: '#D32F2F' },
  { icon: FiUsers, title: 'Gestion d\'équipe', desc: 'Gérez les rôles et permissions de vos employés. Suivi des performances individuelles.', accent: '#FFD600' },
  { icon: FiGlobe, title: 'Mobile & Cloud', desc: 'Accédez à votre boutique depuis n\'importe où. Synchronisation en temps réel sur tous vos appareils.', accent: '#D32F2F' },
];

const steps = [
  { num: '01', title: 'Créez votre compte', desc: 'Inscription gratuite en moins de 2 minutes. Aucune carte bancaire requise.', icon: FiTarget },
  { num: '02', title: 'Ajoutez vos produits', desc: 'Importez votre catalogue ou scannez vos produits un par un avec la caméra.', icon: FiPackage },
  { num: '03', title: 'Commencez à vendre', desc: 'Encaissez vos clients et suivez vos ventes en temps réel depuis votre tableau de bord.', icon: FiTrendingUp },
];

const plans = [
  {
    name: 'Starter',
    price: 'Gratuit',
    period: '',
    desc: 'Parfait pour démarrer votre activité',
    features: ['50 produits maximum', 'Rapports de vente basiques', '1 utilisateur', 'Accès mobile'],
    cta: 'Commencer gratuitement',
    popular: false,
  },
  {
    name: 'Pro',
    price: '5 000',
    period: 'FCFA / mois',
    desc: 'Pour les boutiques en croissance',
    features: ['Produits illimités', 'Rapports avancés & analytics', '5 utilisateurs', 'Scanner de codes-barres', 'Support prioritaire'],
    cta: 'Choisir Pro',
    popular: true,
  },
  {
    name: 'Business',
    price: '10 000',
    period: 'FCFA / mois',
    desc: 'Pour les grandes entreprises',
    features: ['Tout dans Pro +', 'Utilisateurs illimités', 'Multi-boutiques', 'Support 24/7', 'API & intégrations'],
    cta: 'Contacter l\'équipe',
    popular: false,
  },
];

const testimonials = [
  { name: 'Amadou Diallo', role: 'Boutique Électronique, Dakar', text: 'TekkiPro a transformé ma boutique. Je sais exactement ce que j\'ai en stock et mes ventes ont augmenté de 30%.', initials: 'AD' },
  { name: 'Fatou Ndiaye', role: 'Superette Teranga, Thiès', text: 'Le scanner de codes-barres me fait gagner un temps fou. Je recommande à tous les commerçants du marché Sandaga.', initials: 'FN' },
  { name: 'Moussa Konaté', role: 'Quincaillerie Bamako, Mali', text: 'Grâce aux rapports, j\'ai identifié mes produits les plus rentables. Mon chiffre d\'affaires a doublé en 6 mois.', initials: 'MK' },
];

const showcaseScreens = [
  { src: '/screen-dashboard.png', label: 'Tableau de bord' },
  { src: '/screen-ventes.png', label: 'Historique ventes' },
  { src: '/screen-scanner.png', label: 'Point de vente' },
  { src: '/screen-inventaire.png', label: 'Inventaire' },
  { src: '/screen-parametres.png', label: 'Paramètres' },
];

const formatNumber = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M+';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+';
  return n > 0 ? n.toString() + '+' : '—';
};

function KenteStrip() {
  return (
    <div className="flex w-full h-1.5 overflow-hidden" aria-hidden="true">
      {['#1B5E20','#FFD600','#D32F2F','#1B5E20','#FFD600','#D32F2F','#1B5E20','#FFD600','#D32F2F','#1B5E20','#FFD600','#D32F2F'].map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [_activeScreen, setActiveScreen] = useState(2);
  const [stats, setStats] = useState({ boutiques: 0, ventes: 0, produits: 0, utilisateurs: 0 });

  useEffect(() => {
    axios.get(`${API_URL}/public-stats`)
      .then(res => { if (res.data.success) setStats(res.data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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
    if (!mobileMenu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenu]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMobileMenu(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMobileMenu(false); };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .lp-root { font-family: 'DM Sans', sans-serif; }
        .lp-root h1, .lp-root h2, .lp-root h3, .lp-root .font-display { font-family: 'Sora', sans-serif; }
        .lp-hero-bg {
          background: #071C08;
          background-image:
            radial-gradient(ellipse 70% 50% at 80% 20%, rgba(27,94,32,0.35) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 10% 80%, rgba(255,214,0,0.06) 0%, transparent 55%);
        }
        .lp-grain::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.5;
          z-index: 0;
        }
        .gold-underline { text-decoration: underline; text-decoration-color: #FFD600; text-underline-offset: 6px; text-decoration-thickness: 3px; }
        .lp-card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .lp-card-hover:hover { transform: translateY(-4px); }
        .skip-link { position: absolute; left: -9999px; }
        .skip-link:focus { left: 1rem; top: 1rem; z-index: 9999; background: #FFD600; color: #071C08; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 700; }
      `}</style>

      <div className="lp-root relative overflow-x-clip">
        <a href="#landing-main" className="skip-link">Aller au contenu principal</a>

        {/* ══════════════════════ NAV ══════════════════════ */}
        <nav
          className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
            scrolled
              ? 'bg-[#071C08]/95 backdrop-blur-md border-b border-white/10 py-3'
              : 'bg-transparent py-5'
          }`}
          aria-label="Navigation principale TekkiPro"
        >
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto flex items-center justify-between gap-6">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-[#FFD600] flex items-center justify-center">
                <span className="font-display text-[#071C08] font-extrabold text-lg leading-none">T</span>
              </div>
              <span className="font-display text-white font-bold text-lg tracking-tight">TekkiPro</span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-7 text-[0.9rem] font-medium text-white/75">
              <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
              <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
              <a href="#testimonials" className="hover:text-white transition-colors">Témoignages</a>
              <a href="mailto:ibrahimadiallo0899@gmail.com" className="hover:text-white transition-colors">Contact</a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="text-[0.88rem] font-semibold text-white/80 hover:text-white transition-colors px-4 py-2">
                Se connecter
              </Link>
              <Link to="/register" className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#FFD600] text-[#071C08] text-[0.88rem] font-bold hover:bg-[#FFC800] transition-colors shadow-[0_4px_20px_rgba(255,214,0,0.3)]">
                Essai gratuit
                <FiArrowRight size={14} />
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-white/20 text-white"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label={mobileMenu ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {mobileMenu ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>

          {/* Mobile menu */}
          <div className={`md:hidden absolute inset-x-0 top-full bg-[#071C08] border-t border-white/10 transition-all duration-300 overflow-hidden ${mobileMenu ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col gap-1 p-4 text-[0.95rem] font-medium text-white/80">
              <a href="#features" onClick={() => setMobileMenu(false)} className="px-4 py-3 rounded-lg hover:bg-white/5">Fonctionnalités</a>
              <a href="#pricing" onClick={() => setMobileMenu(false)} className="px-4 py-3 rounded-lg hover:bg-white/5">Tarifs</a>
              <a href="#testimonials" onClick={() => setMobileMenu(false)} className="px-4 py-3 rounded-lg hover:bg-white/5">Témoignages</a>
              <a href="mailto:ibrahimadiallo0899@gmail.com" onClick={() => setMobileMenu(false)} className="px-4 py-3 rounded-lg hover:bg-white/5">Contact</a>
              <div className="border-t border-white/10 mt-2 pt-3 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenu(false)} className="px-4 py-3 rounded-lg text-center text-white/70 hover:bg-white/5">Se connecter</Link>
                <Link to="/register" onClick={() => setMobileMenu(false)} className="px-4 py-3.5 rounded-full text-center bg-[#FFD600] text-[#071C08] font-bold">Essai gratuit</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* ══════════════════════ HERO ══════════════════════ */}
        <main id="landing-main">
        <section className="lp-hero-bg lp-grain relative overflow-hidden pt-40 pb-24">
          <div className="relative z-10 w-[min(1180px,calc(100%-2rem))] mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-7 px-4 py-2 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 text-[#FFD600] text-xs font-semibold tracking-wide uppercase">
              <FiZap size={12} />
              Solution #1 pour commerçants d'Afrique de l'Ouest
            </div>

            {/* Headline */}
            <h1 className="font-display text-[clamp(3rem,6.5vw,5.5rem)] leading-[1.0] font-extrabold text-white max-w-[14ch] tracking-tight mb-6">
              Gérez votre{' '}
              <span className="gold-underline text-[#FFD600]">boutique</span>{' '}
              comme un pro.
            </h1>

            <p className="text-white/65 text-[1.1rem] leading-[1.8] max-w-[52ch] mb-10 font-light">
              TekkiPro réunit inventaire, caisse, rapports et gestion d'équipe dans une seule app pensée pour le commerce africain.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-16">
              <Link to="/register" className="flex items-center gap-2 px-7 py-4 rounded-full bg-[#FFD600] text-[#071C08] font-bold text-[0.95rem] hover:bg-[#FFC800] shadow-[0_8px_32px_rgba(255,214,0,0.35)] transition-all hover:-translate-y-0.5">
                Commencer gratuitement
                <FiArrowRight size={16} />
              </Link>
              <a href="#screenshots" className="flex items-center gap-2 px-7 py-4 rounded-full border border-white/25 text-white/85 font-semibold text-[0.95rem] hover:bg-white/5 transition-all hover:-translate-y-0.5">
                <FiPlay size={15} />
                Voir la démo
              </a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-x-10 gap-y-5 pt-8 border-t border-white/10">
              {[
                { value: formatNumber(stats.boutiques), label: 'Boutiques actives' },
                { value: '12+', label: 'Pays en Afrique' },
                { value: '2M+', label: 'Transactions' },
                { value: '99.9%', label: 'Disponibilité' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-display text-[1.9rem] font-extrabold text-[#FFD600] leading-none">{s.value}</div>
                  <div className="text-white/50 text-[0.82rem] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Geometric accent — kente-inspired diagonal bars */}
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-[0.04] pointer-events-none overflow-hidden" aria-hidden="true">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute top-0 h-full w-8" style={{ left: `${i * 30}px`, background: i % 3 === 0 ? '#FFD600' : i % 3 === 1 ? '#1B5E20' : '#D32F2F', transform: 'skewX(-15deg)', transformOrigin: 'top' }} />
            ))}
          </div>
        </section>

        <KenteStrip />

        {/* ══════════════════════ FEATURES ══════════════════════ */}
        <section className="bg-[#FFFAF0] py-24" id="features">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] text-xs font-bold tracking-widest uppercase mb-4">Fonctionnalités</span>
              <h2 className="font-display text-[clamp(1.9rem,3vw,2.8rem)] font-extrabold text-[#071C08] tracking-tight mb-3">
                Tout ce dont votre boutique a besoin
              </h2>
              <p className="text-[#5e5b56] text-[1.05rem] max-w-[46ch] mx-auto leading-relaxed">
                Une plateforme complète pensée pour les réalités du commerce africain.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="lp-card-hover bg-white rounded-2xl p-6 border border-[#1B5E20]/8 shadow-[0_2px_16px_rgba(7,28,8,0.05)]">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${f.accent}15` }}>
                      <Icon size={22} style={{ color: f.accent === '#FFD600' ? '#B8950A' : f.accent }} />
                    </div>
                    <h3 className="font-display font-bold text-[#071C08] text-[1.08rem] mb-2">{f.title}</h3>
                    <p className="text-[#6b6762] text-[0.93rem] leading-relaxed">{f.desc}</p>
                    <div className="mt-4 h-0.5 w-10 rounded-full" style={{ background: f.accent === '#FFD600' ? '#FFD600' : f.accent }} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
        <section className="bg-[#071C08] py-24">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 text-[#FFD600] text-xs font-bold tracking-widest uppercase mb-4">Comment ça marche</span>
              <h2 className="font-display text-[clamp(1.9rem,3vw,2.8rem)] font-extrabold text-white tracking-tight mb-3">
                Démarrez en 3 étapes simples
              </h2>
              <p className="text-white/55 text-[1.05rem] max-w-[44ch] mx-auto leading-relaxed">
                Aucune formation requise. Aucune installation. Commencez immédiatement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="relative p-7 rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm hover:bg-white/7 transition-colors">
                    <div className="font-display text-[3.5rem] font-extrabold text-[#FFD600]/15 leading-none mb-4 select-none">{s.num}</div>
                    <div className="w-11 h-11 rounded-xl bg-[#1B5E20]/40 flex items-center justify-center mb-4">
                      <Icon size={20} className="text-[#FFD600]" />
                    </div>
                    <h3 className="font-display font-bold text-white text-[1.05rem] mb-2">{s.title}</h3>
                    <p className="text-white/55 text-[0.92rem] leading-relaxed">{s.desc}</p>
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-[#FFD600]/30" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════ PRICING ══════════════════════ */}
        <section className="bg-[#071C08] py-24" id="pricing">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 text-[#FFD600] text-xs font-bold tracking-widest uppercase mb-4">Tarifs</span>
              <h2 className="font-display text-[clamp(1.9rem,3vw,2.8rem)] font-extrabold text-white tracking-tight mb-3">
                Un prix simple, sans surprise
              </h2>
              <p className="text-white/55 text-[1.05rem] max-w-[44ch] mx-auto leading-relaxed">
                Commencez gratuitement. Évoluez quand votre business grandit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {plans.map((p, i) => (
                <div
                  key={i}
                  className={`relative rounded-2xl p-7 transition-all duration-300 ${
                    p.popular
                      ? 'bg-[#FFFAF0] shadow-[0_20px_60px_rgba(255,214,0,0.15)] md:-translate-y-3'
                      : 'bg-white/5 border border-white/10 hover:bg-white/8'
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#FFD600] text-[#071C08] text-xs font-extrabold uppercase tracking-wide whitespace-nowrap">
                      Le plus populaire
                    </div>
                  )}

                  <h3 className={`font-display font-extrabold text-[1.05rem] mb-1.5 ${p.popular ? 'text-[#071C08]' : 'text-white'}`}>{p.name}</h3>
                  <p className={`text-[0.88rem] mb-6 ${p.popular ? 'text-[#5e5b56]' : 'text-white/45'}`}>{p.desc}</p>

                  <div className="flex items-baseline gap-1.5 mb-6">
                    <span className={`font-display text-[2.5rem] font-extrabold leading-none tracking-tight ${p.popular ? 'text-[#071C08]' : 'text-white'}`}>{p.price}</span>
                    {p.period && <span className={`text-[0.85rem] ${p.popular ? 'text-[#5e5b56]' : 'text-white/40'}`}>{p.period}</span>}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {p.features.map((f, j) => (
                      <li key={j} className={`flex items-start gap-2.5 text-[0.9rem] ${p.popular ? 'text-[#2d2a27]' : 'text-white/65'}`}>
                        <FiCheck size={15} className={`mt-0.5 shrink-0 ${p.popular ? 'text-[#1B5E20]' : 'text-[#FFD600]'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-full font-bold text-[0.9rem] transition-all hover:-translate-y-0.5 ${
                      p.popular
                        ? 'bg-[#071C08] text-[#FFD600] hover:bg-[#0D2B0F]'
                        : 'border border-white/20 text-white hover:bg-white/8'
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <KenteStrip />

        {/* ══════════════════════ TESTIMONIALS ══════════════════════ */}
        <section className="bg-[#FFFAF0] py-24" id="testimonials">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#1B5E20]/10 text-[#1B5E20] text-xs font-bold tracking-widest uppercase mb-4">Témoignages</span>
              <h2 className="font-display text-[clamp(1.9rem,3vw,2.8rem)] font-extrabold text-[#071C08] tracking-tight mb-3">
                Ce que disent nos commerçants
              </h2>
              <p className="text-[#5e5b56] text-[1.05rem] max-w-[44ch] mx-auto leading-relaxed">
                Des commerçants de toute l'Afrique de l'Ouest font confiance à TekkiPro chaque jour.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testimonials.map((t, i) => (
                <div key={i} className="lp-card-hover bg-white rounded-2xl p-6 border border-[#1B5E20]/8 shadow-[0_2px_16px_rgba(7,28,8,0.05)]">
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(5)].map((_, j) => (
                      <FiStar key={j} size={14} className="fill-[#FFD600] text-[#FFD600]" />
                    ))}
                  </div>
                  <p className="text-[#4a4845] text-[0.93rem] leading-[1.8] min-h-[100px]">"{t.text}"</p>
                  <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#1B5E20]/8">
                    <div className="w-10 h-10 rounded-xl bg-[#071C08] flex items-center justify-center text-[#FFD600] font-bold text-sm font-display">
                      {t.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-[#071C08] text-[0.9rem]">{t.name}</div>
                      <div className="text-[#8a8480] text-[0.8rem]">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════ CTA ══════════════════════ */}
        <section className="lp-hero-bg lp-grain relative overflow-hidden py-28">
          <div className="relative z-10 w-[min(1180px,calc(100%-2rem))] mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 text-[#FFD600] text-xs font-semibold tracking-wide uppercase">
              <FiShield size={12} />
              Essai gratuit 14 jours · Sans engagement
            </div>
            <h2 className="font-display text-[clamp(2rem,4vw,3.8rem)] font-extrabold text-white tracking-tight mb-4 max-w-[16ch] mx-auto leading-[1.05]">
              Prêt à transformer votre commerce ?
            </h2>
            <p className="text-white/55 text-[1.05rem] max-w-[44ch] mx-auto mb-10 leading-relaxed">
              Rejoignez des milliers de commerçants africains qui font confiance à TekkiPro.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/register" className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#FFD600] text-[#071C08] font-bold text-[0.95rem] hover:bg-[#FFC800] shadow-[0_8px_32px_rgba(255,214,0,0.35)] transition-all hover:-translate-y-0.5">
                <FiZap size={16} />
                Démarrer maintenant
              </Link>
              <a href="mailto:ibrahimadiallo0899@gmail.com" className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/25 text-white/85 font-semibold text-[0.95rem] hover:bg-white/5 transition-all hover:-translate-y-0.5">
                <FiMail size={15} />
                Parler à un conseiller
              </a>
            </div>
          </div>
        </section>

        {/* ══════════════════════ FOOTER ══════════════════════ */}
        <footer className="bg-[#030F04] border-t border-white/6 pt-16 pb-8">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_2fr] gap-12 mb-12">
              {/* Brand */}
              <div className="flex flex-col gap-5">
                <Link to="/" className="flex items-center gap-2.5 w-fit">
                  <div className="w-9 h-9 rounded-lg bg-[#FFD600] flex items-center justify-center">
                    <span className="font-display text-[#071C08] font-extrabold text-lg leading-none">T</span>
                  </div>
                  <span className="font-display text-white font-bold text-lg tracking-tight">TekkiPro</span>
                </Link>
                <p className="text-white/40 text-[0.9rem] leading-relaxed max-w-[28ch]">
                  La solution de gestion #1 pour les commerçants africains. Simple, rapide, efficace.
                </p>
                <div className="flex gap-3 mt-1">
                  <a href="#" aria-label="Globe" className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/6 text-white/50 hover:bg-[#FFD600] hover:text-[#071C08] transition-colors"><FiGlobe size={16} /></a>
                  <a href="mailto:ibrahimadiallo0899@gmail.com" aria-label="Mail" className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/6 text-white/50 hover:bg-[#FFD600] hover:text-[#071C08] transition-colors"><FiMail size={16} /></a>
                  <a href="tel:+221768815972" aria-label="Phone" className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/6 text-white/50 hover:bg-[#FFD600] hover:text-[#071C08] transition-colors"><FiPhone size={16} /></a>
                </div>
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div className="flex flex-col gap-3">
                  <h4 className="font-semibold text-white text-[0.88rem] mb-1">Produit</h4>
                  {['Fonctionnalités', 'Tarifs', 'Intégrations', 'Mises à jour'].map((l, i) => (
                    <a key={i} href={i === 0 ? '#features' : i === 1 ? '#pricing' : '#'} className="text-white/40 text-[0.88rem] hover:text-white/80 transition-colors">{l}</a>
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  <h4 className="font-semibold text-white text-[0.88rem] mb-1">Entreprise</h4>
                  {['À propos', 'Blog', 'Carrières'].map((l, i) => (
                    <a key={i} href="#" className="text-white/40 text-[0.88rem] hover:text-white/80 transition-colors">{l}</a>
                  ))}
                  <a href="mailto:ibrahimadiallo0899@gmail.com" className="text-white/40 text-[0.88rem] hover:text-white/80 transition-colors">Contact</a>
                </div>
                <div className="flex flex-col gap-3">
                  <h4 className="font-semibold text-white text-[0.88rem] mb-1">Support</h4>
                  {['Centre d\'aide', 'Documentation', 'Communauté'].map((l, i) => (
                    <a key={i} href="#" className="text-white/40 text-[0.88rem] hover:text-white/80 transition-colors">{l}</a>
                  ))}
                  <a href="tel:+221768815972" className="text-white/40 text-[0.88rem] hover:text-white/80 transition-colors">+221 76 881 59 72</a>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/6 flex flex-col md:flex-row items-center justify-between gap-3 text-[0.85rem] text-white/30">
              <p>© {new Date().getFullYear()} TekkiPro. Tous droits réservés.</p>
              <div className="flex gap-5">
                <a href="#" className="hover:text-white/60 transition-colors">Conditions</a>
                <a href="#" className="hover:text-white/60 transition-colors">Confidentialité</a>
              </div>
            </div>
          </div>
        </footer>
        </main>
      </div>
    </>
  );
}
