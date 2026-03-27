const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Fournisseurs.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import '\.\/Fournisseurs\.css';\r?\n?/, '');

const classesMap = {
  'className="frn-page"': 'className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col font-sans pb-10"',
  'className="frn-loading"': 'className="flex flex-col items-center justify-center min-h-[60vh] gap-4"',
  'className="frn-loading-spinner"': 'className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin"',
  'className="frn-header"': 'className="relative p-8 md:p-10 overflow-hidden border-b border-border/60 bg-gradient-to-b from-white/95 to-slate-50/90 shadow-sm"',
  'className="frn-header-bg"': 'className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(27,94,32,0.04)_0%,rgba(255,214,0,0.02)_50%,rgba(211,47,47,0.01)_100%)]"',
  'className="frn-header-content"': 'className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6"',
  'className="frn-header-left"': 'className="flex items-center gap-5"',
  'className="frn-header-icon"': 'className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-2xl shadow-lg shadow-primary/20 shrink-0"',
  '<h1>Fournisseurs</h1>': '<h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight m-0 leading-tight">Fournisseurs</h1>',
  '<p>Gérez vos fournisseurs et leurs informations</p>': '<p className="text-[0.85rem] font-bold text-muted-foreground mt-1 mb-0">Gérez vos fournisseurs et leurs informations</p>',
  'className="frn-btn-add"': 'className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-[#D32F2F] to-[#b71c1c] text-white rounded-[16px] text-[0.95rem] font-extrabold shadow-lg shadow-accent/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 transition-all"',
  'className="frn-stats"': 'className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-6 md:p-8 pb-0"',
  'className="frn-stat-card"': 'className="relative flex items-center gap-4 p-5 bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[22px] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden"',
  'className="frn-stat-icon blue"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-primary/10 text-primary"',
  'className="frn-stat-icon green"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#d4af37]/10 text-[#d4af37]"',
  'className="frn-stat-icon purple"': 'className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-accent/10 text-accent"',
  'className="frn-stat-info"': 'className="flex flex-col min-w-0"',
  'className="frn-stat-value"': 'className="text-[1.25rem] font-extrabold text-foreground tracking-tight truncate"',
  'className="frn-stat-label"': 'className="text-[0.8rem] font-bold text-muted-foreground truncate"',
  'className="frn-toolbar"': 'className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 pb-0"',
  'className="frn-search"': 'className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 bg-muted/30 border border-border/80 rounded-2xl md:min-w-[360px] focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgba(27,94,32,0.08)] transition-all"',
  'type="text"\n            placeholder="Rechercher un fournisseur..."': 'type="text"\n            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground w-full p-2 py-1.5"\n            placeholder="Rechercher un fournisseur..."',
  'className="frn-result-count"': 'className="text-[0.85rem] font-bold text-muted-foreground"',
  'className="frn-content"': 'className="p-6 md:p-8"',
  'className="frn-table-card"': 'className="bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[24px] shadow-sm overflow-x-auto"',
  'className="frn-table"': 'className="w-full text-left border-collapse min-w-[800px]"',
  '<thead>\n              <tr>': '<thead className="bg-muted/30 border-b border-border">\n              <tr>',
  '<th>Fournisseur</th>': '<th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Fournisseur</th>',
  '<th>Contact</th>': '<th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Contact</th>',
  '<th>Adresse</th>': '<th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Adresse</th>',
  '<th>Produits</th>': '<th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Produits</th>',
  '<th>Entrées</th>': '<th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Entrées</th>',
  '<th>Actions</th>': '<th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Actions</th>',
  '<tr key={f.id}>': '<tr key={f.id} className="hover:bg-muted/50 transition-colors">',
  '<td>': '<td className="px-6 py-4 border-b border-muted/50 align-middle">',
  'className="frn-name-cell"': 'className="flex items-center gap-4"',
  'className="frn-avatar"': 'className="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary rounded-full font-bold shrink-0"',
  '<strong>{f.nom}</strong>': '<strong className="text-[0.95rem] font-extrabold text-foreground block">{f.nom}</strong>',
  'className="frn-contact-cell"': 'className="flex flex-col gap-1.5"',
  'className="frn-contact-item"': 'className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted-foreground"',
  'className="frn-address"': 'className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-muted-foreground"',
  'className="frn-muted"': 'className="text-muted-foreground/50"',
  'className="frn-count-badge blue"': 'className="inline-flex items-center justify-center px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold min-w-[1.75rem]"',
  'className="frn-count-badge green"': 'className="inline-flex items-center justify-center px-2.5 py-0.5 bg-[#d4af37]/10 text-[#d4af37] rounded-full text-xs font-bold min-w-[1.75rem]"',
  'className="frn-actions"': 'className="flex gap-2"',
  'className="frn-action-btn edit"': 'className="w-9 h-9 flex items-center justify-center border border-border rounded-xl bg-card shadow-sm text-muted-foreground transition-all hover:bg-primary/10 hover:border-primary/20 hover:text-primary"',
  'className="frn-action-btn delete"': 'className="w-9 h-9 flex items-center justify-center border border-border rounded-xl bg-card shadow-sm text-muted-foreground transition-all hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive"',
  'className="frn-empty"': 'className="flex flex-col items-center justify-center py-16 text-muted-foreground/50"',
  '<p>Aucun fournisseur trouvé</p>': '<p className="text-[1.05rem] font-extrabold text-muted-foreground mt-4 mb-1">Aucun fournisseur trouvé</p>',
  '<span>Ajoutez votre premier fournisseur</span>': '<span className="text-[0.85rem] font-medium">Ajoutez votre premier fournisseur</span>',
  'className="frn-modal-overlay"': 'className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"',
  'className="frn-modal"': 'className="bg-card border border-border/60 rounded-[24px] w-full max-w-[520px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"',
  'className="frn-modal-header"': 'className="flex items-center gap-4 p-6 border-b border-border/50"',
  'className="frn-modal-icon"': 'className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-lg shadow-primary/20 shrink-0"',
  '<h3>{editing ? \'Modifier le fournisseur\' : \'Nouveau fournisseur\'}</h3>': '<h3 className="text-xl font-extrabold text-foreground m-0">{editing ? \'Modifier le fournisseur\' : \'Nouveau fournisseur\'}</h3>',
  '<p>{editing ? \'Modifiez les informations\' : \'Ajoutez un nouveau partenaire\'}</p>': '<p className="text-sm font-medium text-muted-foreground m-0">{editing ? \'Modifiez les informations\' : \'Ajoutez un nouveau partenaire\'}</p>',
  'className="frn-modal-close"': 'className="w-9 h-9 flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors shrink-0"',
  'className="frn-modal-body"': 'className="p-6 flex flex-col gap-5"',
  'className="frn-modal-row"': 'className="grid grid-cols-1 sm:grid-cols-2 gap-5"',
  'className="frn-field"': 'className="flex flex-col gap-2"',
  '<label><FiUser size={14} /> Nom <span className="frn-req">*</span></label>': '<label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiUser className="text-muted-foreground" size={14} /> Nom <span className="text-destructive">*</span></label>',
  '<label><FiPhone size={14} /> Téléphone</label>': '<label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiPhone className="text-muted-foreground" size={14} /> Téléphone</label>',
  '<label><FiMail size={14} /> Email</label>': '<label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiMail className="text-muted-foreground" size={14} /> Email</label>',
  '<label><FiMapPin size={14} /> Adresse</label>': '<label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiMapPin className="text-muted-foreground" size={14} /> Adresse</label>',
  '<input value={form.nom}': '<input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.nom}',
  '<input value={form.telephone}': '<input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.telephone}',
  '<input type="email" value={form.email}': '<input type="email" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.email}',
  '<input value={form.adresse}': '<input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.adresse}',
  'className="frn-modal-footer"': 'className="flex items-center justify-end gap-3 p-6 border-t border-border/50 bg-muted/10"',
  'className="frn-btn-cancel"': 'className="px-5 py-2.5 bg-white border border-border rounded-xl text-foreground font-bold hover:bg-muted/50 transition-colors"',
  'className="frn-btn-save"': 'className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-br from-accent to-[#b71c1c] text-white rounded-xl font-bold shadow-md shadow-accent/20 hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none"',
  'className="frn-spinner"': 'className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"',
};

for (const [key, value] of Object.entries(classesMap)) {
  content = content.replaceAll(key, value);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fournisseurs JSX restructured for Tailwind successfully!');
