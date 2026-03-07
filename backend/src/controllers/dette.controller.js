// Contrôleur Dettes (Crédit client)
const prisma = require('../config/database');

// Lister toutes les dettes de la boutique
const getAll = async (req, res) => {
  try {
    const { statut, clientId } = req.query;

    const where = { vente: { boutiqueId: req.boutiqueId } };
    if (statut) where.statut = statut;
    if (clientId) where.clientId = parseInt(clientId);

    const dettes = await prisma.dette.findMany({
      where,
      include: {
        client: { select: { id: true, nom: true, prenom: true, telephone: true } },
        vente: { select: { numero: true, montantTotal: true, montantPaye: true, createdAt: true, details: { include: { produit: { select: { nom: true } } } } } },
        remboursements: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalDettes = dettes
      .filter(d => d.statut === 'EN_COURS')
      .reduce((sum, d) => sum + d.montantRestant, 0);

    const nombreEnCours = dettes.filter(d => d.statut === 'EN_COURS').length;

    res.json({ success: true, data: { dettes, totalDettes, nombreEnCours } });
  } catch (error) {
    console.error('Erreur getAll dettes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Rembourser une dette (partiel ou total)
const rembourser = async (req, res) => {
  try {
    const { id } = req.params;
    const { montant } = req.body;

    const dette = await prisma.dette.findFirst({
      where: { id: parseInt(id), vente: { boutiqueId: req.boutiqueId } },
      include: { vente: true, client: true },
    });

    if (!dette) {
      return res.status(404).json({ success: false, message: 'Dette non trouvée' });
    }

    if (dette.statut === 'PAYEE') {
      return res.status(400).json({ success: false, message: 'Cette dette est déjà payée' });
    }

    const montantRemboursement = parseFloat(montant);
    if (montantRemboursement <= 0 || montantRemboursement > dette.montantRestant) {
      return res.status(400).json({
        success: false,
        message: `Montant invalide. Restant: ${dette.montantRestant} CFA`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Créer le remboursement
      await tx.remboursement.create({
        data: { montant: montantRemboursement, detteId: parseInt(id) },
      });

      const newMontantPaye = dette.montantPaye + montantRemboursement;
      const newMontantRestant = dette.montantRestant - montantRemboursement;
      const newStatut = newMontantRestant <= 0 ? 'PAYEE' : 'EN_COURS';

      // Mettre à jour la dette
      const updatedDette = await tx.dette.update({
        where: { id: parseInt(id) },
        data: {
          montantPaye: newMontantPaye,
          montantRestant: Math.max(0, newMontantRestant),
          statut: newStatut,
        },
        include: { client: true, remboursements: true },
      });

      // Mettre à jour la vente aussi
      await tx.vente.update({
        where: { id: dette.venteId },
        data: {
          montantPaye: { increment: montantRemboursement },
          statut: newStatut === 'PAYEE' ? 'COMPLETEE' : 'EN_CREDIT',
        },
      });

      return updatedDette;
    });

    res.json({
      success: true,
      message: result.statut === 'PAYEE' ? 'Dette entièrement remboursée!' : 'Remboursement enregistré',
      data: result,
    });
  } catch (error) {
    console.error('Erreur rembourser:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getAll, rembourser };
