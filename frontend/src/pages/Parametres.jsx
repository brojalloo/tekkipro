import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FiSettings, FiSave, FiMapPin, FiPhone, FiFileText, FiDollarSign, FiShield, FiUser, FiMail, FiCalendar, FiHash, FiGlobe, FiAlertCircle } from 'react-icons/fi';
import './Parametres.css';

export default function Parametres() {
  const { user } = useAuth();
  const [boutique, setBoutique] = useState(null);
  const [form, setForm] = useState({ nom: '', adresse: '', telephone: '', devise: '', ninea: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalForm, setOriginalForm] = useState(null);

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
    } catch (e) { toast.error('Erreur de chargement des paramètres'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/boutique', form);
      toast.success('Paramètres mis à jour avec succès');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur lors de la sauvegarde'); }
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
      <div className="prm-page">
        <div className="prm-loader">
          <div className="prm-loader-ring" />
          <span>Chargement des paramètres...</span>
        </div>
      </div>
    );
  }

  const planColors = {
    GRATUIT: { bg: 'rgba(107,114,128,0.08)', color: '#6b7280', border: 'rgba(107,114,128,0.15)' },
    PRO: { bg: 'rgba(99,102,241,0.08)', color: '#6366f1', border: 'rgba(99,102,241,0.2)' },
    BUSINESS: { bg: 'rgba(16,185,129,0.08)', color: '#10b981', border: 'rgba(16,185,129,0.2)' },
  };
  const pc = planColors[boutique?.plan] || planColors.GRATUIT;

  return (
    <div className="prm-page">
      {/* Header */}
      <div className="prm-header">
        <div className="prm-header-bg" />
        <div className="prm-header-content">
          <div className="prm-header-left">
            <div className="prm-header-icon">
              <FiSettings size={24} />
            </div>
            <div>
              <h1>Paramètres de la Boutique</h1>
              <p>Gérez les informations et la configuration de votre boutique</p>
            </div>
          </div>
          {hasChanges && (
            <div className="prm-unsaved-badge">
              <FiAlertCircle size={14} />
              Modifications non sauvegardées
            </div>
          )}
        </div>
      </div>

      <div className="prm-content">
        {/* Left Column - Form */}
        <div className="prm-main">
          <form onSubmit={handleSubmit}>
            {/* General Info Section */}
            <div className="prm-section">
              <div className="prm-section-header">
                <div className="prm-section-icon blue">
                  <FiFileText size={18} />
                </div>
                <div>
                  <h2>Informations générales</h2>
                  <p>Les informations de base de votre boutique</p>
                </div>
              </div>

              <div className="prm-fields">
                <div className="prm-field">
                  <label>
                    <FiGlobe size={14} />
                    Nom de la boutique
                    <span className="prm-req">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="Ma Boutique"
                    required
                  />
                </div>

                <div className="prm-field-row">
                  <div className="prm-field">
                    <label>
                      <FiMapPin size={14} />
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={form.adresse}
                      onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                      placeholder="Rue, ville, pays"
                    />
                  </div>
                  <div className="prm-field">
                    <label>
                      <FiPhone size={14} />
                      Telephone
                    </label>
                    <input
                      type="text"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      placeholder="+221 77 123 45 67"
                    />
                  </div>
                </div>

                <div className="prm-field-row">
                  <div className="prm-field">
                    <label>
                      <FiHash size={14} />
                      NINEA
                    </label>
                    <input
                      type="text"
                      value={form.ninea}
                      onChange={(e) => setForm({ ...form, ninea: e.target.value })}
                      placeholder="Numero NINEA"
                    />
                    <span className="prm-hint">Numéro d'identification fiscale</span>
                  </div>
                  <div className="prm-field">
                    <label>
                      <FiDollarSign size={14} />
                      Devise
                    </label>
                    <select
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
            </div>

            {/* Save Button */}
            <div className="prm-save-bar">
              <button type="submit" className="prm-btn-save" disabled={saving || !hasChanges}>
                {saving ? (
                  <>
                    <div className="prm-btn-spinner" />
                    Sauvegarde en cours...
                  </>
                ) : (
                  <>
                    <FiSave size={16} />
                    Enregistrer les modifications
                  </>
                )}
              </button>
              {hasChanges && (
                <button
                  type="button"
                  className="prm-btn-reset"
                  onClick={() => setForm({ ...originalForm })}
                >
                  Annuler les modifications
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column - Account Info */}
        <div className="prm-sidebar">
          {/* Plan Card */}
          <div className="prm-info-card">
            <div className="prm-info-header">
              <div className="prm-info-icon green">
                <FiShield size={18} />
              </div>
              <h3>Abonnement</h3>
            </div>
            <div className="prm-plan-display" style={{ background: pc.bg, borderColor: pc.border }}>
              <span className="prm-plan-label">Plan actuel</span>
              <span className="prm-plan-name" style={{ color: pc.color }}>{boutique?.plan}</span>
            </div>
            <a href="/app/abonnement" className="prm-link-btn">
              Gerer l'abonnement
            </a>
          </div>

          {/* Account Info Card */}
          {boutique && (
            <div className="prm-info-card">
              <div className="prm-info-header">
                <div className="prm-info-icon purple">
                  <FiUser size={18} />
                </div>
                <h3>Informations du compte</h3>
              </div>
              <div className="prm-account-rows">
                <div className="prm-account-row">
                  <div className="prm-account-icon"><FiUser size={14} /></div>
                  <div>
                    <span className="prm-account-label">Propriétaire</span>
                    <span className="prm-account-value">{user?.prenom} {user?.nom}</span>
                  </div>
                </div>
                <div className="prm-account-row">
                  <div className="prm-account-icon"><FiMail size={14} /></div>
                  <div>
                    <span className="prm-account-label">Email</span>
                    <span className="prm-account-value">{user?.email}</span>
                  </div>
                </div>
                <div className="prm-account-row">
                  <div className="prm-account-icon"><FiGlobe size={14} /></div>
                  <div>
                    <span className="prm-account-label">Slug</span>
                    <span className="prm-account-value prm-slug">{boutique.slug}</span>
                  </div>
                </div>
                <div className="prm-account-row">
                  <div className="prm-account-icon"><FiCalendar size={14} /></div>
                  <div>
                    <span className="prm-account-label">Date de création</span>
                    <span className="prm-account-value">{new Date(boutique.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
