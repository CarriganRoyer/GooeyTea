import { Router } from "express";
import { pool } from "../db.js";
import { z } from "zod";

const router = Router();

const OrderItemSchema = z.object({
  drinkId: z.number().int().positive(),
  teaId: z.number().int().nonnegative(),
  flavorIds: z.array(z.number().int().nonnegative()),
  toppingIds: z.array(z.number().int().nonnegative()),
  sugar: z.number(), 
  ice: z.number()   
});

const OrderSchema = z.object({
  employeeId: z.number().int().nonnegative(),
  items: z.array(OrderItemSchema).min(1)
});

const STORE_OFFSET_HOURS = -6;

async function applyHappyHourDiscount(subtotal: number): Promise<number> {
  const result = await pool.query(
    'SELECT start_time, end_time, discount_percent, is_active FROM happyHour WHERE id = 1'
  );

  if (result.rows.length === 0) return subtotal;

  const row = result.rows[0];
  if (!row.is_active) return subtotal;


  const utcNow = new Date();
  const storeNow = new Date(utcNow.getTime() + STORE_OFFSET_HOURS * 60 * 60 * 1000);
  const nowMinutes = storeNow.getUTCHours() * 60 + storeNow.getUTCMinutes();

  const [startH, startM] = row.start_time.split(':').map(Number);
  const [endH, endM] = row.end_time.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  let isInWindow = false;
  if (startMinutes < endMinutes) {
    isInWindow = nowMinutes >= startMinutes && nowMinutes < endMinutes;
  } else if (startMinutes > endMinutes) {
    isInWindow = nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }

  if (!isInWindow) return subtotal;

  const discountPercent = Number(row.discount_percent) || 0;
  const factor = 1 - discountPercent / 100;

  return Number((subtotal * factor).toFixed(2));
}


router.post("/", async (req, res) => {
  const parsed = OrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const { employeeId, items } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: maxRows } = await client.query<{ max: number }>(
      "SELECT COALESCE(MAX(orderid), 0) AS max FROM orders"
    );
    const orderId = Number(maxRows[0].max) + 1;

    const drinkIds = items.map((i) => i.drinkId);

    type DrinkPriceRow = { id: number; price: number };

    const priceQuery = await client.query<DrinkPriceRow>(
      "SELECT id, price FROM drinks WHERE id = ANY($1::int[])",
      [drinkIds]
    );

    const priceMap = new Map<number, number>();
    for (const row of priceQuery.rows) {
      priceMap.set(Number(row.id), Number(row.price));
    }

    let total = 0;
    for (const it of items) {
      const price = priceMap.get(it.drinkId);
      if (price == null) throw new Error(`Unknown drinkId=${it.drinkId}`);
      total += price;
    }

    total = await applyHappyHourDiscount(total);

    await client.query(
      "INSERT INTO orders (orderid, time, price, employeeid) VALUES ($1, NOW(), $2, $3)",
      [orderId, total, employeeId]
    );

    const values = items.map((_, i) => `($1, $${i + 2})`).join(",");
    await client.query(
      `INSERT INTO salesHistory (orderid, drinkid) VALUES ${values}`,
      [orderId, ...drinkIds]
    );

    const teaUse = new Map<number, number>();
    const flavorUse = new Map<number, number>();
    const toppingUse = new Map<number, number>();

    for (const it of items) {
      if (it.teaId) teaUse.set(it.teaId, (teaUse.get(it.teaId) ?? 0) + 1);
      for (const id of it.flavorIds) {
        flavorUse.set(id, (flavorUse.get(id) ?? 0) + 1)
      }
      for (const id of it.toppingIds) {
        toppingUse.set(id, (toppingUse.get(id) ?? 0) + 1)
      }
    }

    const updateInventory = async (id: number, count: number) => {
      await client.query(
        `UPDATE inventory
         SET quantityleft = quantityleft - $1,
             quantityused = quantityused + $1
         WHERE id = $2`,
        [count, id]
      );
    };

    for (const [id, count] of teaUse) await updateInventory(id, count);
    for (const [id, count] of flavorUse) await updateInventory(id, count);
    for (const [id, count] of toppingUse) await updateInventory(id, count);

    const accessories = [40, 41, 42, 43];
    for (const acc of accessories) {
      await updateInventory(acc, items.length);
    }

    await client.query("COMMIT");
    res.json({ orderId, price: total });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: String(err) });
  } finally {
    client.release();
  }
});

export default router;
