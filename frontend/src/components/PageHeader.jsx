export default function PageHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-2">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 flex items-center justify-center bg-[#1B5E20]/10 text-[#1B5E20] rounded-xl shrink-0">
          {icon}
        </div>
        <div>
          <h1
            className="text-[1.35rem] font-extrabold text-foreground m-0 leading-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-[0.78rem] font-medium text-muted-foreground mt-0.5 mb-0">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
