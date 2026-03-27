import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';

export default function ProBadge({ variant = 'label', requiredPlan = 'PRO', className = '' }) {
  const label = requiredPlan === 'BUSINESS' ? 'BUSINESS' : 'PRO';

  return (
    <Link
      to="/app/abonnement"
      title={`Disponible en plan ${label}`}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5
        bg-[#FFD600]/20 text-[#B8860B] hover:bg-[#FFD600]/35 transition-colors
        text-[0.65rem] font-extrabold tracking-wide no-underline shrink-0 ${className}`}
    >
      <FiLock size={9} />
      {variant === 'label' && <span>{label}</span>}
    </Link>
  );
}
