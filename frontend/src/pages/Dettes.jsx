import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiDollarSign, FiCheck, FiClock, FiUsers, FiRefreshCw, FiCheckCircle, FiList, FiPhone, FiCreditCard } from 'react-icons/fi';

export default function Dettes() {
  const [data, setData] = useState({ dettes: [], totalDettes: 0, nombreEnCours: 0 });
  const [filter, setFilter] = useState('EN_COURS');
  const [showModal, setShowModal] = useState(false);
  const [selectedDette, setSelectedDette] = useState(null);
  const [montantRemb, setMontantRemb] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dettes', { params: { statut: filter || undefined } });
      setData(res.data.data);
    } catch (e) {
      toast.error('Erreur de chargement des dettes');
    } finally { setLoading(false); }
  };

  const rembourser = async (e) => {
    e.preventDefault();
    const montant = parseFloat(montantRemb);
    if (!montant || montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (montant > selectedDette.montantRestant) {
      toast.error(`Le montant ne peut pas dépasser ${formatCFA(selectedDette.montantRestant)}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/dettes/${selectedDette.id}/rembourser`, { montant });
      toast.success(res.data.message);
      setShowModal(false);
      setMontantRemb('');
      setSelectedDette(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors du remboursement');
    } finally { setSubmitting(false); }
  };

  const openRemb = (dette) => {
    setSelectedDette(dette);
    setMontantRemb('');
    setShowModal(true);
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' CFA';

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div>
      <div className="page-header">
        <h2>Crédits & Dettes</h2>
        <button className="btn btn-outline" onClick={load}>
          <FiRefreshCw /> Actualiser
        </button>
      </div>

      {/* Résumé en cartes */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon red"><FiDollarSign /></div>
          <div>
            <div className="stat-value">{formatCFA(data.totalDettes)}</div>
            <div className="stat-label">Total dettes en cours</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FiClock /></div>
          <div>
            <div className="stat-value">{data.nombreEnCours || 0}</div>
            <div className="stat-label">Dettes en cours</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><FiUsers /></div>
          <div>
            <div className="stat-value">{data.dettes?.length || 0}</div>
            <div className="stat-label">Total affichées</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { v: 'EN_COURS', l: 'En cours', icon: <FiClock size={14} />, color: 'btn-danger' },
          { v: 'PAYEE', l: 'Payées', icon: <FiCheckCircle size={14} />, color: 'btn-secondary' },
          { v: '', l: 'Toutes', icon: <FiList size={14} />, color: 'btn-primary' }
        ].map(f => (
          <button key={f.v}
            className={`btn btn-sm ${filter === f.v ? f.color : 'btn-outline'}`}
            onClick={() => setFilter(f.v)}>
            {f.icon} {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Chargement des dettes...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Vente N°</th>
                <th>Produits</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payé</th>
                <th>Restant</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.dettes?.map(d => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.client?.prenom} {d.client?.nom}</strong>
                    {d.client?.telephone && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiPhone size={11} /> {d.client.telephone}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-blue">{d.vente?.numero || '-'}</span>
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    {d.vente?.details?.map((det, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: 'var(--gray-600)' }}>
                        {det.produit?.nom}
                      </div>
                    )) || '-'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(d.createdAt)}</td>
                  <td style={{ fontWeight: 600 }}>{formatCFA(d.montantTotal)}</td>
                  <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>{formatCFA(d.montantPaye)}</td>
                  <td style={{
                    fontWeight: 700,
                    color: d.montantRestant > 0 ? 'var(--danger)' : 'var(--secondary)',
                    fontSize: '0.95rem'
                  }}>
                    {formatCFA(d.montantRestant)}
                  </td>
                  <td>
                    <span className={`badge ${d.statut === 'PAYEE' ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      {d.statut === 'PAYEE' ? <><FiCheckCircle size={12} /> Payée</> : <><FiClock size={12} /> En cours</>}
                    </span>
                  </td>
                  <td>
                    {d.statut === 'EN_COURS' && (
                      <button className="btn btn-sm btn-secondary" onClick={() => openRemb(d)}>
                        <FiDollarSign /> Rembourser
                      </button>
                    )}
                    {d.remboursements?.length > 0 && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', marginTop: '0.3rem' }}>
                        {d.remboursements.length} paiement(s) effectué(s)
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data.dettes || data.dettes.length === 0) && (
            <div className="empty-state">
              <FiDollarSign style={{ fontSize: '3rem' }} />
              <p>Aucune dette {filter === 'EN_COURS' ? 'en cours' : filter === 'PAYEE' ? 'payée' : ''}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal remboursement */}
      {showModal && selectedDette && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FiCreditCard size={20} /> Remboursement de dette</h3>

            <div style={{
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md, 0.75rem)',
              padding: '1rem',
              marginBottom: '1.25rem',
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Client</span>
                <strong>{selectedDette.client?.prenom} {selectedDette.client?.nom}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Vente</span>
                <span>{selectedDette.vente?.numero}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Montant total</span>
                <span>{formatCFA(selectedDette.montantTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Déjà payé</span>
                <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{formatCFA(selectedDette.montantPaye)}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '2px solid var(--gray-200)',
                marginTop: '0.25rem'
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Reste à payer</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--danger)' }}>
                  {formatCFA(selectedDette.montantRestant)}
                </span>
              </div>
            </div>

            {/* Historique remboursements */}
            {selectedDette.remboursements?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '0.5rem' }}>
                  Historique des paiements
                </div>
                {selectedDette.remboursements.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '0.4rem 0',
                    fontSize: '0.82rem',
                    borderBottom: '1px solid var(--gray-100)'
                  }}>
                    <span style={{ color: 'var(--gray-500)' }}>{formatDate(r.createdAt)}</span>
                    <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>+{formatCFA(r.montant)}</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={rembourser}>
              <div className="form-group">
                <label>Montant du remboursement *</label>
                <input type="number" className="form-control" value={montantRemb}
                  onChange={(e) => setMontantRemb(e.target.value)}
                  max={selectedDette.montantRestant} min="1" step="1" required
                  placeholder={`Max: ${formatCFA(selectedDette.montantRestant)}`}
                  style={{ fontSize: '1.1rem', padding: '0.75rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                <button type="button" className="btn btn-sm btn-outline"
                  onClick={() => setMontantRemb(Math.round(selectedDette.montantRestant / 2).toString())}>
                  50%
                </button>
                <button type="button" className="btn btn-sm btn-outline"
                  onClick={() => setMontantRemb(selectedDette.montantRestant.toString())}>
                  Tout payer
                </button>
              </div>
              {montantRemb && parseFloat(montantRemb) > 0 && (
                <div style={{
                  background: 'var(--secondary-light)',
                  color: 'var(--secondary-dark, #047857)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm, 0.5rem)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginTop: '0.5rem'
                }}>
                  {parseFloat(montantRemb) >= selectedDette.montantRestant
                    ? 'Cette dette sera entièrement remboursée !'
                    : `Restant après paiement: ${formatCFA(selectedDette.montantRestant - parseFloat(montantRemb))}`
                  }
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-secondary" disabled={submitting}>
                  <FiCheck /> {submitting ? 'Enregistrement...' : 'Confirmer le paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
