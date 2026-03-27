import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FiCamera, FiWifiOff, FiBell, FiFileText, FiCreditCard, FiRefreshCw,
  FiArrowRight, FiMenu, FiX, FiStar, FiSmartphone, FiDownload,
  FiShoppingCart, FiBarChart2, FiPackage, FiCheck,
} from 'react-icons/fi';

// ─── TekkiPro palette ───────────────────────────────────────────────────────
const TP = {
  terracotta: '#E8623A',
  terracottaLight: '#FFF0EB',
  gold: '#F4A020',
  goldLight: '#FFF6E5',
  green: '#1B6B3A',
  greenLight: '#E8F5ED',
  bg: '#F8F6F3',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  dark: '#1A1A2E',
};

const KENTE_COLORS = [TP.terracotta, TP.gold, TP.green, TP.terracotta, TP.gold, TP.green];

function KenteStrip() {
  return (
    <div className="flex h-1.5 w-full" aria-hidden="true">
      {KENTE_COLORS.map((c, i) => <div key={i} style={{ background: c }} />)}
    </div>
  );
}

const mobileFeatures = [
  { icon: <FiCamera />, title: 'Scanner intégré', desc: 'Scannez les codes-barres avec la caméra de votre téléphone. Rapide et précis.', color: TP.terracotta, bg: TP.terracottaLight },
  { icon: <FiWifiOff />, title: 'Mode hors-ligne', desc: 'Continuez à vendre même sans connexion internet. Sync auto au retour du réseau.', color: TP.gold, bg: TP.goldLight },
  { icon: <FiBell />, title: 'Alertes en temps réel', desc: 'Recevez des notifications push pour les ventes, stocks bas et objectifs atteints.', color: TP.green, bg: TP.greenLight },
  { icon: <FiFileText />, title: 'Reçus digitaux', desc: 'Envoyez les reçus par SMS ou WhatsApp directement depuis votre téléphone.', color: TP.terracotta, bg: TP.terracottaLight },
  { icon: <FiCreditCard />, title: 'Wave & Orange Money', desc: 'Acceptez les paiements mobiles les plus utilisés en Afrique de l\'Ouest.', color: TP.gold, bg: TP.goldLight },
  { icon: <FiRefreshCw />, title: 'Sync multi-appareils', desc: 'Synchronisez entre le mobile et le web. Vos données sont toujours à jour.', color: TP.green, bg: TP.greenLight },
];

const screens = [
  { label: 'Tableau de bord', icon: <FiBarChart2 /> },
  { label: 'Historique ventes', icon: <FiShoppingCart /> },
  { label: 'Scanner', icon: <FiCamera /> },
  { label: 'Inventaire', icon: <FiPackage /> },
  { label: 'Paramètres', icon: <FiCheck /> },
];

const trustStats = [
  { value: '5 000+', label: 'Boutiques actives', color: TP.terracotta },
  { value: '4.9 ★', label: 'Note App Store', color: TP.gold },
  { value: '12', label: 'Pays couverts', color: TP.green },
  { value: '50K+', label: 'Téléchargements', color: TP.textPrimary },
];

const testimonials = [
  { avatar: 'OD', color: TP.terracotta, name: 'Ousmane Diop', role: 'Boutique Tech, Dakar', text: 'L\'app est super rapide ! Je scanne mes produits en un clin d\'œil et mes stocks sont toujours à jour.' },
  { avatar: 'AS', color: TP.gold, name: 'Aïssatou Sow', role: 'Superette, Saint-Louis', text: 'Depuis que j\'utilise TekkiPro sur mon téléphone, je peux suivre ma boutique même quand je suis en déplacement.' },
  { avatar: 'IB', color: TP.green, name: 'Ibrahim Ba', role: 'Quincaillerie, Bamako', text: 'Le mode hors-ligne est un game changer ! Mon réseau coupe souvent mais mes ventes sont toujours enregistrées.' },
];

export default function MobileLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenu) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenu]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMobileMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative overflow-x-clip bg-[#F8F6F3] text-[#1A1A2E] min-h-screen font-sans">
      <a href="#ml-main" className="skip-link">Aller au contenu</a>

      {/* ── Nav ── */}
      <nav className={`fixed inset-x-0 top-0 z-[60] py-4 transition-all duration-300 ${scrolled ? 'py-2.5 bg-white/90 backdrop-blur-md border-b border-slate-400/10 shadow-sm' : ''}`}>
        <div className="w-[min(1180px,calc(100%-2rem))] mx-auto flex items-center justify-between gap-8 min-h-[64px]">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-3 font-bold text-[#1A1A2E]">
            <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-[#1B6B3A] to-[#F4A020] text-white font-extrabold text-[1.1rem] flex items-center justify-center shadow-[0_8px_20px_rgba(211,47,47,0.28)] shrink-0">T</div>
            <span>TekkiPro</span>
            <span className="px-2.5 py-1 rounded-full bg-[#1B6B3A]/10 border border-[#1B6B3A]/20 text-[#1B6B3A] text-[0.72rem] font-bold tracking-wide hidden sm:inline-flex">App Mobile</span>
          </Link>

          <div className={`flex items-center gap-6 max-md:fixed max-md:inset-x-0 max-md:top-[64px] max-md:flex-col max-md:bg-white max-md:p-6 max-md:shadow-lg max-md:transition-all max-md:duration-300 ${mobileMenu ? 'max-md:opacity-100 max-md:translate-y-0' : 'max-md:opacity-0 max-md:-translate-y-4 max-md:pointer-events-none'}`}>
            <a href="#ml-features" onClick={() => setMobileMenu(false)}>Fonctionnalités</a>
            <a href="#ml-screens" onClick={() => setMobileMenu(false)}>Captures</a>
            <a href="#ml-download" onClick={() => setMobileMenu(false)}>Télécharger</a>
            <div className="flex items-center gap-3 ml-2 flex-wrap">
              <Link to="/login" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[0.88rem] font-semibold bg-[#1B6B3A]/5 border border-slate-400/20 text-[#1A1A2E] transition-all hover:-translate-y-0.5" onClick={() => setMobileMenu(false)}>Connexion</Link>
              <Link to="/register" className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[0.88rem] font-semibold bg-gradient-to-br from-[#1B6B3A] to-[#F4A020] text-white shadow-md transition-all hover:-translate-y-0.5" onClick={() => setMobileMenu(false)}>
                Essai gratuit <FiArrowRight size={14} />
              </Link>
            </div>
          </div>

          <button
            className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center border border-slate-400/20 bg-white/90 backdrop-blur-md shadow-sm text-[#1A1A2E] transition-all hover:bg-white hover:border-[#1A1A2E]/20 cursor-pointer"
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? 'Fermer' : 'Menu'}
          >
            {mobileMenu ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>

      <main id="ml-main">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden pt-32 pb-16 bg-gradient-to-b from-[#0d1520] via-[#162030] to-[#F8F6F3] before:absolute before:w-[400px] before:h-[400px] before:-top-[120px] before:-left-[80px] before:rounded-full before:bg-[#1B6B3A]/20 before:blur-[60px] before:pointer-events-none after:absolute after:w-[300px] after:h-[300px] after:top-[60px] after:-right-[60px] after:rounded-full after:bg-[#F4A020]/15 after:blur-[50px] after:pointer-events-none">
          <div className="relative z-10 w-[min(1180px,calc(100%-2rem))] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            {/* Left */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 border border-white/15 text-white/90 text-[0.8rem] font-semibold mb-6">
                <FiSmartphone size={13} />
                <span>Application mobile TekkiPro</span>
              </div>
              <h1 className="text-[clamp(2.6rem,4.5vw,4.4rem)] leading-[1.04] tracking-tight mb-4 font-extrabold">
                Votre boutique<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#F4A020] to-[#1B6B3A]">dans la poche.</span>
              </h1>
              <p className="text-slate-200/90 text-[1.05rem] leading-[1.75] max-w-[52ch] mb-8">
                L'app TekkiPro vous permet de gérer vos ventes, scanner
                vos produits et suivre votre stock — partout, tout le temps.
              </p>
              <div className="flex flex-wrap gap-4 mb-7">
                <a href="#ml-download" className="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all min-w-[168px] bg-white/10 border border-white/20 text-white hover:-translate-y-[3px] hover:bg-white/15 cursor-pointer">
                  <FiDownload size={18} />
                  <div>
                    <span>Télécharger sur</span>
                    <strong>App Store</strong>
                  </div>
                </a>
                <a href="#ml-download" className="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all min-w-[168px] bg-white/10 border border-white/20 text-white hover:-translate-y-[3px] hover:bg-white/15 cursor-pointer">
                  <FiSmartphone size={18} />
                  <div>
                    <span>Disponible sur</span>
                    <strong>Google Play</strong>
                  </div>
                </a>
              </div>
              <div className="flex items-center gap-3 text-white/80 text-[0.9rem] flex-wrap">
                <div className="flex gap-1 text-[#F4A020]">
                  {[...Array(5)].map((_, i) => <FiStar key={i} />)}
                </div>
                <span><strong>4.9/5</strong> · Plus de 50 000 téléchargements</span>
              </div>
            </div>

            {/* Right — phone mockups */}
            <div className="relative flex items-end justify-center gap-4 h-[380px] hidden md:flex">
              <div className="absolute left-0 bottom-0 w-[130px] h-[250px] bg-white/90 rounded-[30px] border border-white/30 shadow-2xl flex items-center justify-center overflow-hidden z-[1] -rotate-[8deg] backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2.5 p-4 [&>span]:text-[0.72rem] [&>span]:font-bold [&>span]:text-[#1A1A2E] [&>span]:tracking-wide">
                  <FiPackage size={32} style={{ color: TP.gold }} />
                  <span>Inventaire</span>
                </div>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[155px] h-[290px] bg-white/95 rounded-[30px] border border-white/30 shadow-2xl flex items-center justify-center overflow-hidden z-[3] backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2.5 p-4 [&>span]:text-[0.72rem] [&>span]:font-bold [&>span]:text-[#1A1A2E] [&>span]:tracking-wide">
                  <FiBarChart2 size={32} style={{ color: TP.terracotta }} />
                  <span>Dashboard</span>
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-[130px] h-[250px] bg-white/90 rounded-[30px] border border-white/30 shadow-2xl flex items-center justify-center overflow-hidden z-[1] rotate-[8deg] backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2.5 p-4 [&>span]:text-[0.72rem] [&>span]:font-bold [&>span]:text-[#1A1A2E] [&>span]:tracking-wide">
                  <FiCamera size={32} style={{ color: TP.green }} />
                  <span>Scanner</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <KenteStrip />

        {/* ── Trust stats ── */}
        <section className="py-12 bg-white">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto flex flex-col items-center gap-7">
            <p className="text-slate-500 text-[0.88rem] font-semibold tracking-wide uppercase text-center">Utilisé par les commerçants dans toute l'Afrique de l'Ouest</p>
            <div className="flex flex-wrap justify-center gap-12">
              {trustStats.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold tracking-tight leading-none" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-slate-500 text-[0.88rem] font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <KenteStrip />

        {/* ── Mobile Features ── */}
        <section className="py-20 bg-[#F8F6F3]" id="ml-features">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
            <div className="max-w-[700px] mx-auto text-center mb-11">
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[0.72rem] font-bold tracking-widest uppercase mb-4" style={{ color: TP.terracotta, background: TP.terracottaLight }}>FONCTIONNALITÉS MOBILES</span>
              <h2 className="text-[clamp(1.9rem,3vw,2.9rem)] leading-[1.1] tracking-tight text-[#1A1A2E] mb-3 font-extrabold">Tout ce que vous aimez, en version mobile</h2>
              <p className="text-slate-500 text-[1rem] leading-[1.7]">Conçue pour les commerçants en mouvement</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {mobileFeatures.map((f, i) => (
                <div className="p-6 rounded-3xl bg-white/90 border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#1B6B3A]/20 hover:shadow-md" key={i}>
                  <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-[1.3rem] mb-4" style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <h3 className="text-[1.1rem] font-bold tracking-tight text-[#1A1A2E] mb-2.5">{f.title}</h3>
                  <p className="text-slate-500 text-[1rem] leading-[1.7]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── App Screenshots ── */}
        <section className="py-20 bg-white" id="ml-screens">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
            <div className="max-w-[700px] mx-auto text-center mb-11">
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[0.72rem] font-bold tracking-widest uppercase mb-4" style={{ color: TP.green, background: TP.greenLight }}>CAPTURES D'ÉCRAN</span>
              <h2 className="text-[clamp(1.9rem,3vw,2.9rem)] leading-[1.1] tracking-tight text-[#1A1A2E] mb-3 font-extrabold">Découvrez l'app en images</h2>
              <p className="text-slate-500 text-[1rem] leading-[1.7]">5 écrans principaux pour gérer toute votre boutique</p>
            </div>
            <div className="flex justify-center gap-6 flex-wrap">
              {screens.map((s, i) => (
                <div className="flex flex-col items-center gap-3.5 group cursor-pointer" key={i}>
                  <div className="w-[110px] h-[190px] rounded-[22px] bg-gradient-to-br from-[#F8F6F3] to-white/90 border border-slate-200/90 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-hover:shadow-lg">
                    <div className="text-[1.8rem] flex items-center justify-center" style={{ color: [TP.terracotta, TP.gold, TP.green, TP.terracotta, TP.gold][i] }}>
                      {s.icon}
                    </div>
                  </div>
                  <span className="text-[0.82rem] font-bold text-[#1A1A2E] tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-20 bg-[#F8F6F3]">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto">
            <div className="max-w-[700px] mx-auto text-center mb-11">
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[0.72rem] font-bold tracking-widest uppercase mb-4" style={{ color: TP.gold, background: TP.goldLight }}>AVIS UTILISATEURS</span>
              <h2 className="text-[clamp(1.9rem,3vw,2.9rem)] leading-[1.1] tracking-tight text-[#1A1A2E] mb-3 font-extrabold">Ils adorent l'app TekkiPro</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testimonials.map((t, i) => (
                <div className="p-6 rounded-3xl bg-white/95 border border-slate-200/80 shadow-sm flex flex-col gap-4" key={i}>
                  <div className="text-[#F4A020] text-[0.95rem] tracking-[0.1em]">{'★★★★★'}</div>
                  <p className="text-slate-500 text-[0.95rem] leading-[1.75] flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3.5 mt-auto">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[0.88rem] shrink-0" style={{ background: t.color }}>{t.avatar}</div>
                    <div>
                      <div className="font-bold text-[0.93rem] text-[#1A1A2E] tracking-tight">{t.name}</div>
                      <div className="text-slate-400 text-[0.82rem]">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Download CTA ── */}
        <section className="py-20 bg-gradient-to-br from-[#0d1520] via-[#1a2a40] to-[#0d1520] relative overflow-hidden before:absolute before:w-[360px] before:h-[360px] before:-top-[100px] before:-right-[80px] before:rounded-full before:bg-[#D32F2F]/20 before:blur-[60px] before:pointer-events-none after:absolute after:w-[280px] after:h-[280px] after:-bottom-[80px] after:-left-[60px] after:rounded-full after:bg-[#1B6B3A]/15 after:blur-[50px] after:pointer-events-none" id="ml-download">
          <div className="relative z-10 w-[min(1180px,calc(100%-2rem))] mx-auto text-center text-white">
            <h2 className="text-[clamp(1.9rem,3vw,2.9rem)] leading-[1.1] tracking-tight text-[#1A1A2E] mb-3 font-extrabold">Téléchargez l'app TekkiPro</h2>
            <p className="text-slate-500 text-[1rem] leading-[1.7]">Gérez votre boutique depuis votre poche.<br />Gratuit pour commencer, puissant pour grandir.</p>
            <div className="flex justify-center flex-wrap gap-4 mb-7">
              <a href="#" className="inline-flex items-center gap-3.5 px-6 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white font-bold min-w-[185px] transition-all hover:-translate-y-1 hover:bg-white/15 cursor-pointer [&>div]:flex [&>div]:flex-col [&>div]:leading-tight [&>div>span]:text-[0.7rem] [&>div>span]:opacity-75 [&>div>strong]:text-[0.95rem]">
                <FiDownload size={22} />
                <div>
                  <span>Télécharger sur</span>
                  <strong>App Store</strong>
                </div>
              </a>
              <a href="#" className="inline-flex items-center gap-3.5 px-6 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white font-bold min-w-[185px] transition-all hover:-translate-y-1 hover:bg-white/15 cursor-pointer [&>div]:flex [&>div]:flex-col [&>div]:leading-tight [&>div>span]:text-[0.7rem] [&>div>span]:opacity-75 [&>div>strong]:text-[0.95rem]">
                <FiSmartphone size={22} />
                <div>
                  <span>Disponible sur</span>
                  <strong>Google Play</strong>
                </div>
              </a>
            </div>
            <div className="flex justify-center flex-wrap gap-5 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:text-white/75 [&>span]:text-[0.86rem]">
              <span><FiCheck size={14} /> Gratuit pour démarrer</span>
              <span><FiCheck size={14} /> Aucune carte requise</span>
              <span><FiCheck size={14} /> Mode hors-ligne inclus</span>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-gradient-to-b from-[#0a1220] to-[#08111d] text-white pt-14">
          <div className="w-[min(1180px,calc(100%-2rem))] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 pb-8 border-b border-white/10">
            <div className="max-w-[38ch]">
              <div className="flex items-center gap-2.5 font-bold text-base mb-3.5">
                <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-[#1B6B3A] to-[#F4A020] text-white font-extrabold text-[1.1rem] flex items-center justify-center shadow-[0_8px_20px_rgba(211,47,47,0.28)] shrink-0">T</div>
                <span>TekkiPro</span>
              </div>
              <p className="text-slate-500 text-[1rem] leading-[1.7]">La solution de gestion de boutique #1 en Afrique de l'Ouest.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2 [&>h4]:text-[0.92rem] [&>h4]:font-bold [&>h4]:mb-3.5 [&>h4]:text-white/90 [&>a]:text-white/80 [&>a]:text-[0.88rem] [&>a]:mb-2.5 [&>a]:transition-colors hover:[&>a]:text-white">
                <h4>Produit</h4>
                <a href="#ml-features">Fonctionnalités</a>
                <a href="#ml-screens">Captures</a>
                <a href="#ml-download">Télécharger</a>
              </div>
              <div className="flex flex-col gap-2 [&>h4]:text-[0.92rem] [&>h4]:font-bold [&>h4]:mb-3.5 [&>h4]:text-white/90 [&>a]:text-white/80 [&>a]:text-[0.88rem] [&>a]:mb-2.5 [&>a]:transition-colors hover:[&>a]:text-white">
                <h4>Entreprise</h4>
                <a href="#">À propos</a>
                <a href="#">Blog</a>
                <a href="mailto:ibrahimadiallo0899@gmail.com">Contact</a>
              </div>
              <div className="flex flex-col gap-2 [&>h4]:text-[0.92rem] [&>h4]:font-bold [&>h4]:mb-3.5 [&>h4]:text-white/90 [&>a]:text-white/80 [&>a]:text-[0.88rem] [&>a]:mb-2.5 [&>a]:transition-colors hover:[&>a]:text-white">
                <h4>Support</h4>
                <a href="#">Centre d'aide</a>
                <a href="tel:+221768815972">+221 76 881 59 72</a>
                <Link to="/login">Connexion web</Link>
              </div>
            </div>
          </div>
          <div className="py-5">
            <p className="text-slate-500 text-[1rem] leading-[1.7]">© {new Date().getFullYear()} TekkiPro. Tous droits réservés.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
