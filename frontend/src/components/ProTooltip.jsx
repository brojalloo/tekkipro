import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ProTooltip({ locked, featureLabel, requiredPlan = 'PRO', children }) {
  const [visible, setVisible] = useState(false);

  if (!locked) return children;

  return (
    <div
      className="relative inline-flex"
      data-tooltip-wrapper=""
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          w-52 p-3 bg-gray-900 text-white text-[0.75rem] rounded-xl shadow-xl
          pointer-events-none">
          <p className="font-bold mb-1">{featureLabel}</p>
          <p className="text-white/70 leading-snug">
            Disponible sur le <span>plan {requiredPlan}</span>.
          </p>
          <Link
            to="/app/abonnement"
            className="pointer-events-auto mt-2 inline-block text-[#FFD600] font-bold hover:underline"
          >
            Mettre à niveau →
          </Link>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
