const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/MobileLanding.jsx');
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import '\.\/MobileLanding\.css';\r?\n?/, '');
  
  const classesMap = {
    'className="ml-page"': 'className="relative overflow-x-clip bg-[#F8F6F3] text-[#1A1A2E] min-h-screen font-sans"',
    'className="ml-kente"': 'className="flex h-1.5 w-full"',
    'className="ml-container"': 'className="w-[min(1180px,calc(100%-2rem))] mx-auto"',
    'className={`ml-nav ${scrolled ? \'ml-nav-scrolled\' : \'\'}`}' : 'className={`fixed inset-x-0 top-0 z-[60] py-4 transition-all duration-300 ${scrolled ? \'py-2.5 bg-white/90 backdrop-blur-md border-b border-slate-400/10 shadow-sm\' : \'\'}`}',
    'className="ml-container ml-nav-inner"': 'className="w-[min(1180px,calc(100%-2rem))] mx-auto flex items-center justify-between gap-8 min-h-[64px]"',
    'className="ml-brand"': 'className="inline-flex items-center gap-3 font-bold text-[#1A1A2E]"',
    'className="ml-logo-bg"': 'className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B6B3A] to-[#F4A020] text-white font-extrabold text-[1.1rem] flex items-center justify-center shadow-[0_8px_20px_rgba(211,47,47,0.28)] shrink-0"',
    'className="ml-nav-badge"': 'className="px-2.5 py-1 rounded-full bg-[#1B6B3A]/10 border border-[#1B6B3A]/20 text-[#1B6B3A] text-[0.72rem] font-bold tracking-wide hidden sm:inline-flex"',
    'className={`ml-nav-links ${mobileMenu ? \'ml-nav-open\' : \'\'}`}' : 'className={`flex items-center gap-6 max-md:fixed max-md:inset-x-0 max-md:top-[64px] max-md:flex-col max-md:bg-white max-md:p-6 max-md:shadow-lg max-md:transition-all max-md:duration-300 ${mobileMenu ? \'max-md:opacity-100 max-md:translate-y-0\' : \'max-md:opacity-0 max-md:-translate-y-4 max-md:pointer-events-none\'}`}',
    'className="ml-nav-ctas"': 'className="flex items-center gap-3 ml-2 flex-wrap"',
    'className="ml-btn-ghost"': 'className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[0.88rem] font-semibold bg-[#1B6B3A]/5 border border-slate-400/20 text-[#1A1A2E] transition-all hover:-translate-y-0.5"',
    'className="ml-btn-primary"': 'className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[0.88rem] font-semibold bg-gradient-to-br from-[#1B6B3A] to-[#F4A020] text-white shadow-md transition-all hover:-translate-y-0.5"',
    'className="ml-nav-toggle"': 'className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center border border-slate-400/20 bg-white/90 backdrop-blur-md shadow-sm text-[#1A1A2E] transition-all hover:bg-white hover:border-[#1A1A2E]/20 cursor-pointer"',
    'className="ml-hero"': 'className="relative overflow-hidden pt-32 pb-16 bg-gradient-to-b from-[#0d1520] via-[#162030] to-[#F8F6F3] before:absolute before:w-[400px] before:h-[400px] before:-top-[120px] before:-left-[80px] before:rounded-full before:bg-[#1B6B3A]/20 before:blur-[60px] before:pointer-events-none after:absolute after:w-[300px] after:h-[300px] after:top-[60px] after:-right-[60px] after:rounded-full after:bg-[#F4A020]/15 after:blur-[50px] after:pointer-events-none"',
    'className="ml-container ml-hero-inner"': 'className="relative z-10 w-[min(1180px,calc(100%-2rem))] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center"',
    'className="ml-hero-left"': 'className="text-white"',
    'className="ml-hero-badge"': 'className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/10 border border-white/15 text-white/90 text-[0.8rem] font-semibold mb-6"',
    '<h1>': '<h1 className="text-[clamp(2.6rem,4.5vw,4.4rem)] leading-[1.04] tracking-tight mb-4 font-extrabold">',
    'className="ml-gradient-text"': 'className="bg-clip-text text-transparent bg-gradient-to-br from-[#F4A020] to-[#1B6B3A]"',
    'className="ml-hero-desc"': 'className="text-slate-200/90 text-[1.05rem] leading-[1.75] max-w-[52ch] mb-8"',
    'className="ml-hero-btns"': 'className="flex flex-wrap gap-4 mb-7"',
    'className="ml-btn-download ml-btn-dark"': 'className="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all min-w-[168px] bg-white/10 border border-white/20 text-white hover:-translate-y-[3px] hover:bg-white/15 cursor-pointer"',
    'className="ml-hero-rating"': 'className="flex items-center gap-3 text-white/80 text-[0.9rem] flex-wrap"',
    'className="ml-hero-stars"': 'className="flex gap-1 text-[#F4A020]"',
    'className="ml-hero-right"': 'className="relative flex items-end justify-center gap-4 h-[380px] hidden md:flex"',
    'className="ml-phone ml-phone-left"': 'className="absolute left-0 bottom-0 w-[130px] h-[250px] bg-white/90 rounded-[30px] border border-white/30 shadow-2xl flex items-center justify-center overflow-hidden z-[1] -rotate-[8deg] backdrop-blur-sm"',
    'className="ml-phone ml-phone-center"': 'className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[155px] h-[290px] bg-white/95 rounded-[30px] border border-white/30 shadow-2xl flex items-center justify-center overflow-hidden z-[3] backdrop-blur-sm"',
    'className="ml-phone ml-phone-right"': 'className="absolute right-0 bottom-0 w-[130px] h-[250px] bg-white/90 rounded-[30px] border border-white/30 shadow-2xl flex items-center justify-center overflow-hidden z-[1] rotate-[8deg] backdrop-blur-sm"',
    'className="ml-phone-screen"': 'className="flex flex-col items-center gap-2.5 p-4 [&>span]:text-[0.72rem] [&>span]:font-bold [&>span]:text-[#1A1A2E] [&>span]:tracking-wide"',
    'className="ml-trust"': 'className="py-12 bg-white"',
    'className="ml-container ml-trust-inner"': 'className="w-[min(1180px,calc(100%-2rem))] mx-auto flex flex-col items-center gap-7"',
    'className="ml-trust-label"': 'className="text-slate-500 text-[0.88rem] font-semibold tracking-wide uppercase text-center"',
    'className="ml-trust-stats"': 'className="flex flex-wrap justify-center gap-12"',
    'className="ml-trust-item"': 'className="flex flex-col items-center gap-1"',
    'className="ml-trust-value"': 'className="text-[clamp(1.8rem,3vw,2.6rem)] font-extrabold tracking-tight leading-none"',
    'className="ml-trust-sublabel"': 'className="text-slate-500 text-[0.88rem] font-medium"',
    'className="ml-features"': 'className="py-20 bg-[#F8F6F3]"',
    'className="ml-screens"': 'className="py-20 bg-white"',
    'className="ml-testimonials"': 'className="py-20 bg-[#F8F6F3]"',
    'className="ml-section-header"': 'className="max-w-[700px] mx-auto text-center mb-11"',
    'className="ml-tag"': 'className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[0.72rem] font-bold tracking-widest uppercase mb-4"',
    '<h2>': '<h2 className="text-[clamp(1.9rem,3vw,2.9rem)] leading-[1.1] tracking-tight text-[#1A1A2E] mb-3 font-extrabold">',
    '<p>': '<p className="text-slate-500 text-[1rem] leading-[1.7]">',
    'className="ml-features-grid"': 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"',
    'className="ml-feature-card"': 'className="p-6 rounded-3xl bg-white/90 border border-slate-200/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#1B6B3A]/20 hover:shadow-md"',
    'className="ml-feature-icon"': 'className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-[1.3rem] mb-4"',
    '<h3>': '<h3 className="text-[1.1rem] font-bold tracking-tight text-[#1A1A2E] mb-2.5">',
    'className="ml-screens-row"': 'className="flex justify-center gap-6 flex-wrap"',
    'className="ml-screen-item"': 'className="flex flex-col items-center gap-3.5 group cursor-pointer"',
    'className="ml-screen-mockup"': 'className="w-[110px] h-[190px] rounded-[22px] bg-gradient-to-br from-[#F8F6F3] to-white/90 border border-slate-200/90 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-hover:shadow-lg"',
    'className="ml-screen-icon"': 'className="text-[1.8rem] flex items-center justify-center"',
    'className="ml-screen-label"': 'className="text-[0.82rem] font-bold text-[#1A1A2E] tracking-wide"',
    'className="ml-test-grid"': 'className="grid grid-cols-1 md:grid-cols-3 gap-5"',
    'className="ml-test-card"': 'className="p-6 rounded-3xl bg-white/95 border border-slate-200/80 shadow-sm flex flex-col gap-4"',
    'className="ml-test-stars"': 'className="text-[#F4A020] text-[0.95rem] tracking-[0.1em]"',
    'className="ml-test-text"': 'className="text-slate-500 text-[0.95rem] leading-[1.75] flex-1"',
    'className="ml-test-author"': 'className="flex items-center gap-3.5 mt-auto"',
    'className="ml-test-avatar"': 'className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[0.88rem] shrink-0"',
    'className="ml-test-name"': 'className="font-bold text-[0.93rem] text-[#1A1A2E] tracking-tight"',
    'className="ml-test-role"': 'className="text-slate-400 text-[0.82rem]"',
    'className="ml-cta"': 'className="py-20 bg-gradient-to-br from-[#0d1520] via-[#1a2a40] to-[#0d1520] relative overflow-hidden before:absolute before:w-[360px] before:h-[360px] before:-top-[100px] before:-right-[80px] before:rounded-full before:bg-[#D32F2F]/20 before:blur-[60px] before:pointer-events-none after:absolute after:w-[280px] after:h-[280px] after:-bottom-[80px] after:-left-[60px] after:rounded-full after:bg-[#1B6B3A]/15 after:blur-[50px] after:pointer-events-none"',
    'className="ml-container ml-cta-inner"': 'className="relative z-10 w-[min(1180px,calc(100%-2rem))] mx-auto text-center text-white"',
    'className="ml-cta-btns"': 'className="flex justify-center flex-wrap gap-4 mb-7"',
    'className="ml-btn-store"': 'className="inline-flex items-center gap-3.5 px-6 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white font-bold min-w-[185px] transition-all hover:-translate-y-1 hover:bg-white/15 cursor-pointer [&>div]:flex [&>div]:flex-col [&>div]:leading-tight [&>div>span]:text-[0.7rem] [&>div>span]:opacity-75 [&>div>strong]:text-[0.95rem]"',
    'className="ml-cta-sub"': 'className="flex justify-center flex-wrap gap-5 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:text-white/75 [&>span]:text-[0.86rem]"',
    'className="ml-footer"': 'className="bg-gradient-to-b from-[#0a1220] to-[#08111d] text-white pt-14"',
    'className="ml-container ml-footer-inner"': 'className="w-[min(1180px,calc(100%-2rem))] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 pb-8 border-b border-white/10"',
    'className="ml-footer-brand"': 'className="max-w-[38ch]"',
    'className="ml-footer-logo"': 'className="flex items-center gap-2.5 font-bold text-base mb-3.5"',
    'className="ml-footer-links"': 'className="grid grid-cols-2 md:grid-cols-3 gap-6"',
    'className="ml-footer-col"': 'className="flex flex-col gap-2 [&>h4]:text-[0.92rem] [&>h4]:font-bold [&>h4]:mb-3.5 [&>h4]:text-white/90 [&>a]:text-white/80 [&>a]:text-[0.88rem] [&>a]:mb-2.5 [&>a]:transition-colors hover:[&>a]:text-white"',
    'className="ml-footer-bottom"': 'className="py-5"',
    'className="ml-logo-bg"': 'className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-[#1B6B3A] to-[#F4A020] text-white font-extrabold text-[1.1rem] flex items-center justify-center shadow-[0_8px_20px_rgba(211,47,47,0.28)] shrink-0"'
  };

  for (const [key, value] of Object.entries(classesMap)) {
    content = content.replaceAll(key, value);
  }
  
  let additionalReplaces = [
    ['<div className="ml-container">', '<div className="w-[min(1180px,calc(100%-2rem))] mx-auto">'],
    ['<p className="text-slate-500 text-[1rem] leading-[1.7]">L\'app', '<p className="text-slate-500 text-[1rem] leading-[1.7] mt-2">L\'app'] // Slight tweak for test text if needed
  ];
  for (let [find, replace] of additionalReplaces) {
    content = content.replaceAll(find, replace);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Refactored MobileLanding.jsx');
}
