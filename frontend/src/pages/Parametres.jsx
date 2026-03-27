import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { useAuth } from '../context/useAuth';
import { FiSettings, FiSave, FiMapPin, FiPhone, FiFileText, FiDollarSign, FiShield, FiUser, FiMail, FiCalendar, FiHash, FiGlobe, FiAlertCircle, FiCamera, FiCheckCircle } from 'react-icons/fi';
import PageHeader from '../components/PageHeader';

export default function Parametres() {
  const { user } = useAuth();
  const [boutique, setBoutique] = useState(null);
  const [form, setForm] = useState({ nom: '', adresse: '', telephone: '', devise: '', ninea: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalForm, setOriginalForm] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (originalForm) {
      const changed = Object.keys(form).some(k => form[k] !== originalForm[k]);
      setHasChanges(changed);
    }
  }, [form, originalForm]);

  const load = async () => {
    try {
      const res = await api.get('/boutique');
      const b = res.data.data;
      setBoutique(b);
      const f = {
        nom: b.nom || '',
        adresse: b.adresse || '',
        telephone: b.telephone || '',
        devise: b.devise || 'FCFA',
        ninea: b.ninea || '',
      };
      setForm(f);
      setOriginalForm(f);
    } catch { toast.error('Erreur de chargement des paramètres'); } finally { setLoading(false); }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    setUploadingLogo(true);
    try {
      const res = await api.post('/boutique/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBoutique(prev => ({ ...prev, logo: res.data.data.logo }));
      toast.success('Logo mis à jour avec succès');
    } catch (e) {
      toast.error(getApiErrorMessage(e, { fallback: 'Erreur lors de l\'upload du logo' }));
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/boutique', form);
      toast.success(getApiSuccessMessage(response, { fallback: getLocalSuccessMessage({ entity: 'settings', action: 'update' }) }));
      load();
    } catch (e) { toast.error(getApiErrorMessage(e, { fallback: 'Erreur lors de la sauvegarde' })); }
    finally { setSaving(false); }
  };

  const devises = [
    { value: 'FCFA', label: 'FCFA', desc: 'Franc CFA' },
    { value: 'GNF', label: 'GNF', desc: 'Franc Guinéen' },
    { value: 'XOF', label: 'XOF', desc: 'Franc CFA BCEAO' },
    { value: 'NGN', label: 'NGN', desc: 'Naira' },
    { value: 'GHS', label: 'GHS', desc: 'Cedi' },
    { value: 'KES', label: 'KES', desc: 'Shilling Kenyan' },
    { value: 'MAD', label: 'MAD', desc: 'Dirham' },
    { value: 'EUR', label: 'EUR', desc: 'Euro' },
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-transparent font-sans pb-10">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-10 h-10 border-4 border-[#1B5E20]/20 border-t-[#1B5E20] rounded-full animate-spin" />
          <span className="text-[0.9rem] font-semibold text-gray-500">Initialisation du système de gestion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 flex flex-col gap-6 font-sans">

      <PageHeader
        icon={<FiSettings size={20} />}
        title="Paramètres"
        subtitle="Configurez votre boutique"
        action={hasChanges && (
          <button onClick={handleSubmit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B5E20] text-white font-bold text-[0.85rem] rounded-xl hover:-translate-y-0.5 transition-all border-none cursor-pointer disabled:opacity-70">
            <FiSave size={16} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* Colonne principale — Formulaire */}
        <div className="flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* Section — Identité de la Boutique */}
            <div className="bg-white border border-[#1B5E20]/10 rounded-[22px] shadow-sm p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1B5E20]/10 text-[#1B5E20] shrink-0">
                  <FiFileText size={18} />
                </div>
                <h2 className="text-[1rem] font-extrabold text-[#1B5E20] m-0" style={{ fontFamily: 'Sora,sans-serif' }}>Identité de la Boutique</h2>
              </div>

              {/* Logo upload */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 bg-[#F9FBF9] rounded-xl border-2 border-dashed border-[#1B5E20]/15 hover:border-[#1B5E20]/40 transition-colors">
                <div className="w-20 h-20 rounded-xl bg-white border-2 border-[#1B5E20]/15 overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
                  {boutique?.logo
                    ? <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${boutique.logo}`} alt="Logo boutique" className="w-full h-full object-cover" />
                    : <div className="flex items-center justify-center text-[#1B5E20]/25 w-full h-full"><FiCamera size={28} /></div>
                  }
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[0.9rem] font-bold text-gray-800 block">Identité Visuelle (Logo)</span>
                  <span className="text-[0.78rem] text-gray-500 mt-0.5 mb-3 block">PNG, JPG de haute qualité recommandé</span>
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleLogoChange} />
                  <button
                    type="button"
                    className="px-4 py-2 bg-white border-2 border-[#1B5E20]/20 text-[0.8rem] font-bold rounded-lg hover:border-[#FFD600] hover:text-[#1B5E20] hover:bg-[#FFD600]/10 transition-all flex items-center gap-2 text-gray-700 disabled:opacity-60"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <FiCamera size={14} className="text-[#FFD600]" />
                    {uploadingLogo ? 'Upload...' : 'Mettre à jour l\'image'}
                  </button>
                </div>
              </div>

              {/* Nom */}
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-[0.82rem] font-semibold text-gray-700">
                  <FiGlobe size={14} className="text-[#1B5E20]" /> Nom Commercial
                </label>
                <input
                  className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold text-gray-800 transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Entrez le nom de votre boutique"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Adresse */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[0.82rem] font-semibold text-gray-700">
                    <FiMapPin size={14} className="text-[#1B5E20]" /> Siège Social / Adresse
                  </label>
                  <input
                    className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold text-gray-800 transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                    type="text"
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                    placeholder="Localisation physique"
                  />
                </div>

                {/* Téléphone */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[0.82rem] font-semibold text-gray-700">
                    <FiPhone size={14} className="text-[#1B5E20]" /> Contact Téléphonique
                  </label>
                  <input
                    className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold text-gray-800 transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                    type="text"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="+221 ..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* NINEA */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[0.82rem] font-semibold text-gray-700">
                    <FiHash size={14} className="text-[#1B5E20]" /> Numéro NINEA
                  </label>
                  <input
                    className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold text-gray-800 transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                    type="text"
                    value={form.ninea}
                    onChange={(e) => setForm({ ...form, ninea: e.target.value })}
                    placeholder="Identification Fiscale"
                  />
                </div>

                {/* Devise */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-[0.82rem] font-semibold text-gray-700">
                    <FiDollarSign size={14} className="text-[#1B5E20]" /> Unité Monétaire
                  </label>
                  <select
                    className="w-full py-3 px-4 bg-white border-2 border-gray-100 rounded-xl text-[0.9rem] font-semibold text-gray-800 transition-all focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-[#1B5E20]/10"
                    value={form.devise}
                    onChange={(e) => setForm({ ...form, devise: e.target.value })}
                  >
                    {devises.map(d => (
                      <option key={d.value} value={d.value}>{d.label} - {d.desc}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Barre d'action */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white font-extrabold text-[0.9rem] rounded-xl shadow-[0_6px_20px_rgba(27,94,32,0.3)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(27,94,32,0.35)] transition-all border-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none"
                disabled={saving || !hasChanges}
                style={{ fontFamily: 'Sora,sans-serif' }}
              >
                <FiSave size={17} />
                {saving ? 'Sauvegarde...' : 'Appliquer les changements'}
              </button>
              {hasChanges && (
                <button
                  type="button"
                  className="px-6 py-3 bg-transparent border-2 border-gray-200 text-gray-600 font-semibold text-[0.9rem] rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  onClick={() => setForm({ ...originalForm })}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Sidebar — Cartes d'information */}
        <div className="flex flex-col gap-6">

          {/* Statut de Compte */}
          <div className="bg-white border border-[#1B5E20]/10 rounded-[22px] shadow-sm p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#FFD600]/15 text-[#F9A825] shrink-0">
                <FiShield size={18} />
              </div>
              <h2 className="text-[1rem] font-extrabold text-[#1B5E20] m-0" style={{ fontFamily: 'Sora,sans-serif' }}>Statut de Compte</h2>
            </div>
            <div className="bg-[#1B5E20]/5 border-2 border-[#1B5E20]/10 p-4 rounded-xl flex flex-col gap-1">
              <span className="text-[0.72rem] font-bold text-gray-500 uppercase tracking-wider">Votre Forfait</span>
              <span className="text-xl font-black text-[#1B5E20]">{boutique?.plan}</span>
            </div>
            <a
              href="/app/abonnement"
              className="block text-center px-4 py-3 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white rounded-xl font-bold text-[0.88rem] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(27,94,32,0.28)] transition-all"
              style={{ fontFamily: 'Sora,sans-serif' }}
            >
              Évoluer vers une version supérieure
            </a>
          </div>

          {/* Détails Sécurisés */}
          {boutique && (
            <div className="bg-white border border-[#1B5E20]/10 rounded-[22px] shadow-sm p-6 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1B5E20]/10 text-[#1B5E20] shrink-0">
                  <FiUser size={18} />
                </div>
                <h2 className="text-[1rem] font-extrabold text-[#1B5E20] m-0" style={{ fontFamily: 'Sora,sans-serif' }}>Détails Sécurisés</h2>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                  <FiUser size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <span className="block text-[0.68rem] font-bold text-gray-400 uppercase tracking-widest">Propriétaire</span>
                    <span className="block text-[0.9rem] font-semibold text-gray-800 truncate">{user?.prenom} {user?.nom}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                  <FiMail size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <span className="block text-[0.68rem] font-bold text-gray-400 uppercase tracking-widest">Email de Gestion</span>
                    <span className="block text-[0.9rem] font-semibold text-gray-800 truncate">{user?.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                  <FiGlobe size={14} className="text-gray-400 shrink-0" />
                  <div>
                    <span className="block text-[0.68rem] font-bold text-gray-400 uppercase tracking-widest">Identifiant de Boutique</span>
                    <span className="text-[0.8rem] font-semibold font-mono bg-[#FFD600]/15 text-[#D4880F] px-2.5 py-1 rounded-md">{boutique.slug}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
