import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import toast from 'react-hot-toast';
import { getApiErrorMessage, isUpgradeRequiredError } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { showUpgradeToast } from '../lib/upgradeToast';
import {
  FiPlus, FiEdit, FiTrash2, FiSearch, FiPhone, FiDollarSign,
  FiUsers, FiMapPin, FiUser, FiShoppingCart, FiAlertCircle,
  FiCheckCircle, FiX, FiMail
} from 'react-icons/fi';
import { PlanLimitBanner } from '../components/UpgradeBanner';
import PageHeader from '../components/PageHeader';

export default function Clients() {
  const navigate = useNavigate();
  const { planLimits } = useAuth();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', adresse: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadClients = useCallback(async (searchValue = '') => {
    try {
      const res = await api.get('/clients', { params: { search: searchValue || undefined } });
      setClients(res.data.data);
    } catch { toast.error('Erreur de chargement des clients'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingClient) {
        const response = await api.put(`/clients/${editingClient.id}`, form);
        toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'client', action: 'update' }) }));
      } else {
        const response = await api.post('/clients', form);
        toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'client', action: 'create' }) }));
      }
      setShowModal(false);
      setForm({ nom: '', prenom: '', telephone: '', adresse: '' });
      setEditingClient(null);
      loadClients(search);
    } catch (error) {
      const message = getApiErrorMessage(error, { fallback: 'Erreur lors de l\'enregistrement' });
      if (isUpgradeRequiredError(error)) {
        showUpgradeToast({ message, navigate });
      } else {
        toast.error(message);
      }
    } finally { setSubmitting(false); }
  };

  const startEdit = (client) => {
    setEditingClient(client);
    setForm({ nom: client.nom, prenom: client.prenom || '', telephone: client.telephone || '', adresse: client.adresse || '' });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingClient(null);
    setForm({ nom: '', prenom: '', telephone: '', adresse: '' });
    setShowModal(true);
  };

  const deleteClient = async (id) => {
    if (!window.confirm('Supprimer ce client ?')) return;
    try {
      const response = await api.delete(`/clients/${id}`);
      toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'client', action: 'delete' }) }));
      loadClients(search);
    } catch { toast.error('Impossible: le client a des ventes'); }
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';

  const totalDettes = clients.reduce((s, c) => s + (c.totalDettes || 0), 0);
  const totalVentes = clients.reduce((s, c) => s + (c.nombreVentes || 0), 0);
  const clientsAvecDettes = clients.filter(c => c.totalDettes > 0).length;

  const filtered = clients.filter(c => {
    const term = search.toLowerCase();
    return (c.nom || '').toLowerCase().includes(term) ||
           (c.prenom || '').toLowerCase().includes(term) ||
           (c.telephone || '').includes(term);
  });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col font-sans pb-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" /><p>Chargement...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent flex flex-col font-sans pb-10">
      <div className="px-6 md:px-8 pt-6 md:pt-8">
        <PageHeader
          icon={<FiUsers size={20} />}
          title="Clients"
          subtitle="Gérez votre base de clients"
          action={
            <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B5E20] text-white font-bold text-[0.88rem] rounded-[14px] shadow-md shadow-[#1B5E20]/20 hover:bg-[#155230] hover:-translate-y-0.5 transition-all">
              <FiPlus size={16} /> Nouveau client
            </button>
          }
        />
      </div>

      {/* Plan Limit Banner */}
      <PlanLimitBanner label="clients" current={clients.length} limit={planLimits.clients} icon={<FiUsers size={14} />} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-6 md:p-8 pb-0">
        {/* Total clients — green fill */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] rounded-[22px] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white shrink-0"><FiUsers size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[1.5rem] font-extrabold text-white tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>{clients.length}</span>
            <span className="text-[0.8rem] font-bold text-white/65">Total clients</span>
          </div>
        </div>
        {/* Ventes totales */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[22px] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1B5E20]/10 text-[#1B5E20] shrink-0"><FiShoppingCart size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[1.5rem] font-extrabold text-foreground tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>{totalVentes}</span>
            <span className="text-[0.8rem] font-bold text-muted-foreground">Ventes totales</span>
          </div>
        </div>
        {/* Dettes en cours */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[22px] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0"><FiAlertCircle size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[1.5rem] font-extrabold text-destructive tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(totalDettes)}</span>
            <span className="text-[0.8rem] font-bold text-muted-foreground">Dettes en cours</span>
          </div>
        </div>
        {/* Clients avec dettes — amber/white card */}
        <div className="relative flex flex-col gap-3 p-5 bg-gradient-to-b from-white to-slate-50 border border-[#FFD600]/30 rounded-[22px] shadow-sm hover:-translate-y-1 hover:shadow-md transition-all overflow-hidden">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FFD600]/15 text-[#F9A825] shrink-0"><FiDollarSign size={18} /></div>
          <div className="flex flex-col">
            <span className="text-[1.5rem] font-extrabold text-foreground tracking-tight" style={{fontFamily:'Sora,sans-serif'}}>{clientsAvecDettes}</span>
            <span className="text-[0.8rem] font-bold text-muted-foreground">Avec dettes</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 pb-0">
        <form className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 bg-muted/30 border border-border/80 rounded-2xl md:min-w-[360px] focus-within:border-[#1B5E20] focus-within:shadow-[0_0_0_4px_rgba(27,94,32,0.08)] transition-all" onSubmit={(e) => { e.preventDefault(); loadClients(search); }}>
          <FiSearch size={16} />
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground w-full"
            placeholder="Rechercher par nom, prénom, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="px-4 py-2 bg-muted text-muted-foreground font-bold text-xs rounded-xl hover:bg-muted/80 transition-colors">Chercher</button>
        </form>
        <span className="text-[0.85rem] font-bold text-muted-foreground">{filtered.length} client{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="p-6 md:p-8">
        <div className="bg-gradient-to-b from-white to-slate-50 border border-border/80 rounded-[24px] shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#1B5E20]/[0.04] border-b border-[#1B5E20]/10">
              <tr>
                <th className="px-6 py-4 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Téléphone</th>
                <th className="px-6 py-4 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Adresse</th>
                <th className="px-6 py-4 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Ventes</th>
                <th className="px-6 py-4 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Dettes</th>
                <th className="px-6 py-4 text-[0.72rem] font-bold text-[#1B5E20]/70 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={`transition-all ${c.totalDettes > 0 ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/50'}`}>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white rounded-full font-bold shadow-md shadow-[#1B5E20]/20 shrink-0">
                        {(c.prenom || c.nom || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong className="text-[0.95rem] font-extrabold text-foreground block">{c.prenom} {c.nom}</strong>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    {c.telephone ? (
                      <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-muted-foreground"><FiPhone size={13} /> {c.telephone}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    {c.adresse ? (
                      <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-muted-foreground"><FiMapPin size={12} /> {c.adresse}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle"><span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-[#1B5E20]/10 text-[#1B5E20] rounded-full text-xs font-bold min-w-[1.75rem]">{c.nombreVentes || 0}</span></td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    {c.totalDettes > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold whitespace-nowrap">
                        <FiDollarSign size={12} /> {formatCFA(c.totalDettes)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1B5E20]/10 text-[#1B5E20] rounded-full text-xs font-bold whitespace-nowrap">
                        <FiCheckCircle size={12} /> Aucune dette
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 border-b border-muted/50 align-middle">
                    <div className="flex gap-2">
                      <button className="w-9 h-9 flex items-center justify-center border border-[#1B5E20]/20 rounded-xl bg-card shadow-sm text-[#1B5E20]/60 transition-all hover:bg-[#1B5E20]/10 hover:border-[#1B5E20]/30 hover:text-[#1B5E20]" onClick={() => startEdit(c)} title="Modifier">
                        <FiEdit size={15} />
                      </button>
                      <button className="w-9 h-9 flex items-center justify-center border border-[#D32F2F]/20 rounded-xl bg-card shadow-sm text-[#D32F2F]/60 transition-all hover:bg-[#D32F2F]/10 hover:border-[#D32F2F]/30 hover:text-[#D32F2F]" onClick={() => deleteClient(c.id)} title="Supprimer">
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
              <FiUsers size={40} />
              <p className="text-[1.05rem] font-extrabold text-muted-foreground mt-4 mb-1">Aucun client trouvé</p>
              <span className="text-[0.85rem] font-medium">Ajoutez votre premier client</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border/60 rounded-[24px] w-full max-w-[520px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 p-6 border-b border-border/50">
              <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] rounded-xl shadow-[0_6px_20px_rgba(255,214,0,0.25)] shrink-0">
                {editingClient ? <FiEdit size={22} /> : <FiPlus size={22} />}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground m-0">{editingClient ? 'Modifier le client' : 'Nouveau client'}</h3>
                <p className="text-sm font-medium text-muted-foreground m-0">{editingClient ? 'Modifiez les informations' : 'Ajoutez un nouveau client'}</p>
              </div>
              <button className="w-9 h-9 flex items-center justify-center bg-muted/50 hover:bg-muted text-muted-foreground rounded-xl transition-colors shrink-0" onClick={() => setShowModal(false)}><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiUser className="text-muted-foreground" size={14} /> Prénom</label>
                    <input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiUser className="text-muted-foreground" size={14} /> Nom <span className="text-destructive">*</span></label>
                    <input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required placeholder="Nom de famille" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-1.5 text-sm font-bold text-foreground"><FiPhone className="text-muted-foreground" size={14} /> Téléphone</label>
                  <input className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm transition-all focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-muted-foreground" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+221 77 000 0000" />
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
                  {submitting ? 'Enregistrement...' : (editingClient ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
