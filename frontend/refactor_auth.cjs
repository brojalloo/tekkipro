const fs = require('fs');
const path = require('path');

const authFiles = [
  'src/pages/Login.jsx',
  'src/pages/Register.jsx',
  'src/pages/ForgotPassword.jsx',
  'src/pages/ResetPassword.jsx',
  'src/pages/VerifyEmail.jsx'
];

const classesMap = {
  'className="auth-page"': 'className="min-h-screen flex bg-[#FFFAF0] text-[#1A1C23] font-sans"',
  'className="auth-page auth-page--simple"': 'className="min-h-screen flex bg-[#FFFAF0] text-[#1A1C23] font-sans items-center justify-center p-4"',
  'className="auth-shell"': 'className="flex w-full min-h-screen bg-white md:bg-transparent"',
  'className="auth-showcase"': 'className="hidden md:flex flex-[0_0_42%] lg:flex-[0_0_42%] bg-[#1A1C23] text-white flex-col justify-center p-12 relative overflow-hidden before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_10%_10%,rgba(211,47,47,0.2),transparent_50%),radial-gradient(circle_at_90%_90%,rgba(255,214,0,0.15),transparent_50%)] before:z-[1] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[5px] after:bg-gradient-to-b after:from-[#1B5E20] after:via-[#FFD600] after:to-[#D32F2F] after:z-[2]"',
  'className="auth-logo-wrap"': 'className="relative z-[3] flex items-center gap-4 mb-16"',
  'className="auth-logo-icon"': 'className="w-14 h-14 bg-gradient-to-br from-[#1B5E20] to-[#FFD600] rounded-[18px] flex items-center justify-center font-sans text-2xl font-extrabold text-white shadow-[0_8px_24px_rgba(27,94,32,0.3)]"',
  'className="auth-logo-name"': 'className="font-sans text-[1.75rem] font-extrabold tracking-tight text-[#1B5E20]"',
  'className="auth-showcase-body"': 'className="relative z-[3]"',
  '<h2>': '<h2 className="font-sans text-[2.5rem] font-extrabold leading-[1.1] mb-6 tracking-tight text-white">',
  '<p>': '<p className="text-[1.1rem] text-white/60 leading-[1.6] mb-12 max-w-[480px]">',
  'className="auth-stats"': 'className="flex gap-12"',
  'className="auth-stat"': 'className="flex flex-col [&>strong]:font-sans [&>strong]:text-[1.75rem] [&>strong]:font-extrabold [&>strong]:mb-1 [&>span]:text-[0.9rem] [&>span]:font-semibold [&>span]:text-white/40 [&>span]:uppercase [&>span]:tracking-wider [&:nth-child(1)>strong]:text-[#1B5E20] [&:nth-child(2)>strong]:text-[#FFD600] [&:nth-child(3)>strong]:text-[#4ade80]"',
  'className="auth-card"': 'className="flex-1 flex flex-col justify-center p-8 md:p-16 max-w-[580px] w-full mx-auto"',
  'className="auth-card simple-card"': 'className="bg-white rounded-[24px] shadow-2xl p-10 md:p-14 max-w-[480px] w-full text-center flex flex-col items-center mx-auto"',
  '<h1>': '<h1 className="font-sans text-[2.25rem] font-extrabold mb-2 tracking-tight text-[#1B5E20]">',
  'className="subtitle"': 'className="text-base text-gray-500 mb-10 font-medium"',
  'className="form-group"': 'className="mb-5 text-left w-full"',
  '<label htmlFor': '<label className="block text-[0.9rem] font-bold text-gray-700 mb-2 pl-1" htmlFor',
  'className="form-input-wrap"': 'className="relative"',
  'className="form-input-icon"': 'className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 flex pointer-events-none"',
  'className="form-control"': 'className="w-full py-3.5 pr-5 pl-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm"',
  'className="form-control form-control-with-toggle"': 'className="w-full py-3.5 pl-12 pr-12 bg-white border-2 border-gray-100 rounded-xl font-sans text-base font-semibold text-[#1A1C23] transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10 hover:shadow-sm"',
  'className="form-password-group"': 'className="relative"',
  'className="form-password-toggle"': 'className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-gray-400 cursor-pointer p-1 transition-colors hover:text-[#D32F2F]"',
  'className="form-remember-row"': 'className="flex items-center justify-between my-6"',
  'className="form-remember-check"': 'className="flex items-center gap-2.5 text-[0.9rem] font-semibold text-gray-600 cursor-pointer [&>input]:w-[18px] [&>input]:h-[18px] [&>input]:accent-[#D32F2F]"',
  'className="form-forgot-link"': 'className="text-[0.9rem] font-bold text-[#D32F2F] no-underline hover:underline"',
  'className="btn btn-primary"': 'className="w-full p-4 rounded-2xl text-[1.05rem] font-extrabold font-sans cursor-pointer transition-all border-none flex items-center justify-center gap-3 bg-gradient-to-br from-[#D32F2F] to-[#b71c1c] text-white shadow-lg hover:-translate-y-1 hover:shadow-xl disabled:opacity-70"',
  'className="btn btn-google"': 'className="w-full p-4 rounded-2xl text-[1.05rem] font-extrabold font-sans cursor-pointer transition-all flex items-center justify-center gap-3 bg-white text-[#1A1C23] border-2 border-gray-100 mt-6 hover:bg-gray-50 hover:border-gray-200 hover:-translate-y-px"',
  'className="btn btn-outline"': 'className="w-full p-4 rounded-2xl text-[1.05rem] font-extrabold font-sans cursor-pointer transition-all flex items-center justify-center gap-3 bg-white text-[#1A1C23] border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300"',
  'className="auth-divider"': 'className="flex items-center gap-4 my-8 text-[0.85rem] font-bold text-gray-400 uppercase tracking-widest before:content-[\'\'] before:flex-1 before:h-[2px] before:bg-gray-100 after:content-[\'\'] after:flex-1 after:h-[2px] after:bg-gray-100"',
  'className="form-status-banner success"': 'className="p-4 rounded-xl text-[0.95rem] font-semibold mb-6 flex items-center gap-3 bg-[#1B5E20]/10 text-[#1b5e20] border-l-4 border-[#1B5E20] text-left"',
  'className="form-status-banner error"': 'className="p-4 rounded-xl text-[0.95rem] font-semibold mb-6 flex items-center gap-3 bg-[#D32F2F]/10 text-[#b71c1c] border-l-4 border-[#D32F2F] text-left"',
  'className="link"': 'className="text-center mt-8 font-semibold text-gray-500 [&>a]:text-[#D32F2F] [&>a]:font-extrabold [&>a]:no-underline hover:[&>a]:underline"',
  'className="auth-feature-list"': 'className="flex flex-col gap-5"',
  'className="auth-feature-item"': 'className="flex items-center gap-4 text-[1.05rem] font-medium text-white/80"',
  'className="auth-feature-item-icon"': 'className="w-11 h-11 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#FFD600] shrink-0"',
  'className="form-cgu"': 'className="flex gap-3 text-[0.9rem] font-semibold text-gray-600 my-6 leading-relaxed cursor-pointer [&>input]:w-[18px] [&>input]:h-[18px] [&>input]:mt-[2px] [&>input]:accent-[#D32F2F] [&>input]:shrink-0 [&_a]:text-[#D32F2F] [&_a]:font-bold [&_a]:no-underline hover:[&_a]:underline"',
  'className={`spin ${loading ? \'visible\' : \'hidden\'}`}': 'className={`animate-spin ${loading ? \'visible\' : \'hidden\'}`}'
};

for (const relativePath of authFiles) {
  const fullPath = path.join(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) continue;
  
  let fileContent = fs.readFileSync(fullPath, 'utf8');
  
  // Remove CSS import
  fileContent = fileContent.replace(/import '\.\/AuthPages\.css';\r?\n?/, '');
  
  // Fix auth-card for simple pages (VerifyEmail, ResetPassword)
  if (relativePath.includes('VerifyEmail') || relativePath.includes('ResetPassword') || relativePath.includes('ForgotPassword')) {
    fileContent = fileContent.replace('className="auth-card"', 'className="auth-card simple-card"');
  }
  
  // Replace specific tags to ensure simple auth cards get tailwind titles properly
  for (const [key, value] of Object.entries(classesMap)) {
    fileContent = fileContent.replaceAll(key, value);
  }
  
  fs.writeFileSync(fullPath, fileContent, 'utf8');
  console.log(`Refactored ${relativePath}`);
}
