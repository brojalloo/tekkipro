import { Link } from 'react-router-dom';
import { FiLock, FiArrowRight, FiZap, FiStar, FiShield, FiCheckCircle } from 'react-icons/fi';
import './UpgradeBanner.css';

const PLAN_LABELS = {
  GRATUIT: 'Starter',
  PRO: 'Pro',
  BUSINESS: 'Business',
};

const THEME_PALETTES = {
  amber: {
    accent: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.10)',
    softStrong: 'rgba(245, 158, 11, 0.18)',
    glow: 'rgba(245, 158, 11, 0.22)',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  },
  emerald: {
    accent: '#10b981',
    soft: 'rgba(16, 185, 129, 0.10)',
    softStrong: 'rgba(16, 185, 129, 0.18)',
    glow: 'rgba(16, 185, 129, 0.22)',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  },
  indigo: {
    accent: '#6366f1',
    soft: 'rgba(99, 102, 241, 0.10)',
    softStrong: 'rgba(99, 102, 241, 0.18)',
    glow: 'rgba(99, 102, 241, 0.22)',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
  },
};

const formatPlanLabel = (plan) => PLAN_LABELS[plan] || plan;

/**
 * UpgradeBanner — Affiche un bandeau d'upgrade quand une fonctionnalité est restreinte
 * Props:
 *  - feature: nom de la fonctionnalité (ex: "Gestion des fournisseurs")
 *  - requiredPlan: plan minimum requis ("PRO" ou "BUSINESS")
 *  - compact: booléen pour affichage compact (barre en haut de page)
 *  - fullPage: booléen pour affichage pleine page (bloque le contenu)
 */
export default function UpgradeBanner({
  feature,
  requiredPlan = 'PRO',
  compact = false,
  fullPage = false,
  currentPlan,
  title = 'Fonctionnalité Premium',
  description,
  badge = 'Accès limité',
  benefits = [],
  preview = [],
  ctaLabel,
  theme,
  icon = null,
}) {
  const planIcon = requiredPlan === 'BUSINESS' ? <FiShield size={compact ? 14 : 20} /> : <FiStar size={compact ? 14 : 20} />;
  const planName = formatPlanLabel(requiredPlan);
  const currentPlanName = currentPlan ? formatPlanLabel(currentPlan) : null;
  const defaultTheme = requiredPlan === 'BUSINESS' ? 'amber' : 'indigo';
  const palette = THEME_PALETTES[theme || defaultTheme] || THEME_PALETTES.indigo;
  const bannerStyle = {
    '--upgrade-accent': palette.accent,
    '--upgrade-soft': palette.soft,
    '--upgrade-soft-strong': palette.softStrong,
    '--upgrade-glow': palette.glow,
    '--upgrade-gradient': palette.gradient,
  };
  const fullPageDescription = description || `Cette fonctionnalité est disponible à partir du plan ${planName}. Passez à un plan supérieur pour débloquer une gestion plus fluide et plus avancée.`;
  const actionLabel = ctaLabel || `Passer au plan ${planName}`;

  if (compact) {
    return (
      <div className="upgrade-banner-compact" style={bannerStyle}>
        <div className="upgrade-banner-compact-left">
          <FiLock size={13} />
          <span><strong>{feature}</strong> — Disponible avec le plan {planName}</span>
        </div>
        <Link to="/app/abonnement" className="upgrade-banner-compact-btn">
          Passer au plan {planName} <FiArrowRight size={13} />
        </Link>
      </div>
    );
  }

  if (fullPage) {
    return (
      <div className="upgrade-banner-fullpage" style={bannerStyle}>
        <div className="upgrade-banner-fullpage-glow" />
        <div className="upgrade-banner-fullpage-card">
          <div className="upgrade-banner-fullpage-topline">
            <span className="upgrade-banner-fullpage-tag">{badge}</span>
            {currentPlanName && (
              <span className="upgrade-banner-fullpage-current">Plan actuel : {currentPlanName}</span>
            )}
          </div>

          <div className="upgrade-banner-fullpage-hero">
            <div className="upgrade-banner-fullpage-copy">
              <div className="upgrade-banner-fullpage-icon">
                {icon || <FiLock size={30} />}
              </div>
              <p className="upgrade-banner-fullpage-feature">{feature}</p>
              <h2>{title}</h2>
              <p className="upgrade-banner-fullpage-desc">{fullPageDescription}</p>

              {benefits.length > 0 && (
                <div className="upgrade-banner-fullpage-benefits">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="upgrade-banner-fullpage-benefit">
                      <FiCheckCircle size={16} />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {preview.length > 0 && (
              <div className="upgrade-banner-fullpage-preview">
                {preview.map((item) => (
                  <div key={`${item.value}-${item.label}`} className="upgrade-banner-fullpage-preview-card">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="upgrade-banner-fullpage-footer">
            <div className="upgrade-banner-fullpage-plan">
              <div className="upgrade-banner-fullpage-plan-icon">
                {planIcon}
              </div>
              <div>
                <strong>Plan {planName}</strong>
                <span>{requiredPlan === 'BUSINESS' ? '10 000 FCFA/mois' : '5 000 FCFA/mois'}</span>
              </div>
            </div>

            <div className="upgrade-banner-fullpage-actions">
              <Link to="/app/abonnement" className="upgrade-banner-fullpage-btn">
                <FiZap size={16} /> {actionLabel} <FiArrowRight size={16} />
              </Link>
              <Link to="/app" className="upgrade-banner-fullpage-back">
                Retour au tableau de bord
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: inline banner
  return (
    <div className="upgrade-banner" style={bannerStyle}>
      <div className="upgrade-banner-icon">
        <FiLock size={18} />
      </div>
      <div className="upgrade-banner-content">
        <h4>{feature}</h4>
        <p>Passez au plan <strong>{planName}</strong> pour accéder à cette fonctionnalité.</p>
      </div>
      <Link to="/app/abonnement" className="upgrade-banner-btn">
        {planIcon} Upgrade <FiArrowRight size={14} />
      </Link>
    </div>
  );
}

export function FeaturePreview({ icon, title, featureLabel, requiredPlan = 'PRO', description }) {
  return (
    <div className="relative min-h-[300px] bg-white border border-border/60 rounded-2xl overflow-hidden">
      {/* Animated skeleton rows */}
      <div className="p-6 flex flex-col gap-3 opacity-40 pointer-events-none select-none" aria-hidden="true">
        <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
        {[100, 75, 90, 60, 80].map((w, i) => (
          <div
            key={i}
            className="h-12 bg-gray-100 rounded-xl animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>

      {/* CTA Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8
        bg-white/80 backdrop-blur-[2px]">
        <div className="w-14 h-14 flex items-center justify-center rounded-2xl
          bg-[#1B5E20]/10 text-[#1B5E20]">
          {icon}
        </div>
        <div className="text-center">
          <p className="text-[0.65rem] font-bold text-[#B8860B] uppercase tracking-widest mb-1">
            ✦ Fonctionnalité {requiredPlan}
          </p>
          <h2 className="text-[1.1rem] font-extrabold text-foreground mb-1"
            style={{ fontFamily: 'Sora, sans-serif' }}>
            {title}
          </h2>
          {description && (
            <p className="text-[0.82rem] text-muted-foreground max-w-xs mx-auto">{description}</p>
          )}
        </div>
        <a
          href="/app/abonnement"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B5E20] text-white
            font-bold text-[0.85rem] rounded-xl hover:-translate-y-0.5 transition-all no-underline"
        >
          Débloquer {featureLabel} →
        </a>
      </div>
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
