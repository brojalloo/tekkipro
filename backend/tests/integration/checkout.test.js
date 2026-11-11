const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');

const baseUrl = new URL(process.env.TEKKIPRO_TEST_URL || 'http://127.0.0.1:8092');
const shop = `caisse-${randomUUID().slice(0, 12)}`;

function createClient(token) {
  return async (path, { method = 'GET', body, expectedStatus } = {}) => {
    const headers = { Origin: baseUrl.origin };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';

    const response = await fetch(new URL(`/api${path}`, baseUrl), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json();
    if (expectedStatus !== undefined) {
      assert.equal(response.status, expectedStatus, `${method} ${path}: ${JSON.stringify(payload)}`);
    }
    return { status: response.status, ...payload };
  };
}

test('la caisse conserve un stock et une dette cohérents sous requêtes concurrentes', async () => {
  const publicApi = createClient();
  const credentials = { email: `${shop}@example.test`, password: 'Local-ci-1234' };
  await publicApi('/auth/register', {
    method: 'POST',
    body: { ...credentials, nomBoutique: 'Boutique CI', slug: shop, nom: 'Test', prenom: 'Caisse' },
    expectedStatus: 201,
  });

  const { data: { token } } = await publicApi('/auth/login', {
    method: 'POST', body: credentials, expectedStatus: 200,
  });
  assert.ok(token);

  const api = createClient(token);
  const { data: produit } = await api('/produits', {
    method: 'POST',
    body: { nom: 'Savon CI', prixVente: 1000, stock: 0 },
    expectedStatus: 201,
  });
  await api('/stock/entree', {
    method: 'POST', body: { produitId: produit.id, quantite: 1 }, expectedStatus: 201,
  });

  const { data: client } = await api('/clients', {
    method: 'POST', body: { nom: 'Ndiaye', prenom: 'Awa' }, expectedStatus: 201,
  });
  const vendre = () => api('/ventes', {
    method: 'POST',
    body: { details: [{ produitId: produit.id, quantite: 1 }], modePaiement: 'CREDIT', clientId: client.id },
  });

  const ventes = await Promise.all([vendre(), vendre()]);
  assert.deepEqual(ventes.map(({ status }) => status).sort(), [201, 400], JSON.stringify(ventes));
  const venteId = ventes.find(({ status }) => status === 201).data.id;
  const lireStock = async () => (await api(`/produits/${produit.id}`, { expectedStatus: 200 })).data.stock;
  assert.equal(await lireStock(), 0);

  const lireVente = async () => (await api(`/ventes/${venteId}`, { expectedStatus: 200 })).data;
  const { dette } = await lireVente();
  assert.equal(dette.montantRestant, 1000);
  const rembourser = (montant) => api(`/dettes/${dette.id}/rembourser`, {
    method: 'POST', body: { montant },
  });

  const partiels = await Promise.all([rembourser(200), rembourser(200)]);
  assert.deepEqual(partiels.map(({ status }) => status), [200, 200], JSON.stringify(partiels));
  const excedentaires = await Promise.all([rembourser(400), rembourser(400)]);
  assert.deepEqual(excedentaires.map(({ status }) => status).sort(), [200, 400], JSON.stringify(excedentaires));
  const vente = await lireVente();
  assert.equal(vente.statut, 'EN_CREDIT');
  assert.equal(vente.montantPaye, 800);
  assert.equal(vente.dette.montantPaye, 800);
  assert.equal(vente.dette.montantRestant, 200);
  assert.deepEqual(vente.dette.remboursements.map(({ montant }) => montant).sort(), [200, 200, 400]);

  const annuler = () => api(`/ventes/${venteId}/annuler`, { method: 'PATCH' });
  const annulations = await Promise.all([annuler(), annuler()]);
  assert.deepEqual(annulations.map(({ status }) => status).sort(), [200, 400], JSON.stringify(annulations));
  assert.equal(await lireStock(), 1);
  const venteAnnulee = await lireVente();
  assert.equal(venteAnnulee.statut, 'ANNULEE');
  assert.equal(venteAnnulee.dette, null);
  assert.equal((await rembourser(100)).status, 404);
});
