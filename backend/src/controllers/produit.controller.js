// Contrôleur Produits + Unités de vente (système de conversion)
const prisma = require('../config/database');

// Lister tous les produits de la boutique
const getAll = async (req, res) => {
  try {
    const { search, categorieId, alerteStock } = req.query;

    const where = { boutiqueId: req.boutiqueId, actif: true };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { codeBarre: { contains: search } },
      ];
    }
    if (categorieId) where.categorieId = parseInt(categorieId);

    let produits = await prisma.produit.findMany({
      where,
      include: {
        categorie: true,
        fournisseur: { select: { id: true, nom: true } },
        unitesVente: { orderBy: { estDefaut: 'desc' } },
      },
      orderBy: { nom: 'asc' },
    });

    // Filtrer les alertes stock côté JS
    if (alerteStock === 'true') {
      produits = produits.filter(p => p.stock <= p.stockAlerte);
    }

    res.json({ success: true, data: produits });
  } catch (error) {
    console.error('Erreur getAll produits:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Obtenir un produit par ID
const getById = async (req, res) => {
  try {
    const produit = await prisma.produit.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
      include: { categorie: true, fournisseur: true, unitesVente: { orderBy: { estDefaut: 'desc' } } },
    });

    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    res.json({ success: true, data: produit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Créer un produit
const create = async (req, res) => {
  try {
    const { nom, description, prixVente, prixAchat, stock, stockAlerte, uniteBase, codeBarre, categorieId, fournisseurId, unitesVente } = req.body;

    // stock est entré par l'utilisateur dans une unité de vente ou en unité de base
    // Le frontend envoie le stock déjà converti en unité de base
    const produit = await prisma.produit.create({
      data: {
        nom,
        description,
        prixVente: parseFloat(prixVente || 0),
        prixAchat: parseFloat(prixAchat || 0),
        stock: parseFloat(stock || 0),
        stockAlerte: parseFloat(stockAlerte || 0),
        uniteBase: uniteBase || 'piece',
        codeBarre,
        categorieId: categorieId ? parseInt(categorieId) : null,
        fournisseurId: fournisseurId ? parseInt(fournisseurId) : null,
        boutiqueId: req.boutiqueId,
        unitesVente: unitesVente && unitesVente.length > 0 ? {
          create: unitesVente.map(u => ({
            nom: u.nom,
            facteurConversion: parseFloat(u.facteurConversion),
            prix: parseFloat(u.prix),
            prixAchat: u.prixAchat ? parseFloat(u.prixAchat) : null,
            estDefaut: Boolean(u.estDefaut),
          })),
        } : undefined,
      },
      include: { unitesVente: true, categorie: true },
    });

    res.status(201).json({ success: true, message: 'Produit créé', data: produit });
  } catch (error) {
    console.error('Erreur create produit:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du produit' });
  }
};

// Modifier un produit
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.produit.findFirst({
      where: { id: parseInt(id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const { nom, description, prixVente, prixAchat, stockAlerte, uniteBase, codeBarre, categorieId, fournisseurId, actif } = req.body;

    const produit = await prisma.produit.update({
      where: { id: parseInt(id) },
      data: {
        nom, description,
        prixVente: prixVente !== undefined && prixVente !== '' ? parseFloat(prixVente) : undefined,
        prixAchat: prixAchat !== undefined && prixAchat !== '' ? parseFloat(prixAchat) : undefined,
        stockAlerte: stockAlerte !== undefined && stockAlerte !== '' ? parseFloat(stockAlerte) : undefined,
        uniteBase, codeBarre, actif,
        categorieId: categorieId ? parseInt(categorieId) : (categorieId === '' || categorieId === null ? null : undefined),
        fournisseurId: fournisseurId ? parseInt(fournisseurId) : (fournisseurId === '' || fournisseurId === null ? null : undefined),
      },
      include: { unitesVente: true, categorie: true },
    });

    res.json({ success: true, message: 'Produit mis à jour', data: produit });
  } catch (error) {
    console.error('Erreur update produit:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer un produit (soft delete)
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.produit.findFirst({
      where: { id: parseInt(id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    await prisma.produit.update({
      where: { id: parseInt(id) },
      data: { actif: false },
    });

    res.json({ success: true, message: 'Produit désactivé' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ====== GESTION DES UNITÉS DE VENTE ======

// Ajouter une unité de vente à un produit
const addUniteVente = async (req, res) => {
  try {
    const { produitId } = req.params;
    const { nom, facteurConversion, prix, prixAchat, estDefaut } = req.body;

    const produit = await prisma.produit.findFirst({
      where: { id: parseInt(produitId), boutiqueId: req.boutiqueId },
    });

    if (!produit) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    if (!nom || !facteurConversion || !prix) {
      return res.status(400).json({ success: false, message: 'Nom, facteur de conversion et prix sont requis' });
    }

    const unite = await prisma.uniteVente.create({
      data: {
        nom,
        facteurConversion: parseFloat(facteurConversion),
        prix: parseFloat(prix),
        prixAchat: prixAchat ? parseFloat(prixAchat) : null,
        estDefaut: Boolean(estDefaut),
        produitId: parseInt(produitId),
      },
    });

    res.status(201).json({ success: true, message: 'Unité de vente ajoutée', data: unite });
  } catch (error) {
    console.error('Erreur addUniteVente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Supprimer une unité de vente
const removeUniteVente = async (req, res) => {
  try {
    const { uniteId } = req.params;
    const unite = await prisma.uniteVente.findFirst({
      where: { id: parseInt(uniteId) },
      include: { produit: { select: { boutiqueId: true } } },
    });
    if (!unite || unite.produit.boutiqueId !== req.boutiqueId) {
      return res.status(404).json({ success: false, message: 'Unité non trouvée' });
    }
    await prisma.uniteVente.delete({ where: { id: parseInt(uniteId) } });
    res.json({ success: true, message: 'Unité de vente supprimée' });
  } catch (error) {
    console.error('Erreur removeUniteVente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre à jour une unité de vente
const updateUniteVente = async (req, res) => {
  try {
    const { uniteId } = req.params;
    const { nom, facteurConversion, prix, prixAchat, estDefaut } = req.body;

    const unite = await prisma.uniteVente.findFirst({
      where: { id: parseInt(uniteId) },
      include: { produit: { select: { boutiqueId: true } } },
    });
    if (!unite || unite.produit.boutiqueId !== req.boutiqueId) {
      return res.status(404).json({ success: false, message: 'Unité non trouvée' });
    }

    const updated = await prisma.uniteVente.update({
      where: { id: parseInt(uniteId) },
      data: {
        nom: nom || unite.nom,
        facteurConversion: facteurConversion !== undefined ? parseFloat(facteurConversion) : unite.facteurConversion,
        prix: prix !== undefined ? parseFloat(prix) : unite.prix,
        prixAchat: prixAchat !== undefined ? (prixAchat ? parseFloat(prixAchat) : null) : unite.prixAchat,
        estDefaut: estDefaut !== undefined ? Boolean(estDefaut) : unite.estDefaut,
      },
    });

    res.json({ success: true, message: 'Unité de vente mise à jour', data: updated });
  } catch (error) {
    console.error('Erreur updateUniteVente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Produits en alerte de stock
const getAlertesStock = async (req, res) => {
  try {
    const produits = await prisma.produit.findMany({
      where: {
        boutiqueId: req.boutiqueId,
        actif: true,
      },
      include: { categorie: { select: { nom: true } }, unitesVente: true },
      orderBy: { stock: 'asc' },
    });
    const filtered = produits.filter(p => p.stock <= p.stockAlerte);
    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Erreur getAlertesStock:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getAll, getById, create, update, remove, addUniteVente, removeUniteVente, updateUniteVente, getAlertesStock };
