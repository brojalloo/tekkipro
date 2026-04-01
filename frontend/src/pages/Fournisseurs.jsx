import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import PageHeader from '../components/PageHeader';
import {
  FiPlus, FiEdit, FiTrash2, FiTruck, FiPhone, FiMail,
  FiMapPin, FiSearch, FiPackage, FiArrowDownCircle,
  FiX, FiCheckCircle, FiUser
} from 'react-icons/fi';
import UpgradeBanner, { FeaturePreview } from '../components/UpgradeBanner';

export default function Fournisseurs() {
  const { isPro, _plan } = useAuth();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: '', telephone: '', adresse: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/fournisseurs');
      setFournisseurs(res.data.data);
    } catch { toast.error('Erreur de chargement des fournisseurs'); } finally { setLoading(false); }
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
      if (editing) {
        const response = await api.put(`/fournisseurs/${editing.id}`, form);
        toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'fournisseur', action: 'update' }) }));
      } else {
        const response = await api.post('/fournisseurs', form);
        toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'fournisseur', action: 'create' }) }));
      }
      setShowModal(false);
      setEditing(null);
      setForm({ nom: '', telephone: '', adresse: '', email: '' });
      load();
    } catch (error) { toast.error(getApiErrorMessage(error, { fallback: 'Erreur lors de l\'enregistrement' })); } finally { setSubmitting(false); }
  };

  const startEdit = (f) => {
    setEditing(f);
    setForm({ nom: f.nom, telephone: f.telephone || '', adresse: f.adresse || '', email: f.email || '' });
    setShowModal(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nom: '', telephone: '', adresse: '', email: '' });
    setShowModal(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Supprimer ce fournisseur ?')) return;
    try {
      const response = await api.delete(`/fournisseurs/${id}`);
      toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'fournisseur', action: 'delete' }) }));
      load();
    } catch (error) { toast.error(getApiErrorMessage(error, { fallback: 'Erreur' })); }
  };

  const filtered = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.telephone || '').includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col font-sans pb-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" /><p>Chargement...</p></div>
      </div>
    );
  }

  // Bloquer l’accès pour le plan Gratuit
  if (!isPro) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 font-sans">
        <FeaturePreview
          icon={<FiTruck size={26} />}
          title="Gérez vos fournisseurs"
          featureLabel="les fournisseurs"
          requiredPlan="PRO"
          description="Transformez vos achats en réseau fiable"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">
      <PageHeader
        icon={<FiTruck size={20} />}
        title="Fournisseurs"
        subtitle="Gérez vos partenaires et approvisionnements"
        action={
          <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B5E20] text-white font-bold text-[0.85rem] rounded-xl hover:-translate-y-0.5 transition-all border-none cursor-pointer">
            <FiPlus size={16} /> Nouveau fournisseur
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="relative flex items-center gap-4 p-5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] border border-[#1B5E20]/20 rounded-[22px] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden">
          <div className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-white/15 text-white"><FiTruck size={20} /></div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.25rem] font-extrabold text-white tracking-tight truncate">{fournisseurs.length}</span>
            <span className="text-[0.8rem] font-bold text-white/70 truncate">Fournisseurs</span>
          </div>
        </div>
        <div className="relative flex items-center gap-4 p-5 bg-white border border-[#1B5E20]/10 rounded-[22px] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden">
          <div className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#FFD600]/10 text-[#F9A825]"><FiPackage size={20} /></div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.25rem] font-extrabold text-foreground tracking-tight truncate">{fournisseurs.reduce((s, f) => s + (f._count?.produits || 0), 0)}</span>
            <span className="text-[0.8rem] font-bold text-muted-foreground truncate">Produits liés</span>
          </div>
        </div>
        <div className="relative flex items-center gap-4 p-5 bg-white border border-[#1B5E20]/10 rounded-[22px] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden">
          <div className="w-[52px] h-[52px] flex items-center justify-center rounded-2xl shrink-0 bg-[#D32F2F]/10 text-[#D32F2F]"><FiArrowDownCircle size={20} /></div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.25rem] font-extrabold text-foreground tracking-tight truncate">{fournisseurs.reduce((s, f) => s + (f._count?.entreeStocks || 0), 0)}</span>
            <span className="text-[0.8rem] font-bold text-muted-foreground truncate">Entrées stock</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-[18px] shadow-sm focus-within:border-[#1B5E20] focus-within:shadow-[0_0_0_4px_rgba(27,94,32,0.08)] transition-all md:min-w-[360px]">
          <FiSearch className="text-gray-400" size={18} />
          <input type="text" placeholder="Rechercher un fournisseur..." className="border-none outline-none bg-transparent flex-1 text-[0.9rem] font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <span className="text-[0.85rem] font-bold text-muted-foreground">{filtered.length} fournisseur{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div>
        <div className="bg-white border border-[#1B5E20]/10 rounded-[24px] shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Fournisseur</th>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Adresse</th>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Produits</th>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Entrées</th>
                <th className="px-6 py-4 text-[0.72rem] font-extrabold text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white font-extrabold rounded-full shrink-0 text-sm">{f.nom.charAt(0).toUpperCase()}</div>
                      <strong className="text-[0.95rem] font-extrabold text-foreground block">{f.nom}</strong>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    <div className="flex flex-col gap-1.5">
                      {f.telephone && (
                        <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted-foreground"><FiPhone size={12} /> {f.telephone}</span>
                      )}
                      {f.email && (
                        <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted-foreground"><FiMail size={12} /> {f.email}</span>
                      )}
                      {!f.telephone && !f.email && <span className="text-muted-foreground/50">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    {f.adresse ? (
                      <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-muted-foreground"><FiMapPin size={12} /> {f.adresse}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle"><span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold min-w-[1.75rem]">{f._count?.produits || 0}</span></td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle"><span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-[#d4af37]/10 text-[#d4af37] rounded-full text-xs font-bold min-w-[1.75rem]">{f._count?.entreeStocks || 0}</span></td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    <div className="flex gap-2">
                      <button className="w-9 h-9 flex items-center justify-center border border-border rounded-xl bg-card shadow-sm text-muted-foreground transition-all hover:bg-[#1B5E20]/10 hover:border-[#1B5E20]/20 hover:text-[#1B5E20]" onClick={() => startEdit(f)} title="Modifier">
                        <FiEdit size={15} />
                      </button>
                      <button className="w-9 h-9 flex items-center justify-center border border-border rounded-xl bg-card shadow-sm text-muted-foreground transition-all hover:bg-[#D32F2F]/10 hover:border-[#D32F2F]/20 hover:text-[#D32F2F]" onClick={() => remove(f.id)} title="Supprimer">
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
              <FiTruck size={40} />
              <p className="text-[1.05rem] font-extrabold text-muted-foreground mt-4 mb-1">Aucun fournisseur trouvé</p>
              <span className="text-[0.85rem] font-medium">Ajoutez votre premier fournisseur</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border/60 rounded-[24px] w-full max-w-[520px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 p-6 border-b border-border/50">
              <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] rounded-xl shadow-[0_6px_20px_rgba(255,214,0,0.3)] shrink-0">
                {editing ? <FiEdit size={22} /> : <FiPlus size={22} />}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground m-0">{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h3>
                <p className="text-sm font-medium text-muted-foreground m-0">{editing ? 'Modifiez les informations' : 'Ajoutez un nouveau partenaire'}</p>
              </div>
              <button className="w-9 h-9 flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors shrink-0" onClick={() => setShowModal(false)}><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiUser className="text-muted-foreground" size={14} /> Nom <span className="text-destructive">*</span></label>
                  <input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required placeholder="Nom du fournisseur" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiPhone className="text-muted-foreground" size={14} /> Téléphone</label>
                    <input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+221 77 000 0000" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiMail className="text-muted-foreground" size={14} /> Email</label>
                    <input type="email" className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiMapPin className="text-muted-foreground" size={14} /> Adresse</label>
                  <input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse complète" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border/50 bg-muted/10">
                <button type="button" className="px-5 py-2.5 bg-white border border-border rounded-xl text-foreground font-bold hover:bg-muted/50 transition-colors" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white rounded-xl font-bold shadow-md shadow-[#1B5E20]/20 hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none" disabled={submitting}>
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheckCircle size={16} />}
                  {submitting ? 'Enregistrement...' : (editing ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
