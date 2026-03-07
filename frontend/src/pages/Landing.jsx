import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiShoppingCart, FiPackage, FiUsers, FiDollarSign, FiBarChart2,
  FiSliders, FiCheckCircle, FiArrowRight, FiStar, FiPhone,
  FiMail, FiMapPin, FiChevronRight, FiGrid, FiTruck, FiHome,
  FiShield, FiZap, FiClock, FiTrendingUp, FiHelpCircle,
  FiLock, FiInfo, FiMessageSquare, FiPlay, FiCheck, FiMenu, FiX,
  FiTarget, FiAward, FiGlobe
} from 'react-icons/fi';
import './Landing.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const features = [
  { icon: <FiShoppingCart />, title: 'Gestion des Ventes', desc: 'Enregistrez chaque vente en quelques clics. Espèces, mobile money ou crédit — tout est pris en charge.', color: '#3b82f6' },
  { icon: <FiPackage />, title: 'Gestion du Stock', desc: 'Suivez vos entrées et sorties en temps réel. Recevez des alertes avant la rupture de stock.', color: '#10b981' },
  { icon: <FiSliders />, title: 'Vente Fractionnée', desc: 'Vendez au gramme, au litre, au morceau. Conçu pour les réalités du commerce africain.', color: '#f59e0b' },
  { icon: <FiUsers />, title: 'Comptes Employés', desc: 'Créez des accès sécurisés pour vos employés et suivez leurs performances individuelles.', color: '#8b5cf6' },
  { icon: <FiDollarSign />, title: 'Suivi des Crédits', desc: 'Gérez les clients à crédit avec un historique complet et des rappels de paiement.', color: '#ef4444' },
  { icon: <FiBarChart2 />, title: 'Rapports & Analyses', desc: 'Visualisez vos profits, marges et tendances avec des tableaux de bord clairs et précis.', color: '#06b6d4' },
];

const formatNumber = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M+';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+';
  return n.toString() + '+';
};

const formatCFA = (n) => {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + ' Mrd';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
};

const steps = [
  { num: '1', title: 'Créez votre compte', desc: 'Inscription gratuite en 30 secondes. Aucune carte bancaire requise.', icon: <FiTarget /> },
  { num: '2', title: 'Ajoutez vos produits', desc: 'Configurez votre catalogue avec les prix, unités et fractions de vente.', icon: <FiPackage /> },
  { num: '3', title: 'Vendez & analysez', desc: 'Enregistrez vos ventes et suivez vos profits automatiquement.', icon: <FiTrendingUp /> },
];

const plans = [
  {
    name: 'Starter',
    price: '0',
    period: 'Gratuit pour toujours',
    desc: 'Idéal pour tester et démarrer',
    features: ['1 utilisateur', '50 produits', 'Ventes illimitées', 'Rapports basiques', 'Support email'],
    cta: 'Commencer gratuitement',
    popular: false,
  },
  {
    name: 'Pro',
    price: '5 000',
    period: 'FCFA / mois',
    desc: 'Pour les boutiques en croissance',
    features: ['5 utilisateurs', 'Produits illimités', 'Vente fractionnée', 'Suivi des crédits', 'Rapports avancés', 'Factures PDF', 'Support prioritaire'],
    cta: 'Essai gratuit 14 jours',
    popular: true,
  },
  {
    name: 'Business',
    price: '10 000',
    period: 'FCFA / mois',
    desc: 'Pour les négoces multi-sites',
    features: ['Utilisateurs illimités', 'Multi-boutiques', 'Tout dans Pro', 'API & intégrations', 'Rapports personnalisés', 'Manager dédié', 'Support 24/7'],
    cta: 'Contacter l\'équipe',
    popular: false,
  },
];

const testimonials = [
  { name: 'Fatou Diop', role: 'Boutique de quartier, Dakar', text: 'Avant Tekkipro, je perdais de l\'argent sans le savoir. Maintenant je sais exactement combien je gagne chaque jour. C\'est un outil indispensable.', avatar: 'FD' },
  { name: 'Moussa Konaté', role: 'Grossiste, Abidjan', text: 'La vente fractionnée c\'est exactement ce qu\'il nous fallait. Mes employés enregistrent les ventes au gramme sans la moindre erreur.', avatar: 'MK' },
  { name: 'Aminata Sangaré', role: 'Cosmétiques, Bamako', text: 'Le suivi des crédits clients a tout changé. Plus de cahier perdu, tout est digital et accessible en un clic. Je recommande à 100%.', avatar: 'AS' },
];

const showcaseImages = [
  { src: '/image1.png', alt: 'Tableau de bord', label: 'Tableau de bord intelligent' },
  { src: '/image2.png', alt: 'Gestion des ventes', label: 'Gestion des ventes' },
  { src: '/image3.png', alt: 'Suivi du stock', label: 'Suivi du stock' },
  { src: '/image4.png', alt: 'Rapports & analyses', label: 'Rapports détaillés' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
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
      setActiveImage(prev => (prev + 1) % showcaseImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing">
      {/* ========== NAV ========== */}
      <nav className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="landing-container nav-inner">
          <Link to="/" className="nav-brand">
            <div className="brand-logo">T</div>
            <span>TekkiPro</span>
          </Link>
          <div className={`nav-links ${mobileMenu ? 'nav-open' : ''}`}>
            <a href="#features" onClick={() => setMobileMenu(false)}>Fonctionnalités</a>
            <a href="#screenshots" onClick={() => setMobileMenu(false)}>Aperçu</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)}>Tarifs</a>
            <a href="#testimonials" onClick={() => setMobileMenu(false)}>Avis</a>
            <div className="nav-cta-group">
              <Link to="/login" className="nav-btn-ghost">Se connecter</Link>
              <Link to="/register" className="nav-btn-primary">Essai gratuit <FiArrowRight size={15} /></Link>
            </div>
          </div>
          <button className="nav-mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-glow hero-glow-3" />
        <div className="hero-grid-bg" />
        <div className="landing-container hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <FiZap size={13} />
              <span>La gestion de boutique nouvelle génération</span>
            </div>
            <h1>
              La solution <span className="hero-gradient-text">tout-en-un</span> pour
              les commerçants africains
            </h1>
            <p className="hero-desc">
              Gérez vos ventes, stocks, employés et crédits clients depuis un seul 
              tableau de bord. Simple, rapide, conçu pour le terrain.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn-primary-lg">
                Démarrer gratuitement
                <FiArrowRight size={18} />
              </Link>
              <a href="#screenshots" className="btn-ghost-lg">
                <FiPlay size={16} />
                Voir en action
              </a>
            </div>
            <div className="hero-social-proof">
              <div className="hero-avatars">
                <div className="h-avatar" style={{background: '#f59e0b'}}>F</div>
                <div className="h-avatar" style={{background: '#10b981'}}>M</div>
                <div className="h-avatar" style={{background: '#8b5cf6'}}>A</div>
                <div className="h-avatar" style={{background: '#3b82f6'}}>K</div>
                <div className="h-avatar" style={{background: '#ef4444'}}>S</div>
              </div>
              <div className="hero-proof-text">
                <div className="hero-proof-stars">
                  {[...Array(5)].map((_, i) => <FiStar key={i} />)}
                </div>
                <span>Utilisé par <strong>{formatNumber(stats.boutiques)} boutiques</strong> en Afrique</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-browser">
              <div className="browser-bar">
                <div className="browser-dots">
                  <span /><span /><span />
                </div>
                <div className="browser-url">app.tekkipro.com</div>
              </div>
              <div className="browser-content">
                <img src="/dashboard-preview.png" alt="TekkiPro Dashboard" />
              </div>
            </div>
            <div className="hero-float-card float-card-1">
              <FiTrendingUp className="float-icon" />
              <div>
                <span className="float-value">+34%</span>
                <span className="float-label">Ventes ce mois</span>
              </div>
            </div>
            <div className="hero-float-card float-card-2">
              <FiShield className="float-icon" />
              <div>
                <span className="float-value">Sécurisé</span>
                <span className="float-label">Données protégées</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="stats-bar">
        <div className="landing-container stats-inner">
          <div className="stat-item">
            <span className="stat-value">{formatNumber(stats.boutiques)}</span>
            <span className="stat-label">Boutiques actives</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatNumber(stats.ventes)}</span>
            <span className="stat-label">Ventes enregistrées</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatNumber(stats.produits)}</span>
            <span className="stat-label">Produits gérés</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatNumber(stats.utilisateurs)}</span>
            <span className="stat-label">Utilisateurs</span>
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section className="features" id="features">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-tag">Fonctionnalités</span>
            <h2>Tous les outils dont vous avez besoin</h2>
            <p>Une plateforme complète pensée pour les réalités du commerce africain.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon" style={{ background: `${f.color}12`, color: f.color }}>
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="feature-line" style={{ background: f.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SHOWCASE ========== */}
      <section className="showcase" id="screenshots">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-tag">Aperçu</span>
            <h2>Une interface claire et intuitive</h2>
            <p>Découvrez les écrans clés de TekkiPro, conçus pour être efficaces sur le terrain.</p>
          </div>
          <div className="showcase-container">
            <div className="showcase-main">
              <div className="showcase-browser">
                <div className="browser-bar">
                  <div className="browser-dots"><span /><span /><span /></div>
                  <div className="browser-url">app.tekkipro.com</div>
                </div>
                <div className="showcase-img-wrapper">
                  <img src={showcaseImages[activeImage].src} alt={showcaseImages[activeImage].alt} />
                </div>
              </div>
            </div>
            <div className="showcase-thumbs">
              {showcaseImages.map((img, i) => (
                <button
                  key={i}
                  className={`showcase-thumb ${activeImage === i ? 'active' : ''}`}
                  onClick={() => setActiveImage(i)}
                >
                  <img src={img.src} alt={img.alt} />
                  <span>{img.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="how-it-works">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-tag">Comment ça marche</span>
            <h2>Opérationnel en 3 minutes</h2>
            <p>Aucune formation requise. Aucune installation. Commencez immédiatement.</p>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div className="step-card" key={i}>
                <div className="step-number">{s.num}</div>
                <div className="step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="step-connector">
                    <FiArrowRight />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section className="pricing" id="pricing">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-tag">Tarifs</span>
            <h2>Des prix adaptés à votre taille</h2>
            <p>Commencez gratuitement. Évoluez quand votre business grandit.</p>
          </div>
          <div className="pricing-grid">
            {plans.map((p, i) => (
              <div className={`pricing-card ${p.popular ? 'popular' : ''}`} key={i}>
                {p.popular && <div className="popular-ribbon">Recommandé</div>}
                <div className="pricing-header">
                  <h3>{p.name}</h3>
                  <p className="pricing-desc">{p.desc}</p>
                </div>
                <div className="pricing-price">
                  <span className="price-amount">{p.price}</span>
                  <span className="price-period">{p.period}</span>
                </div>
                <ul className="pricing-features">
                  {p.features.map((f, j) => (
                    <li key={j}><FiCheck className="check-icon" /> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className={`pricing-cta ${p.popular ? 'cta-solid' : 'cta-outline'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="testimonials" id="testimonials">
        <div className="landing-container">
          <div className="section-header">
            <span className="section-tag">Témoignages</span>
            <h2>Ils nous font confiance</h2>
            <p>Découvrez ce que disent les commerçants qui utilisent TekkiPro au quotidien.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div className="testimonial-card" key={i}>
                <div className="testimonial-quote">"</div>
                <p className="testimonial-text">{t.text}</p>
                <div className="testimonial-footer">
                  <div className="testimonial-avatar">{t.avatar}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                  <div className="testimonial-stars">
                    {[...Array(5)].map((_, j) => <FiStar key={j} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="final-cta">
        <div className="landing-container">
          <div className="cta-card">
            <div className="cta-glow" />
            <div className="cta-content">
              <h2>Prêt à transformer votre commerce ?</h2>
              <p>Rejoignez {formatNumber(stats.boutiques)} commerçants qui gèrent leur boutique efficacement avec TekkiPro. Gratuit pour commencer.</p>
              <div className="cta-actions">
                <Link to="/register" className="btn-primary-lg btn-white">
                  Commencer gratuitement <FiArrowRight size={18} />
                </Link>
              </div>
              <div className="cta-features">
                <span><FiCheck size={14} /> Gratuit pour démarrer</span>
                <span><FiCheck size={14} /> Aucune carte requise</span>
                <span><FiCheck size={14} /> Support inclus</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="nav-brand">
                <div className="brand-logo brand-logo-light">T</div>
                <span>TekkiPro</span>
              </div>
              <p>La solution de gestion #1 pour les commerçants africains. Simple, rapide, efficace.</p>
              <div className="footer-social">
                <a href="#" aria-label="Globe"><FiGlobe size={18} /></a>
                <a href="mailto:ibrahimadiallo0899@gmail.com" aria-label="Mail"><FiMail size={18} /></a>
                <a href="tel:+221768815972" aria-label="Phone"><FiPhone size={18} /></a>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>Produit</h4>
                <a href="#features">Fonctionnalités</a>
                <a href="#pricing">Tarifs</a>
                <a href="#screenshots">Aperçu</a>
                <a href="#">Roadmap</a>
              </div>
              <div className="footer-col">
                <h4>Entreprise</h4>
                <a href="#">À propos</a>
                <a href="#">Contact</a>
                <a href="#">Centre d'aide</a>
                <a href="#">Confidentialité</a>
              </div>
              <div className="footer-col">
                <h4>Contact</h4>
                <a href="mailto:ibrahimadiallo0899@gmail.com">ibrahimadiallo0899@gmail.com</a>
                <a href="tel:+221768815972">+221 76 881 59 72</a>
                <a href="#">Dakar, Sénégal</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} TekkiPro. Tous droits réservés.</p>
            <div className="footer-bottom-links">
              <a href="#">Conditions</a>
              <a href="#">Confidentialité</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
