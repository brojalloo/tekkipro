const DEFAULT_SUCCESS_MESSAGES = Object.freeze({
  fr: Object.freeze({
    fallback: 'Opération effectuée avec succès.',
    create: 'Création effectuée avec succès.',
    update: 'Mise à jour effectuée avec succès.',
    delete: 'Suppression effectuée avec succès.',
    save: 'Enregistrement effectué avec succès.',
    cancel: 'Annulation effectuée avec succès.',
  }),
  en: Object.freeze({
    fallback: 'Operation completed successfully.',
    create: 'Creation completed successfully.',
    update: 'Update completed successfully.',
    delete: 'Deletion completed successfully.',
    save: 'Saved successfully.',
    cancel: 'Cancellation completed successfully.',
  }),
});

const LOCAL_SUCCESS_MESSAGES = Object.freeze({
  fr: Object.freeze({
    auth: Object.freeze({
      login: 'Connexion réussie.',
    }),
    boutique: Object.freeze({
      create: 'Boutique créée avec succès.',
      delete: 'Boutique supprimée avec succès.',
    }),
    client: Object.freeze({
      create: 'Client ajouté avec succès.',
      update: 'Client mis à jour avec succès.',
      delete: 'Client supprimé avec succès.',
    }),
    employe: Object.freeze({
      create: 'Employé ajouté avec succès.',
    }),
    fournisseur: Object.freeze({
      create: 'Fournisseur ajouté avec succès.',
      update: 'Fournisseur mis à jour avec succès.',
      delete: 'Fournisseur supprimé avec succès.',
    }),
    produit: Object.freeze({
      create: 'Produit créé avec succès.',
      update: 'Produit mis à jour avec succès.',
      delete: 'Produit supprimé avec succès.',
      deactivate: 'Produit désactivé avec succès.',
      addToSale: ({ name } = {}) => name ? `Produit ${name} ajouté à la vente.` : 'Produit ajouté à la vente.',
      barcodeScanned: ({ code } = {}) => code ? `Code-barres scanné : ${code}` : 'Code-barres scanné.',
    }),
    settings: Object.freeze({
      update: 'Paramètres mis à jour avec succès.',
    }),
    stock: Object.freeze({
      update: 'Stock mis à jour avec succès.',
    }),
    dette: Object.freeze({
      repay: 'Paiement enregistré avec succès.',
    }),
    subscription: Object.freeze({
      stripePaymentConfirmed: 'Paiement Stripe confirmé. Votre abonnement est activé.',
      paymentProcessing: 'Paiement en cours de traitement.',
      paymentReceivedRefreshing: 'Paiement reçu. Actualisation en cours.',
      paymentConfirmed: 'Paiement confirmé. Votre abonnement est activé.',
    }),
    vente: Object.freeze({
      save: ({ numero } = {}) => numero ? `Vente ${numero} enregistrée avec succès.` : 'Vente enregistrée avec succès.',
      cancel: 'Vente annulée avec succès.',
    }),
  }),
  en: Object.freeze({
    auth: Object.freeze({
      login: 'Signed in successfully.',
    }),
    boutique: Object.freeze({
      create: 'Store created successfully.',
      delete: 'Store deleted successfully.',
    }),
    client: Object.freeze({
      create: 'Client added successfully.',
      update: 'Client updated successfully.',
      delete: 'Client deleted successfully.',
    }),
    employe: Object.freeze({
      create: 'Employee added successfully.',
    }),
    fournisseur: Object.freeze({
      create: 'Supplier added successfully.',
      update: 'Supplier updated successfully.',
      delete: 'Supplier deleted successfully.',
    }),
    produit: Object.freeze({
      create: 'Product created successfully.',
      update: 'Product updated successfully.',
      delete: 'Product deleted successfully.',
      deactivate: 'Product deactivated successfully.',
      addToSale: ({ name } = {}) => name ? `Product ${name} added to sale.` : 'Product added to sale.',
      barcodeScanned: ({ code } = {}) => code ? `Barcode scanned: ${code}` : 'Barcode scanned.',
    }),
    settings: Object.freeze({
      update: 'Settings updated successfully.',
    }),
    stock: Object.freeze({
      update: 'Stock updated successfully.',
    }),
    dette: Object.freeze({
      repay: 'Payment recorded successfully.',
    }),
    subscription: Object.freeze({
      stripePaymentConfirmed: 'Stripe payment confirmed. Your subscription is active.',
      paymentProcessing: 'Payment is being processed.',
      paymentReceivedRefreshing: 'Payment received. Refreshing.',
      paymentConfirmed: 'Payment confirmed. Your subscription is active.',
    }),
    vente: Object.freeze({
      save: ({ numero } = {}) => numero ? `Sale ${numero} saved successfully.` : 'Sale saved successfully.',
      cancel: 'Sale cancelled successfully.',
    }),
  }),
});

function resolveLanguage(language) {
  return language === 'en' ? 'en' : 'fr';
}

function resolveLocalSuccessMessage(language, { entity, action, params }) {
  const message = entity && action ? LOCAL_SUCCESS_MESSAGES[language]?.[entity]?.[action] : null;

  if (typeof message === 'function') {
    return message(params);
  }

  return message || null;
}

export function getApiSuccessPayload(response) {
  return response?.data || response || null;
}

export function getApiSuccessMessage(response, options = {}) {
  const language = resolveLanguage(options.language);
  const payload = getApiSuccessPayload(response);

  if (payload?.message) {
    return payload.message;
  }

  if (options.fallback) {
    return options.fallback;
  }

  if (options.action && DEFAULT_SUCCESS_MESSAGES[language][options.action]) {
    return DEFAULT_SUCCESS_MESSAGES[language][options.action];
  }

  return DEFAULT_SUCCESS_MESSAGES[language].fallback;
}

export function getLocalSuccessMessage(options = {}) {
  const language = resolveLanguage(options.language);
  const localMessage = resolveLocalSuccessMessage(language, options);

  if (localMessage) {
    return localMessage;
  }

  if (options.fallback) {
    return options.fallback;
  }

  if (options.action && DEFAULT_SUCCESS_MESSAGES[language][options.action]) {
    return DEFAULT_SUCCESS_MESSAGES[language][options.action];
  }

  return DEFAULT_SUCCESS_MESSAGES[language].fallback;
}
