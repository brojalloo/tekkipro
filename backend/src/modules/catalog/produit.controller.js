// Contrôleur Produits + Unités de vente (système de conversion)
const prisma = require('../../config/database');
const { badRequest, created, error: sendError, notFound } = require('../../common/utils/response');
const { normalizePeremptionPayload } = require('../../common/utils/peremption');
const { parsePagination, paginatedResponse } = require('../../common/utils/pagination');
const logger = require('../../common/utils/logger');
const { logAudit } = require('../../common/utils/auditLog');

const COMMERCIAL_MODES = {
  poids: {
    uniteBase: 'g',
    label: 'Sac',
    suffixe: 'kg',
    detailUnits: [
      { nom: '1 kg', facteurConversion: 1000 },
      { nom: '500 g', facteurConversion: 500 },
      { nom: '250 g', facteurConversion: 250 },
    ],
  },
  volume: {
    uniteBase: 'ml',
    label: 'Bidon',
    suffixe: 'L',
    detailUnits: [
      { nom: '1 L', facteurConversion: 1000 },
      { nom: '1/2 L', facteurConversion: 500 },
      { nom: '1/4 L', facteurConversion: 250 },
      { nom: '1/8 L', facteurConversion: 125 },
    ],
  },
  carton: {
    uniteBase: 'piece',
    label: 'Carton',
    suffixe: 'unités',
    detailUnits: [
      { nom: 'Unité', facteurConversion: 1 },
    ],
  },
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBooleanInput = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'off', 'no', 'non', ''].includes(normalized)) return false;
    if (['true', '1', 'on', 'yes', 'oui'].includes(normalized)) return true;
  }
  return Boolean(value);
};

const createUnitWithDefaultReset = async ({ produitId, data }) => {
  if (!data.estDefaut) {
    return prisma.uniteVente.create({ data });
  }

  return prisma.$transaction(async (tx) => {
    await tx.uniteVente.updateMany({
      where: { produitId },
      data: { estDefaut: false },
    });
    return tx.uniteVente.create({ data });
  });
};

const updateUnitWithDefaultReset = async ({ uniteId, produitId, data }) => {
  if (!data.estDefaut) {
    return prisma.uniteVente.update({ where: { id: uniteId }, data });
  }

  return prisma.$transaction(async (tx) => {
    await tx.uniteVente.updateMany({
      where: {
        produitId,
        id: { not: uniteId },
      },
      data: { estDefaut: false },
    });
    return tx.uniteVente.update({ where: { id: uniteId }, data });
  });
};

const roundPrice = (value, digits = 4) => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.0+$/, '');
};

const getCommercialFactor = (mode, size) => {
  if (!COMMERCIAL_MODES[mode] || !Number.isFinite(size)) return null;
  return mode === 'carton' ? size : size * 1000;
};

const buildCommercialUnitName = (mode, size) => {
  const config = COMMERCIAL_MODES[mode];
  if (!config) return '';
  return `${config.label} ${formatNumber(size)} ${config.suffixe}`.trim();
};

const normalizeManualUnits = (unitesVente = []) => {
  if (!Array.isArray(unitesVente)) return [];

  return unitesVente
    .map((u) => {
      const facteurConversion = parseNumber(u.facteurConversion);
      const prix = parseNumber(u.prix);
      const prixAchat = parseNumber(u.prixAchat);

      if (!u.nom || !Number.isFinite(facteurConversion) || facteurConversion <= 0 || prix === null || prix < 0) {
        return null;
      }

      return {
        nom: u.nom.trim(),
        facteurConversion,
        prix: roundPrice(prix, 2),
        prixAchat: prixAchat !== null ? roundPrice(prixAchat, 2) : null,
        estDefaut: parseBooleanInput(u.estDefaut),
      };
    })
    .filter(Boolean);
};

const buildAutomaticConfig = (payload, options = {}) => {
  const { requireCount = false } = options;
  const { commercialMode } = payload;

  if (!COMMERCIAL_MODES[commercialMode]) {
    return null;
  }

  const commercialSize = parseNumber(payload.commercialSize);
  if (commercialSize === null || commercialSize <= 0) {
    return { error: 'La taille du conditionnement doit être supérieure à 0.' };
  }

  const commercialFactor = getCommercialFactor(commercialMode, commercialSize);
  const prixAchatConditionnement = parseNumber(payload.prixAchatConditionnement ?? payload.prixAchat);
  const prixVenteConditionnement = parseNumber(payload.prixVenteConditionnement ?? payload.prixVente);
  const prixVenteDetail = parseNumber(payload.prixVenteDetail);
  const stockAlerteCommercial = parseNumber(payload.stockAlerte);
  const commercialCount = parseNumber(payload.commercialCount);

  if (requireCount && (commercialCount === null || commercialCount < 0)) {
    return { error: 'Le nombre de conditionnements est requis.' };
  }

  if (prixAchatConditionnement === null || prixAchatConditionnement < 0) {
    return { error: 'Le prix d\'achat du conditionnement est requis.' };
  }

  if (prixVenteConditionnement === null || prixVenteConditionnement < 0) {
    return { error: 'Le prix de vente du conditionnement est requis.' };
  }

  if (commercialMode === 'carton' && prixVenteDetail !== null && prixVenteDetail < 0) {
    return { error: 'Le prix de vente unitaire doit être positif.' };
  }

  const commercialUnit = {
    nom: buildCommercialUnitName(commercialMode, commercialSize),
    facteurConversion: commercialFactor,
    prix: roundPrice(prixVenteConditionnement, 2),
    prixAchat: roundPrice(prixAchatConditionnement, 2),
    estDefaut: true,
  };

  const detailUnits = COMMERCIAL_MODES[commercialMode].detailUnits.map((unit) => {
    let unitPrice = prixVenteConditionnement / commercialFactor * unit.facteurConversion;
    if (commercialMode === 'carton' && unit.facteurConversion === 1 && prixVenteDetail !== null) {
      unitPrice = prixVenteDetail;
    }

    return {
      nom: unit.nom,
      facteurConversion: unit.facteurConversion,
      prix: roundPrice(unitPrice, 2),
      prixAchat: null,
      estDefaut: false,
    };
  });

  return {
    uniteBase: COMMERCIAL_MODES[commercialMode].uniteBase,
    stock: commercialCount !== null ? commercialCount * commercialFactor : undefined,
    stockAlerte: stockAlerteCommercial !== null ? stockAlerteCommercial * commercialFactor : undefined,
    prixAchat: roundPrice(prixAchatConditionnement / commercialFactor, 4),
    prixVente: roundPrice(
      commercialMode === 'carton' && prixVenteDetail !== null
        ? prixVenteDetail
        : prixVenteConditionnement / commercialFactor,
      4,
    ),
    unitsToCreate: [commercialUnit, ...detailUnits],
  };
};

// Lister tous les produits de la boutique (avec pagination)
const getAll = async (req, res) => {
  try {
    const { search, categorieId, alerteStock } = req.query;
    const { page, limit, skip, take } = parsePagination(req.query);

    const where = { boutiqueId: req.boutiqueId, actif: true };

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { codeBarre: { contains: search } },
      ];
    }
    if (categorieId) where.categorieId = parseInt(categorieId);

    // Note : Prisma ne supporte pas la comparaison directe de colonnes (stock <= stockAlerte),
    // le filtre alerteStock est appliqué en post-traitement JS après fetch.
    // Pour éviter le N+1, on charge une page complète puis on filtre si nécessaire
    const [produits, total] = await prisma.$transaction([
      prisma.produit.findMany({
        where,
        include: {
          categorie: { select: { id: true, nom: true } },
          fournisseur: { select: { id: true, nom: true } },
          unitesVente: { orderBy: { estDefaut: 'desc' } },
        },
        orderBy: { nom: 'asc' },
        skip: alerteStock === 'true' ? undefined : skip,
        take:  alerteStock === 'true' ? undefined : take,
      }),
      prisma.produit.count({ where }),
    ]);

    if (alerteStock === 'true') {
      const filtered = produits.filter(p => p.stock <= p.stockAlerte);
      const paged = filtered.slice(skip, skip + take);
      return res.json(paginatedResponse(paged, filtered.length, page, limit));
    }

    res.json(paginatedResponse(produits, total, page, limit));
  } catch (error) {
    logger.error('Erreur getAll produits', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'PRODUCTS_FETCH_FAILED' });
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
      return notFound(res, 'Produit non trouvé', { code: 'PRODUCT_NOT_FOUND' });
    }

    res.json({ success: true, data: produit });
  } catch (error) {
    return sendError(res, 'Erreur serveur', 500, { code: 'PRODUCT_FETCH_FAILED' });
  }
};

// Créer un produit
const create = async (req, res) => {
  try {
    const { nom, description, prixVente, prixAchat, stock, stockAlerte, uniteBase, codeBarre, categorieId, fournisseurId, unitesVente } = req.body;
    const peremptionPayload = normalizePeremptionPayload(req.body);

    if (peremptionPayload.error) {
      return badRequest(res, peremptionPayload.error, { code: 'INVALID_PEREMPTION_PAYLOAD' });
    }

    const automaticConfig = buildAutomaticConfig(req.body, { requireCount: true });
    if (automaticConfig?.error) {
      return badRequest(res, automaticConfig.error, { code: 'INVALID_AUTOMATIC_PRODUCT_CONFIG' });
    }

    const stockBase = automaticConfig
      ? automaticConfig.stock
      : (parseNumber(stock) ?? 0);

    const unitsToCreate = automaticConfig
      ? automaticConfig.unitsToCreate
      : normalizeManualUnits(unitesVente);

    const produit = await prisma.produit.create({
      data: {
        nom,
        description,
        prixVente: automaticConfig ? automaticConfig.prixVente : (parseNumber(prixVente) ?? 0),
        prixAchat: automaticConfig ? automaticConfig.prixAchat : (parseNumber(prixAchat) ?? 0),
        stock: stockBase,
        stockAlerte: automaticConfig ? (automaticConfig.stockAlerte ?? 0) : (parseNumber(stockAlerte) ?? 0),
        uniteBase: automaticConfig ? automaticConfig.uniteBase : (uniteBase || 'piece'),
        codeBarre,
        categorieId: categorieId ? parseInt(categorieId) : null,
        fournisseurId: fournisseurId ? parseInt(fournisseurId) : null,
        ...peremptionPayload.data,
        boutiqueId: req.boutiqueId,
        unitesVente: unitsToCreate.length > 0 ? { create: unitsToCreate } : undefined,
      },
      include: { unitesVente: { orderBy: { estDefaut: 'desc' } }, categorie: { select: { id: true, nom: true } } },
    });

    logAudit(prisma, {
      action: 'CREATE',
      entite: 'produit',
      entiteId: produit.id,
      message: `Produit "${produit.nom}" cree`,
      userId: req.user.id,
      boutiqueId: req.boutiqueId,
    });
    return created(res, produit, 'Produit cree');
  } catch (error) {
    logger.error('Erreur create produit', error);
    return sendError(res, 'Erreur lors de la création du produit', 500, { code: 'PRODUCT_CREATE_FAILED' });
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
      return notFound(res, 'Produit non trouvé', { code: 'PRODUCT_NOT_FOUND' });
    }

    const { nom, description, prixVente, prixAchat, stock, stockAlerte, uniteBase, codeBarre, categorieId, fournisseurId, actif } = req.body;
    const peremptionPayload = normalizePeremptionPayload(req.body, existing);

    if (peremptionPayload.error) {
      return badRequest(res, peremptionPayload.error, { code: 'INVALID_PEREMPTION_PAYLOAD' });
    }

    const automaticConfig = buildAutomaticConfig(req.body, { requireCount: false });
    if (automaticConfig?.error) {
      return badRequest(res, automaticConfig.error, { code: 'INVALID_AUTOMATIC_PRODUCT_CONFIG' });
    }

    const produit = await prisma.produit.update({
      where: { id: parseInt(id) },
      data: {
        nom,
        description,
        prixVente: automaticConfig
          ? automaticConfig.prixVente
          : (prixVente !== undefined && prixVente !== '' ? parseFloat(prixVente) : undefined),
        prixAchat: automaticConfig
          ? automaticConfig.prixAchat
          : (prixAchat !== undefined && prixAchat !== '' ? parseFloat(prixAchat) : undefined),
        stock: automaticConfig && automaticConfig.stock !== undefined
          ? automaticConfig.stock
          : (stock !== undefined && stock !== null && stock !== '' ? parseNumber(stock) : undefined),
        stockAlerte: automaticConfig
          ? automaticConfig.stockAlerte
          : (stockAlerte !== undefined && stockAlerte !== '' ? parseFloat(stockAlerte) : undefined),
        uniteBase: automaticConfig ? automaticConfig.uniteBase : uniteBase,
        codeBarre,
        actif,
        categorieId: categorieId ? parseInt(categorieId) : (categorieId === '' || categorieId === null ? null : undefined),
        fournisseurId: fournisseurId ? parseInt(fournisseurId) : (fournisseurId === '' || fournisseurId === null ? null : undefined),
        ...peremptionPayload.data,
        unitesVente: automaticConfig
          ? {
              deleteMany: {},
              create: automaticConfig.unitsToCreate,
            }
          : undefined,
      },
      include: { unitesVente: { orderBy: { estDefaut: 'desc' } }, categorie: true },
    });

    logAudit(prisma, {
      action: 'UPDATE',
      entite: 'produit',
      entiteId: produit.id,
      message: `Produit "${produit.nom}" modifie`,
      userId: req.user.id,
      boutiqueId: req.boutiqueId,
    });
    res.json({ success: true, message: 'Produit mis a jour', data: produit });
  } catch (error) {
    logger.error('Erreur update produit', error);
    return sendError(res, 'Erreur lors de la mise à jour', 500, { code: 'PRODUCT_UPDATE_FAILED' });
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
      return notFound(res, 'Produit non trouvé', { code: 'PRODUCT_NOT_FOUND' });
    }

    await prisma.produit.update({
      where: { id: parseInt(id) },
      data: { actif: false },
    });

    logAudit(prisma, {
      action: 'DELETE',
      entite: 'produit',
      entiteId: existing.id,
      message: `Produit "${existing.nom}" supprime`,
      userId: req.user.id,
      boutiqueId: req.boutiqueId,
    });
    res.json({ success: true, message: 'Produit desactive' });
  } catch (error) {
    return sendError(res, 'Erreur serveur', 500, { code: 'PRODUCT_REMOVE_FAILED' });
  }
};

// ====== GESTION DES UNITÉS DE VENTE ======

// Ajouter une unité de vente à un produit
const addUniteVente = async (req, res) => {
  try {
    const { produitId } = req.params;
    const { nom, facteurConversion, prix, prixAchat, estDefaut } = req.body;
    const produitIdInt = parseInt(produitId);

    const produit = await prisma.produit.findFirst({
      where: { id: produitIdInt, boutiqueId: req.boutiqueId },
    });

    if (!produit) {
      return notFound(res, 'Produit non trouvé', { code: 'PRODUCT_NOT_FOUND' });
    }

    if (!nom || !facteurConversion || !prix) {
      return badRequest(res, 'Nom, facteur de conversion et prix sont requis', { code: 'UNIT_FIELDS_REQUIRED' });
    }

    const uniteData = {
      nom,
      facteurConversion: parseFloat(facteurConversion),
      prix: parseFloat(prix),
      prixAchat: prixAchat ? parseFloat(prixAchat) : null,
      estDefaut: parseBooleanInput(estDefaut),
      produitId: produitIdInt,
    };

    const unite = await createUnitWithDefaultReset({
      produitId: produitIdInt,
      data: uniteData,
    });

    return created(res, unite, 'Unité de vente ajoutée');
  } catch (error) {
    logger.error('Erreur addUniteVente', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'UNIT_CREATE_FAILED' });
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
      return notFound(res, 'Unité non trouvée', { code: 'UNIT_NOT_FOUND' });
    }
    await prisma.uniteVente.delete({ where: { id: parseInt(uniteId) } });
    res.json({ success: true, message: 'Unité de vente supprimée' });
  } catch (error) {
    logger.error('Erreur removeUniteVente', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'UNIT_REMOVE_FAILED' });
  }
};

// Mettre à jour une unité de vente
const updateUniteVente = async (req, res) => {
  try {
    const { uniteId } = req.params;
    const { nom, facteurConversion, prix, prixAchat, estDefaut } = req.body;
    const uniteIdInt = parseInt(uniteId);

    const unite = await prisma.uniteVente.findFirst({
      where: { id: uniteIdInt },
      include: { produit: { select: { boutiqueId: true } } },
    });
    if (!unite || unite.produit.boutiqueId !== req.boutiqueId) {
      return notFound(res, 'Unité non trouvée', { code: 'UNIT_NOT_FOUND' });
    }

    const updateData = {
      nom: nom || unite.nom,
      facteurConversion: facteurConversion !== undefined ? parseFloat(facteurConversion) : unite.facteurConversion,
      prix: prix !== undefined ? parseFloat(prix) : unite.prix,
      prixAchat: prixAchat !== undefined ? (prixAchat ? parseFloat(prixAchat) : null) : unite.prixAchat,
      estDefaut: estDefaut !== undefined ? parseBooleanInput(estDefaut) : unite.estDefaut,
    };

    const updated = await updateUnitWithDefaultReset({
      uniteId: uniteIdInt,
      produitId: unite.produitId,
      data: updateData,
    });

    res.json({ success: true, message: 'Unité de vente mise à jour', data: updated });
  } catch (error) {
    logger.error('Erreur updateUniteVente', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'UNIT_UPDATE_FAILED' });
  }
};

// Produits en alerte de stock
// Prisma ne supporte pas la comparaison de colonnes directement (stock <= stockAlerte),
// on récupère les IDs via SQL raw, puis on charge les données complètes avec les includes.
const getAlertesStock = async (req, res) => {
  try {
    const alertIds = await prisma.$queryRaw`
      SELECT id FROM produits
      WHERE "boutiqueId" = ${req.boutiqueId} AND actif = true AND stock <= "stockAlerte"
      ORDER BY stock ASC
    `.then(rows => rows.map(r => Number(r.id)));

    if (alertIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const produits = await prisma.produit.findMany({
      where: { id: { in: alertIds } },
      include: { categorie: { select: { nom: true } }, unitesVente: true },
      orderBy: { stock: 'asc' },
    });

    res.json({ success: true, data: produits });
  } catch (error) {
    logger.error('Erreur getAlertesStock', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'STOCK_ALERTS_FETCH_FAILED' });
  }
};

module.exports = { getAll, getById, create, update, remove, addUniteVente, removeUniteVente, updateUniteVente, getAlertesStock };
