import { query, queryOne } from '../db/pool.js';
// queryOne used for count
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

export async function createNotification(recipientType, recipientId, title, message, type = 'info', linkUrl = null) {
  await query(
    `INSERT INTO notifications (recipient_type, recipient_id, title, message, type, link_url) VALUES (?, ?, ?, ?, ?, ?)`,
    [recipientType, recipientId, title, message, type, linkUrl]
  );
}

export async function getNotifications(recipientType, recipientId, queryParams) {
  const { page, limit, offset } = parsePagination(queryParams);
  const countRow = await queryOne(
    'SELECT COUNT(*) AS total FROM notifications WHERE recipient_type = ? AND recipient_id = ?',
    [recipientType, recipientId]
  );
  const rows = await query(
    `SELECT * FROM notifications WHERE recipient_type = ? AND recipient_id = ?
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [recipientType, recipientId, limit, offset]
  );
  const unread = await queryOne(
    'SELECT COUNT(*) AS count FROM notifications WHERE recipient_type = ? AND recipient_id = ? AND is_read = 0',
    [recipientType, recipientId]
  );
  return { ...paginatedResponse(rows, countRow.total, page, limit), unreadCount: unread.count };
}

export async function markRead(id, recipientType, recipientId) {
  await query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_type = ? AND recipient_id = ?',
    [id, recipientType, recipientId]
  );
}

export async function markAllRead(recipientType, recipientId) {
  await query(
    'UPDATE notifications SET is_read = 1 WHERE recipient_type = ? AND recipient_id = ?',
    [recipientType, recipientId]
  );
}
