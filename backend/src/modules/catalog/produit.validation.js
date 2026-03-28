const { body, param, query } = require('express-validator');

const isEmptyValue = (value) => value === undefined || value === null || value === '';

const normalizeBooleanLike = (value) => {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return value !== 0 ? 'true' : 'false';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes', 'oui'].includes(normalized)) return 'true';
    if (['false', '0', 'off', 'no', 'non', ''].includes(normalized)) return 'false';
  }
  return value;
};

const isBooleanLike = (value) => ['true', 'false'].includes(normalizeBooleanLike(value));

const optionalPositiveInt = (builder, label) => builder.custom((value) => {
  if (isEmptyValue(value)) return true;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} invalide`);
  }
  return true;
});

const optionalNonNegativeNumber = (builder, label) => builder.custom((value) => {
  if (isEmptyValue(value)) return true;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} invalide`);
  }
  return true;
});

const optionalStrictPositiveNumber = (builder, label) => builder.custom((value) => {
  if (isEmptyValue(value)) return true;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} invalide`);
  }
  return true;
});

const idParamValidation = (field, label) => [
  param(field)
    .isInt({ min: 1 })
    .withMessage(`${label} invalide`)
    .toInt(),
];

const productBodyValidation = ({ requireName, requireStock = false }) => {
  const nameRule = body('nom')
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('Le nom du produit doit contenir entre 2 et 160 caractères');

  const prixVenteRule = body('prixVente')
    .notEmpty().withMessage('Le prix de vente est obligatoire')
    .bail()
    .custom((value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Le prix de vente invalide');
      return true;
    });

  const stockRule = requireStock
    ? body('stock')
        .notEmpty().withMessage('Le stock initial est obligatoire')
        .bail()
        .custom((value) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Le stock invalide');
          return true;
        })
    : optionalNonNegativeNumber(body('stock'), 'Le stock');

  const categorieRule = body('categorieId')
    .notEmpty().withMessage('La catégorie est obligatoire')
    .bail()
    .custom((value) => {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isInteger(parsed) || parsed < 1) throw new Error('Catégorie invalide');
      return true;
    })
    .toInt();

  return [
    ...(requireName ? [nameRule] : [body('nom').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 160 }).withMessage('Le nom du produit doit contenir entre 2 et 160 caractères')]),
    body('description')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 2000 })
      .withMessage('La description ne peut pas dépasser 2000 caractères'),
    body('codeBarre')
      .optional({ nullable: true })
      .trim()
      .isLength({ max: 64 })
      .withMessage('Le code-barres ne peut pas dépasser 64 caractères'),
    body('uniteBase')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('L’unité de base est invalide'),
    body('commercialMode')
      .optional({ values: 'falsy' })
      .trim()
      .toLowerCase()
      .isIn(['poids', 'volume', 'carton'])
      .withMessage('Mode commercial invalide'),
    optionalStrictPositiveNumber(body('commercialSize'), 'La taille de conditionnement'),
    optionalNonNegativeNumber(body('commercialCount'), 'Le nombre de conditionnements'),
    prixVenteRule,
    optionalNonNegativeNumber(body(‘prixAchat’), ‘Le prix d’achat’),
    optionalNonNegativeNumber(body(‘prixAchatConditionnement’), ‘Le prix d’achat du conditionnement’),
    optionalNonNegativeNumber(body(‘prixVenteConditionnement’), ‘Le prix de vente du conditionnement’),
    optionalNonNegativeNumber(body(‘prixVenteDetail’), ‘Le prix de vente au détail’),
    stockRule,
    optionalNonNegativeNumber(body(‘stockAlerte’), ‘Le stock d’alerte’),
    categorieRule,
    optionalPositiveInt(body('fournisseurId'), 'Fournisseur'),
    body('datePeremption')
      .optional({ nullable: true })
      .custom((value) => {
        if (isEmptyValue(value)) return true;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
          throw new Error('La date de péremption doit être au format AAAA-MM-JJ');
        }
        return true;
      }),
    body('alertePeremptionJours')
      .optional({ nullable: true })
      .custom((value) => {
        if (isEmptyValue(value)) return true;
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw new Error('Le seuil d’alerte de péremption est invalide');
        }
        return true;
      }),
    body('actif')
      .optional({ nullable: true })
      .custom((value) => {
        if (!isBooleanLike(value)) {
          throw new Error('Le statut actif est invalide');
        }
        return true;
      })
      .customSanitizer(normalizeBooleanLike),
  ];
};

const listProductsValidation = [
  query('search')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Le terme de recherche est trop long'),
  optionalPositiveInt(query('categorieId'), 'Catégorie'),
  query('alerteStock')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (!isBooleanLike(value)) {
        throw new Error('Le filtre alerteStock est invalide');
      }
      return true;
    })
    .customSanitizer(normalizeBooleanLike),
];

const createProductValidation = productBodyValidation({ requireName: true, requireStock: true });
const updateProductValidation = [...idParamValidation('id', 'Identifiant produit'), ...productBodyValidation({ requireName: false, requireStock: false })];
const productIdValidation = idParamValidation('id', 'Identifiant produit');
const productUnitParentValidation = idParamValidation('produitId', 'Identifiant produit');
const unitIdValidation = idParamValidation('uniteId', 'Identifiant unité');

const createUnitValidation = [
  ...productUnitParentValidation,
  body('nom')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Le nom de l’unité doit contenir entre 1 et 80 caractères'),
  optionalStrictPositiveNumber(body('facteurConversion'), 'Le facteur de conversion'),
  body('facteurConversion')
    .custom((value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Le facteur de conversion est invalide');
      }
      return true;
    }),
  body('prix')
    .custom((value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Le prix est invalide');
      }
      return true;
    }),
  optionalNonNegativeNumber(body('prixAchat'), 'Le prix d’achat'),
  body('estDefaut')
    .optional({ nullable: true })
    .custom((value) => {
      if (!isBooleanLike(value)) {
        throw new Error('Le statut par défaut est invalide');
      }
      return true;
    })
    .customSanitizer(normalizeBooleanLike),
];

const updateUnitValidation = [
  ...unitIdValidation,
  body('nom')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Le nom de l’unité doit contenir entre 1 et 80 caractères'),
  optionalStrictPositiveNumber(body('facteurConversion'), 'Le facteur de conversion'),
  optionalStrictPositiveNumber(body('prix'), 'Le prix'),
  optionalNonNegativeNumber(body('prixAchat'), 'Le prix d’achat'),
  body('estDefaut')
    .optional({ nullable: true })
    .custom((value) => {
      if (!isBooleanLike(value)) {
        throw new Error('Le statut par défaut est invalide');
      }
      return true;
    })
    .customSanitizer(normalizeBooleanLike),
];

module.exports = {
  createProductValidation,
  createUnitValidation,
  listProductsValidation,
  productIdValidation,
  updateProductValidation,
  updateUnitValidation,
  unitIdValidation,
};