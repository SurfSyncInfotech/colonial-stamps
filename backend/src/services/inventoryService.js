import { query, queryOne, getPool } from '../db/pool.js';
import { AppError } from '../utils/errors.js';

export async function adjustStock(productId, quantityChange, type, reason, ref = {}, adminUserId = null) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT stock, reserved_stock FROM products WHERE id = ? FOR UPDATE', [productId]);
    const product = rows[0];
    if (!product) throw new AppError('Product not found', 404);

    const stockBefore = product.stock;
    const stockAfter = stockBefore + quantityChange;
    if (stockAfter < 0) throw new AppError('Insufficient stock', 400, 'INSUFFICIENT_STOCK');

    await conn.execute('UPDATE products SET stock = ? WHERE id = ?', [stockAfter, productId]);
    await conn.execute(
      `INSERT INTO inventory_adjustments (product_id, adjustment_type, quantity_change, stock_before, stock_after, reason, reference_type, reference_id, admin_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, type, quantityChange, stockBefore, stockAfter, reason, ref.type || null, ref.id || null, adminUserId]
    );
    await conn.commit();
    return stockAfter;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function reserveStock(productId, quantity) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT stock, reserved_stock FROM products WHERE id = ? FOR UPDATE', [productId]);
    const product = rows[0];
    if (!product) throw new AppError('Product not found', 404);
    const available = product.stock - product.reserved_stock;
    if (available < quantity) throw new AppError(`Insufficient stock for product #${productId}`, 400, 'INSUFFICIENT_STOCK');

    await conn.execute('UPDATE products SET reserved_stock = reserved_stock + ? WHERE id = ?', [quantity, productId]);
    await conn.execute(
      `INSERT INTO inventory_adjustments (product_id, adjustment_type, quantity_change, stock_before, stock_after, reason, reference_type)
       VALUES (?, 'reserve', ?, ?, ?, 'Order reservation', 'order')`,
      [productId, -quantity, product.stock, product.stock]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deductStock(productId, quantity, orderId) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT stock, reserved_stock FROM products WHERE id = ? FOR UPDATE', [productId]);
    const product = rows[0];
    if (!product) throw new AppError('Product not found', 404);

    const newStock = product.stock - quantity;
    const newReserved = Math.max(0, product.reserved_stock - quantity);
    if (newStock < 0) throw new AppError('Insufficient stock', 400);

    await conn.execute('UPDATE products SET stock = ?, reserved_stock = ? WHERE id = ?', [newStock, newReserved, productId]);
    await conn.execute(
      `INSERT INTO inventory_adjustments (product_id, adjustment_type, quantity_change, stock_before, stock_after, reason, reference_type, reference_id)
       VALUES (?, 'sale', ?, ?, ?, 'Order sale', 'order', ?)`,
      [productId, -quantity, product.stock, newStock, orderId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function restoreStock(productId, quantity, orderId) {
  await adjustStock(productId, quantity, 'cancel_restore', 'Order cancellation restore', { type: 'order', id: orderId });
}

export async function getInventoryHistory(productId, limit = 50) {
  return query(
    'SELECT * FROM inventory_adjustments WHERE product_id = ? ORDER BY created_at DESC LIMIT ?',
    [productId, limit]
  );
}
