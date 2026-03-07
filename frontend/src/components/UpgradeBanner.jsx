import { Link } from 'react-router-dom';
import { FiLock, FiArrowRight, FiZap, FiStar, FiShield } from 'react-icons/fi';
import './UpgradeBanner.css';

/**
 * UpgradeBanner — Affiche un bandeau d'upgrade quand une fonctionnalité est restreinte
 * Props:
 *  - feature: nom de la fonctionnalité (ex: "Gestion des fournisseurs")
 *  - requiredPlan: plan minimum requis ("PRO" ou "BUSINESS")
 *  - currentPlan: plan actuel
 *  - compact: booléen pour affichage compact (barre en haut de page)
 *  - fullPage: booléen pour affichage pleine page (bloque le contenu)
 */
export default function UpgradeBanner({ feature, requiredPlan = 'PRO', currentPlan = 'GRATUIT', compact = false, fullPage = false }) {
  const planIcon = requiredPlan === 'BUSINESS' ? <FiShield size={compact ? 14 : 20} /> : <FiStar size={compact ? 14 : 20} />;
  const planName = requiredPlan === 'BUSINESS' ? 'Business' : 'Pro';
  const planColor = requiredPlan === 'BUSINESS' ? '#b45309' : '#4f46e5';

  if (compact) {
    return (
      <div className="upgrade-banner-compact" style={{ borderColor: planColor }}>
        <div className="upgrade-banner-compact-left">
          <FiLock size={13} />
          <span><strong>{feature}</strong> — Disponible avec le plan {planName}</span>
        </div>
        <Link to="/app/abonnement" className="upgrade-banner-compact-btn" style={{ background: planColor }}>
          Passer au plan {planName} <FiArrowRight size={13} />
        </Link>
      </div>
    );
  }

  if (fullPage) {
    return (
      <div className="upgrade-banner-fullpage">
        <div className="upgrade-banner-fullpage-card">
          <div className="upgrade-banner-fullpage-icon" style={{ background: `${planColor}15`, color: planColor }}>
            <FiLock size={32} />
          </div>
          <h2>Fonctionnalité Premium</h2>
          <p className="upgrade-banner-fullpage-feature">{feature}</p>
          <p className="upgrade-banner-fullpage-desc">
            Cette fonctionnalité est disponible à partir du plan <strong>{planName}</strong>.
            Passez à un plan supérieur pour débloquer toutes les fonctionnalités avancées.
          </p>
          <div className="upgrade-banner-fullpage-plan">
            <div className="upgrade-banner-fullpage-plan-icon" style={{ background: `${planColor}20`, color: planColor }}>
              {planIcon}
            </div>
            <div>
              <strong>Plan {planName}</strong>
              <span>{requiredPlan === 'BUSINESS' ? '10 000 FCFA/mois' : '5 000 FCFA/mois'}</span>
            </div>
          </div>
          <Link to="/app/abonnement" className="upgrade-banner-fullpage-btn" style={{ background: planColor }}>
            <FiZap size={16} /> Passer au plan {planName} <FiArrowRight size={16} />
          </Link>
          <Link to="/app" className="upgrade-banner-fullpage-back">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  // Default: inline banner
  return (
    <div className="upgrade-banner" style={{ borderColor: planColor }}>
      <div className="upgrade-banner-icon" style={{ background: `${planColor}15`, color: planColor }}>
        <FiLock size={18} />
      </div>
      <div className="upgrade-banner-content">
        <h4>{feature}</h4>
        <p>Passez au plan <strong>{planName}</strong> pour accéder à cette fonctionnalité.</p>
      </div>
      <Link to="/app/abonnement" className="upgrade-banner-btn" style={{ background: planColor }}>
        {planIcon} Upgrade <FiArrowRight size={14} />
      </Link>
    </div>
  );
}

/**
 * PlanLimitBanner — Affiche un compteur de limite du plan
 * Props:
 *  - label: ex. "Produits"
 *  - current: nombre actuel
 *  - limit: limite du plan
 *  - icon: icône React
 */
export function PlanLimitBanner({ label, current, limit, icon }) {
  if (limit >= 999999) return null; // pas de limite à afficher

  const percent = Math.min(100, Math.round((current / limit) * 100));
  const isWarning = percent >= 70;
  const isDanger = percent >= 90;
  const color = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#6366f1';

  return (
    <div className="plan-limit-banner" style={{ borderColor: `${color}30` }}>
      <div className="plan-limit-banner-left">
        {icon && <span className="plan-limit-icon" style={{ color }}>{icon}</span>}
        <span className="plan-limit-text">
          <strong>{current}</strong> / {limit} {label}
        </span>
      </div>
      <div className="plan-limit-bar">
        <div className="plan-limit-bar-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      {isDanger && (
        <Link to="/app/abonnement" className="plan-limit-upgrade">
          Augmenter la limite
        </Link>
      )}
    </div>
  );
}
