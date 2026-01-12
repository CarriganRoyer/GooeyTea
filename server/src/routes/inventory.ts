import { Router, Request, Response } from "express";
import { pool } from "../db.js";

const router = Router();

// GET all inventory
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        quantityleft  AS "quantityLeft",
        quantityused  AS "quantityUsed",
        saleprice     AS "salePrice",
        reorderprice  AS "reorderPrice"
      FROM inventory
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// POST - Add new inventory item
router.post("/", async (req: Request, res: Response) => {
  const { id, name, quantityLeft, quantityUsed, salePrice, reorderPrice } = req.body;

  if (
    id === undefined ||
    !name ||
    quantityLeft === undefined ||
    quantityUsed === undefined ||
    salePrice === undefined ||
    reorderPrice === undefined
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO inventory
        (id, name, quantityleft, quantityused, saleprice, reorderprice)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        id, name,
        quantityleft AS "quantityLeft",
        quantityused AS "quantityUsed",
        saleprice AS "salePrice",
        reorderprice AS "reorderPrice"
      `,
      [id, name, quantityLeft, quantityUsed, salePrice, reorderPrice]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error adding inventory:", error);
    res.status(500).json({ error: "Failed to add inventory" });
  }
});

// PUT - Update inventory item by id
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, quantityLeft, quantityUsed, salePrice, reorderPrice } = req.body;

  if (
    !name ||
    quantityLeft === undefined ||
    quantityUsed === undefined ||
    salePrice === undefined ||
    reorderPrice === undefined
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE inventory
      SET
        name = $1,
        quantityleft = $2,
        quantityused = $3,
        saleprice = $4,
        reorderprice = $5
      WHERE id = $6
      RETURNING
        id, name,
        quantityleft AS "quantityLeft",
        quantityused AS "quantityUsed",
        saleprice AS "salePrice",
        reorderprice AS "reorderPrice"
      `,
      [name, quantityLeft, quantityUsed, salePrice, reorderPrice, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating inventory:", error);
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

// DELETE stays the same
router.delete("/", async (req: Request, res: Response) => {
  const { id, name } = req.query;

  if (!id && !name) {
    return res.status(400).json({ error: "Provide id or name to delete" });
  }

  try {
    let result;
    if (id) {
      result = await pool.query(
        `DELETE FROM inventory WHERE id = $1 RETURNING *`,
        [id]
      );
    } else {
      result = await pool.query(
        `DELETE FROM inventory WHERE name = $1 RETURNING *`,
        [name]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Inventory item not found" });
    }

    res.json({ message: "Inventory deleted", item: result.rows[0] });
  } catch (error: any) {
    console.error("Error deleting inventory:", error);
    res.status(500).json({ error: "Failed to delete inventory" });
  }
});

export default router;
