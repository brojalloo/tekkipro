const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Parametres.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import '\.\/Parametres\.css';\r?\n?/, '');

const classesMap = {
  'className="prm-page"': 'className="min-h-[calc(100vh-64px)] bg-transparent font-sans animate-in fade-in duration-500 pb-10"',
  'className="prm-loader"': 'className="flex flex-col items-center justify-center min-h-[60vh] gap-4"',
  'className="prm-loader-ring"': 'className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"',
  'className="prm-header"': 'className="relative p-8 md:p-12 overflow-hidden border-b border-border/50 bg-white/40 backdrop-blur-xl"',
  'className="prm-header-bg"': 'className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(27,94,32,0.08),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(255,214,0,0.08),transparent_40%)] pointer-events-none opacity-60"',
  'className="prm-header-content"': 'className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6"',
  'className="prm-header-left"': 'className="flex items-center gap-6"',
  'className="prm-header-icon"': 'className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-2xl shadow-[0_12px_32px_rgba(27,94,32,0.2)] shrink-0 -rotate-3 hover:rotate-0 hover:scale-105 transition-all"',
  '<h1>Paramètres Avancés</h1>': '<h1 className="text-3xl font-extrabold text-foreground tracking-tight m-0 leading-tight">Paramètres Avancés</h1>',
  '<p>Configuration de votre écosystème commercial TekkiPro</p>': '<p className="text-[0.95rem] font-medium text-muted-foreground m-0 mt-1">Configuration de votre écosystème commercial TekkiPro</p>',
  'className="prm-unsaved-badge"': 'className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-primary text-xs font-bold uppercase tracking-widest animate-pulse"',
  'className="prm-content"': 'className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 md:gap-14 p-6 md:p-10 max-w-[1400px] mx-auto"',
  'className="prm-main"': 'className="flex flex-col"',
  'className="prm-sidebar"': 'className="flex flex-col gap-8"',
  'className="prm-section"': 'className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-md hover:-translate-y-1 hover:shadow-lg transition-all relative mb-8"',
  'className="prm-section-header"': 'className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8"',
  'className="prm-section-icon blue"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-primary/10 text-primary"',
  '<h2>Identité de la Boutique</h2>': '<h2 className="text-xl font-bold text-foreground m-0">Identité de la Boutique</h2>',
  '<p>Informations clés pour vos factures et documents officiels</p>': '<p className="text-[0.85rem] text-muted-foreground mt-1 mb-0">Informations clés pour vos factures et documents officiels</p>',
  'className="prm-logo-block"': 'className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 bg-muted/40 rounded-2xl mb-8 border border-dashed border-border"',
  'className="prm-logo-preview"': 'className="w-24 h-24 rounded-2xl bg-white border-2 border-muted overflow-hidden shadow-sm shrink-0 flex items-center justify-center"',
  'className="prm-logo-placeholder"': 'className="flex items-center justify-center text-muted-foreground/40 w-full h-full"',
  'className="prm-logo-info"': 'className="flex flex-col items-start min-w-0"',
  'className="prm-logo-label"': 'className="text-[0.9rem] font-bold text-foreground block"',
  'className="prm-hint"': 'className="text-[0.8rem] text-muted-foreground mt-1 mb-3 block"',
  'className="prm-btn-logo"': 'className="px-4 py-2 bg-white border border-border text-xs font-bold rounded-[8px] hover:border-secondary hover:text-secondary hover:bg-secondary/10 transition-colors flex items-center gap-2 text-foreground"',
  'className="prm-fields"': 'className="flex flex-col gap-6"',
  'className="prm-field-row"': 'className="grid grid-cols-1 md:grid-cols-2 gap-6"',
  'className="prm-field"': 'className="flex flex-col"',
  '<label><FiGlobe size={16} /> Nom Commercial</label>': '<label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><FiGlobe size={16} className="text-secondary" /> Nom Commercial</label>',
  '<label><FiMapPin size={16} /> Siège Social / Adresse</label>': '<label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><FiMapPin size={16} className="text-secondary" /> Siège Social / Adresse</label>',
  '<label><FiPhone size={16} /> Contact Téléphonique</label>': '<label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><FiPhone size={16} className="text-secondary" /> Contact Téléphonique</label>',
  '<label><FiHash size={16} /> Numéro NINEA</label>': '<label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><FiHash size={16} className="text-secondary" /> Numéro NINEA</label>',
  '<label><FiDollarSign size={16} /> Unité Monétaire</label>': '<label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2"><FiDollarSign size={16} className="text-secondary" /> Unité Monétaire</label>',
  '<input\n': '<input className="w-full px-4 py-3 bg-muted/30 border border-border/80 rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"\n',
  '<select\n': '<select className="w-full px-4 py-3 bg-muted/30 border border-border/80 rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"\n',
  'className="prm-save-bar"': 'className="flex flex-col sm:flex-row items-center gap-4 mt-8"',
  'className="prm-btn-save"': 'className="px-10 py-3 bg-gradient-to-br from-primary to-[#1B6B3A] text-white border-none rounded-xl font-bold shadow-[0_10px_24px_rgba(27,94,32,0.2)] transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none"',
  'className="prm-btn-reset"': 'className="px-6 py-3 bg-transparent border border-muted text-foreground font-semibold rounded-xl hover:bg-muted/50 transition-colors"',
  'className="prm-info-card"': 'className="bg-card border border-border/60 rounded-3xl p-8 shadow-md hover:shadow-lg transition-all"',
  'className="prm-info-header"': 'className="flex items-center gap-4 mb-6"',
  'className="prm-info-icon"': 'className="w-10 h-10 flex items-center justify-center rounded-lg bg-secondary/10 text-secondary shrink-0"',
  '<h3>Statut de Compte</h3>': '<h3 className="text-lg font-bold text-foreground m-0">Statut de Compte</h3>',
  '<h3>Détails Sécurisés</h3>': '<h3 className="text-lg font-bold text-foreground m-0">Détails Sécurisés</h3>',
  'className="prm-plan-display"': 'className="bg-primary/5 border-2 border-primary/10 p-5 rounded-2xl mb-6 flex flex-col gap-1"',
  'className="prm-plan-label"': 'className="text-[0.75rem] font-bold text-muted-foreground uppercase tracking-wider"',
  'className="prm-plan-name"': 'className="text-xl font-black text-primary"',
  'className="prm-link-btn"': 'className="block text-center px-4 py-3 bg-foreground text-background rounded-xl font-bold hover:bg-black hover:-translate-y-0.5 transition-all text-sm"',
  'className="prm-account-rows"': 'className="flex flex-col min-w-0"',
  'className="prm-account-row"': 'className="flex items-center gap-4 py-4 border-b border-muted/50 last:border-0"',
  'className="prm-account-icon"': 'className="text-muted-foreground shrink-0"',
  'className="prm-account-label"': 'className="block text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest"',
  'className="prm-account-value"': 'className="block text-[0.9rem] font-semibold text-foreground truncate"',
  'className="prm-account-value prm-slug"': 'className="text-[0.8rem] font-semibold font-mono bg-secondary/10 text-[#D4880F] px-2.5 py-1 rounded-md"\n'
};

for (const [key, value] of Object.entries(classesMap)) {
  content = content.replaceAll(key, value);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Parametres JSX restructured for Tailwind successfully!');
