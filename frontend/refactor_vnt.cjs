const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Ventes.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import '\.\/Ventes\.css';\r?\n?/, '');

const classesMap = {
  'className="vnt-page"': 'className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans"',
  'className="vnt-loading"': 'className="flex flex-col items-center justify-center min-h-[60vh] gap-4"',
  'className="vnt-loading-spinner"': 'className="w-10 h-10 border-[3px] border-muted border-t-primary rounded-full animate-spin"',
  'className="vnt-header"': 'className="relative p-8 overflow-hidden border border-border/80 rounded-[28px] bg-gradient-to-b from-white/98 to-slate-50/96 shadow-sm"',
  'className="vnt-header-bg"': 'className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(27,94,32,0.12)_0%,transparent_34%),linear-gradient(135deg,rgba(27,94,32,0.05)_0%,rgba(211,47,47,0.04)_50%,rgba(255,214,0,0.03)_100%)] pointer-events-none"',
  'className="vnt-header-content"': 'className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6"',
  'className="vnt-header-left"': 'className="flex items-center gap-5"',
  'className="vnt-header-icon"': 'className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-[0_6px_20px_rgba(27,94,32,0.25)] shrink-0"',
  '<h1>Ventes</h1>': '<h1 className="text-2xl font-extrabold text-foreground tracking-tight m-0 mb-0.5 leading-tight">Ventes</h1>',
  '<p>Historique et gestion des ventes</p>': '<p className="text-[0.85rem] font-medium text-muted-foreground m-0">Historique et gestion des ventes</p>',
  'className="vnt-stats"': 'className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"',
  'className="vnt-stat-card"': 'className="relative flex items-center gap-4 p-5 bg-gradient-to-b from-white/98 to-slate-50/96 border border-border/80 rounded-[22px] shadow-sm transition-all overflow-hidden hover:-translate-y-1 hover:shadow-md before:absolute before:top-0 before:left-[1.1rem] before:right-[1.1rem] before:h-[3px] before:rounded-full before:bg-gradient-to-r before:from-primary before:to-secondary"',
  'className="vnt-stat-icon blue"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-[#D32F2F]/10 text-[#D32F2F]"',
  'className="vnt-stat-icon green"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-[#1B6B3A]/10 text-[#1B6B3A]"',
  'className="vnt-stat-icon purple"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-primary/10 text-primary"',
  'className="vnt-stat-icon amber"': 'className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-amber-500/10 text-amber-500"',
  'className="vnt-stat-info"': 'className="flex flex-col min-w-0"',
  'className="vnt-stat-value"': 'className="text-[1.15rem] font-extrabold text-foreground tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"',
  'className="vnt-stat-value vnt-credit-val"': 'className="text-[1.15rem] font-extrabold text-amber-500 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"',
  'className="vnt-stat-label"': 'className="text-[0.76rem] font-semibold text-muted-foreground mt-0.5 max-w-[150px] truncate"',
  'className="vnt-toolbar"': 'className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-b from-white/98 to-slate-50/96 border border-border/80 rounded-[22px] shadow-sm"',
  'className="vnt-filters"': 'className="flex flex-col md:flex-row md:items-center gap-2"',
  'className="vnt-filter-field"': 'className="flex items-center gap-2 px-3 py-2.5 bg-slate-50/90 border border-border/80 rounded-xl transition-all shadow-inner focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(27,94,32,0.08)]"',
  'className="vnt-filter-btn"': 'className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#1B6B3A] to-[#124d29] text-white border-none rounded-xl text-[0.82rem] font-bold cursor-pointer transition-all shadow-[0_4px_14px_rgba(27,94,32,0.2)] whitespace-nowrap hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(27,94,32,0.3)]"',
  'className="vnt-search-group"': 'className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto mt-2 md:mt-0"',
  'className="vnt-search"': 'className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/90 border border-border/80 rounded-xl min-w-full md:min-w-[280px] transition-all shadow-inner focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(27,94,32,0.08)]"',
  'className="vnt-result-count"': 'className="text-[0.78rem] font-semibold text-muted-foreground whitespace-nowrap"',
  'className="vnt-content"': 'className="p-0"',
  'className="vnt-table-card"': 'className="bg-gradient-to-b from-white/98 to-slate-50/96 border border-border/80 rounded-3xl overflow-x-auto shadow-sm relative backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-gradient-to-r before:from-primary before:to-secondary"',
  'className="vnt-table"': 'className="w-full border-collapse min-w-[900px] text-left"',
  '<thead>': '<thead className="bg-gradient-to-b from-slate-50/98 to-slate-100/95 border-b border-border">',
  '<th scope="col">N° Vente</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider">N° Vente</th>',
  '<th scope="col">Date</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider">Date</th>',
  '<th scope="col">Client</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider">Client</th>',
  '<th scope="col">Vendeur</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider">Vendeur</th>',
  '<th scope="col">Produits</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider">Produits</th>',
  '<th scope="col">Total</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider">Total</th>',
  '<th scope="col">Paiement</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider">Paiement</th>',
  '<th scope="col">Statut</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider">Statut</th>',
  '<th scope="col">Actions</th>': '<th scope="col" className="px-5 py-3.5 text-[0.72rem] font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>',
  'className={v.statut === \'ANNULEE\' ? \'vnt-row-cancelled\' : v.statut === \'EN_CREDIT\' ? \'vnt-row-credit\' : \'\'}': 'className={`transition-all hover:bg-muted/50 border-b border-muted last:border-0 hover:translate-x-0.5 ${v.statut === \'ANNULEE\' ? \'bg-muted/40 opacity-[0.65] hover:bg-muted/60\' : v.statut === \'EN_CREDIT\' ? \'bg-amber-500/5 hover:bg-amber-500/10\' : \'\'}`}',
  '<th scope="row">': '<th scope="row" className="px-5 py-4 font-normal align-middle">',
  '<td>': '<td className="px-5 py-4 align-middle">',
  'className="vnt-numero"': 'className="font-extrabold text-foreground text-[0.82rem] bg-primary/10 px-2.5 py-1 rounded-lg"',
  'className="vnt-date-cell"': 'className="flex items-center gap-1.5 text-[0.8rem] text-muted-foreground"',
  'className="vnt-client-cell"': 'className="flex items-center gap-2 text-[0.85rem] font-semibold text-foreground"',
  'className="vnt-avatar"': 'className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-full text-[0.78rem] font-extrabold shrink-0 shadow-sm"',
  'className="vnt-vendeur-cell"': 'className="flex items-center gap-1.5 text-[0.82rem] text-muted-foreground"',
  'className="vnt-muted"': 'className="text-[0.82rem] text-muted-foreground"',
  'className="vnt-produits-cell"': 'className="flex flex-col gap-1"',
  'className="vnt-produit-line"': 'className="flex items-center gap-1.5 text-[0.78rem] text-muted-foreground"',
  ' className="vnt-produit-line"': ' className="flex items-center gap-1.5 text-[0.78rem] text-muted-foreground"',
  '<em className="vnt-fraction">': '<em className="italic text-amber-600 text-[0.75rem] font-semibold">',
  'className="vnt-montant"': 'className="font-extrabold text-[0.9rem] text-foreground tabular-nums"',
  'className={`vnt-badge ${v.modePaiement === \'CASH\' ? \'success\' : v.modePaiement === \'CREDIT\' ? \'danger\' : \'blue\'}`}': 'className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-bold whitespace-nowrap ${v.modePaiement === \'CASH\' ? \'bg-[#1B6B3A]/10 text-[#1B6B3A]\' : v.modePaiement === \'CREDIT\' ? \'bg-destructive/10 text-destructive\' : \'bg-[#D32F2F]/10 text-[#D32F2F]\'}`}',
  'className={`vnt-status ${v.statut === \'COMPLETEE\' ? \'completed\' : v.statut === \'EN_CREDIT\' ? \'credit\' : \'cancelled\'}`}': 'className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-bold whitespace-nowrap ${v.statut === \'COMPLETEE\' ? \'bg-[#1B6B3A]/10 text-[#1B6B3A]\' : v.statut === \'EN_CREDIT\' ? \'bg-amber-500/10 text-amber-600\' : \'bg-muted text-muted-foreground\'}`}',
  'className="vnt-actions"': 'className="flex flex-wrap items-center justify-end gap-1.5"',
  'className={`vnt-action-btn pdf ${!isPro ? \'locked\' : \'\'}`}': 'className={`w-[34px] h-[34px] flex items-center justify-center border rounded-xl cursor-pointer transition-all shadow-sm ${!isPro ? \'bg-slate-50 border-slate-200 text-muted-foreground hover:bg-slate-100\' : \'bg-white border-muted text-muted-foreground hover:bg-primary/10 hover:border-primary/20 hover:text-primary\'}`}',
  'className="vnt-action-btn cancel"': 'className="w-[34px] h-[34px] flex items-center justify-center border border-muted bg-white rounded-xl cursor-pointer transition-all shadow-sm text-muted-foreground hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive"',
  'className="vnt-empty"': 'className="flex flex-col items-center justify-center py-14 px-8 text-muted-foreground/60"',
  '<p>Aucune vente trouvée</p>': '<p className="text-[0.95rem] font-bold text-muted-foreground m-0 mt-3 mb-1">Aucune vente trouvée</p>',
  '<span>Modifiez vos filtres ou effectuez une nouvelle vente</span>': '<span className="text-[0.82rem] font-medium text-muted-foreground text-center">Modifiez vos filtres ou effectuez une nouvelle vente</span>',
  '<input type="text" placeholder="Rechercher (n°, client, vendeur)..."': '<input type="text" placeholder="Rechercher (n°, client, vendeur)..." className="border-none bg-transparent outline-none text-[0.82rem] font-medium text-foreground w-full placeholder:text-muted-foreground"',
  '<input type="date" value={filters.dateDebut}': '<input type="date" value={filters.dateDebut} className="border-none bg-transparent outline-none text-[0.82rem] font-medium text-foreground w-[120px]"',
  '<input type="date" value={filters.dateFin}': '<input type="date" value={filters.dateFin} className="border-none bg-transparent outline-none text-[0.82rem] font-medium text-foreground w-[120px]"',
  '<select value={filters.statut}': '<select value={filters.statut} className="border-none bg-transparent outline-none text-[0.82rem] font-medium text-foreground w-[120px]"'
};

for (const [key, value] of Object.entries(classesMap)) {
  content = content.replaceAll(key, value);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Ventes JSX restructured for Tailwind successfully!');
