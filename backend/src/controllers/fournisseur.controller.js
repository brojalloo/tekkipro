// Contrôleur Fournisseurs
const prisma = require('../config/database');

const getAll = async (req, res) => {
  try {
    const fournisseurs = await prisma.fournisseur.findMany({
      where: { boutiqueId: req.boutiqueId },
      include: { _count: { select: { produits: true, entreeStocks: true } } },
      orderBy: { nom: 'asc' },
    });
    res.json({ success: true, data: fournisseurs });
  } catch (error) {
    console.error('Erreur getAll fournisseurs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const getById = async (req, res) => {
  try {
    const fournisseur = await prisma.fournisseur.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
      include: {
        produits: { select: { id: true, nom: true, prixAchat: true, stock: true, uniteBase: true } },
        entreeStocks: { orderBy: { createdAt: 'desc' }, take: 20, include: { produit: { select: { nom: true } } } },
      },
    });

    if (!fournisseur) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }

    res.json({ success: true, data: fournisseur });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  try {
    const { nom, telephone, adresse, email } = req.body;
    if (!nom || nom.trim() === '') {
      return res.status(400).json({ success: false, message: 'Le nom du fournisseur est obligatoire' });
    }
    const fournisseur = await prisma.fournisseur.create({
      data: { nom: nom.trim(), telephone: telephone?.trim() || null, adresse: adresse?.trim() || null, email: email?.trim() || null, boutiqueId: req.boutiqueId },
    });
    res.status(201).json({ success: true, message: 'Fournisseur ajouté', data: fournisseur });
  } catch (error) {
    console.error('Erreur create fournisseur:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await prisma.fournisseur.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }

    const { nom, telephone, adresse, email } = req.body;
    const fournisseur = await prisma.fournisseur.update({
      where: { id: parseInt(req.params.id) },
      data: { nom, telephone, adresse, email },
    });

    res.json({ success: true, message: 'Fournisseur mis à jour', data: fournisseur });
  } catch (error) {
    console.error('Erreur update fournisseur:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.fournisseur.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }
    await prisma.fournisseur.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Fournisseur supprimé' });
  } catch (error) {
    console.error('Erreur remove fournisseur:', error);
    const msg = error.code === 'P2003' ? 'Impossible: ce fournisseur a des produits ou entrées de stock associés' : (error.message || 'Erreur serveur');
    res.status(500).json({ success: false, message: msg });
  }
};

module.exports = { getAll, getById, create, update, remove };
