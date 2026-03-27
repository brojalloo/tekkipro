// frontend/src/services/planUsageStore.js
// This module exposes a registrar so AuthContext can register
// its updatePlanUsage function, accessible by api.js without circular import.

let _updater = null;

export const registerPlanUsageUpdater = (fn) => { _updater = fn; };

export const callPlanUsageUpdater = (payload) => {
  if (_updater) _updater(payload);
};
