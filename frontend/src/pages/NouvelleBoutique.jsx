import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import {
  FiArrowLeft, FiArrowRight, FiCheck, FiMapPin, FiPhone, FiMail,
  FiGlobe, FiShoppingBag, FiStar, FiPackage, FiUsers, FiTrendingUp,
  FiRefreshCw, FiZap, FiGrid, FiLayers, FiShield, FiClock,
  FiChevronRight, FiHome, FiTag
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';

export default function NouvelleBoutique() {
  const navigate = useNavigate();
  const { boutique, loadMesBoutiques, isBusiness } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdBoutique, setCreatedBoutique] = useState(null);
  const [form, setForm] = useState({
    nom: '',
    slug: '',
    adresse: '',
    telephone: '',
    email: ''
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const totalSteps = 3;

  const generateSlug = (nom) => {
    return nom
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNomChange = (e) => {
    const nom = e.target.value;
    setForm(prev => ({
      ...prev,
      nom,
      slug: slugTouched ? prev.slug : generateSlug(nom)
    }));
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
  };

  const canProceed = () => {
    if (step === 1) return form.nom.trim().length >= 2 && form.slug.trim().length >= 2;
    if (step === 2) return true; // optional fields
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps && canProceed()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.slug.trim()) {
      return toast.error('Le nom et le slug sont requis');
    }
    try {
      setSubmitting(true);
      const res = await api.post('/boutique/nouvelle', form);
      setCreatedBoutique(res.data.data);
      setSuccess(true);
      loadMesBoutiques();
      toast.success(getApiSuccessMessage(res, { fallback: getLocalSuccessMessage({ entity: 'boutique', action: 'create' }) }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, { fallback: 'Erreur lors de la création' }));
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect if not business
  if (!isBusiness) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-12">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6"><FiShield size={48} /></div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">Plan Business requis</h2>
          <p>La création de nouvelles boutiques est réservée au plan Business.</p>
          <button className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white border-none rounded-xl text-sm font-bold cursor-pointer transition-all shadow-[0_8px_24px_rgba(27,94,32,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(27,94,32,0.4)]" onClick={() => navigate('/app/abonnement')}>
            <FiZap size={16} /> Passer au Business
          </button>
        </div>
      </div>
    );
  }

  // Success screen
  if (success && createdBoutique) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <div className="flex flex-col items-center justify-center min-h-[80vh] relative overflow-hidden text-center p-8">
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="absolute rounded-full border-2 border-emerald-500/10 w-[300px] h-[300px] animate-ping" />
            <div className="absolute rounded-full border-2 border-emerald-500/10 w-[450px] h-[450px] animate-pulse" />
            <div className="absolute rounded-full border-2 border-emerald-500/10 w-[600px] h-[600px] opacity-50" />
          </div>
          <div className="relative z-10 flex flex-col items-center bg-white/80 backdrop-blur-xl p-10 lg:p-14 rounded-3xl border border-white/50 shadow-xl max-w-xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-[0_10px_30px_rgba(16,211,153,0.3)] animate-in zoom-in spin-in-12 duration-500">
              <FiCheck size={40} />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2">Boutique créée !</h1>
            <p className="text-xl font-bold text-muted-foreground m-0 mb-1">{createdBoutique.nom}</p>
            <p className="text-sm font-mono text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-md mb-8">/{createdBoutique.slug}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8 text-left">
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-border rounded-xl text-[0.85rem] font-semibold text-foreground">
                <FiPackage size={16} />
                <span>5 catégories par défaut créées</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-border rounded-xl text-[0.85rem] font-semibold text-foreground">
                <FiShield size={16} />
                <span>Plan {createdBoutique.plan} hérité</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 border border-border rounded-xl text-[0.85rem] font-semibold text-foreground">
                <FiGlobe size={16} />
                <span>Connectée à votre réseau</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-border text-foreground rounded-xl font-bold hover:bg-muted transition-all" onClick={() => navigate('/app/boutiques')}>
                <FiGrid size={16} /> Voir mes boutiques
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-primary to-secondary text-white border-none rounded-xl font-bold shadow-lg shadow-primary/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 transition-all" onClick={() => {
                setSuccess(false);
                setCreatedBoutique(null);
                setForm({ nom: '', slug: '', adresse: '', telephone: '', email: '' });
                setSlugTouched(false);
                setStep(1);
              }}>
                <FiShoppingBag size={16} /> Créer une autre
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 md:px-8 bg-white border-b border-border sticky top-0 z-50">
        <button className="flex items-center gap-2 bg-transparent border-none text-muted-foreground text-[0.88rem] font-semibold cursor-pointer py-2 px-3 rounded-[10px] transition-all hover:bg-muted/50 hover:text-foreground" onClick={() => navigate('/app/boutiques')}>
          <FiArrowLeft size={18} />
          <span>Mes Boutiques</span>
        </button>
        <div className="hidden md:flex items-center gap-10 relative">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-extrabold bg-white border-[2.5px] border-muted-foreground/30 text-muted-foreground relative z-10 transition-all duration-300 ${step >= s ? 'bg-gradient-to-br from-primary to-secondary border-primary text-white shadow-md shadow-primary/30' : ''} ${step === s ? 'scale-110 shadow-lg shadow-primary/40' : ''}`}>
              {step > s ? <FiCheck size={12} /> : s}
            </div>
          ))}
          <div className="absolute top-1/2 left-[18px] right-[18px] h-[3px] bg-muted rounded-[3px] -translate-y-1/2 z-0">
            <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-[3px] transition-all duration-500" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
          </div>
        </div>
        <div className="text-[0.8rem] text-muted-foreground font-semibold">
          Étape {step}/{totalSteps}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] min-h-[calc(100vh-65px)]">
        {/* Left: Form */}
        <div className="p-8 lg:p-12 flex flex-col">
          <div className="w-full max-w-[580px] mx-auto flex-1 flex flex-col">
            {/* Step 1: Identity */}
            <div className={`flex flex-col animate-in slide-in-from-right-4 duration-300 ${step === 1 ? 'flex-1 block' : 'hidden'}`}>
              <div className="flex items-start gap-4 mb-8">
                <div className="w-[52px] h-[52px] rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FiShoppingBag size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-foreground tracking-tight m-0 mb-1">Identité de la boutique</h2>
                  <p className="text-[0.88rem] text-muted-foreground m-0 leading-relaxed">Choisissez un nom qui représente votre point de vente</p>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[0.82rem] font-bold text-muted-foreground tracking-wide">
                    <FiTag size={14} />
                    Nom de la boutique
                    <span className="text-destructive font-bold flex-shrink-0">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border-2 border-border rounded-xl text-[0.92rem] text-foreground transition-all outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/50"
                    value={form.nom}
                    onChange={handleNomChange}
                    placeholder="Ex: Boutique Pikine Centre"
                    autoFocus
                  />
                  <span className="text-[0.75rem] text-muted-foreground font-medium mt-1">Le nom visible par vos clients et votre équipe</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[0.82rem] font-bold text-muted-foreground tracking-wide">
                    <FiGlobe size={14} />
                    Identifiant unique (slug)
                    <span className="text-destructive font-bold flex-shrink-0">*</span>
                  </label>
                  <div className="flex items-stretch border-2 border-border rounded-xl overflow-hidden bg-white transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <span className="flex items-center px-3 bg-muted text-muted-foreground text-[0.82rem] font-semibold border-r border-border whitespace-nowrap">tekkipro.com/</span>
                    <input
                      type="text"
                      className="flex-1 border-none rounded-none shadow-none focus:ring-0 px-4 py-3 text-[0.92rem] text-foreground outline-none w-full"
                      value={form.slug}
                      onChange={handleSlugChange}
                      placeholder="boutique-pikine-centre"
                    />
                  </div>
                  <span className="text-[0.75rem] text-muted-foreground font-medium mt-1">URL unique — lettres minuscules, chiffres et tirets uniquement</span>
                </div>
              </div>
            </div>

            {/* Step 2: Contact */}
            <div className={`flex flex-col animate-in slide-in-from-right-4 duration-300 ${step === 2 ? 'flex-1 block' : 'hidden'}`}>
              <div className="flex items-start gap-4 mb-8">
                <div className="w-[52px] h-[52px] rounded-2xl bg-[#D4880F]/10 text-[#D4880F] flex items-center justify-center shrink-0">
                  <FiMapPin size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-foreground tracking-tight m-0 mb-1">Coordonnées</h2>
                  <p className="text-[0.88rem] text-muted-foreground m-0 leading-relaxed">Informations de contact pour cette boutique (optionnel)</p>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[0.82rem] font-bold text-muted-foreground tracking-wide">
                    <FiMapPin size={14} />
                    Adresse
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border-2 border-border rounded-xl text-[0.92rem] text-foreground transition-all outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/50"
                    value={form.adresse}
                    onChange={e => setForm(prev => ({ ...prev, adresse: e.target.value }))}
                    placeholder="Quartier, Rue, Ville"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-[0.82rem] font-bold text-muted-foreground tracking-wide">
                      <FiPhone size={14} />
                      Téléphone
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-white border-2 border-border rounded-xl text-[0.92rem] text-foreground transition-all outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/50"
                      value={form.telephone}
                      onChange={e => setForm(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="+221 7X XXX XX XX"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-[0.82rem] font-bold text-muted-foreground tracking-wide">
                      <FiMail size={14} />
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 bg-white border-2 border-border rounded-xl text-[0.92rem] text-foreground transition-all outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/50"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@boutique.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Confirmation */}
            <div className={`flex flex-col animate-in slide-in-from-right-4 duration-300 ${step === 3 ? 'flex-1 block' : 'hidden'}`}>
              <div className="flex items-start gap-4 mb-8">
                <div className="w-[52px] h-[52px] rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <FiCheck size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-foreground tracking-tight m-0 mb-1">Récapitulatif</h2>
                  <p className="text-[0.88rem] text-muted-foreground m-0 leading-relaxed">Vérifiez les informations avant de créer votre boutique</p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="bg-white border border-border rounded-[14px] p-5">
                  <h4 className="flex items-center gap-2 text-[0.82rem] font-bold text-muted-foreground uppercase tracking-widest mb-4 pb-3 border-b border-muted m-0"><FiShoppingBag size={14} /> Identité</h4>
                  <div className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                    <span className="text-[0.85rem] text-muted-foreground font-medium">Nom</span>
                    <span className="text-[0.88rem] text-foreground font-bold">{form.nom || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                    <span className="text-[0.85rem] text-muted-foreground font-medium">Slug</span>
                    <span className="font-mono text-[#1B5E20] bg-[#1B5E20]/10 px-2 py-1 rounded-md text-[0.82rem]">/{form.slug || '—'}</span>
                  </div>
                </div>

                <div className="bg-white border border-border rounded-[14px] p-5">
                  <h4 className="flex items-center gap-2 text-[0.82rem] font-bold text-muted-foreground uppercase tracking-widest mb-4 pb-3 border-b border-muted m-0"><FiMapPin size={14} /> Coordonnées</h4>
                  <div className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                    <span className="text-[0.85rem] text-muted-foreground font-medium">Adresse</span>
                    <span className="text-[0.88rem] text-foreground font-bold">{form.adresse || 'Non renseignée'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                    <span className="text-[0.85rem] text-muted-foreground font-medium">Téléphone</span>
                    <span className="text-[0.88rem] text-foreground font-bold">{form.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                    <span className="text-[0.85rem] text-muted-foreground font-medium">Email</span>
                    <span className="text-[0.88rem] text-foreground font-bold">{form.email || 'Non renseigné'}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/15 rounded-[14px] p-5">
                  <h4 className="flex items-center gap-2 text-[0.82rem] font-bold text-muted-foreground uppercase tracking-widest mb-4 pb-3 border-b border-muted m-0"><FiShield size={14} /> Hérité automatiquement</h4>
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-full text-[0.78rem] font-semibold text-foreground"><FiStar size={12} /> Plan {boutique?.plan || 'BUSINESS'}</div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-full text-[0.78rem] font-semibold text-foreground"><FiGlobe size={12} /> Devise {boutique?.devise || 'FCFA'}</div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-full text-[0.78rem] font-semibold text-foreground"><FiLayers size={12} /> 5 catégories par défaut</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-8 mt-auto border-t border-border w-full">
              {step > 1 && (
                <button className="flex items-center gap-2 px-5 py-2.5 bg-transparent border-2 border-border rounded-xl text-muted-foreground text-[0.88rem] font-semibold cursor-pointer transition-all hover:bg-muted hover:border-muted-foreground/30" onClick={handleBack}>
                  <FiArrowLeft size={16} />
                  Retour
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                {step < totalSteps ? (
                  <button
                    className="flex items-center gap-2 px-7 py-2.5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white rounded-xl text-[0.9rem] font-bold cursor-pointer transition-all shadow-[0_6px_20px_rgba(27,94,32,0.3)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(27,94,32,0.4)] disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    Continuer
                    <FiArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-primary to-secondary text-white rounded-xl text-[0.92rem] font-bold cursor-pointer transition-all shadow-[0_6px_20px_rgba(27,94,32,0.3)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(27,94,32,0.4)] disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                    onClick={handleSubmit}
                    disabled={submitting || !form.nom.trim() || !form.slug.trim()}
                  >
                    {submitting ? (
                      <><FiRefreshCw className="animate-spin" size={16} /> Création en cours...</>
                    ) : (
                      <><FiShoppingBag size={16} /> Créer la boutique</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="bg-gradient-to-b from-slate-50 to-slate-100 border-l border-border p-8 overflow-y-auto hidden lg:block">
          <div className="sticky top-8">
            <div className="flex items-center gap-2 text-[0.78rem] font-bold text-muted-foreground uppercase tracking-widest mb-4">
              <FiGrid size={14} />
              Aperçu en temps réel
            </div>
            <div className="relative bg-white border border-[#1B5E20]/10 rounded-[20px] p-8 overflow-hidden shadow-[0_8px_32px_rgba(7,28,8,0.07)]">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute rounded-full blur-[60px] w-[200px] h-[200px] bg-[#1B5E20]/10 top-[-60px] right-[-40px]" />
                <div className="absolute rounded-full blur-[60px] w-[150px] h-[150px] bg-emerald-400/10 bottom-[-40px] left-[-30px]" />
              </div>
              
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-black mx-auto mb-4 relative z-10 shadow-[0_8px_24px_rgba(27,94,32,0.25)] transition-all">
                {form.nom ? form.nom.charAt(0).toUpperCase() : '?'}
              </div>

              {/* Name */}
              <h3 className="text-[1.15rem] font-extrabold text-foreground text-center m-0 mb-1 relative z-10 transition-all">
                {form.nom || 'Nom de la boutique'}
              </h3>
              <span className="inline-flex text-center font-mono text-[0.78rem] text-[#1B5E20] bg-[#1B5E20]/10 px-3 py-1 rounded-md mx-auto mb-5 relative z-10 left-1/2 -translate-x-1/2">
                /{form.slug || 'slug-de-la-boutique'}
              </span>

              {/* Contact preview */}
              <div className="flex flex-col gap-2 mb-5 relative z-10">
                {form.adresse && (
                  <div className="flex items-center gap-2 text-[0.82rem] text-muted-foreground font-medium">
                    <FiMapPin size={13} />
                    <span>{form.adresse}</span>
                  </div>
                )}
                {form.telephone && (
                  <div className="flex items-center gap-2 text-[0.82rem] text-muted-foreground font-medium">
                    <FiPhone size={13} />
                    <span>{form.telephone}</span>
                  </div>
                )}
                {form.email && (
                  <div className="flex items-center gap-2 text-[0.82rem] text-muted-foreground font-medium">
                    <FiMail size={13} />
                    <span>{form.email}</span>
                  </div>
                )}
                {!form.adresse && !form.telephone && !form.email && (
                  <div className="flex items-center gap-2 text-[0.82rem] text-muted-foreground italic">
                    <FiMapPin size={13} />
                    <span>Les coordonnées apparaîtront ici</span>
                  </div>
                )}
              </div>

              {/* Mini metrics */}
              <div className="grid grid-cols-3 gap-2 mb-5 relative z-10">
                <div className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-border rounded-xl">
                  <FiPackage size={14} />
                  <span className="text-[0.72rem] text-muted-foreground font-semibold">0 produits</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-border rounded-xl">
                  <FiUsers size={14} />
                  <span className="text-[0.72rem] text-muted-foreground font-semibold">0 clients</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-border rounded-xl">
                  <FiTrendingUp size={14} />
                  <span className="text-[0.72rem] text-muted-foreground font-semibold">0 ventes</span>
                </div>
              </div>

              {/* Inherited info */}
              <div className="flex flex-wrap items-center justify-center gap-2 relative z-10 pt-4 border-t border-muted">
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[0.7rem] font-bold bg-primary/10 text-primary border border-primary/20">
                  <FiStar size={11} /> {boutique?.plan || 'BUSINESS'}
                </div>
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[0.7rem] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  <FiHome size={11} /> Rattachée à {boutique?.nom || 'Boutique principale'}
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-6 p-5 bg-white border border-border rounded-2xl">
              <h5 className="flex items-center gap-1.5 text-[0.82rem] font-bold text-muted-foreground m-0 mb-3"><FiZap size={14} /> Conseils</h5>
              <ul className="list-none p-0 m-0 flex flex-col gap-2">
                <li className="text-[0.78rem] text-muted-foreground font-medium pl-5 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary leading-relaxed">Choisissez un nom court et mémorable</li>
                <li className="text-[0.78rem] text-muted-foreground font-medium pl-5 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary leading-relaxed">Le slug doit être unique dans tout le système</li>
                <li className="text-[0.78rem] text-muted-foreground font-medium pl-5 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary leading-relaxed">Les coordonnées peuvent être ajoutées plus tard</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
