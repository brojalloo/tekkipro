const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Boutiques.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import '\.\/Boutiques\.css';\r?\n?/, '');

const classesMap = {
  'className="mbq-page"': 'className="min-h-screen bg-transparent font-sans pb-10"',
  'className="mbq-hero"': 'className="relative px-6 md:px-10 py-11 overflow-hidden border-b border-border"',
  'className="mbq-hero-bg"': 'className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-destructive/5 pointer-events-none"',
  'className="mbq-hero-orb mbq-orb-1"': 'className="absolute rounded-full blur-[80px] opacity-40 w-[350px] h-[350px] bg-primary/10 top-[-120px] right-[-80px]"',
  'className="mbq-hero-orb mbq-orb-2"': 'className="absolute rounded-full blur-[80px] opacity-40 w-[250px] h-[250px] bg-emerald-500/10 bottom-[-100px] left-[20%]"',
  'className="mbq-hero-orb mbq-orb-3"': 'className="absolute rounded-full blur-[80px] opacity-40 w-[180px] h-[180px] bg-destructive/10 top-[50%] right-[30%]"',
  'className="mbq-hero-content"': 'className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8"',
  'className="mbq-hero-left"': 'className="flex flex-col items-start"',
  'className="mbq-hero-badge"': 'className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold tracking-wide mb-3"',
  '<h1>Mes Boutiques</h1>': '<h1 className="text-3xl font-black text-foreground tracking-tight m-0 mb-2 leading-tight">Mes Boutiques</h1>',
  '<p>Pilotez tous vos points de vente depuis un centre de commande unifié</p>': '<p className="text-[0.92rem] font-medium text-muted-foreground leading-relaxed max-w-md m-0">Pilotez tous vos points de vente depuis un centre de commande unifié</p>',
  'className="mbq-hero-cta"': 'className="flex items-center gap-4 py-3 pr-6 pl-3 bg-gradient-to-br from-[#E8623A] to-[#F4A020] border-none rounded-2xl cursor-pointer transition-all shadow-lg shadow-accent/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/35 shrink-0"',
  'className="mbq-cta-icon"': 'className="w-11 h-11 flex items-center justify-center bg-white/20 rounded-xl text-white"',
  'className="mbq-cta-text"': 'className="flex flex-col items-start"',
  'className="mbq-cta-main"': 'className="text-white text-[0.92rem] font-bold"',
  'className="mbq-cta-sub"': 'className="text-white/80 text-[0.72rem] font-medium"',
  'className="mbq-stats-row"': 'className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-6 md:p-10 pb-0"',
  'className="mbq-stat-tile"': 'className="flex items-center gap-4 p-5 bg-card border border-border/80 rounded-2xl transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5"',
  'className="mbq-stat-icon si-blue"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-blue-500/10 text-blue-500"',
  'className="mbq-stat-icon si-emerald"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-emerald-500/10 text-emerald-500"',
  'className="mbq-stat-icon si-amber"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-amber-500/10 text-amber-500"',
  'className="mbq-stat-icon si-purple"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-purple-500/10 text-purple-500"',
  'className="mbq-stat-data"': 'className="flex flex-col min-w-0"',
  'className="mbq-stat-num"': 'className="text-[1.6rem] font-extrabold text-foreground leading-none tracking-tight truncate"',
  'className="mbq-stat-lbl"': 'className="text-[0.76rem] font-bold text-muted-foreground mt-1 truncate"',
  'className="mbq-loader"': 'className="flex flex-col items-center justify-center gap-5 py-20 text-[0.88rem] font-bold text-muted-foreground"',
  'className="mbq-loader-ring"': 'className="w-10 h-10 border-[3px] border-primary/15 border-t-primary rounded-full animate-spin"',
  'className="mbq-grid"': 'className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-6 md:p-10"',
  'className={`mbq-card ${isActive ? \'mbq-card-active\' : \'\'} ${isMain ? \'mbq-card-main\' : \'\'}`}': 'className={`relative bg-card border rounded-[20px] p-7 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden ${isActive ? \'border-primary bg-primary/5 hover:border-[#E8623A]/50\' : isMain ? \'border-emerald-500/25 hover:border-border/80\' : \'border-border hover:border-border/80\'}`}',
  'className="mbq-card-glow"': 'className="absolute top-[-1px] left-[-1px] right-[-1px] h-[3px] bg-gradient-to-r from-accent via-primary to-accent bg-[length:200%_100%] animate-pulse rounded-t-[20px]"',
  'className="mbq-card-badges"': 'className="flex gap-2 mb-4 min-h-[24px]"',
  'className="mbq-badge mbq-badge-main"': 'className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.67rem] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"',
  'className="mbq-badge mbq-badge-active"': 'className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.67rem] font-bold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20"',
  'className="mbq-card-top"': 'className="flex items-center gap-4 mb-4"',
  'className="mbq-card-avatar"': 'className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-extrabold shrink-0 shadow-md"',
  '<h3>{b.nom}</h3>': '<h3 className="text-[1.1rem] font-extrabold text-foreground m-0 leading-tight">{b.nom}</h3>',
  'className="mbq-slug-tag"': 'className="inline-block mt-1 text-[0.72rem] text-muted-foreground font-mono font-bold bg-muted px-2 py-0.5 rounded"',
  'className="mbq-card-infos"': 'className="flex flex-col gap-1.5 mb-4"',
  'className="mbq-info-row"': 'className="flex items-center gap-2 text-muted-foreground font-medium text-[0.8rem]"',
  'className="mbq-info-empty"': 'className="text-muted-foreground font-medium text-[0.78rem] italic py-1"',
  'className="mbq-card-metrics"': 'className="flex items-center py-4 border-y border-border mb-4"',
  'className="mbq-metric"': 'className="flex-1 text-center"',
  'className="mbq-metric-val"': 'className="text-[1.15rem] font-extrabold text-foreground leading-none"',
  'className="mbq-metric-lbl"': 'className="text-[0.68rem] font-bold text-muted-foreground mt-1.5 uppercase tracking-wider"',
  'className="mbq-metric-sep"': 'className="w-[1px] h-8 bg-border shrink-0"',
  'className="mbq-card-actions"': 'className="flex items-center gap-2.5"',
  'className="mbq-action-active"': 'className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl text-[0.78rem] font-bold"',
  'className="mbq-btn-switch"': 'className="flex-1 flex items-center justify-center gap-2 p-3 bg-muted/30 border border-border/80 rounded-xl text-foreground text-[0.82rem] font-bold cursor-pointer transition-all hover:bg-primary/10 hover:border-primary/30 hover:text-primary hover:-translate-y-[1px] shadow-sm"',
  'className="mbq-btn-delete"': 'className="flex items-center justify-center w-10 h-10 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive hover:bg-destructive/20 hover:border-destructive/30 transition-all shrink-0"',
  'className="mbq-card mbq-card-add"': 'className="relative bg-card border border-dashed border-border flex flex-col items-center justify-center min-h-[340px] cursor-pointer p-8 rounded-[20px] transition-all hover:border-[#E8623A]/40 hover:bg-[#E8623A]/5 group"',
  'className="mbq-add-content"': 'className="text-center"',
  'className="mbq-add-icon"': 'className="w-16 h-16 flex items-center justify-center bg-muted text-muted-foreground rounded-[18px] mx-auto mb-5 transition-all group-hover:bg-[#E8623A]/10 group-hover:text-[#E8623A] group-hover:scale-110"',
  '<h4>Nouveau point de vente</h4>': '<h4 className="text-base font-extrabold text-foreground mb-1.5">Nouveau point de vente</h4>',
  '<p>Créer une nouvelle boutique rattachée à votre réseau</p>': '<p className="text-[0.78rem] text-muted-foreground font-medium max-w-[200px] mx-auto leading-relaxed">Créer une nouvelle boutique rattachée à votre réseau</p>',
  'className="mbq-overlay"': 'className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200"',
  'className="mbq-modal mbq-modal-sm"': 'className="relative bg-card border border-border rounded-3xl w-[92%] max-w-[480px] max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"',
  'className="mbq-modal-top danger"': 'className="flex items-center gap-4 p-7 pb-5 border-b border-border"',
  'className="mbq-modal-icon-wrap danger"': 'className="w-12 h-12 flex items-center justify-center bg-destructive/10 text-destructive rounded-xl shrink-0"',
  '<h3>Supprimer la boutique</h3>': '<h3 className="text-[1.1rem] font-bold text-foreground m-0">Supprimer la boutique</h3>',
  '<p>Cette action est irréversible</p>': '<p className="text-[0.78rem] font-medium text-muted-foreground mt-1 mb-0">Cette action est irréversible</p>',
  'className="mbq-modal-x"': 'className="absolute top-6 right-6 flex items-center justify-center w-9 h-9 bg-muted/50 border border-border rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"',
  'className="mbq-delete-body"': 'className="p-7"',
  'className="mbq-delete-alert"': 'className="flex gap-4 p-4 bg-destructive/10 text-destructive rounded-xl"',
  '<strong>Attention !</strong>': '<strong className="block mb-1">Attention !</strong>',
  '<p>\n                    La boutique': '<p className="text-sm m-0">\n                    La boutique',
  'className="mbq-modal-actions"': 'className="flex items-center justify-end gap-3 p-6 bg-muted/30 border-t border-border"',
  'className="mbq-btn-cancel"': 'className="px-5 py-2.5 bg-card border border-border rounded-xl font-bold text-foreground hover:bg-muted transition-colors"',
  'className="mbq-btn-danger"': 'className="flex items-center gap-2 px-5 py-2.5 bg-destructive text-destructive-foreground rounded-xl font-bold hover:bg-destructive/90 transition-all disabled:opacity-50"',
  'className="mbq-spin"': 'className="animate-spin"'
};

for (const [key, value] of Object.entries(classesMap)) {
  content = content.replaceAll(key, value);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Boutiques JSX restructured for Tailwind successfully!');
