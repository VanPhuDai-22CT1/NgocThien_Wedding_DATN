import { Request } from 'express';

export function pagination(query: Request['query']) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw Object.assign(new Error('page must be positive; limit must be between 1 and 100'), { status: 400 });
  }
  return { page, limit, offset: (page - 1) * limit };
}
