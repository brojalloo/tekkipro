const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Dashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import '\.\/Dashboard\.css';\r?\n?/, '');

const classesMap = {
  'className="db-page"': 'className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col gap-5 p-4 md:p-6 lg:p-8 font-sans"',
  'className="db-loading"': 'className="flex flex-col items-center justify-center min-h-[60vh] gap-4"',
  'className="db-loading-spinner"': 'className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"',
  'className="db-header"': 'className="relative p-6 md:p-8 overflow-hidden border border-border/60 rounded-[28px] bg-gradient-to-b from-white/95 to-slate-50/90 shadow-xl shadow-slate-200/50"',
  'className="db-header-bg"': 'className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(27,94,32,0.08)_0%,transparent_34%),linear-gradient(135deg,rgba(27,94,32,0.04)_0%,rgba(255,214,0,0.02)_52%,rgba(211,47,47,0.01)_100%)]"',
  'className="db-header-content"': 'className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6"',
  'className="db-header-left"': 'className="flex items-center gap-5"',
  'className="db-header-icon"': 'className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-2xl shadow-lg shadow-primary/20 shrink-0"',
  '<h1>{g.text}': '<h1 className="text-[1.6rem] md:text-3xl font-extrabold text-foreground tracking-tight m-0 leading-tight">{g.text}',
  '<p>\n                <FiCalendar': '<p className="flex items-center gap-1.5 text-[0.85rem] font-bold text-muted-foreground mt-1 mb-0">\n                <FiCalendar',
  'className="db-btn-vente"': 'className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-[#D32F2F] to-[#b71c1c] text-white rounded-[16px] text-[0.95rem] font-extrabold shadow-lg shadow-accent/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 transition-all"',
  'className="db-stats"': 'className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"',
  'className="db-stat-card"': 'className="relative flex items-center gap-4 p-5 bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[22px] shadow-lg shadow-slate-200/40 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden"',
  'className="db-stat-icon blue"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-primary/10 text-primary"',
  'className="db-stat-icon green"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-primary/10 text-primary"',
  'className="db-stat-icon emerald"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-primary/10 text-primary"',
  'className="db-stat-icon red"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-destructive/10 text-destructive"',
  'className="db-stat-icon amber"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#d4af37]/10 text-[#d4af37]"',
  'className="db-stat-icon indigo"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#E8623A]/10 text-[#E8623A]"',
  'className="db-stat-icon teal"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#14b8a6]/10 text-[#14b8a6]"',
  'className="db-stat-info"': 'className="flex flex-col min-w-0"',
  'className="db-stat-value"': 'className="text-[1.25rem] font-extrabold text-foreground tracking-tight truncate"',
  'className="db-stat-value db-profit"': 'className="text-[1.25rem] font-extrabold text-[#155230] tracking-tight truncate"',
  'className="db-stat-value db-debt"': 'className="text-[1.25rem] font-extrabold text-destructive tracking-tight truncate"',
  'className="db-stat-label"': 'className="text-[0.8rem] font-bold text-muted-foreground truncate"',
  'className="db-plan-widget"': 'className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 bg-gradient-to-b from-white to-blue-50/30 border border-border/80 rounded-[20px] shadow-sm"',
  'className="db-plan-widget-left"': 'className="flex items-center gap-3"',
  'className={`db-plan-icon plan-${plan.toLowerCase()}`}': 'className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${plan === \'GRATUIT\' ? \'bg-muted text-muted-foreground\' : plan === \'PRO\' ? \'bg-primary/10 text-primary\' : \'bg-[#d4af37]/10 text-[#d4af37]\'} shrink-0`} ',
  'className="db-plan-info"': 'className="flex flex-col"',
  'className="db-plan-label"': 'className="text-[0.65rem] font-extrabold text-muted-foreground uppercase tracking-widest"',
  'className="db-plan-name"': 'className="text-base font-extrabold text-foreground leading-none"',
  'className="db-plan-limits"': 'className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 flex-1 md:justify-center"',
  '<span><FiPackage': '<span className="inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-muted-foreground"><FiPackage',
  '<span><FiUsers': '<span className="inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-muted-foreground"><FiUsers',
  '<span><FiShoppingCart': '<span className="inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-muted-foreground"><FiShoppingCart',
  'className="db-plan-upgrade-btn"': 'className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-accent to-secondary text-white text-[0.8rem] font-bold shadow-md shadow-accent/20 hover:-translate-y-0.5 hover:shadow-lg transition-all"',
  'className="db-bottom"': 'className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5"',
  'className="db-card-header"': 'className="flex items-center justify-between mb-6"',
  'className="db-card-title"': 'className="flex items-center gap-2.5 text-primary"',
  '<h3>Ventes des 14 derniers jours</h3>': '<h3 className="text-base font-extrabold text-foreground m-0">Ventes des 14 derniers jours</h3>',
  '<h3>Top Produits</h3>': '<h3 className="text-[1.05rem] font-extrabold text-foreground m-0">Top Produits</h3>',
  'className="db-card-link"': 'className="flex items-center gap-1.5 text-[0.85rem] font-bold text-primary hover:gap-2 transition-all"',
  'className="db-card-period"': 'className="text-[0.75rem] font-bold text-muted-foreground bg-muted px-3 py-1 rounded-lg"',
  'className="db-chart-card"': 'className="relative p-6 bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[28px] shadow-lg shadow-slate-200/40 overflow-hidden"',
  'className="db-chart-wrap"': 'className="-mx-4"',
  'className="db-top-card"': 'className="relative p-6 bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[28px] shadow-lg shadow-slate-200/40 overflow-hidden"',
  'className="db-empty-top"': 'className="flex flex-col items-center justify-center py-12 text-muted-foreground/40"',
  '<p>Aucune vente ce mois</p>': '<p className="text-[0.9rem] font-bold text-muted-foreground mt-3">Aucune vente ce mois</p>',
  'className="db-top-list"': 'className="flex flex-col"',
  'className="db-top-item"': 'className="flex items-center justify-between py-3 border-b border-muted/50 hover:bg-muted/30 hover:translate-x-1 transition-all rounded-2xl px-2"',
  'className="db-top-left"': 'className="flex items-center gap-3.5 min-w-0"',
  'className={`db-rank ${i < 3 ? \'top\' : \'\'}`}': 'className={`w-[28px] h-[28px] flex items-center justify-center rounded-full text-xs font-extrabold shrink-0 ${i < 3 ? \'bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20\' : \'bg-muted text-muted-foreground\'}`}',
  'className="db-top-info"': 'className="flex flex-col min-w-0"',
  '<strong>{p.produit}</strong>': '<strong className="text-[0.9rem] font-bold text-foreground truncate block">{p.produit}</strong>',
  '<span>\n                        {formatTopProduitQuantities': '<span className="text-[0.75rem] font-bold text-muted-foreground truncate block pt-0.5">\n                        {formatTopProduitQuantities',
  'className="db-top-ca"': 'className="text-[0.9rem] font-extrabold font-mono text-primary ml-3 shrink-0"',
};

for (const [key, value] of Object.entries(classesMap)) {
  content = content.replaceAll(key, value);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dashboard JSX restructured for Tailwind successfully!');
