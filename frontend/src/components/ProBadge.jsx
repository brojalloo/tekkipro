import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';

export default function ProBadge({ variant = 'label', requiredPlan = 'PRO', className = '', asLink = true }) {
  const label = requiredPlan === 'BUSINESS' ? 'BUSINESS' : 'PRO';

  const badgeClass = `inline-flex items-center gap-1 rounded-full px-1.5 py-0.5
        bg-[#FFD600]/20 text-[#B8860B] hover:bg-[#FFD600]/35 transition-colors
        text-[0.65rem] font-extrabold tracking-wide no-underline shrink-0 ${className}`;
  const content = (
    <>
      <FiLock size={9} />
      {variant === 'label' && <span>{label}</span>}
    </>
  );

  if (!asLink) return <span className={badgeClass} aria-hidden="true">{content}</span>;

  return (
    <Link
      to="/app/abonnement"
      title={`Disponible en plan ${label}`}
      onClick={(e) => e.stopPropagation()}
      className={badgeClass}
    >
      {content}
    </Link>
  );
}
