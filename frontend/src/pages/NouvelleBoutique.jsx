import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiArrowLeft, FiArrowRight, FiCheck, FiMapPin, FiPhone, FiMail,
  FiGlobe, FiShoppingBag, FiStar, FiPackage, FiUsers, FiTrendingUp,
  FiRefreshCw, FiZap, FiGrid, FiLayers, FiShield, FiClock,
  FiChevronRight, FiHome, FiTag
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import './NouvelleBoutique.css';

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
      toast.success('Boutique créée avec succès !');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect if not business
  if (!isBusiness) {
    return (
      <div className="nb-page">
        <div className="nb-restricted">
          <div className="nb-restricted-icon"><FiShield size={48} /></div>
          <h2>Plan Business requis</h2>
          <p>La création de nouvelles boutiques est réservée au plan Business.</p>
          <button className="nb-btn-upgrade" onClick={() => navigate('/app/abonnement')}>
            <FiZap size={16} /> Passer au Business
          </button>
        </div>
      </div>
    );
  }

  // Success screen
  if (success && createdBoutique) {
    return (
      <div className="nb-page">
        <div className="nb-success-screen">
          <div className="nb-success-bg">
            <div className="nb-success-ring r1" />
            <div className="nb-success-ring r2" />
            <div className="nb-success-ring r3" />
          </div>
          <div className="nb-success-content">
            <div className="nb-success-check">
              <FiCheck size={40} />
            </div>
            <h1>Boutique créée !</h1>
            <p className="nb-success-name">{createdBoutique.nom}</p>
            <p className="nb-success-slug">/{createdBoutique.slug}</p>

            <div className="nb-success-features">
              <div className="nb-sf-item">
                <FiPackage size={16} />
                <span>5 catégories par défaut créées</span>
              </div>
              <div className="nb-sf-item">
                <FiShield size={16} />
                <span>Plan {createdBoutique.plan} hérité</span>
              </div>
              <div className="nb-sf-item">
                <FiGlobe size={16} />
                <span>Connectée à votre réseau</span>
              </div>
            </div>

            <div className="nb-success-actions">
              <button className="nb-btn-secondary" onClick={() => navigate('/app/boutiques')}>
                <FiGrid size={16} /> Voir mes boutiques
              </button>
              <button className="nb-btn-primary" onClick={() => {
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
    <div className="nb-page">
      {/* Top bar */}
      <div className="nb-topbar">
        <button className="nb-back-btn" onClick={() => navigate('/app/boutiques')}>
          <FiArrowLeft size={18} />
          <span>Mes Boutiques</span>
        </button>
        <div className="nb-stepper">
          {[1, 2, 3].map(s => (
            <div key={s} className={`nb-step-dot ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}>
              {step > s ? <FiCheck size={12} /> : s}
            </div>
          ))}
          <div className="nb-step-track">
            <div className="nb-step-fill" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
          </div>
        </div>
        <div className="nb-step-label">
          Étape {step}/{totalSteps}
        </div>
      </div>

      {/* Main content */}
      <div className="nb-main">
        {/* Left: Form */}
        <div className="nb-form-side">
          <div className="nb-form-container">
            {/* Step 1: Identity */}
            <div className={`nb-step-panel ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>
              <div className="nb-step-header">
                <div className="nb-step-icon-wrap">
                  <FiShoppingBag size={22} />
                </div>
                <div>
                  <h2>Identité de la boutique</h2>
                  <p>Choisissez un nom qui représente votre point de vente</p>
                </div>
              </div>

              <div className="nb-fields">
                <div className="nb-field">
                  <label className="nb-label">
                    <FiTag size={14} />
                    Nom de la boutique
                    <span className="nb-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="nb-input"
                    value={form.nom}
                    onChange={handleNomChange}
                    placeholder="Ex: Boutique Pikine Centre"
                    autoFocus
                  />
                  <span className="nb-hint">Le nom visible par vos clients et votre équipe</span>
                </div>

                <div className="nb-field">
                  <label className="nb-label">
                    <FiGlobe size={14} />
                    Identifiant unique (slug)
                    <span className="nb-required">*</span>
                  </label>
                  <div className="nb-slug-wrap">
                    <span className="nb-slug-prefix">tekkipro.com/</span>
                    <input
                      type="text"
                      className="nb-input nb-slug-input"
                      value={form.slug}
                      onChange={handleSlugChange}
                      placeholder="boutique-pikine-centre"
                    />
                  </div>
                  <span className="nb-hint">URL unique — lettres minuscules, chiffres et tirets uniquement</span>
                </div>
              </div>
            </div>

            {/* Step 2: Contact */}
            <div className={`nb-step-panel ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
              <div className="nb-step-header">
                <div className="nb-step-icon-wrap orange">
                  <FiMapPin size={22} />
                </div>
                <div>
                  <h2>Coordonnées</h2>
                  <p>Informations de contact pour cette boutique (optionnel)</p>
                </div>
              </div>

              <div className="nb-fields">
                <div className="nb-field">
                  <label className="nb-label">
                    <FiMapPin size={14} />
                    Adresse
                  </label>
                  <input
                    type="text"
                    className="nb-input"
                    value={form.adresse}
                    onChange={e => setForm(prev => ({ ...prev, adresse: e.target.value }))}
                    placeholder="Quartier, Rue, Ville"
                  />
                </div>

                <div className="nb-field-row">
                  <div className="nb-field">
                    <label className="nb-label">
                      <FiPhone size={14} />
                      Téléphone
                    </label>
                    <input
                      type="text"
                      className="nb-input"
                      value={form.telephone}
                      onChange={e => setForm(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="+221 7X XXX XX XX"
                    />
                  </div>
                  <div className="nb-field">
                    <label className="nb-label">
                      <FiMail size={14} />
                      Email
                    </label>
                    <input
                      type="email"
                      className="nb-input"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contact@boutique.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Confirmation */}
            <div className={`nb-step-panel ${step === 3 ? 'active' : ''}`}>
              <div className="nb-step-header">
                <div className="nb-step-icon-wrap green">
                  <FiCheck size={22} />
                </div>
                <div>
                  <h2>Récapitulatif</h2>
                  <p>Vérifiez les informations avant de créer votre boutique</p>
                </div>
              </div>

              <div className="nb-recap">
                <div className="nb-recap-section">
                  <h4><FiShoppingBag size={14} /> Identité</h4>
                  <div className="nb-recap-row">
                    <span className="nb-recap-label">Nom</span>
                    <span className="nb-recap-value">{form.nom || '—'}</span>
                  </div>
                  <div className="nb-recap-row">
                    <span className="nb-recap-label">Slug</span>
                    <span className="nb-recap-value nb-slug-display">/{form.slug || '—'}</span>
                  </div>
                </div>

                <div className="nb-recap-section">
                  <h4><FiMapPin size={14} /> Coordonnées</h4>
                  <div className="nb-recap-row">
                    <span className="nb-recap-label">Adresse</span>
                    <span className="nb-recap-value">{form.adresse || 'Non renseignée'}</span>
                  </div>
                  <div className="nb-recap-row">
                    <span className="nb-recap-label">Téléphone</span>
                    <span className="nb-recap-value">{form.telephone || 'Non renseigné'}</span>
                  </div>
                  <div className="nb-recap-row">
                    <span className="nb-recap-label">Email</span>
                    <span className="nb-recap-value">{form.email || 'Non renseigné'}</span>
                  </div>
                </div>

                <div className="nb-recap-section nb-recap-inherit">
                  <h4><FiShield size={14} /> Hérité automatiquement</h4>
                  <div className="nb-inherit-chips">
                    <div className="nb-chip"><FiStar size={12} /> Plan {boutique?.plan || 'BUSINESS'}</div>
                    <div className="nb-chip"><FiGlobe size={12} /> Devise {boutique?.devise || 'FCFA'}</div>
                    <div className="nb-chip"><FiLayers size={12} /> 5 catégories par défaut</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="nb-actions">
              {step > 1 && (
                <button className="nb-btn-back" onClick={handleBack}>
                  <FiArrowLeft size={16} />
                  Retour
                </button>
              )}
              <div className="nb-actions-right">
                {step < totalSteps ? (
                  <button
                    className="nb-btn-next"
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    Continuer
                    <FiArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="nb-btn-create"
                    onClick={handleSubmit}
                    disabled={submitting || !form.nom.trim() || !form.slug.trim()}
                  >
                    {submitting ? (
                      <><FiRefreshCw className="nb-spin" size={16} /> Création en cours...</>
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
        <div className="nb-preview-side">
          <div className="nb-preview-sticky">
            <div className="nb-preview-label">
              <FiGrid size={14} />
              Aperçu en temps réel
            </div>
            <div className="nb-preview-card">
              <div className="nb-preview-card-bg">
                <div className="nb-pv-orb nb-pv-orb-1" />
                <div className="nb-pv-orb nb-pv-orb-2" />
              </div>
              
              {/* Avatar */}
              <div className="nb-preview-avatar">
                {form.nom ? form.nom.charAt(0).toUpperCase() : '?'}
              </div>

              {/* Name */}
              <h3 className="nb-preview-name">
                {form.nom || 'Nom de la boutique'}
              </h3>
              <span className="nb-preview-slug">
                /{form.slug || 'slug-de-la-boutique'}
              </span>

              {/* Contact preview */}
              <div className="nb-preview-infos">
                {form.adresse && (
                  <div className="nb-preview-info">
                    <FiMapPin size={13} />
                    <span>{form.adresse}</span>
                  </div>
                )}
                {form.telephone && (
                  <div className="nb-preview-info">
                    <FiPhone size={13} />
                    <span>{form.telephone}</span>
                  </div>
                )}
                {form.email && (
                  <div className="nb-preview-info">
                    <FiMail size={13} />
                    <span>{form.email}</span>
                  </div>
                )}
                {!form.adresse && !form.telephone && !form.email && (
                  <div className="nb-preview-info nb-preview-info-empty">
                    <FiMapPin size={13} />
                    <span>Les coordonnées apparaîtront ici</span>
                  </div>
                )}
              </div>

              {/* Mini metrics */}
              <div className="nb-preview-metrics">
                <div className="nb-pm-item">
                  <FiPackage size={14} />
                  <span>0 produits</span>
                </div>
                <div className="nb-pm-item">
                  <FiUsers size={14} />
                  <span>0 clients</span>
                </div>
                <div className="nb-pm-item">
                  <FiTrendingUp size={14} />
                  <span>0 ventes</span>
                </div>
              </div>

              {/* Inherited info */}
              <div className="nb-preview-footer">
                <div className="nb-pf-badge plan">
                  <FiStar size={11} /> {boutique?.plan || 'BUSINESS'}
                </div>
                <div className="nb-pf-badge network">
                  <FiHome size={11} /> Rattachée à {boutique?.nom || 'Boutique principale'}
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="nb-tips">
              <h5><FiZap size={14} /> Conseils</h5>
              <ul>
                <li>Choisissez un nom court et mémorable</li>
                <li>Le slug doit être unique dans tout le système</li>
                <li>Les coordonnées peuvent être ajoutées plus tard</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
