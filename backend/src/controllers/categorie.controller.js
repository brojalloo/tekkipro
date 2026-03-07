// Contrôleur Catégories
const prisma = require('../config/database');

const getAll = async (req, res) => {
  try {
    const categories = await prisma.categorie.findMany({
      where: { boutiqueId: req.boutiqueId },
      include: { _count: { select: { produits: true } } },
      orderBy: { nom: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  try {
    const { nom } = req.body;
    const categorie = await prisma.categorie.create({
      data: { nom, boutiqueId: req.boutiqueId },
    });
    res.status(201).json({ success: true, message: 'Catégorie créée', data: categorie });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Cette catégorie existe déjà' });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const update = async (req, res) => {
  try {
    const { nom } = req.body;
    const categorie = await prisma.categorie.update({
      where: { id: parseInt(req.params.id) },
      data: { nom },
    });
    res.json({ success: true, data: categorie });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.categorie.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Impossible: des produits utilisent cette catégorie' });
  }
};

module.exports = { getAll, create, update, remove };
