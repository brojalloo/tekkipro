// Contrôleur Ventes - Système de conversion d'unités
const prisma = require('../config/database');

// Générer un numéro de vente unique
const generateNumeroVente = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `VNT-${dateStr}-${rand}`;
};

// Créer une vente
const create = async (req, res) => {
  try {
    const { details, clientId, modePaiement, montantPaye } = req.body;

    // details = [{ produitId, quantite, uniteVenteId? }, ...]
    // If uniteVenteId is provided: sell in that unit (quantite × facteurConversion = base qty)
    // If no uniteVenteId: sell in base unit directly (quantite = base qty)

    if (!details || details.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun produit dans la vente' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let montantTotal = 0;
      const venteDetails = [];

      for (const item of details) {
        const produit = await tx.produit.findFirst({
          where: { id: parseInt(item.produitId), boutiqueId: req.boutiqueId },
          include: { unitesVente: true },
        });

        if (!produit) {
          throw new Error(`Produit #${item.produitId} non trouvé`);
        }

        let quantiteBase, prixUnitaire, uniteNom;
        const quantiteUser = parseFloat(item.quantite || 1);

        if (item.uniteVenteId) {
          // Vente dans une unité de vente spécifique
          const unite = produit.unitesVente.find(u => u.id === parseInt(item.uniteVenteId));
          if (!unite) throw new Error(`Unité de vente non trouvée pour ${produit.nom}`);

          quantiteBase = quantiteUser * unite.facteurConversion;
          prixUnitaire = unite.prix;
          uniteNom = unite.nom;
        } else {
          // Vente en unité de base
          quantiteBase = quantiteUser;
          prixUnitaire = produit.prixVente;
          uniteNom = produit.uniteBase;
        }

        // Vérifier le stock (toujours en unité de base)
        if (produit.stock < quantiteBase) {
          const stockInfo = item.uniteVenteId && uniteNom
            ? `Stock: ${produit.stock} ${produit.uniteBase} (≈ ${Math.floor(produit.stock / (quantiteBase / quantiteUser))} ${uniteNom})`
            : `Stock: ${produit.stock} ${produit.uniteBase}`;
          throw new Error(`Stock insuffisant pour ${produit.nom}. ${stockInfo}`);
        }

        const sousTotal = prixUnitaire * quantiteUser;
        montantTotal += sousTotal;

        // Décrémenter le stock en unité de base
        await tx.produit.update({
          where: { id: produit.id },
          data: { stock: { decrement: quantiteBase } },
        });

        venteDetails.push({
          produitId: produit.id,
          quantite: quantiteUser,
          quantiteBase,
          prixUnitaire,
          sousTotal,
          uniteNom,
        });
      }

      // Déterminer le statut
      const paiementMode = modePaiement || 'CASH';
      const paye = (montantPaye !== undefined && montantPaye !== null && montantPaye !== '')
        ? parseFloat(montantPaye)
        : (paiementMode === 'CREDIT' ? 0 : montantTotal);
      let statut = 'COMPLETEE';

      if (paiementMode === 'CREDIT' || paye < montantTotal) {
        statut = 'EN_CREDIT';
        if (!clientId) {
          throw new Error('Un client est requis pour une vente à crédit');
        }
      }

      // Créer la vente
      const vente = await tx.vente.create({
        data: {
          numero: generateNumeroVente(),
          montantTotal,
          montantPaye: paye,
          modePaiement: paiementMode,
          statut,
          clientId: clientId ? parseInt(clientId) : null,
          userId: req.user.id,
          boutiqueId: req.boutiqueId,
          details: { create: venteDetails },
        },
        include: {
          details: { include: { produit: { select: { nom: true, uniteBase: true } } } },
          client: true,
          user: { select: { nom: true, prenom: true } },
        },
      });

      // Créer une dette si c'est à crédit
      if (statut === 'EN_CREDIT') {
        await tx.dette.create({
          data: {
            montantTotal: montantTotal,
            montantPaye: paye,
            montantRestant: montantTotal - paye,
            clientId: parseInt(clientId),
            venteId: vente.id,
          },
        });
      }

      return vente;
    });

    res.status(201).json({ success: true, message: 'Vente enregistrée', data: result });
  } catch (error) {
    console.error('Erreur create vente:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lister les ventes
const getAll = async (req, res) => {
  try {
    const { dateDebut, dateFin, statut, userId } = req.query;

    const where = { boutiqueId: req.boutiqueId };

    if (dateDebut || dateFin) {
      where.createdAt = {};
      if (dateDebut) where.createdAt.gte = new Date(dateDebut);
      if (dateFin) where.createdAt.lte = new Date(dateFin + 'T23:59:59.999Z');
    }
    if (statut) where.statut = statut;
    if (userId) where.userId = parseInt(userId);

    const ventes = await prisma.vente.findMany({
      where,
      include: {
        details: { include: { produit: { select: { nom: true, uniteBase: true } } } },
        client: { select: { nom: true, prenom: true } },
        user: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: ventes });
  } catch (error) {
    console.error('Erreur getAll ventes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Obtenir une vente par ID
const getById = async (req, res) => {
  try {
    const vente = await prisma.vente.findFirst({
      where: { id: parseInt(req.params.id), boutiqueId: req.boutiqueId },
      include: {
        details: { include: { produit: true } },
        client: true,
        user: { select: { nom: true, prenom: true } },
        dette: { include: { remboursements: true } },
      },
    });

    if (!vente) {
      return res.status(404).json({ success: false, message: 'Vente non trouvée' });
    }

    res.json({ success: true, data: vente });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Annuler une vente (remettre le stock en unité de base)
const annuler = async (req, res) => {
  try {
    const { id } = req.params;

    const vente = await prisma.vente.findFirst({
      where: { id: parseInt(id), boutiqueId: req.boutiqueId },
      include: { details: true },
    });

    if (!vente) {
      return res.status(404).json({ success: false, message: 'Vente non trouvée' });
    }

    if (vente.statut === 'ANNULEE') {
      return res.status(400).json({ success: false, message: 'Vente déjà annulée' });
    }

    await prisma.$transaction(async (tx) => {
      // Remettre le stock (utiliser quantiteBase si disponible, sinon quantite)
      for (const detail of vente.details) {
        const qtyToRestore = detail.quantiteBase || detail.quantite;
        await tx.produit.update({
          where: { id: detail.produitId },
          data: { stock: { increment: qtyToRestore } },
        });
      }

      // Annuler la vente
      await tx.vente.update({
        where: { id: parseInt(id) },
        data: { statut: 'ANNULEE' },
      });

      // Annuler les dettes associées
      await tx.dette.updateMany({
        where: { venteId: parseInt(id) },
        data: { statut: 'ANNULEE', montantRestant: 0 },
      });
    });

    res.json({ success: true, message: 'Vente annulée, stock restauré' });
  } catch (error) {
    console.error('Erreur annuler vente:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { create, getAll, getById, annuler };
