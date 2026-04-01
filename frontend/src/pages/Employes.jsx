import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { FiPlus, FiUserCheck, FiUserX, FiShield, FiUser, FiUsers, FiX } from 'react-icons/fi';
import UpgradeBanner, { FeaturePreview } from '../components/UpgradeBanner';
import PageHeader from '../components/PageHeader';

export default function Employes() {
  const { isPro, _plan } = useAuth();
  const [employes, setEmployes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', telephone: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/auth/employees');
      setEmployes(res.data.data);
    } catch {
      toast.error('Erreur de chargement des employés');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isPro) {
      setLoading(false);
      return;
    }
    load();
  }, [isPro, load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/auth/employees', form);
      toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'employe', action: 'create' }) }));
      setShowModal(false);
      setForm({ nom: '', prenom: '', email: '', password: '', telephone: '' });
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, { fallback: 'Erreur' }));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActif = async (id) => {
    try {
      const res = await api.patch(`/auth/employees/${id}/toggle`);
      toast.success(getApiSuccessMessage(res, { action: 'update' }));
      load();
    } catch (error) { toast.error(getApiErrorMessage(error, { fallback: 'Erreur' })); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-[0.88rem] font-bold text-muted-foreground">Chargement de l'équipe...</p>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 font-sans">
        <FeaturePreview
          icon={<FiUsers size={26} />}
          title="Structurez votre équipe"
          featureLabel="la gestion d’équipe"
          requiredPlan="PRO"
          description="Structurez votre équipe sans perdre le contrôle"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">
      <PageHeader
        icon={<FiUsers size={20} />}
        title="Équipe"
        subtitle="Gérez vos employés et leurs accès"
        action={
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B5E20] text-white font-bold text-[0.85rem] rounded-xl hover:-translate-y-0.5 transition-all border-none cursor-pointer">
            <FiPlus size={16} /> Ajouter un employé
          </button>
        }
      />

      {/* Employee Cards */}
      <div className="flex flex-col gap-3">
        {employes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 px-8 text-muted-foreground/60 bg-white border border-[#1B5E20]/10 rounded-[18px]">
            <FiUsers size={40} />
            <p className="text-[0.95rem] font-bold text-muted-foreground m-0 mt-3 mb-1">Aucun employé trouvé</p>
          </div>
        )}
        {employes.map(e => (
          <div key={e.id} className="bg-white border border-[#1B5E20]/10 rounded-[18px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5 flex items-center gap-4">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white flex items-center justify-center font-extrabold text-[0.9rem] shrink-0">
              {e.prenom.charAt(0)}{e.nom.charAt(0)}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-foreground text-[0.95rem] m-0 leading-tight truncate">{e.prenom} {e.nom}</p>
              <p className="text-[0.8rem] font-medium text-muted-foreground m-0 mt-0.5 truncate">{e.email}</p>
              {e.telephone && <p className="text-[0.78rem] font-medium text-muted-foreground/70 m-0 mt-0.5">{e.telephone}</p>}
            </div>
            {/* Badges */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-bold whitespace-nowrap ${e.role === 'ADMIN' ? 'bg-[#1B5E20]/10 text-[#1B5E20]' : 'bg-blue-500/10 text-blue-600'}`}>
                {e.role === 'ADMIN' ? <><FiShield size={11} /> Admin</> : <><FiUser size={11} /> Employé</>}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-bold whitespace-nowrap ${e.actif ? 'bg-[#1B5E20]/10 text-[#1B5E20]' : 'bg-gray-100 text-gray-500'}`}>
                {e.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>
            {/* Toggle */}
            <button
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.78rem] font-bold transition-all border shrink-0 ${e.actif ? 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200' : 'bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] border-transparent text-white hover:-translate-y-0.5 shadow-sm hover:shadow-[0_4px_14px_rgba(27,94,32,0.3)]'}`}
              onClick={() => toggleActif(e.id)}
            >
              {e.actif ? <><FiUserX size={14} /> Désactiver</> : <><FiUserCheck size={14} /> Activer</>}
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-[1000] p-6 animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
          <div className="bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[28px] w-full max-w-[500px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3.5 p-6 border-b border-border bg-gradient-to-b from-[#1B5E20]/5 to-transparent">
              <div className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white rounded-xl shadow-md shrink-0">
                <FiUser size={22} />
              </div>
              <div>
                <h3 className="text-[1.1rem] font-extrabold text-foreground m-0" style={{fontFamily:'Sora,sans-serif'}}>Ajouter un employé</h3>
                <p className="text-[0.78rem] font-medium text-muted-foreground m-0 mt-1">Nouveau membre de l'équipe</p>
              </div>
              <button type="button" className="w-9 h-9 flex items-center justify-center bg-muted border-none rounded-xl text-muted-foreground cursor-pointer transition-all hover:bg-muted/80 hover:text-foreground shrink-0 ml-auto" onClick={() => setShowModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">Prénom <span className="text-destructive font-bold">*</span></label>
                    <input className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">Nom <span className="text-destructive font-bold">*</span></label>
                    <input className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">Email <span className="text-destructive font-bold">*</span></label>
                  <input type="email" className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">Mot de passe <span className="text-destructive font-bold">*</span></label>
                  <input type="password" className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-muted-foreground">Téléphone</label>
                  <input className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-[0.88rem] font-medium text-foreground transition-all outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 p-5 border-t border-border bg-gradient-to-b from-slate-50/98 to-slate-100/90">
                <button type="button" className="px-5 py-2.5 bg-white border border-border rounded-xl text-muted-foreground text-[0.85rem] font-semibold cursor-pointer transition-all hover:bg-muted hover:text-foreground" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white border-none rounded-xl text-[0.85rem] font-bold cursor-pointer transition-all shadow-[0_6px_20px_rgba(27,94,32,0.3)] hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none" style={{fontFamily:'Sora,sans-serif'}} disabled={submitting}>
                  {submitting ? 'Ajout en cours...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
