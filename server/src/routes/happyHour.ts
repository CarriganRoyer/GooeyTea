import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const STORE_OFFSET_HOURS = -6;

router.get('/happy-hour', async (_req, res) => {
    try {
      const result = await pool.query(
        'SELECT start_time, end_time, discount_percent, is_active FROM happyHour WHERE id = 1'
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Happy Hour settings not found' });
      }
  
      const row = result.rows[0];
  
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
  
      const isCurrentlyActive = row.is_active && isInWindow;
  
      res.json({
        startTime: row.start_time.slice(0, 5),
        endTime: row.end_time.slice(0, 5),
        discountPercent: Number(row.discount_percent),
        isActive: row.is_active,
        isCurrentlyActive,         
      });
    } catch (err) {
      console.error('Error fetching happy hour settings:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

router.put('/happy-hour', async (req, res) => {
  const { startTime, endTime, discountPercent, isActive } = req.body;

  if (!startTime || !endTime) {
    return res.status(400).json({ error: 'startTime and endTime are required' });
  }

  try {
    await pool.query(
      `UPDATE happyHour
       SET start_time = $1,
           end_time = $2,
           discount_percent = $3,
           is_active = $4
       WHERE id = 1`,
      [startTime, endTime, discountPercent, isActive]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating happy hour settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
