const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/NouvelleVente.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove CSS import
content = content.replace(/import '\.\/NouvelleVente\.css';\r?\n?/, '');

// 2. Class mappings
const classesMap = {
  'className="nv-page"': 'className="min-h-screen font-sans bg-[#FFFAF0] text-gray-900 pb-0"',
  'className="nv-header"': 'className="relative px-6 md:px-10 py-5 bg-card/70 backdrop-blur-xl border-b border-white/30 shadow-sm z-10"',
  'className="nv-header-bg"': 'className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(27,94,32,0.08),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(255,214,0,0.08),transparent_45%)] pointer-events-none"',
  'className="nv-header-content"': 'className="relative flex items-center justify-between gap-4"',
  'className="nv-header-left"': 'className="flex items-center gap-5"',
  'className="nv-header-icon"': 'className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-2xl shadow-[0_8px_16px_rgba(27,94,32,0.2)] shrink-0"',
  '<h1>Nouvelle Vente</h1>': '<h1 className="text-[1.75rem] font-extrabold tracking-tight text-primary m-0 leading-none">Nouvelle Vente</h1>',
  '<p>Gérez vos transactions avec rapidité et précision</p>': '<p className="text-sm font-semibold text-muted-foreground mt-1 mb-0">Gérez vos transactions avec rapidité et précision</p>',
  'className="nv-cart-badge"': 'className="flex items-center gap-3 px-5 py-3 bg-card rounded-2xl shadow-md border border-border"',
  'className="nv-layout"': 'className="grid grid-cols-1 xl:grid-cols-[1fr_440px] gap-0 min-h-[calc(100vh-100px)]"',
  'className="nv-products-section"': 'className="p-5 md:p-8 xl:pr-10 overflow-y-auto"',
  'className="nv-search-bar"': 'className="flex items-center gap-3 px-5 py-3.5 bg-card border-2 border-border/50 rounded-[18px] mb-6 focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(27,94,32,0.1)] transition-all shadow-sm"',
  'type="text" placeholder="Rechercher': 'type="text" className="flex-1 bg-transparent border-none outline-none text-base font-semibold text-foreground placeholder:text-muted-foreground" placeholder="Rechercher',
  'className={`nv-scan-toggle ${scanMode ? \'active\' : \'\'}`}': 'className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${scanMode ? \'bg-primary/10 text-primary\' : \'bg-muted hover:bg-muted/80\'}`}',
  'className={`nv-scan-pulse ${scanMode ? \'active\' : \'\'}`}': 'className={`relative flex items-center justify-center ${scanMode ? \'animate-pulse\' : \'\'}`}',
  'className="nv-products-grid"': 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-4"',
  'className={`nv-product-card ${p.stock <= p.stockAlerte ? \'low-stock\' : \'\'}`}': 'className={`bg-card border rounded-[20px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all flex flex-col cursor-pointer ${p.stock <= p.stockAlerte ? \'border-destructive/30\' : \'border-border/50 hover:border-primary/20\'}`}',
  'className="nv-product-avatar"': 'className="w-11 h-11 flex items-center justify-center bg-muted text-primary rounded-[14px] shrink-0"',
  'className="nv-product-info"': 'className="flex-1"',
  'className={`nv-stock-badge ${p.stock <= p.stockAlerte ? \'danger\' : \'success\'}`}': 'className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase ${p.stock <= p.stockAlerte ? \'bg-destructive/10 text-destructive\' : \'bg-primary/10 text-primary\'}`}',
  'className="nv-product-price"': 'className="text-xl font-extrabold text-primary my-4 font-mono"',
  'className="nv-fractions"': 'className="flex flex-wrap gap-2 mt-auto"',
  'className="nv-fraction-btn"': 'className="flex-1 min-w-[90px] p-2 bg-muted/50 border border-border rounded-xl text-xs font-bold hover:border-secondary hover:text-secondary transition-colors"',
  'className="nv-add-btn"': 'className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-extrabold shadow-[0_4px_12px_rgba(27,94,32,0.2)] hover:scale-[1.02] transition-transform"',
  'className="nv-empty-state"': 'className="col-span-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground"',
  'className="nv-cart-section"': 'className="p-5 md:p-8 xl:pl-0 h-full"',
  'className="nv-cart-card"': 'className="bg-card border border-border rounded-[24px] shadow-lg xl:sticky top-6 flex flex-col max-h-[calc(100vh-48px)] xl:max-h-[calc(100vh-120px)] overflow-hidden"',
  'className="nv-cart-header"': 'className="p-5 px-6 bg-muted/40 border-b border-border flex justify-between items-center shrink-0"',
  'className="nv-cart-count"': 'className="w-7 h-7 flex items-center justify-center bg-primary text-white rounded-full text-xs font-bold"',
  'className="nv-cart-items"': 'className="flex-1 overflow-y-auto py-2"',
  'className="nv-cart-item"': 'className="px-6 py-4 flex items-center gap-4 border-b border-muted/50 hover:bg-muted/30 transition-colors"',
  'className="nv-item-info"': 'className="flex flex-col"',
  'className="nv-item-controls"': 'className="flex items-center"',
  'className="nv-fraction-tag"': 'className="px-2 py-0.5 bg-secondary/10 text-yellow-700 rounded-md text-[0.7rem] font-extrabold"',
  'className="nv-qty-btn"': 'className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-all shadow-sm"',
  'className="nv-cart-total"': 'className="p-6 bg-gray-900 text-white flex justify-between items-center shrink-0"',
  'className="nv-total-amount"': 'className="text-[1.5rem] font-extrabold font-mono text-secondary"',
  'className="nv-select-wrap"': 'className="relative"',
  '<select ': '<select className="w-full flex h-10 items-center justify-between rounded-xl border border-input bg-card px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none" ',
  '<FiChevronDown size={14} />': '<FiChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />',
  'className="nv-payment-modes"': 'className="flex gap-2 p-4 px-6 shrink-0"',
  'className={`nv-pay-btn ${modePaiement === m.key ? \'active\' : \'\'}`}': 'className={`flex-1 flex justify-center items-center gap-2 p-3 rounded-xl border font-extrabold transition-all ${modePaiement === m.key ? \'bg-primary text-white border-transparent shadow-[0_4px_12px_rgba(27,94,32,0.2)]\' : \'border-border text-foreground hover:bg-muted\'}`}',
  'className="nv-input"': 'className="flex w-full items-center justify-between rounded-xl border border-input bg-card px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"',
  'className="nv-submit-btn"': 'className="mx-6 mb-6 p-4 bg-gradient-to-br from-[#D32F2F] to-[#b71c1c] text-white rounded-2xl font-extrabold text-lg shadow-[0_8px_24px_rgba(211,47,47,0.2)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(211,47,47,0.3)] transition-all flex justify-center items-center shrink-0"',
  'className="nv-toast-card"': 'className="bg-card p-4 rounded-xl shadow-lg border border-border"',
  'className="nv-toast-actions"': 'className="flex gap-2 mt-3"',
  'className="nv-btn-sm primary"': 'className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"',
  'className="nv-btn-sm"': 'className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-bold rounded-lg hover:bg-muted/80 transition-colors"'
};

for (const [key, value] of Object.entries(classesMap)) {
  content = content.replaceAll(key, value);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Restructured CSS -> Tailwind successfully for NouvelleVente.jsx!');
