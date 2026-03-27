const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/Landing.jsx');
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import '\.\/Landing\.css';\r?\n?/, '');
  
  const classesMap = {
    'className="landing"': 'className="relative overflow-x-clip bg-[#FFFAF0] text-[#1a1a1a] font-sans before:absolute before:rounded-full before:pointer-events-none before:blur-[36px] before:opacity-45 before:w-[320px] before:h-[320px] before:top-32 before:-right-[120px] before:bg-[rgba(211,47,47,0.1)] after:absolute after:rounded-full after:pointer-events-none after:blur-[36px] after:opacity-45 after:w-[260px] after:h-[260px] after:bottom-64 after:-left-[90px] after:bg-[rgba(27,94,32,0.08)]"',
    'className="kente-strip"': 'className="flex h-1.5 w-full"',
    'className="landing-container"': 'className="w-[min(1180px,calc(100%-2rem))] mx-auto"',
    'className={`landing-nav ${scrolled ? \'nav-scrolled\' : \'\'}`}' : 'className={`fixed inset-x-0 top-0 z-[60] py-4 transition-all duration-300 ${scrolled ? \'py-2.5 bg-white/80 backdrop-blur-md border-b border-slate-400/10\' : \'\'}`}',
    'className="landing-container nav-inner"': 'className="w-[min(1180px,calc(100%-2rem))] mx-auto flex items-center justify-between gap-8 min-h-[72px] relative z-10"',
    'className="nav-brand"': 'className="inline-flex items-center gap-3 text-[1.02rem] font-bold text-[#1a1a1a] relative z-20"',
    'className="brand-logo"': 'className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#D32F2F] to-[#FFD600] text-white font-extrabold shadow-[0_14px_28px_rgba(27,94,32,0.2)]"',
    'className="brand-logo brand-logo-light"': 'className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#D32F2F] to-[#FFD600] text-white font-extrabold shadow-[0_14px_28px_rgba(27,94,32,0.15)]"',
    'className={`nav-links ${mobileMenu ? \'nav-open\' : \'\'}`}' : 'className={`flex items-center gap-6 max-md:fixed max-md:inset-x-0 max-md:top-[72px] max-md:flex-col max-md:bg-white max-md:p-6 max-md:shadow-lg max-md:transition-all max-md:duration-300 ${mobileMenu ? \'max-md:opacity-100 max-md:translate-y-0\' : \'max-md:opacity-0 max-md:-translate-y-4 max-md:pointer-events-none\'}`}',
    'className="nav-cta-group"': 'className="flex items-center gap-3 ml-2 flex-wrap"',
    'className="nav-btn-ghost"': 'className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[0.9rem] font-semibold bg-transparent border border-[#1a1a2e]/10 text-[#1a1a1a] transition-all hover:-translate-y-0.5"',
    'className="nav-btn-primary"': 'className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[0.9rem] font-semibold bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white shadow-[0_16px_28px_rgba(211,47,47,0.2)] transition-all hover:-translate-y-0.5"',
    'className="nav-mobile-toggle"': 'className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center border border-slate-400/20 bg-white/90 backdrop-blur-md shadow-sm text-[#1a1a1a] transition-all hover:bg-white hover:border-[#D32F2F]/20 cursor-pointer"',
    'className="hero"': 'className="relative overflow-hidden pt-36 pb-20 bg-white"',
    'className="landing-container hero-inner"': 'className="w-[min(1180px,calc(100%-2rem))] mx-auto grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center"',
    'className="hero-badge"': 'className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/10 text-[#D32F2F] text-[0.82rem] font-bold mb-5"',
    '<h1>': '<h1 className="text-[clamp(2.8rem,5vw,4.8rem)] leading-[1.02] tracking-tight max-w-[11ch] mb-4 font-extrabold">',
    'className="hero-gradient-text"': 'className="bg-clip-text text-transparent bg-gradient-to-br from-[#FFD600] to-[#D32F2F]"',
    'className="hero-desc"': 'className="max-w-[58ch] text-[#5e5b56] text-[1.08rem] leading-[1.75]"',
    'className="hero-actions"': 'className="flex flex-wrap gap-4 my-7"',
    'className="btn-primary-lg"': 'className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white shadow-[0_14px_28px_rgba(211,47,47,0.22)] transition-all hover:-translate-y-0.5"',
    'className="btn-ghost-lg"': 'className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold bg-transparent border border-[#1a1a2e]/20 text-[#1a1a1a] transition-all hover:-translate-y-0.5"',
    'className="hero-stats"': 'className="flex items-center gap-6 mt-8 pt-7 border-t border-[#1a1a2e]/10 flex-wrap"',
    'className="hero-stat"': 'className="flex flex-col [&>strong]:text-[1.5rem] [&>strong]:font-extrabold [&>strong]:tracking-tight [&>strong]:text-[#1a1a1a] [&>span]:text-[0.82rem] [&>span]:text-[#5e5b56] [&>span]:mt-0.5"',
    'className="hero-stat-divider"': 'className="w-px h-9 bg-[#1a1a2e]/10 shrink-0 hidden sm:block"',
    'className="hero-app-preview"': 'className="rounded-3xl overflow-hidden border border-white/60 shadow-[0_28px_90px_rgba(27,94,32,0.16),0_0_0_1px_rgba(211,47,47,0.06)] bg-white/85 backdrop-blur-md"',
    'className="features"': 'className="relative py-20"',
    'className="showcase"': 'className="relative py-20"',
    'className="how-it-works"': 'className="relative py-20"',
    'className="pricing"': 'className="relative py-20"',
    'className="testimonials"': 'className="relative py-20"',
    'className="final-cta"': 'className="relative py-20"',
    'className="section-header"': 'className="max-w-[740px] mx-auto text-center mb-11"',
    'className="section-tag"': 'className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/10 text-[#D32F2F] text-[0.75rem] font-bold tracking-widest uppercase mb-4"',
    '<h2>': '<h2 className="text-[clamp(2rem,3vw,3rem)] leading-[1.1] tracking-tight mb-3 font-extrabold">',
    '<p>': '<p className="text-[1.05rem] text-slate-600 leading-[1.7] max-w-[48rem] mx-auto">',
    'className="features-grid"': 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"',
    'className="feature-card"': 'className="relative overflow-hidden p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/55 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all hover:-translate-y-1.5 hover:border-[#D32F2F]/20 hover:shadow-[0_18px_50px_rgba(27,94,32,0.1)] hover:bg-white/90 cursor-pointer"',
    'className="feature-icon"': 'className="w-14 h-14 rounded-[18px] flex items-center justify-center text-xl mb-4"',
    '<h3>': '<h3 className="text-[1.15rem] mb-2 tracking-tight font-extrabold">',
    'className="feature-line"': 'className="w-12 h-1 rounded-full mt-4"',
    'className="showcase-row"': 'className="flex gap-4 items-end justify-center flex-wrap"',
    'className={`showcase-screen ${activeScreen === i ? \'active\' : \'\'}`}' : 'className={`flex-1 min-w-0 max-w-[220px] flex flex-col items-center gap-3 p-0 bg-transparent border-none cursor-pointer transition-all duration-300 [&.active>div]:border-[#D32F2F] [&.active>div]:shadow-[0_16px_40px_rgba(232,98,58,0.2)] [&.active>div]:-translate-y-2 [&.active>span]:text-[#D32F2F] [&.active>span]:font-bold ${activeScreen === i ? \'active\' : \'\'}`}',
    'className="showcase-screen-img"': 'className="w-full rounded-2xl overflow-hidden border-2 border-[#1a1a2e]/10 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all duration-300 bg-white"',
    'className="showcase-screen-label"': 'className="text-[0.82rem] font-semibold text-[#5e5b56] transition-colors duration-300"',
    'className="steps-grid"': 'className="grid grid-cols-1 md:grid-cols-3 gap-5"',
    'className="step-card"': 'className="relative p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/55 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(27,94,32,0.1)]"',
    'className="step-number"': 'className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#D32F2F]/10 text-[#D32F2F] text-[0.9rem] font-extrabold mb-4"',
    'className="step-icon"': 'className="w-14 h-14 rounded-[18px] flex items-center justify-center bg-gradient-to-br from-[#D32F2F]/10 to-[#FFD600]/10 text-[#D32F2F] text-2xl mb-4"',
    'className="step-connector"': 'className="mt-4 w-16 h-1 rounded-full bg-gradient-to-r from-[#D32F2F]/35 to-[#FFD600]/10"',
    'className="pricing-grid"': 'className="grid grid-cols-1 md:grid-cols-3 gap-5"',
    'className={`pricing-card ${p.popular ? \'popular\' : \'\'}`}' : 'className={`relative p-7 rounded-[26px] bg-white/70 backdrop-blur-md border border-white/55 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(27,94,32,0.1)] cursor-pointer ${p.popular ? \'bg-[#1A1A2E] border-transparent shadow-[0_28px_90px_rgba(27,94,32,0.16)] -translate-y-2.5 text-white [&>div>h3]:text-white [&>div>.price-amount]:text-white [&>div>.pricing-desc]:text-slate-300 [&>div>.price-period]:text-slate-300 [&>ul>li]:text-slate-300 [&>ul>li>.check-icon]:text-[#4ade80]\' : \'\'}`}',
    'className="popular-ribbon"': 'className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white text-[0.74rem] font-bold uppercase tracking-widest"',
    'className="pricing-desc"': 'className="text-[#5e5b56] min-h-[46px]"',
    'className="pricing-price"': 'className="flex items-baseline gap-1.5 my-5"',
    'className="price-amount"': 'className="text-[2.6rem] leading-none font-extrabold tracking-tight"',
    'className="price-period"': 'className="text-[#5e5b56] text-[0.95rem]"',
    'className="pricing-features"': 'className="grid gap-3 mb-6"',
    '<li><FiCheck': '<li className="flex items-start gap-2.5 text-[#1a1a1a]"><FiCheck',
    'className="check-icon"': 'className="text-[#1B5E20] mt-1 shrink-0"',
    'className={`pricing-cta ${p.popular ? \'cta-solid\' : \'cta-outline\'}`}' : 'className={`inline-flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-full font-bold transition-all hover:-translate-y-0.5 ${p.popular ? \'bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white shadow-[0_18px_30px_rgba(211,47,47,0.22)]\' : \'bg-slate-50/5 border border-slate-400/20 text-[#1a1a1a]\'}`}',
    'className="testimonials-grid"': 'className="grid grid-cols-1 md:grid-cols-3 gap-5"',
    'className="testimonial-card"': 'className="relative p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/55 shadow-[0_10px_30px_rgba(27,94,32,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(27,94,32,0.1)]"',
    'className="testimonial-text"': 'className="text-[#5e5b56] leading-[1.8] mt-1.5 min-h-[128px]"',
    'className="testimonial-footer"': 'className="flex items-center gap-4 mt-5"',
    'className="testimonial-avatar"': 'className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#D32F2F] to-[#FFD600] text-white font-bold"',
    'className="testimonial-name"': 'className="font-bold tracking-tight"',
    'className="testimonial-role"': 'className="text-[#5e5b56] text-[0.86rem]"',
    'className="landing-container final-cta-inner"': 'className="w-[min(1180px,calc(100%-2rem))] mx-auto text-center"',
    'className="cta-actions"': 'className="flex flex-wrap items-center justify-center gap-4 mt-8"',
    'className="btn-cta-primary"': 'className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold bg-gradient-to-br from-[#D32F2F] to-[#F4A020] text-white shadow-[0_14px_28px_rgba(211,47,47,0.22)] transition-all hover:-translate-y-0.5"',
    'className="btn-cta-ghost"': 'className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold bg-transparent border border-[#1a1a2e]/20 text-[#1a1a1a] transition-all hover:-translate-y-0.5"',
    'className="landing-footer"': 'className="bg-[#FFFAF0] pt-16 pb-8 border-t border-slate-400/10"',
    'className="footer-top"': 'className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-12 mb-12"',
    'className="footer-brand"': 'className="flex flex-col gap-4"',
    'className="footer-social"': 'className="flex items-center gap-4 mt-2"',
    '<a href="#" aria-label="Globe"': '<a href="#" aria-label="Globe" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#D32F2F] hover:text-white transition-colors"',
    '<a href="mailto:ibrahimadiallo0899@gmail.com" aria-label="Mail"': '<a href="mailto:ibrahimadiallo0899@gmail.com" aria-label="Mail" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#D32F2F] hover:text-white transition-colors"',
    '<a href="tel:+221768815972" aria-label="Phone"': '<a href="tel:+221768815972" aria-label="Phone" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-[#D32F2F] hover:text-white transition-colors"',
    'className="footer-links"': 'className="grid grid-cols-2 md:grid-cols-3 gap-8"',
    'className="footer-col"': 'className="flex flex-col gap-3 [&>h4]:font-bold [&>h4]:mb-2 [&>a]:text-[#5e5b56] [&>a]:text-[0.95rem] [&>a]:font-medium hover:[&>a]:text-[#D32F2F] [&>a]:transition-colors"',
    'className="footer-bottom"': 'className="pt-8 border-t border-slate-400/10 flex flex-col md:flex-row items-center justify-between gap-4 text-[0.9rem] text-[#5e5b56]"',
    'className="footer-bottom-links"': 'className="flex gap-6 hover:[&>a]:text-[#D32F2F] [&>a]:font-medium"',
  };

  for (const [key, value] of Object.entries(classesMap)) {
    content = content.replaceAll(key, value);
  }
  
  let additionalReplaces = [
    ['<div className="landing-container">', '<div className="w-[min(1180px,calc(100%-2rem))] mx-auto">'],
    ['<ul className="pricing-features">', '<ul className="grid gap-3 mb-6">'],
    ['<p className="text-[#5e5b56] min-h-[46px]">', '<p className="text-[#5e5b56] min-h-[46px] text-sm">'],
  ];
  for (let [find, replace] of additionalReplaces) {
    content = content.replaceAll(find, replace);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Refactored Landing.jsx');
}
