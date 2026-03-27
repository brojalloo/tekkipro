const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/ProduitForm.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Imports
const importTarget = "import BarcodeScannerInput from '../features/products/components/BarcodeScannerInput';\nimport './ProduitForm.css';";
const importReplacement = `import BarcodeScannerInput from '../features/products/components/BarcodeScannerInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';`;
content = content.replace(importTarget, importReplacement);

// 2. Global replacements for simple elements
content = content.replaceAll('<div className="pf-page">', '<div className="min-h-screen font-sans bg-background pb-12">');
content = content.replaceAll('<div className="pf-header">',
  '<div className="relative px-6 md:px-10 py-8 border-b border-border overflow-hidden bg-card">');
content = content.replaceAll('<div className="pf-header-bg" />',
  '<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 pointer-events-none" />');
content = content.replaceAll('<div className="pf-header-content">',
  '<div className="relative z-10 flex items-center justify-between gap-6">');
content = content.replaceAll('<div className="pf-header-left">',
  '<div className="flex items-center gap-4">');
content = content.replaceAll('<button type="button" className="pf-back-btn"',
  '<Button variant="outline" size="icon" className="w-10 h-10 rounded-xl shrink-0"');
content = content.replaceAll('<div className="pf-header-icon">',
  '<div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-[0_6px_20px_rgba(27,94,32,0.25)] shrink-0">');
content = content.replaceAll(/<div className="pf-header-icon">[\s\S]*?<\/div>/.source, '<div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-[0_6px_20px_rgba(27,94,32,0.25)] shrink-0">\n            <FiPackage size={22} />\n          </div>');

// Headers rewriting
content = content.replaceAll('<h1>{isEdit ? \'Modifier le produit\' : \'Nouveau produit\'}</h1>',
  '<h1 className="text-2xl font-extrabold tracking-tight text-foreground m-0 leading-tight">{isEdit ? \'Modifier le produit\' : \'Nouveau produit\'}</h1>');
content = content.replaceAll('<p>{isEdit ? \'Mettez à jour les informations de votre produit\' : \'Ajoutez un nouveau produit à votre catalogue\'}</p>',
  '<p className="text-sm font-medium text-muted-foreground m-0">{isEdit ? \'Mettez à jour les informations de votre produit\' : \'Ajoutez un nouveau produit à votre catalogue\'}</p>');

// Form layout
content = content.replaceAll('<form onSubmit={handleSubmit} className="pf-form-layout">',
  '<form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-7 px-6 md:px-10 py-8 items-start max-w-7xl mx-auto">');
content = content.replaceAll('<div className="pf-main">',
  '<div className="flex flex-col gap-6 min-w-0">');

// Sections to Cards
content = content.replaceAll('<div className="pf-section">', '<Card className="shadow-sm border-border overflow-hidden rounded-2xl">');
content = content.replaceAll('<div className="pf-section pf-section-fractions">', '<Card className="shadow-sm border-border overflow-hidden rounded-2xl">');

content = content.replaceAll('<div className="pf-section-header">',
  '<CardHeader className="flex flex-row items-center gap-3.5 border-b border-border/50 bg-muted/20 px-6 py-5">');
content = content.replaceAll('<div className="pf-section-body">',
  '<CardContent className="p-6 space-y-6">');

// Fields and Rows
content = content.replaceAll('<div className="pf-row">',
  '<div className="grid grid-cols-1 md:grid-cols-2 gap-5">');
content = content.replaceAll('<div className="pf-row-3">',
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-5">');
content = content.replaceAll('<div className="pf-field">',
  '<div className="space-y-2">');
content = content.replaceAll('<div className="pf-field" style={{ flex: 2 }}>',
  '<div className="space-y-2 col-span-1 md:col-span-2">');

// Labels
content = content.replace(/<label>\s*(?:<Fi[^>]+>\s*)?([\s\S]*?)<\/label>/g, (match, inner) => {
  let req = '';
  if (inner.includes('<span className="pf-req">*</span>')) {
     req = ' <span className="text-destructive font-bold">*</span>';
     inner = inner.replace('<span className="pf-req">*</span>', '');
  }
  // keep the icon if present by taking the original and extracting icon
  let iconMatch = match.match(/<Fi[^>]+>/);
  let icon = iconMatch ? iconMatch[0] + ' ' : '';
  let text = inner.replace(/<Fi[^>]+>/, '').trim();
  return `<Label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">${icon}${text}${req}</Label>`;
});

// Inputs, Select, Textarea
content = content.replace(/<input\s+([^>]*)type="text"([^>]*)>/g, '<Input type="text" $1$2 />');
content = content.replace(/<input\s+([^>]*)type="number"([^>]*)>/g, '<Input type="number" $1$2 />');
content = content.replace(/<textarea\s+([^>]*)>/g, '<Textarea $1 className="min-h-[80px]" >');
content = content.replaceAll('<select ', '<select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" ');

// Icons in section headers
content = content.replaceAll('<div className="pf-section-icon blue">', '<div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">');
content = content.replaceAll('<div className="pf-section-icon green">', '<div className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary/10 text-secondary shrink-0">');
content = content.replaceAll('<div className="pf-section-icon amber">', '<div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 shrink-0">');
content = content.replaceAll('<div className="pf-section-icon purple">', '<div className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">');

content = content.replaceAll('<h2>', '<CardTitle className="text-base m-0">');
content = content.replaceAll('</h2>', '</CardTitle>');
content = content.replace(/<p>([\s\S]*?)<\/p>\s*<\/div>/g, '<CardDescription className="text-xs mt-0.5">$1</CardDescription></div>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('ProduitForm.jsx refactored successfully.');
