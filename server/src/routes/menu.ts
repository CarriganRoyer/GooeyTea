import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * get /api/menu/seasonal
 * for seasonal stuff
 */
router.get("/seasonal", async (_req, res) => {
  try {
    const [teas, flavors, toppings] = await Promise.all([
      pool.query("SELECT id, name FROM inventory WHERE id BETWEEN 50 AND 59 ORDER BY id"),
      pool.query("SELECT id, name FROM inventory WHERE id BETWEEN 60 AND 69 ORDER BY id"),
      pool.query("SELECT id, name FROM inventory WHERE id >= 70 ORDER BY id")
    ]);
    res.json({
      seasonalTeas: teas.rows,
      seasonalFlavors: flavors.rows,
      seasonalToppings: toppings.rows
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
