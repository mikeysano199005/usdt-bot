import { query } from '../db/pool';
import { Order, OrderStatus, VALID_TRANSITIONS } from '../types/order';
import { getSetting } from './settingsService';

export interface OrderWithUser extends Order {
  discord_id: string;
  username: string | null;
  display_name: string | null;
  proof_file_path: string | null;
}

function generateOrderRef(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${datePart}-${rand}`;
}

export async function createOrder(data: {
  userId: number;
  inrAmount: number;
  network: string;
  walletAddress: string;
  utrNumber: string;
  proofFilename: string;
  discordAttachmentUrl: string;
}): Promise<Order> {
  const rateStr = await getSetting('exchange_rate');
  const rate = parseFloat(rateStr ?? '88.50');
  const usdtAmount = data.inrAmount / rate;
  const orderRef = generateOrderRef();

  const { rows: [order] } = await query<Order>(
    `INSERT INTO orders
       (order_ref, user_id, inr_amount, usdt_amount, exchange_rate, network, wallet_address, status, utr_number, direction)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'payment_submitted', $8, 'buy')
     RETURNING *`,
    [
      orderRef,
      data.userId,
      data.inrAmount,
      usdtAmount.toFixed(6),
      rate.toFixed(4),
      data.network,
      data.walletAddress,
      data.utrNumber,
    ]
  );

  await query(
    `INSERT INTO payment_proofs (order_id, file_path, discord_attachment_url)
     VALUES ($1, $2, $3)`,
    [order.id, data.proofFilename, data.discordAttachmentUrl]
  );

  return order;
}

export async function createSellOrder(data: {
  userId: number;
  usdtAmount: number;
  inrAmount: number;
  exchangeRate: number;
  network: string;
  walletAddress: string;
  txHash: string;
  proofFilename: string;
  discordAttachmentUrl: string;
}): Promise<Order> {
  const orderRef = generateOrderRef();

  const { rows: [order] } = await query<Order>(
    `INSERT INTO orders
       (order_ref, user_id, inr_amount, usdt_amount, exchange_rate, network, wallet_address, status, utr_number, tx_hash, direction)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'payment_submitted', $8, $9, 'sell')
     RETURNING *`,
    [
      orderRef,
      data.userId,
      data.inrAmount.toFixed(2),
      data.usdtAmount.toFixed(6),
      data.exchangeRate.toFixed(4),
      data.network,
      data.walletAddress,
      data.txHash,
      data.txHash,
    ]
  );

  await query(
    `INSERT INTO payment_proofs (order_id, file_path, discord_attachment_url)
     VALUES ($1, $2, $3)`,
    [order.id, data.proofFilename, data.discordAttachmentUrl]
  );

  return order;
}

export async function getOrderById(id: number): Promise<OrderWithUser | null> {
  const { rows } = await query<OrderWithUser>(
    `SELECT o.*, u.discord_id, u.username, u.display_name,
            pp.file_path as proof_file_path
     FROM orders o
     JOIN users u ON u.id = o.user_id
     LEFT JOIN payment_proofs pp ON pp.order_id = o.id
     WHERE o.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getOrderByRef(orderRef: string): Promise<Order | null> {
  const { rows } = await query<Order>(
    'SELECT * FROM orders WHERE order_ref = $1',
    [orderRef]
  );
  return rows[0] ?? null;
}

export async function getOrdersByUserId(userId: number): Promise<Order[]> {
  const { rows } = await query<Order>(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
    [userId]
  );
  return rows;
}

export async function getOrdersByDiscordId(discordId: string): Promise<Order[]> {
  const { rows } = await query<Order>(
    `SELECT o.* FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE u.discord_id = $1
     ORDER BY o.created_at DESC LIMIT 10`,
    [discordId]
  );
  return rows;
}

export interface GetOrdersOptions {
  status?: OrderStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getOrders(
  opts: GetOrdersOptions = {}
): Promise<{ orders: OrderWithUser[]; total: number }> {
  const { status, search, limit = 20, offset = 0 } = opts;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (status) {
    conditions.push(`o.status = $${paramIdx++}`);
    params.push(status);
  }

  if (search) {
    conditions.push(
      `(o.order_ref ILIKE $${paramIdx} OR o.utr_number ILIKE $${paramIdx} OR u.username ILIKE $${paramIdx} OR o.wallet_address ILIKE $${paramIdx})`
    );
    params.push(`%${search}%`);
    paramIdx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [{ rows: orders }, { rows: countRows }] = await Promise.all([
    query<OrderWithUser>(
      `SELECT o.*, u.discord_id, u.username, u.display_name,
              pp.file_path as proof_file_path
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN payment_proofs pp ON pp.order_id = o.id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM orders o ${where}`,
      params
    ),
  ]);

  return { orders, total: parseInt(countRows[0].count, 10) };
}

export async function updateOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
  adminId: number,
  extras: { notes?: string; txHash?: string } = {}
): Promise<Order> {
  const { rows: [current] } = await query<Order>(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );

  if (!current) throw new Error('Order not found');

  const allowed = VALID_TRANSITIONS[current.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from ${current.status} to ${newStatus}`
    );
  }

  const updates: string[] = ['status = $2', 'updated_at = NOW()'];
  const params: unknown[] = [orderId, newStatus];
  let idx = 3;

  if (extras.notes !== undefined) {
    updates.push(`admin_notes = $${idx++}`);
    params.push(extras.notes);
  }
  if (extras.txHash !== undefined) {
    updates.push(`tx_hash = $${idx++}`);
    params.push(extras.txHash);
  }

  const { rows: [updated] } = await query<Order>(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );

  await query(
    `INSERT INTO admin_actions (admin_id, order_id, action, notes)
     VALUES ($1, $2, $3, $4)`,
    [adminId, orderId, `status_changed_to_${newStatus}`, extras.notes ?? null]
  );

  return updated;
}

export async function getStats(): Promise<Record<string, number | string>> {
  const [{ rows: statusRows }, { rows: volumeRows }] = await Promise.all([
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    ),
    query<{ total_inr: string; total_usdt: string }>(
      `SELECT
         COALESCE(SUM(inr_amount), 0)::text as total_inr,
         COALESCE(SUM(usdt_amount), 0)::text as total_usdt
       FROM orders WHERE status = 'completed'`
    ),
  ]);

  const stats: Record<string, number | string> = {
    pending_payment: 0,
    payment_submitted: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    usdt_sent: 0,
    completed: 0,
    total_inr_volume: volumeRows[0]?.total_inr ?? '0',
    total_usdt_volume: volumeRows[0]?.total_usdt ?? '0',
  };
  for (const row of statusRows) {
    stats[row.status] = parseInt(row.count, 10);
  }
  return stats;
}
