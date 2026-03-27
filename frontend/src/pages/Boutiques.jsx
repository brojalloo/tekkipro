import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/useAuth';
import {
  FiGrid, FiPlus, FiTrash2, FiMapPin, FiPhone, FiMail,
  FiPackage, FiUsers, FiX,
  FiCheck, FiAlertTriangle, FiStar, FiRefreshCw,
  FiActivity, FiTrendingUp, FiGlobe, FiExternalLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import UpgradeBanner from '../components/UpgradeBanner';

export default function Boutiques() {
  const navigate = useNavigate();
  const { boutique, isAdmin, isBusiness, loadMesBoutiques, switchBoutique, activeBoutique } = useAuth();
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentBoutiqueId = activeBoutique || boutique?.id;
  const mainBoutiqueId = boutiques.find(b => !b.parentBoutiqueId)?.id || boutique?.id;
  const totalProduits = boutiques.reduce((a, b) => a + (b._count?.produits || 0), 0);
  const totalVentes = boutiques.reduce((a, b) => a + (b._count?.ventes || 0), 0);
  const totalClients = boutiques.reduce((a, b) => a + (b._count?.clients || 0), 0);

  const loadBoutiques = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/boutique/mes-boutiques');
      setBoutiques(res.data.data || []);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || !isBusiness) {
      setLoading(false);
      return;
    }

    loadBoutiques();
  }, [isAdmin, isBusiness, loadBoutiques]);

  const handleDelete = async (id) => {
    try {
      setSubmitting(true);
      const res = await api.delete(`/boutique/${id}`);
      toast.success(getApiSuccessMessage(res, { fallback: getLocalSuccessMessage({ entity: 'boutique', action: 'delete' }) }));
      setShowDeleteModal(null);
      loadBoutiques();
      loadMesBoutiques();
      if (id === currentBoutiqueId) {
        switchBoutique(mainBoutiqueId);
        window.location.reload();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, { fallback: 'Erreur lors de la suppression' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitch = (id) => {
    switchBoutique(id);
    window.location.reload();
  };

  if (!isAdmin || !isBusiness) {
    return (
      <div className="min-h-screen bg-transparent font-sans pb-10">
        <UpgradeBanner
          fullPage
          feature="Gestion multi-boutiques"
          requiredPlan="BUSINESS"
          currentPlan={boutique?.plan}
          theme="indigo"
          badge="Starter • Réseau mono-boutique"
          icon={<FiGrid size={30} />}
          title="Pilotez plusieurs boutiques depuis un seul espace"
          description="Le plan Business vous permet d'ajouter d'autres points de vente, de basculer entre vos sites et de garder une vision unifiée de votre réseau sans complexité."
          benefits={[
            'Créez plusieurs points de vente rattachés à votre activité',
            "Basculez d'une boutique à une autre sans quitter TekkiPro",
            "Suivez l'évolution de votre réseau depuis un tableau de bord central",
          ]}
          preview={[
            { value: 'Multi-sites', label: 'plusieurs points de vente reliés' },
            { value: 'Bascule', label: 'changez de boutique en un clic' },
            { value: 'Vue réseau', label: "pilotage global de l'activité" },
            { value: 'Croissance', label: "structure prête pour l'expansion" },
          ]}
          ctaLabel="Passer au plan Business"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">

      {/* ===== HERO HEADER ===== */}
      <div className="relative p-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071C08] via-[#0D2710] to-[#071C08] shadow-[0_8px_32px_rgba(7,28,8,0.35)]">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1B5E20] via-[#FFD600] to-[#D32F2F] rounded-t-[28px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(27,94,32,0.35),transparent_55%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] rounded-xl shadow-[0_6px_20px_rgba(255,214,0,0.3)] shrink-0">
              <FiGrid size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight m-0 mb-0.5 leading-tight" style={{ fontFamily: 'Sora,sans-serif' }}>Mes Boutiques</h1>
              <p className="text-[0.85rem] font-medium text-white/55 m-0">Gérez vos points de vente</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/boutiques/nouvelle')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] font-extrabold text-[0.9rem] rounded-xl shadow-[0_4px_14px_rgba(255,214,0,0.35)] hover:-translate-y-0.5 transition-all border-none cursor-pointer"
            style={{ fontFamily: 'Sora,sans-serif' }}
          >
            <FiPlus size={18} /> Nouvelle boutique
          </button>
        </div>
      </div>

      {/* ===== STATS OVERVIEW ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Points de vente — teal/green fill */}
        <div className="flex items-center gap-4 p-5 bg-[#1B5E20] rounded-2xl shadow-[0_4px_16px_rgba(27,94,32,0.25)] hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-white/15 text-white">
            <FiGlobe size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.6rem] font-extrabold text-white leading-none tracking-tight truncate">{boutiques.length}</span>
            <span className="text-[0.76rem] font-bold text-white/70 mt-1 truncate">Points de vente</span>
          </div>
        </div>

        {/* Produits — green fill */}
        <div className="flex items-center gap-4 p-5 bg-[#2E7D32] rounded-2xl shadow-[0_4px_16px_rgba(46,125,50,0.25)] hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-white/15 text-white">
            <FiPackage size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.6rem] font-extrabold text-white leading-none tracking-tight truncate">{totalProduits}</span>
            <span className="text-[0.76rem] font-bold text-white/70 mt-1 truncate">Produits au total</span>
          </div>
        </div>

        {/* Ventes — gold fill, dark text */}
        <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#FFD600] to-[#F9A825] rounded-2xl shadow-[0_4px_16px_rgba(255,214,0,0.3)] hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-[#071C08]/10 text-[#071C08]">
            <FiTrendingUp size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.6rem] font-extrabold text-[#071C08] leading-none tracking-tight truncate">{totalVentes}</span>
            <span className="text-[0.76rem] font-bold text-[#071C08]/60 mt-1 truncate">Ventes réalisées</span>
          </div>
        </div>

        {/* Clients — white card, teal/green accent */}
        <div className="flex items-center gap-4 p-5 bg-white border border-[#1B5E20]/20 rounded-2xl shadow-[0_4px_16px_rgba(27,94,32,0.08)] hover:-translate-y-0.5 transition-all">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 bg-[#1B5E20]/10 text-[#1B5E20]">
            <FiUsers size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[1.6rem] font-extrabold text-[#071C08] leading-none tracking-tight truncate">{totalClients}</span>
            <span className="text-[0.76rem] font-bold text-[#071C08]/50 mt-1 truncate">Clients enregistrés</span>
          </div>
        </div>
      </div>

      {/* ===== BOUTIQUE CARDS ===== */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-5 py-20 text-[0.88rem] font-bold text-muted-foreground">
          <div className="w-10 h-10 border-[3px] border-[#1B5E20]/20 border-t-[#1B5E20] rounded-full animate-spin" />
          <span>Chargement de vos boutiques...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {boutiques.map(b => {
            const isActive = b.id === currentBoutiqueId;
            const isMain = !b.parentBoutiqueId;
            return (
              <div
                key={b.id}
                className={`relative bg-white border rounded-[20px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-6 overflow-hidden ${isActive ? 'border-[#1B5E20]/40 shadow-[0_4px_16px_rgba(27,94,32,0.12)]' : 'border-gray-100'}`}
              >
                {/* Active top bar */}
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1B5E20] via-[#FFD600] to-[#1B5E20] rounded-t-[20px]" />
                )}

                {/* Badges */}
                <div className="flex gap-2 mb-4 min-h-[24px]">
                  {isMain && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.67rem] font-bold tracking-wide uppercase bg-[#1B5E20]/10 text-[#1B5E20] border border-[#1B5E20]/20">
                      <FiStar size={11} /> Siège
                    </span>
                  )}
                  {isActive && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.67rem] font-bold tracking-wide uppercase bg-[#1B5E20]/10 text-[#1B5E20] border border-[#1B5E20]/20">
                      <FiCheck size={11} /> Active
                    </span>
                  )}
                </div>

                {/* Top section */}
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-extrabold shrink-0 shadow-md"
                    style={{ background: isMain ? 'linear-gradient(135deg, #2E7D32, #1B5E20)' : 'linear-gradient(135deg, #388E3C, #2E7D32)' }}
                  >
                    {b.nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-[1.1rem] font-extrabold text-[#071C08] m-0 leading-tight">{b.nom}</h3>
                    <span className="inline-block mt-1 text-[0.72rem] text-gray-500 font-mono font-bold bg-gray-100 px-2 py-0.5 rounded">/{b.slug}</span>
                  </div>
                </div>

                {/* Info rows */}
                <div className="flex flex-col gap-1.5 mb-4">
                  {b.adresse && (
                    <div className="flex items-center gap-2 text-gray-500 font-medium text-[0.8rem]"><FiMapPin size={13} /><span>{b.adresse}</span></div>
                  )}
                  {b.telephone && (
                    <div className="flex items-center gap-2 text-gray-500 font-medium text-[0.8rem]"><FiPhone size={13} /><span>{b.telephone}</span></div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-2 text-gray-500 font-medium text-[0.8rem]"><FiMail size={13} /><span>{b.email}</span></div>
                  )}
                  {!b.adresse && !b.telephone && !b.email && (
                    <div className="text-gray-400 font-medium text-[0.78rem] italic py-1">Aucune info de contact</div>
                  )}
                </div>

                {/* Metrics */}
                <div className="flex items-center py-4 border-y border-gray-100 mb-4">
                  <div className="flex-1 text-center">
                    <div className="text-[1.15rem] font-extrabold text-[#071C08] leading-none">{b._count?.produits || 0}</div>
                    <div className="text-[0.68rem] font-bold text-gray-400 mt-1.5 uppercase tracking-wider">Produits</div>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-100 shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="text-[1.15rem] font-extrabold text-[#071C08] leading-none">{b._count?.ventes || 0}</div>
                    <div className="text-[0.68rem] font-bold text-gray-400 mt-1.5 uppercase tracking-wider">Ventes</div>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-100 shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="text-[1.15rem] font-extrabold text-[#071C08] leading-none">{b._count?.clients || 0}</div>
                    <div className="text-[0.68rem] font-bold text-gray-400 mt-1.5 uppercase tracking-wider">Clients</div>
                  </div>
                  <div className="w-[1px] h-8 bg-gray-100 shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="text-[1.15rem] font-extrabold text-[#071C08] leading-none">{b._count?.users || 0}</div>
                    <div className="text-[0.68rem] font-bold text-gray-400 mt-1.5 uppercase tracking-wider">Équipe</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5">
                  {isActive ? (
                    <div className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-[#1B5E20]/10 text-[#1B5E20] rounded-xl text-[0.78rem] font-bold">
                      <FiCheck size={14} /> Boutique en cours d'utilisation
                    </div>
                  ) : (
                    <button
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-white border border-[#1B5E20]/30 rounded-xl text-[#1B5E20] text-[0.82rem] font-bold cursor-pointer transition-all hover:bg-[#1B5E20] hover:text-white hover:-translate-y-[1px] shadow-sm"
                      onClick={() => handleSwitch(b.id)}
                    >
                      <FiExternalLink size={14} />
                      <span>Basculer vers cette boutique</span>
                    </button>
                  )}
                  {!isMain && (
                    <button
                      className="flex items-center justify-center w-10 h-10 bg-[#D32F2F]/10 border border-[#D32F2F]/20 rounded-xl text-[#D32F2F] hover:bg-[#D32F2F]/20 hover:border-[#D32F2F]/40 transition-all shrink-0"
                      onClick={() => setShowDeleteModal(b)}
                      title="Supprimer"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Card */}
          <div
            className="relative bg-white border border-dashed border-gray-200 flex flex-col items-center justify-center min-h-[340px] cursor-pointer p-8 rounded-[20px] transition-all hover:border-[#FFD600]/60 hover:bg-[#FFD600]/5 group"
            onClick={() => navigate('/app/boutiques/nouvelle')}
          >
            <div className="text-center">
              <div className="w-16 h-16 flex items-center justify-center bg-gray-100 text-gray-400 rounded-[18px] mx-auto mb-5 transition-all group-hover:bg-[#FFD600]/15 group-hover:text-[#F9A825] group-hover:scale-110">
                <FiPlus size={28} />
              </div>
              <h4 className="text-base font-extrabold text-[#071C08] mb-1.5">Nouveau point de vente</h4>
              <p className="text-[0.78rem] text-gray-400 font-medium max-w-[200px] mx-auto leading-relaxed">Créer une nouvelle boutique rattachée à votre réseau</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL SUPPRIMER ===== */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200"
          onClick={() => setShowDeleteModal(null)}
        >
          <div
            className="relative bg-white border border-gray-100 rounded-3xl w-[92%] max-w-[480px] max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header — red accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#D32F2F] via-[#EF5350] to-[#D32F2F] rounded-t-3xl" />

            <div className="flex items-center gap-4 p-7 pb-5 border-b border-gray-100">
              <div className="w-12 h-12 flex items-center justify-center bg-[#D32F2F]/10 text-[#D32F2F] rounded-xl shrink-0">
                <FiAlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-[1.1rem] font-bold text-[#071C08] m-0">Supprimer la boutique</h3>
                <p className="text-[0.78rem] font-medium text-gray-400 mt-1 mb-0">Cette action est irréversible</p>
              </div>
              <button
                className="absolute top-6 right-6 flex items-center justify-center w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-[#071C08] transition-all"
                onClick={() => setShowDeleteModal(null)}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-7">
              <div className="flex gap-4 p-4 bg-[#D32F2F]/8 border border-[#D32F2F]/15 text-[#D32F2F] rounded-xl">
                <FiAlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-1 text-[#B71C1C]">Attention !</strong>
                  <p className="text-sm m-0 text-[#D32F2F]">
                    La boutique <strong>"{showDeleteModal.nom}"</strong> et toutes ses données seront supprimées :
                    produits, ventes, clients, employés...
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100">
              <button
                className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-[#071C08] hover:bg-gray-50 transition-colors"
                onClick={() => setShowDeleteModal(null)}
              >
                Annuler
              </button>
              <button
                className="flex items-center gap-2 px-5 py-2.5 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-[#B71C1C] transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(211,47,47,0.35)]"
                onClick={() => handleDelete(showDeleteModal.id)}
                disabled={submitting}
              >
                {submitting
                  ? <><FiRefreshCw className="animate-spin" size={14} /> Suppression...</>
                  : <><FiTrash2 size={14} /> Supprimer définitivement</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
