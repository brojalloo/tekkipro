import { Link } from 'react-router-dom';

const UNLIMITED = 999999;
const UPGRADE_THRESHOLD = 0.8;

export default function UsageMeter({ label, used, limit, compact = false }) {
  // Show nothing for plans without real limits
  if (!limit || limit >= UNLIMITED) return null;

  const pct = Math.min(Math.round((used / limit) * 100), 100);
  const showCta = pct >= UPGRADE_THRESHOLD * 100;

  const barColor =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-400' :
                'bg-[#1B5E20]';

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[0.7rem] font-bold tabular-nums text-muted-foreground shrink-0">
          {used}/{limit}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.78rem] font-semibold text-muted-foreground">{label}</span>
        <span className="text-[0.78rem] font-bold tabular-nums text-foreground">{used} / {limit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showCta && (
        <Link
          to="/app/abonnement"
          className="self-start text-[0.72rem] font-bold text-[#1B5E20] hover:underline mt-0.5"
        >
          Passer au PRO →
        </Link>
      )}
    </div>
  );
}
