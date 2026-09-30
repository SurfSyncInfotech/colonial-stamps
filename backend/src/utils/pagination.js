export function parsePagination(query, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page = Math.max(1, parseInt(query.page || defaults.page, 10));
  const limit = Math.min(defaults.maxLimit, Math.max(1, parseInt(query.limit || defaults.limit, 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
