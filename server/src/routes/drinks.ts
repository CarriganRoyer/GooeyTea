import { Router } from "express";
import { pool } from "../db.js";
import { z } from "zod";

const router = Router();

const SIZE_PRICE: Record<string, number> = {
  Small: 0,
  Medium: 0.5,
  Large: 1,
};

const ResolveSchema = z.object({
  teaId: z.coerce.number().int(),
  flavorIds: z.string(),
  toppingIds: z.string(),
  sugar: z.coerce.number(), 
  ice: z.coerce.number(),
  size: z.enum(['Small', 'Medium', 'Large']) 
});

/**
 * get /api/drinks/resolve?teaId=&flavorId1...=&toppingId1...=&sugar=&ice=
 * returns drinkId, price
 */
router.get("/resolve", async (req, res) => {
  const parsed = ResolveSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { teaId, flavorIds, toppingIds, sugar, ice, size } = parsed.data;

  const flavorIdsArray = flavorIds.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n));
  const toppingIdsArray = toppingIds.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n));

  const sizePrice = SIZE_PRICE[size] || 0;

  try {
    const { rows } = await pool.query(
      `SELECT id, price
       FROM drinks
       WHERE teaid=$1 
       AND ARRAY[flavorid1, flavorid2, flavorid3, flavorid4, flavorid5, flavorid6, flavorid7, flavorid8, flavorid9, flavorid10, flavorid11, flavorid12, flavorid13, flavorid14, flavorid15] @> $2::int[]
       AND ARRAY[toppingid1, toppingid2, toppingid3, toppingid4, toppingid5, toppingid6, toppingid7, toppingid8, toppingid9, toppingid10] @> $3::int[]
       AND sugar=$4 
       AND ice=$5
       AND size=$6
       LIMIT 1`,
      [teaId, flavorIdsArray, toppingIdsArray, sugar, ice, size]
    );
    if (rows.length === 0) {
      // get new drinkId
      const { rows: maxRows } = await pool.query(
        `SELECT COUNT(*) FROM drinks`
      );
      const newDrinkId = Number(maxRows[0].count) + 1;

      const price = 5.5 + sizePrice + flavorIdsArray.filter(id => id !== 0).length + (toppingIdsArray.filter(id => id !== 0).length * 0.75);
      const flavorValues = [...flavorIdsArray, ...Array(15 - flavorIdsArray.length).fill(0)];
      const toppingValues = [...toppingIdsArray, ...Array(10 - toppingIdsArray.length).fill(0)];
      const insertParams = [newDrinkId, teaId, ...flavorValues, ...toppingValues, sugar, ice, size, price];
      const { rows } = await pool.query(
        `INSERT INTO drinks
        (id, teaid, flavorid1, flavorid2, flavorid3, flavorid4, flavorid5, flavorid6, flavorid7, flavorid8, flavorid9, flavorid10, flavorid11, flavorid12, flavorid13, flavorid14, flavorid15,
         toppingid1, toppingid2, toppingid3, toppingid4, toppingid5, toppingid6, toppingid7, toppingid8, toppingid9, toppingid10,
         sugar, ice, size, price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
         RETURNING id, price`,
        insertParams,
      );
      res.json({ drinkId: Number(rows[0].id), price: Number(rows[0].price) });
    }
    else {
      res.json({ drinkId: Number(rows[0].id), price: Number(rows[0].price) });
    }
    } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
