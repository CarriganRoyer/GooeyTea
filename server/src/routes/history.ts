// routes/orderHistory.ts
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/order-history/drink-usage - Get drink usage statistics
router.get("/drink-usage", async (req, res) => {
  try {
    const query = `
      SELECT 
        d.id AS drinkid,
        COUNT(s.drinkID) AS used
      FROM drinks d
      LEFT JOIN salesHistory s ON d.id = s.drinkID
      GROUP BY d.id
      ORDER BY used DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching drink usage:", error);
    res.status(500).json({ error: "Failed to fetch drink usage data" });
  }
});

// GET /api/order-history/ingredient-usage
router.get("/ingredient-usage", async (req, res) => {
  try {
    const query = `
      -- Count tea usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Tea' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.teaid = i.id
      WHERE d.teaid IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count topping1 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Topping' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.toppingid1 = i.id
      WHERE d.toppingid1 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count topping2 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Topping' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.toppingid2 = i.id
      WHERE d.toppingid2 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count topping3 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Topping' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.toppingid3 = i.id
      WHERE d.toppingid3 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count topping4 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Topping' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.toppingid4 = i.id
      WHERE d.toppingid4 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count flavor1 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Flavor' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.flavorid1 = i.id
      WHERE d.flavorid1 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count flavor2 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Flavor' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.flavorid2 = i.id
      WHERE d.flavorid2 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count flavor3 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Flavor' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.flavorid3 = i.id
      WHERE d.flavorid3 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count flavor4 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Flavor' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.flavorid4 = i.id
      WHERE d.flavorid4 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count flavor5 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Flavor' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.flavorid5 = i.id
      WHERE d.flavorid5 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count flavor6 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Flavor' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.flavorid6 = i.id
      WHERE d.flavorid6 IS NOT NULL
      GROUP BY i.id, i.name
      
      UNION ALL
      
      -- Count flavor7 usage
      SELECT 
        i.id AS itemid,
        i.name AS name,
        'Flavor' AS type,
        COUNT(*) AS used
      FROM salesHistory s
      INNER JOIN drinks d ON s.drinkid = d.id
      INNER JOIN inventory i ON d.flavorid7 = i.id
      WHERE d.flavorid7 IS NOT NULL
      GROUP BY i.id, i.name
      
      ORDER BY used DESC
    `;

    const result = await pool.query(query);
    
    // Aggregate same items that appear multiple times
    const aggregated = new Map();
    result.rows.forEach((row: any) => {
      const key = `${row.itemid}-${row.type}`;
      if (aggregated.has(key)) {
        const existing = aggregated.get(key);
        existing.used += parseInt(row.used);
      } else {
        aggregated.set(key, {
          itemid: row.itemid,
          name: row.name,
          type: row.type,
          used: parseInt(row.used)
        });
      }
    });
    
    const finalResult = Array.from(aggregated.values())
      .sort((a: any, b: any) => b.used - a.used);
    
    res.json(finalResult);
  } catch (error: any) {
    console.error("Error fetching ingredient usage:", error);
    console.error("Error details:", error?.message);
    res.status(500).json({ 
      error: "Failed to fetch ingredient usage data",
      details: error?.message || "Unknown error"
    });
  }
});

// GET /api/order-history/recent - Get recent orders with details
router.get("/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const query = `
      SELECT 
        o.orderID AS order_id,
        o.time AS timestamp,
        o.employeeID,
        e.name AS employee_name,
        o.price AS total_price,
        COUNT(s.drinkID) AS item_count
      FROM orders o
      LEFT JOIN employees e ON o.employeeID = e.id
      LEFT JOIN salesHistory s ON o.orderID = s.orderID
      GROUP BY 
        o.orderID, 
        o.time, 
        o.employeeID, 
        e.name, 
        o.price
      ORDER BY o.time DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    res.status(500).json({ error: "Failed to fetch recent orders" });
  }
});

// GET /api/order-history/order/:id - Get specific order details
router.get("/order/:id", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    // Get order header
    const orderQuery = `
      SELECT 
        o.id,
        o.timestamp,
        o.employee_id,
        e.name as employee_name,
        o.price as total_price
      FROM orders o
      LEFT JOIN employees e ON o.employee_id = e.id
      WHERE o.id = $1
    `;
    
    const orderResult = await pool.query(orderQuery, [orderId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get order items
    const itemsQuery = `
      SELECT 
        oi.id as item_id,
        oi.drink_id,
        d.name as drink_name,
        oi.quantity,
        oi.tea_id,
        t.name as tea_name,
        oi.sugar,
        oi.ice
      FROM order_items oi
      LEFT JOIN drinks d ON oi.drink_id = d.id
      LEFT JOIN menu t ON oi.tea_id = t.id
      WHERE oi.order_id = $1
    `;
    
    const itemsResult = await pool.query(itemsQuery, [orderId]);

    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
});

// GET /api/order-history/stats - Get overall statistics
router.get("/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.price), 0) as total_revenue,
        COALESCE(AVG(o.price), 0) as average_order_value,
        COUNT(DISTINCT oi.drink_id) as unique_drinks_sold
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    const result = await pool.query(statsQuery);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// GET /api/order-history/date-range - Get orders within date range
router.get("/date-range", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Start date and end date are required" });
    }

    const query = `
      SELECT 
        o.id as order_id,
        o.timestamp,
        o.employee_id,
        e.name as employee_name,
        o.price as total_price,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN employees e ON o.employee_id = e.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.timestamp >= $1 AND o.timestamp <= $2
      GROUP BY o.id, o.timestamp, o.employee_id, e.name, o.price
      ORDER BY o.timestamp DESC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders by date range:", error);
    res.status(500).json({ error: "Failed to fetch orders by date range" });
  }
});

// GET /api/order-history/top-items - Get most popular items
router.get("/top-items", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const query = `
      SELECT 
        d.id,
        d.name,
        COUNT(oi.id) as times_ordered,
        SUM(oi.quantity) as total_quantity
      FROM drinks d
      INNER JOIN order_items oi ON d.id = oi.drink_id
      GROUP BY d.id, d.name
      ORDER BY times_ordered DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching top items:", error);
    res.status(500).json({ error: "Failed to fetch top items" });
  }
});

// GET /api/order-history/employee-sales - Get sales by employee
router.get("/employee-sales", async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id as employee_id,
        e.name as employee_name,
        COUNT(o.id) as orders_processed,
        COALESCE(SUM(o.price), 0) as total_sales
      FROM employees e
      LEFT JOIN orders o ON e.id = o.employee_id
      GROUP BY e.id, e.name
      ORDER BY total_sales DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching employee sales:", error);
    res.status(500).json({ error: "Failed to fetch employee sales" });
  }
});

export default router;