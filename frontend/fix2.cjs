const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/ProduitForm.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
const importTarget = "import BarcodeScannerInput from '../features/products/components/BarcodeScannerInput';\nimport './ProduitForm.css';";
const importReplacement = `import BarcodeScannerInput from '../features/products/components/BarcodeScannerInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';`;
content = content.replace(importTarget, importReplacement);

// 2. The entire pf-page div replacement using regex to capture everything from <div className="pf-page"> to the end of the file.
// BUT it's safer to just replace specific components.

const replacements = [
  {
    from: `<div className="pf-page">`,
    to: `<div className="min-h-screen font-sans bg-background pb-12">`
  },
  {
    from: `<div className="pf-header">`,
    to: `<div className="relative px-6 md:px-10 py-8 border-b border-border overflow-hidden bg-card">`
  },
  {
    from: `<div className="pf-header-bg" />`,
    to: `<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pointer-events-none" />`
  },
  {
    from: `<div className="pf-header-content">`,
    to: `<div className="relative z-10 flex items-center justify-between gap-6">`
  },
  {
    from: `<div className="pf-header-left">`,
    to: `<div className="flex items-center gap-4">`
  },
  {
    from: `<button type="button" className="pf-back-btn" onClick={() => navigate(getExitPath())}>\n              <FiArrowLeft size={18} />\n            </button>`,
    to: `<Button variant="outline" size="icon" className="w-10 h-10 rounded-xl shrink-0" onClick={() => navigate(getExitPath())}>\n              <FiArrowLeft size={18} />\n            </Button>`
  },
  {
    from: `<div className="pf-header-icon">\n              <FiPackage size={22} />\n            </div>`,
    to: `<div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-[0_6px_20px_rgba(27,94,32,0.25)] shrink-0">\n              <FiPackage size={22} />\n            </div>`
  },
  {
    from: `<h1>{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h1>\n              <p>{isEdit ? 'Mettez à jour les informations de votre produit' : 'Ajoutez un nouveau produit à votre catalogue'}</p>`,
    to: `<h1 className="text-2xl font-extrabold tracking-tight text-foreground m-0 leading-tight">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</h1>\n              <p className="text-sm font-medium text-muted-foreground m-0">{isEdit ? 'Mettez à jour les informations de votre produit' : 'Ajoutez un nouveau produit à votre catalogue'}</p>`
  },
  {
    from: `<form onSubmit={handleSubmit} className="pf-form-layout">`,
    to: `<form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-7 px-6 md:px-10 py-8 items-start max-w-7xl mx-auto">`
  },
  {
    from: `<div className="pf-main">`,
    to: `<div className="flex flex-col gap-6 min-w-0">`
  }
];

for (const rep of replacements) {
  content = content.replace(rep.from, rep.to);
}

// We will avoid rewriting Card logic to keep HTML trees identical, but we'll inject tailwind classes onto the section divs instead!
// This prevents mismatched tag errors entirely.

const classesMap = {
  'className="pf-section"': 'className="bg-card shadow-sm border border-border overflow-hidden rounded-2xl"',
  'className="pf-section pf-section-fractions"': 'className="bg-card shadow-sm border border-border overflow-hidden rounded-2xl"',
  'className="pf-section-header"': 'className="flex flex-row items-center gap-3.5 border-b border-border/50 bg-muted/20 px-6 py-5"',
  'className="pf-section-body"': 'className="p-6 space-y-6"',
  'className="pf-row"': 'className="grid grid-cols-1 md:grid-cols-2 gap-5"',
  'className="pf-row-3"': 'className="grid grid-cols-1 md:grid-cols-3 gap-5"',
  'className="pf-field"': 'className="space-y-2"',
  'className="pf-field" style={{ flex: 2 }}': 'className="space-y-2 col-span-1 md:col-span-2"',
  'className="pf-section-icon blue"': 'className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0"',
  'className="pf-section-icon green"': 'className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary/10 text-secondary shrink-0"',
  'className="pf-section-icon amber"': 'className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 shrink-0"',
  'className="pf-section-icon purple"': 'className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0"',
  '<h2>': '<h2 className="text-base font-bold m-0 text-foreground">',
  '<p>Nom,': '<p className="text-xs text-muted-foreground mt-0.5">Nom,',
  '<p>Utilisez': '<p className="text-xs text-muted-foreground mt-0.5">Utilisez',
  '<p>{isAutomaticMode ? \'Saisissez': '<p className="text-xs text-muted-foreground mt-0.5">{isAutomaticMode ? \'Saisissez',
  '<p>{isAutomaticMode ? \'Le système': '<p className="text-xs text-muted-foreground mt-0.5">{isAutomaticMode ? \'Le système',
  'className="pf-req"': 'className="text-destructive font-bold"',
  '<span className="pf-input-suffix">': '<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">',
  'className="pf-hint"': 'className="block text-xs font-medium text-muted-foreground mt-1"',
  'className="pf-sidebar"': 'className="flex flex-col gap-5 sticky top-8"',
  'className="pf-sidebar-card pf-actions-card"': 'className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col"',
  'className="pf-sidebar-card pf-preview-card"': 'className="bg-card border border-border rounded-2xl p-6 shadow-sm"',
  '<h3>': '<h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">',
  'className="pf-btn-save"': 'className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-br from-[#E8623A] to-[#F4A020] text-white rounded-xl font-bold shadow-[0_4px_16px_rgba(211,47,47,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(211,47,47,0.3)] transition-all disabled:opacity-50 disabled:transform-none"',
  'className="pf-btn-cancel"': 'className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2.5 bg-muted border border-border rounded-xl text-muted-foreground font-semibold hover:bg-muted/80 hover:text-foreground transition-all"',
  'className="pf-preview-body"': 'className="flex flex-col gap-3"',
  'className="pf-preview-name"': 'className="text-[1.05rem] font-bold text-foreground leading-snug"',
  'className="pf-preview-cat"': 'className="inline-block px-2.5 py-0.5 bg-accent/10 text-primary rounded-full text-xs font-semibold w-fit"',
  'className="pf-preview-meta"': 'className="flex flex-wrap gap-2"',
  'className="pf-input-with-icon"': 'className="relative"',
  'className="pf-unite-base-grid"': 'className="grid grid-cols-2 lg:grid-cols-3 gap-2.5"',
  'className={`pf-unite-base-option': 'className={`flex flex-col items-start p-3 border rounded-xl text-left transition-all hover:bg-accent/5 focus:ring-2 focus:ring-ring ${',
  ' ? \'active\' : \'\'}`': ' ? \'border-primary bg-primary/5 ring-1 ring-primary\' : \'border-input bg-card\'}`',
  'className="pf-stock-guide"': 'className="flex gap-3 p-3.5 bg-gradient-to-br from-amber-400/10 to-amber-500/5 border border-amber-500/15 rounded-xl mb-5 items-start"',
  'className="pf-fractions-info"': 'className="flex gap-3 p-3.5 bg-gradient-to-br from-amber-400/10 to-violet-500/5 border border-amber-500/15 rounded-xl mb-5 items-start"',
  'className="pf-stock-preview"': 'className="flex gap-2.5 p-3.5 bg-primary/5 border border-primary/15 rounded-xl text-sm text-foreground"',
  'className="pf-stock-equiv"': 'className="text-muted-foreground font-medium"',
  'className="pf-add-fraction-btn"': 'className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 border border-secondary/20 rounded-lg text-secondary text-xs font-bold hover:bg-secondary/15 transition-all"',
  'className="pf-suggestions"': 'className="mb-4"',
  'className="pf-suggestions-label"': 'className="text-xs font-bold text-muted-foreground block mb-2"',
  'className="pf-suggestions-list"': 'className="flex flex-wrap gap-2"',
  'className="pf-suggestion-btn"': 'className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-full text-xs font-semibold hover:bg-muted transition-all"',
  'className="pf-fractions-list"': 'className="flex flex-col gap-2"',
  'className="pf-fraction-header-row"': 'className="grid grid-cols-1 md:grid-cols-[1.5fr_1.8fr_1.5fr_40px] gap-2 px-1 text-[0.7rem] font-bold text-muted-foreground uppercase tracking-widest hidden md:grid"',
  'className="pf-fraction-row"': 'className="grid grid-cols-1 md:grid-cols-[1.5fr_1.8fr_1.5fr_40px] gap-2 items-start bg-muted/30 md:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none border md:border-none border-border"',
  'className="pf-fraction-contenance"': 'className="flex flex-col gap-1"',
  'className="pf-fraction-hint"': 'className="text-[0.7rem] font-bold text-primary pl-1 opacity-85"',
  'className="pf-fraction-prix"': 'className="flex flex-col gap-1"',
  'className="pf-fraction-delete"': 'className="w-9 h-9 flex items-center justify-center bg-destructive/10 border border-destructive/20 rounded-lg text-destructive/50 hover:bg-destructive/20 hover:text-destructive transition-all"',
  'className="pf-fractions-empty"': 'className="text-center py-8 px-4 text-muted-foreground flex flex-col items-center"',
  'className={`pf-marge-indicator ${': 'className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium mt-2 border ${',
  ' ? \'positive\' : Number(marge) < 0 ? \'negative\' : \'neutral\'}`': ' ? \'bg-green-600/10 border-green-600/20 text-green-800\' : Number(marge) < 0 ? \'bg-red-600/10 border-red-600/20 text-red-700\' : \'bg-gray-500/10 border-gray-500/20 text-gray-600\'}`',
};

for (const [key, value] of Object.entries(classesMap)) {
  content = content.replaceAll(key, value);
}

// We will keep inputs as standard <input> tags but style them immediately with tailwind.
// This prevents `<Input>` tags breaking if they are self-closed in original code or missing Shadcn.
const inputTailwind = 'className="flex w-full items-center justify-between rounded-xl border border-input bg-card px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all"';

content = content.replaceAll('<input\n', `<input\n  ${inputTailwind}\n`);
content = content.replaceAll('<select ', `<select ${inputTailwind} `);
content = content.replaceAll('<textarea\n', `<textarea\n  ${inputTailwind}\n`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Restructured CSS -> Tailwind successfully without breaking standard HTML syntax!');
