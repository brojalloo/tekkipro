import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';
import { showUpgradeToast } from '../lib/upgradeToast';
import { getApiErrorMessage, isUpgradeRequiredError } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import {
  FiShoppingCart, FiPlus, FiMinus, FiTrash2, FiUser, FiCheck,
  FiSearch, FiCreditCard, FiSmartphone, FiDollarSign, FiPackage,
  FiAlertCircle, FiTag, FiChevronDown, FiZap, FiWifi, FiInbox, FiX
} from 'react-icons/fi';
import BarcodeScannerInput from '../features/products/components/BarcodeScannerInput';
import UsageMeter from '../components/UsageMeter';

// Helper: format stock in human-readable form
const formatStockHuman = (stock, uniteBase, unitesVente) => {
  if (!unitesVente || unitesVente.length === 0) return `${stock} ${uniteBase}`;
  const defUnit = unitesVente.find(u => u.estDefaut) || unitesVente[0];
  if (defUnit && defUnit.facteurConversion > 0) {
    const qty = stock / defUnit.facteurConversion;
    return `${qty % 1 === 0 ? qty : qty.toFixed(2)} ${defUnit.nom}`;
  }
  return `${stock} ${uniteBase}`;
};

export default function NouvelleVente() {
  const { plan, planUsage } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoAddedBarcodeRef = useRef(null);
  const [produits, setProduits] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [clientId, setClientId] = useState('');
  const [modePaiement, setModePaiement] = useState('CASH');
  const [montantPaye, setMontantPaye] = useState('');
  const [loading, setLoading] = useState(false);

  const [scanMode, setScanMode] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [prodRes, clientRes] = await Promise.all([
        api.get('/produits?limit=1000'),
        api.get('/clients?limit=1000'),
      ]);
      setProduits(prodRes.data.data.filter(p => p.actif));
      setClients(clientRes.data.data);
    } catch { toast.error('Erreur de chargement des données'); }
  };

  const filteredProduits = useMemo(() =>
    produits.filter(p =>
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.codeBarre?.includes(search)
    ), [produits, search]);

  const addToCart = useCallback((produit) => {
    setCart(currentCart => {
      const existing = currentCart.find(c => c.produitId === produit.id && !c.uniteVenteId);
      if (existing) {
        return currentCart.map(c => c === existing ? { ...c, quantite: c.quantite + 1 } : c);
      }

      return [...currentCart, {
        produitId: produit.id, nom: produit.nom, prixUnitaire: produit.prixVente,
        quantite: 1, uniteBase: produit.uniteBase, uniteVenteId: null, uniteNom: produit.uniteBase,
        facteurConversion: 1, stockDispo: produit.stock,
      }];
    });
  }, []);

  const addUniteToCart = useCallback((produit, unite) => {
    setCart(currentCart => {
      const existing = currentCart.find(c => c.uniteVenteId === unite.id);
      if (existing) {
        return currentCart.map(c => c === existing ? { ...c, quantite: c.quantite + 1 } : c);
      }

      return [...currentCart, {
        produitId: produit.id, nom: produit.nom, prixUnitaire: unite.prix,
        quantite: 1, uniteBase: produit.uniteBase, uniteVenteId: unite.id, uniteNom: unite.nom,
        facteurConversion: unite.facteurConversion, stockDispo: produit.stock,
      }];
    });
  }, []);

  useEffect(() => {
    const barcodeSearch = searchParams.get('codeBarre');
    if (!barcodeSearch) {
      autoAddedBarcodeRef.current = null;
      return;
    }
    setSearch(barcodeSearch);
    if (autoAddedBarcodeRef.current === barcodeSearch) return;

    const produitFromBarcode = produits.find((p) => p.actif && p.codeBarre === barcodeSearch);
    if (!produitFromBarcode) return;
    const availableStock = Number(produitFromBarcode.stock || 0);
    if (availableStock <= 0) return;

    autoAddedBarcodeRef.current = barcodeSearch;
    const units = Array.isArray(produitFromBarcode.unitesVente) ? produitFromBarcode.unitesVente : [];
    const autoSelectedUnit = units.find((u) => u.estDefaut && Number(u.facteurConversion) <= availableStock) || 
                             units.find((u) => Number(u.facteurConversion) <= availableStock);

    if (autoSelectedUnit) addUniteToCart(produitFromBarcode, autoSelectedUnit);
    else addToCart(produitFromBarcode);
  }, [addToCart, addUniteToCart, produits, searchParams]);

  const handleScan = useCallback(async (code) => {
    if (scanLoading) return;
    setScanLoading(true);
    try {
      const res = await api.get(`/barcodes/lookup/${encodeURIComponent(code)}`);
      const lookupData = res.data?.data;
      if (!lookupData) {
        toast.error(`Code-barres inconnu : ${code}`);
        return;
      }
      const produit = lookupData.produit || lookupData;
      if (!produit || !produit.id) {
        toast.error(`Produit invalide pour le code : ${code}`);
        return;
      }
      const uniteFromBarcode = lookupData.uniteId
        ? produit.unitesVente?.find(u => u.id === lookupData.uniteId)
        : null;
      if (uniteFromBarcode) {
        addUniteToCart(produit, uniteFromBarcode);
      } else {
        const defUnite = produit.unitesVente?.find(u => u.estDefaut) || produit.unitesVente?.[0];
        if (defUnite) addUniteToCart(produit, defUnite);
        else addToCart(produit);
      }
      toast.success(getLocalSuccessMessage({ entity: 'produit', action: 'addToSale', params: { name: produit.nom } }));
    } catch (err) {
      if (err.response?.status === 404) {
        toast((t) => (
          <div className="bg-card p-4 rounded-xl shadow-lg border border-border">
            <p><strong>Produit introuvable ({code})</strong></p>
            <p>Souhaitez-vous le créer ?</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => {
                toast.dismiss(t.id);
                navigate(`/app/produits/nouveau?${new URLSearchParams({ codeBarre: code, returnTo: 'vente' })}`);
              }} className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">Créer</button>
              <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-bold rounded-lg hover:bg-muted/80 transition-colors">Fermer</button>
            </div>
          </div>
        ), { duration: 8000 });
      } else { toast.error('Erreur lors du scan'); }
    } finally { setScanLoading(false); }
  }, [addToCart, addUniteToCart, navigate, scanLoading]);

  const updateQuantite = (index, delta) => {
    setCart(cart.map((c, i) => i !== index ? c : { ...c, quantite: Math.max(1, c.quantite + delta) }));
  };
  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));
  const total = cart.reduce((sum, c) => sum + c.prixUnitaire * c.quantite, 0);
  const rawMontantPaye = parseFloat(montantPaye);
  const parsedMontantPaye = montantPaye === '' || !Number.isFinite(rawMontantPaye) ? null : Math.max(0, rawMontantPaye);
  const normalizedMontantPaye = parsedMontantPaye === null ? undefined : Math.min(total, parsedMontantPaye);

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Panier vide !'); return; }
    if (modePaiement === 'CREDIT' && !clientId) { toast.error('Sélectionnez un client pour le crédit'); return; }
    setLoading(true);
    try {
      const details = cart.map(c => ({
        produitId: c.produitId, quantite: c.quantite,
        uniteVenteId: c.uniteVenteId || undefined,
      }));
      const res = await api.post('/ventes', {
        details, clientId: clientId || undefined, modePaiement,
        montantPaye: normalizedMontantPaye,
      });
      toast.success(getApiSuccessMessage(res, { fallback: getLocalSuccessMessage({ entity: 'vente', action: 'save', params: { numero: res.data.data.numero } }) }));
      setCart([]); setClientId(''); setMontantPaye('');
      loadData();
    } catch (error) {
      const upgradeRequired = isUpgradeRequiredError(error);
      const msg = getApiErrorMessage(error, { fallback: 'Erreur de vente', includeStatus: !upgradeRequired });
      if (upgradeRequired) showUpgradeToast({ message: msg, navigate });
      else toast.error(msg, { duration: 8000 });
    } finally { setLoading(false); }
  };

  const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  return (
    <div className="min-h-screen font-sans bg-[#FFFAF0] text-gray-900 pb-0">
      <div className="relative px-6 md:px-10 py-5 bg-gradient-to-br from-[#071C08] to-[#0D2710] border-b border-[#1B5E20]/20 shadow-lg z-10">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1B5E20] via-[#FFD600] to-[#D32F2F] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,rgba(255,214,0,0.07),transparent_45%)] pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#FFD600] to-[#F9A825] text-[#071C08] rounded-xl shadow-[0_6px_16px_rgba(255,214,0,0.25)] shrink-0"><FiShoppingCart size={22} /></div>
            <div>
              <h1 className="text-[1.55rem] font-extrabold tracking-tight text-white m-0 leading-none" style={{fontFamily:'Sora,sans-serif'}}>Nouvelle Vente</h1>
              <p className="text-[0.78rem] font-medium text-white/50 mt-1 mb-0">Transactions rapides · Scanner HID intégré</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white/8 border border-white/12 rounded-2xl backdrop-blur-sm">
            <FiShoppingCart size={16} className="text-[#FFD600]" />
            <span className="text-white/70 text-sm font-medium">{cart.length} article{cart.length !== 1 ? 's' : ''}</span>
            <strong className="text-[#FFD600] font-mono text-sm">{formatCFA(total)}</strong>
          </div>
        </div>
      </div>

      {plan === 'GRATUIT' && planUsage && (
        <div className="max-w-xs px-6 pt-4">
          <UsageMeter
            label="Ventes ce mois"
            used={planUsage.ventesParMois?.used ?? 0}
            limit={planUsage.ventesParMois?.limit ?? null}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-0 min-h-[calc(100vh-100px)] pb-20 lg:pb-0">
        <div className="p-5 md:p-8 lg:pr-6 overflow-y-auto">
          <BarcodeScannerInput onScan={handleScan} active={scanMode} showInput={false} />

          <div className="flex items-center gap-3 px-4 py-3 bg-white border border-[#1B5E20]/15 rounded-[18px] mb-6 focus-within:border-[#1B5E20]/40 focus-within:shadow-[0_0_0_3px_rgba(27,94,32,0.08)] transition-all shadow-sm">
            <FiSearch size={18} className="text-[#1B5E20]/50 shrink-0" />
            <input type="text" className="flex-1 bg-transparent border-none outline-none text-[0.92rem] font-medium text-foreground placeholder:text-muted-foreground" placeholder="Rechercher par nom ou code-barres…"
              value={search} onChange={(e) => setSearch(e.target.value)} />

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all ${scanMode ? 'bg-[#1B5E20] text-white shadow-sm shadow-[#1B5E20]/25' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              onClick={() => setScanMode(v => !v)}
              title={scanMode ? 'Désactiver le scanner' : 'Activer le scanner'}
            >
              <div className={`relative flex items-center justify-center ${scanMode ? 'animate-pulse' : ''}`}>
                {scanLoading ? <FiZap size={16} /> : <FiWifi size={16} />}
              </div>
              <span className="text-xs font-bold">{scanMode ? 'HID ON' : 'HID OFF'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {filteredProduits.map(p => {
              const isAlert = p.stock <= p.stockAlerte;
              return (
                <div key={p.id} className={`relative bg-white border rounded-[20px] p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all flex flex-col cursor-pointer group ${isAlert ? 'border-amber-300/50 bg-amber-50/30' : 'border-[#1B5E20]/12 hover:border-[#1B5E20]/30 hover:shadow-[#1B5E20]/10'}`} onClick={() => addToCart(p)}>
                  {isAlert && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  <div className="flex gap-3 mb-3">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl shrink-0 ${isAlert ? 'bg-amber-100 text-amber-600' : 'bg-[#1B5E20]/10 text-[#1B5E20]'}`}><FiPackage size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <strong className="text-[0.88rem] font-semibold text-foreground block truncate">{p.nom}</strong>
                      <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[0.68rem] font-bold rounded-full ${isAlert ? 'bg-amber-100 text-amber-700' : 'bg-[#1B5E20]/8 text-[#1B5E20]'}`}>
                        {isAlert ? <FiAlertCircle size={10} /> : <FiTag size={10} />}
                        {formatStockHuman(p.stock, p.uniteBase, p.unitesVente)}
                      </span>
                    </div>
                  </div>

                  <div className="text-[1.05rem] font-extrabold text-[#1B5E20] mb-3 font-mono" style={{fontFamily:'Sora,sans-serif'}}>
                    {(() => {
                      const defUnite = p.unitesVente?.find(u => u.estDefaut) || p.unitesVente?.[0];
                      if (defUnite) return <>{formatCFA(defUnite.prix)} <span className="text-[0.7rem] font-semibold text-muted-foreground">/ {defUnite.nom}</span></>;
                      return <>{formatCFA(p.prixVente)} <span className="text-[0.7rem] font-semibold text-muted-foreground">/ {p.uniteBase}</span></>;
                    })()}
                  </div>

                  {p.unitesVente?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-auto" onClick={(e) => e.stopPropagation()}>
                      {p.unitesVente.map(u => (
                        <button key={u.id} className="flex-1 min-w-[80px] p-2 bg-[#1B5E20]/6 border border-[#1B5E20]/15 rounded-xl text-[0.72rem] font-bold text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white hover:border-[#1B5E20] transition-all" onClick={() => addUniteToCart(p, u)}>
                          {u.nom}<br/><span className="font-mono">{formatCFA(u.prix)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button className="w-full py-2.5 bg-[#1B5E20] text-white rounded-xl text-sm font-bold shadow-sm shadow-[#1B5E20]/20 hover:bg-[#155230] hover:scale-[1.02] transition-all mt-auto" onClick={(e) => { e.stopPropagation(); addToCart(p); }}>
                      + 1 {p.uniteBase}
                    </button>
                  )}
                </div>
              );
            })}

            {filteredProduits.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-[#1B5E20]/8 text-[#1B5E20]/30 mb-4"><FiInbox size={32} /></div>
                <h3 className="text-[1rem] font-semibold text-muted-foreground mb-1">Aucun produit trouvé</h3>
                <p className="text-[0.82rem] text-muted-foreground/60">Essayez un autre mot-clé ou scannez un article</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile overlay backdrop */}
        {showCart && (
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowCart(false)} />
        )}

        <div className={`lg:p-5 xl:pl-0 h-full ${showCart ? 'fixed inset-x-0 bottom-0 z-50 lg:relative lg:inset-auto lg:z-auto' : 'hidden lg:block'}`}>
          <div className="bg-white border border-[#1B5E20]/12 rounded-t-[24px] lg:rounded-[24px] shadow-lg lg:sticky top-6 flex flex-col max-h-[85vh] lg:max-h-[calc(100vh-120px)] overflow-hidden">
            <div className="p-5 px-6 bg-[#1B5E20]/5 border-b border-[#1B5E20]/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <FiShoppingCart size={18} className="text-[#1B5E20]" />
                <h3 className="text-[0.95rem] font-bold text-foreground m-0" style={{fontFamily:'Sora,sans-serif'}}>Détail du Panier</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center bg-[#1B5E20] text-white rounded-full text-xs font-bold">{cart.length}</div>
                <button className="lg:hidden w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 border-none cursor-pointer" onClick={() => setShowCart(false)}><FiX size={15} /></button>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <FiShoppingCart size={40} />
                <h3>Panier vide</h3>
                <p>Veuillez sélectionner des produits pour commencer la vente</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto py-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="px-5 py-3.5 flex items-center gap-3 border-b border-[#1B5E20]/8 last:border-0 hover:bg-[#1B5E20]/4 transition-colors">
                      <div className="flex flex-col flex-1 min-w-0">
                        <strong className="text-[0.88rem] font-semibold text-foreground truncate">{item.nom}</strong>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-[#FFD600]/15 text-[#B8860B] border border-[#FFD600]/25 rounded-md text-[0.68rem] font-bold">{item.uniteNom}</span>
                          <span className="text-muted-foreground text-[0.75rem] font-mono">{formatCFA(item.prixUnitaire)} / u</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button className="w-7 h-7 rounded-lg bg-[#1B5E20]/8 border border-[#1B5E20]/15 flex items-center justify-center text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white transition-all" onClick={() => updateQuantite(idx, -1)}><FiMinus size={12} /></button>
                        <span className="w-6 text-center text-sm font-extrabold">{item.quantite}</span>
                        <button className="w-7 h-7 rounded-lg bg-[#1B5E20]/8 border border-[#1B5E20]/15 flex items-center justify-center text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white transition-all" onClick={() => updateQuantite(idx, 1)}><FiPlus size={12} /></button>
                        <button className="w-7 h-7 rounded-lg bg-red-50 border border-red-200/60 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all ml-1" onClick={() => removeFromCart(idx)}>
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 px-6 bg-gradient-to-br from-[#071C08] to-[#0D2710] text-white flex justify-between items-center shrink-0">
                  <div>
                    <span className="text-[0.68rem] font-bold text-white/50 uppercase tracking-widest block">Total à payer</span>
                    <span className="text-[1.45rem] font-extrabold font-mono text-[#FFD600]" style={{fontFamily:'Sora,sans-serif'}}>{formatCFA(total)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[0.68rem] font-bold text-white/50 uppercase tracking-widest block">Articles</span>
                    <span className="text-[1.1rem] font-bold text-white">{cart.length}</span>
                  </div>
                </div>

                <div className="px-5 pt-4">
                  <div className="relative">
                    <FiUser size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1B5E20]/50 pointer-events-none" />
                    <select className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-[#1B5E20]/15 bg-[#1B5E20]/5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/20 focus:border-[#1B5E20]/35 appearance-none transition-all" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                      <option value="">Client de passage</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.prenom} {c.nom} ({c.telephone})</option>
                      ))}
                    </select>
                    <FiChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="flex gap-2 p-4 px-5 shrink-0">
                  {[
                    { key: 'CASH', icon: <FiDollarSign size={15} />, label: 'Cash' },
                    { key: 'MOBILE_MONEY', icon: <FiSmartphone size={15} />, label: 'MoMo' },
                    { key: 'CREDIT', icon: <FiCreditCard size={15} />, label: 'Crédit' },
                  ].map(m => (
                    <button key={m.key} type="button"
                      className={`flex-1 flex justify-center items-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${modePaiement === m.key ? 'bg-[#1B5E20] text-white border-transparent shadow-sm shadow-[#1B5E20]/25' : 'border-[#1B5E20]/15 text-foreground bg-[#1B5E20]/4 hover:bg-[#1B5E20]/10'}`}
                      onClick={() => { setModePaiement(m.key); if (m.key !== 'CREDIT') setMontantPaye(''); }}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>

                {modePaiement === 'CREDIT' && (
                  <div style={{ padding: '0 1.5rem 1.25rem' }}>
                    <input type="number" className="flex w-full items-center justify-between rounded-xl border border-input bg-card px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all" style={{ width: '100%', marginBottom: '0.5rem' }} 
                      value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)}
                      placeholder="Montant encaissé..." />
                    {parsedMontantPaye !== null && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiAlertCircle size={14} /> Reste à payer: {formatCFA(total - normalizedMontantPaye)}
                      </div>
                    )}
                  </div>
                )}

                <button className="mx-6 mb-6 p-4 bg-gradient-to-br from-[#1B5E20] to-[#0D3B14] text-white rounded-2xl font-extrabold text-base shadow-[0_8px_24px_rgba(27,94,32,0.25)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(27,94,32,0.35)] transition-all flex justify-center items-center gap-2 shrink-0" style={{fontFamily:'Sora,sans-serif'}} onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Traitement...' : 'Finaliser la Vente'}
                  {!loading && <FiCheck size={20} style={{ marginLeft: '0.5rem' }} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating cart button — mobile only */}
      {cart.length > 0 && !showCart && (
        <button
          className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-6 py-3.5 bg-[#1B5E20] text-white rounded-full font-bold text-[0.9rem] shadow-[0_8px_28px_rgba(27,94,32,0.45)] border-none cursor-pointer whitespace-nowrap"
          onClick={() => setShowCart(true)}
        >
          <FiShoppingCart size={17} />
          Panier ({cart.length})
        </button>
      )}
    </div>
  );
}
