// Helper pagination — à utiliser dans tous les endpoints de liste
// Usage: const { skip, take, page, limit } = parsePagination(req.query);
//        res.json(paginatedResponse(data, total, page, limit));

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

/**
 * Parse les paramètres de pagination depuis req.query.
 * Supporte: ?page=1&limit=20
 */
const parsePagination = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip  = (page - 1) * limit;
  return { page, limit, skip, take: limit };
};

/**
 * Construit la réponse paginée standard.
 */
const paginatedResponse = (data, total, page, limit) => ({
  success: true,
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

module.exports = { parsePagination, paginatedResponse, DEFAULT_LIMIT, MAX_LIMIT };
