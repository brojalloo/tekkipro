// Contrôleur Clients
const prisma = require('../config/database');

const getAll = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { boutiqueId: req.boutiqueId };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        dettes: { where: { statut: 'EN_COURS' } },
        _count: { select: { ventes: true } },
      },
      orderBy: { nom: 'asc' },
    });

    // Ajouter le total des dettes
    const data = clients.map(c => ({
      ...c,
      totalDettes: c.dettes.reduce((sum, d) => sum + d.montantRestant, 0),
      nombreVentes: c._count.ventes,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erreur getAll clients:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const getById = async (req, res) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
      include: {
        dettes: { include: { remboursements: true, vente: true } },
        ventes: {
          include: { details: { include: { produit: { select: { nom: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client non trouvé' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const create = async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse } = req.body;

    if (!nom || nom.trim() === '') {
      return res.status(400).json({ success: false, message: 'Le nom du client est obligatoire' });
    }

    const client = await prisma.client.create({
      data: { nom: nom.trim(), prenom: prenom?.trim() || null, telephone: telephone?.trim() || null, adresse: adresse?.trim() || null, boutiqueId: req.boutiqueId },
    });

    res.status(201).json({ success: true, message: 'Client ajouté', data: client });
  } catch (error) {
    console.error('Erreur create client:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de la création du client' });
  }
};

const update = async (req, res) => {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client non trouvé' });
    }

    const { nom, prenom, telephone, adresse } = req.body;

    if (!nom || nom.trim() === '') {
      return res.status(400).json({ success: false, message: 'Le nom du client est obligatoire' });
    }

    const client = await prisma.client.update({
      where: { id: parseInt(req.params.id) },
      data: { nom: nom.trim(), prenom: prenom?.trim() || null, telephone: telephone?.trim() || null, adresse: adresse?.trim() || null },
    });

    res.json({ success: true, message: 'Client mis à jour', data: client });
  } catch (error) {
    console.error('Erreur update client:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur lors de la mise à jour du client' });
  }
};

const remove = async (req, res) => {
  try {
    const existing = await prisma.client.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Client non trouvé' });
    }

    await prisma.client.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: 'Client supprimé' });
  } catch (error) {
    console.error('Erreur remove client:', error);
    const msg = error.code === 'P2003' ? 'Impossible: le client a des ventes ou dettes associées' : (error.message || 'Erreur serveur');
    res.status(500).json({ success: false, message: msg });
  }
};

module.exports = { getAll, getById, create, update, remove };
