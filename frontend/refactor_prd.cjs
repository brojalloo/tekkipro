const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Produits.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import '\.\/Produits\.css';\r?\n?/, '');

const classesMap = {
  'className="prd-page"': 'className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col gap-5 p-4 md:p-6 lg:p-8 font-sans"',
  'className="prd-loading"': 'className="flex flex-col items-center justify-center min-h-[60vh] gap-4"',
  'className="prd-loading-spinner"': 'className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"',
  'className="prd-header"': 'className="relative p-6 md:p-8 overflow-hidden border border-border/60 rounded-[28px] bg-gradient-to-b from-white/95 to-slate-50/90 shadow-xl shadow-slate-200/50"',
  'className="prd-header-bg"': 'className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(27,94,32,0.08)_0%,transparent_34%),linear-gradient(135deg,rgba(27,94,32,0.04)_0%,rgba(211,47,47,0.03)_50%,rgba(255,214,0,0.02)_100%)]"',
  'className="prd-header-content"': 'className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6"',
  'className="prd-header-left"': 'className="flex items-center gap-5"',
  'className="prd-header-icon"': 'className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-2xl shadow-lg shadow-primary/20 shrink-0"',
  '<h1>Produits</h1>': '<h1 className="text-[1.6rem] md:text-3xl font-extrabold text-foreground tracking-tight m-0 leading-tight">Produits</h1>',
  '<p>Catalogue complet de vos articles</p>': '<p className="text-[0.85rem] font-bold text-muted-foreground mt-1 mb-0">Catalogue complet de vos articles</p>',
  'className="prd-btn-add"': 'className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-[#D32F2F] to-[#b71c1c] text-white rounded-[16px] text-[0.95rem] font-extrabold shadow-lg shadow-accent/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 transition-all"',
  'className="prd-stats"': 'className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"',
  'className="prd-stat-card"': 'className="relative flex items-center gap-4 p-5 bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[22px] shadow-lg shadow-slate-200/40 hover:-translate-y-1 hover:shadow-xl transition-all overflow-hidden"',
  'className="prd-stat-icon blue"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-primary/10 text-primary"',
  'className="prd-stat-icon green"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#1B6B3A]/10 text-[#1B6B3A]"',
  'className="prd-stat-icon amber"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#f59e0b]/10 text-[#f59e0b]"',
  'className="prd-stat-icon purple"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#D4880F]/10 text-[#D4880F]"',
  'className="prd-stat-info"': 'className="flex flex-col min-w-0"',
  'className="prd-stat-value"': 'className="text-[1.25rem] font-extrabold text-foreground tracking-tight truncate"',
  'className="prd-stat-value prd-alert-val"': 'className="text-[1.25rem] font-extrabold text-[#f59e0b] tracking-tight truncate"',
  'className="prd-stat-label"': 'className="text-[0.8rem] font-bold text-muted-foreground truncate"',
  'className="prd-filter-active"': 'className="absolute top-4 right-4 text-[0.65rem] font-bold bg-[#f59e0b]/10 text-[#d97706] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm"',
  'className="prd-toolbar"': 'className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-6 bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[22px] shadow-lg shadow-slate-200/40"',
  'className="prd-search"': 'className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 bg-muted/30 border border-border/80 rounded-2xl md:min-w-[360px] focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(27,94,32,0.08)] transition-all"',
  'type="text"\n            placeholder="Rechercher': 'type="text"\n            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground w-full"\n            placeholder="Rechercher',
  'className="prd-search-btn"': 'className="px-4 py-2 bg-muted text-muted-foreground font-bold text-xs rounded-xl hover:bg-muted/80 transition-colors"',
  'className="prd-result-count"': 'className="text-[0.85rem] font-bold text-muted-foreground"',
  'className="prd-content"': 'className="p-0"',
  'className="prd-table-card"': 'className="bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[28px] shadow-lg shadow-slate-200/40 overflow-x-auto"',
  'className="prd-table"': 'className="w-full text-left border-collapse min-w-[800px]"',
  '<thead>\n              <tr>': '<thead className="bg-muted/30 border-b border-border">\n              <tr>',
  '<th scope="col">': '<th scope="col" className="px-6 py-5 text-[0.75rem] font-extrabold text-muted-foreground uppercase tracking-widest">',
  '<tr key={p.id} className={p.stock <= p.stockAlerte ? \'prd-row-alert\' : \'\'}>': '<tr key={p.id} className={`transition-all ${p.stock <= p.stockAlerte ? \'bg-[#f59e0b]/5 hover:bg-[#f59e0b]/10\' : \'hover:bg-muted/50\'}`}>',
  '<th scope="row">': '<th scope="row" className="px-6 py-4 font-normal border-b border-muted/50">',
  '<td>\n                    <span': '<td className="px-6 py-4 border-b border-muted/50 align-middle">\n                    <span',
  '<td>\n                      {(()': '<td className="px-6 py-4 border-b border-muted/50 align-middle">\n                      {(()',
  '<td>\n                    <div className="prd-stock-cell">': '<td className="px-6 py-4 border-b border-muted/50 align-middle">\n                    <div className="flex items-center gap-2">',
  '<td>\n                    <div className="prd-fractions">': '<td className="px-6 py-4 border-b border-muted/50 align-middle">\n                    <div className="flex flex-wrap gap-1.5">',
  '<td>\n                      <div className="prd-actions">': '<td className="px-6 py-4 border-b border-muted/50 align-middle">\n                      <div className="flex gap-2 justify-end">',
  'className="prd-product-cell"': 'className="flex items-center gap-4"',
  'className={`prd-product-avatar ${!p.actif ? \'inactive\' : \'\'}`}': 'className={`w-11 h-11 flex items-center justify-center rounded-xl shrink-0 ${!p.actif ? \'bg-muted text-muted-foreground\' : \'bg-primary/10 text-primary shadow-md shadow-primary/10\'}`}',
  'className="prd-inactive-badge"': 'className="inline-block ml-2 px-2.5 py-0.5 bg-muted text-muted-foreground rounded-full text-[0.65rem] font-bold align-middle"',
  '<strong>{p.nom}</strong>': '<strong className="text-[0.95rem] font-extrabold text-foreground">{p.nom}</strong>',
  'className="prd-cat-badge"': 'className="inline-block px-3 py-1 bg-muted/60 border border-muted-foreground/10 rounded-full text-[0.76rem] font-bold text-muted-foreground"',
  'className="prd-price-main"': 'className="text-[0.95rem] font-extrabold text-foreground font-mono"',
  'className="prd-price-unit"': 'className="text-[0.72rem] text-muted-foreground font-medium ml-1"',
  'className="prd-price-achat"': 'className="text-[0.9rem] font-bold text-muted-foreground font-mono"',
  'className={`prd-stock-val ${p.stock <= p.stockAlerte ? \'alert\' : \'\'}`}': 'className={`text-[0.95rem] font-extrabold ${p.stock <= p.stockAlerte ? \'text-destructive\' : \'text-foreground\'}`}',
  'className="prd-stock-alert-icon"': 'className="text-[#f59e0b] animate-pulse"',
  'className="prd-fraction-tag"': 'className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#D4880F] rounded-[10px] text-[0.75rem] font-extrabold whitespace-nowrap"',
  'className="prd-muted"': 'className="text-muted-foreground text-[0.82rem] font-medium"',
  'className="prd-action-btn edit"': 'className="w-9 h-9 flex items-center justify-center border border-border rounded-[10px] bg-card shadow-sm text-muted-foreground transition-all hover:bg-primary/10 hover:border-primary/20 hover:text-primary"',
  'className="prd-action-btn delete"': 'className="w-9 h-9 flex items-center justify-center border border-border rounded-[10px] bg-card shadow-sm text-muted-foreground transition-all hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive"',
  'className="prd-empty"': 'className="flex flex-col items-center justify-center py-16 text-muted-foreground/50"',
  '<p>Aucun produit trouvé</p>': '<p className="text-[1.05rem] font-extrabold text-muted-foreground mt-4 mb-1">Aucun produit trouvé</p>',
  '<span>{filterAlerte \? \'Aucun produit': '<span className="text-[0.85rem] font-medium">{filterAlerte ? \'Aucun produit',
};

for (const [key, value] of Object.entries(classesMap)) {
  content = content.replaceAll(key, value);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Produits JSX restructured for Tailwind successfully!');
