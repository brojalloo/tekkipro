import toast from 'react-hot-toast';

export function showUpgradeToast({
  message,
  navigate,
  title = 'Limite du plan atteinte',
  ctaLabel = 'Voir Abonnement',
  target = '/app/abonnement',
  duration = 8000,
}) {
  toast((t) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <strong>{title}</strong>
      <span>{message}</span>
      <button
        type="button"
        onClick={() => {
          toast.dismiss(t.id);
          navigate(target);
        }}
        style={{
          alignSelf: 'flex-start',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        {ctaLabel}
      </button>
    </div>
  ), { duration });
}

