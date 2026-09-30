import { query, queryOne } from '../db/pool.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

export async function logActivity(adminUserId, action, entityType, entityId, details, ip) {
  await query(
    `INSERT INTO admin_activity_logs (admin_user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminUserId, action, entityType, entityId, JSON.stringify(details || {}), ip]
  );
}

export async function getActivityLogs(queryParams) {
  const { page, limit, offset } = parsePagination(queryParams, { limit: 30 });
  const countRow = await queryOne('SELECT COUNT(*) AS total FROM admin_activity_logs');
  const rows = await query(
    `SELECT al.*, au.name AS admin_name FROM admin_activity_logs al
     LEFT JOIN admin_users au ON au.id = al.admin_user_id
     ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return paginatedResponse(rows, countRow.total, page, limit);
}
