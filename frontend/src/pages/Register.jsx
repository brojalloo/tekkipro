import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    nomBoutique: '', slug: '', nom: '', prenom: '', email: '', password: '', telephone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Générer le slug automatiquement
  const handleBoutiqueNameChange = (e) => {
    const nom = e.target.value;
    const slug = nom.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    setForm({ ...form, nomBoutique: nom, slug });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Boutique créée avec succès !');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>TekkiPro</h1>
        <p className="subtitle">Créez votre boutique en ligne</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nom de la boutique</label>
            <input type="text" className="form-control" value={form.nomBoutique}
              onChange={handleBoutiqueNameChange} placeholder="Ma Super Boutique" required />
            {form.slug && <small style={{ color: '#6b7280' }}>{form.slug}.tekkipro.com</small>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prénom</label>
              <input type="text" className="form-control" name="prenom" value={form.prenom}
                onChange={handleChange} placeholder="Moussa" required />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input type="text" className="form-control" name="nom" value={form.nom}
                onChange={handleChange} placeholder="Diop" required />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-control" name="email" value={form.email}
              onChange={handleChange} placeholder="moussa@email.com" required />
          </div>

          <div className="form-group">
            <label>Téléphone</label>
            <input type="tel" className="form-control" name="telephone" value={form.telephone}
              onChange={handleChange} placeholder="+221 77 123 45 67" />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" className="form-control" name="password" value={form.password}
              onChange={handleChange} placeholder="Minimum 6 caractères" required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Création...' : 'Créer ma boutique'}
          </button>
        </form>

        <p className="link">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
