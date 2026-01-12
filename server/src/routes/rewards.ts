import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

interface Rewards {
  phone: string;
  points: number;
}

// GET one rewards member
router.get('/:phone', async (req: Request, res: Response) => {
    const { phone } = req.params;

    try {
    const result = await pool.query(
        'SELECT points FROM rewards where phone=$1', [phone]
    );

    if(result.rows.length === 0) {
        return res.status(404).json({error: "Phone number not found"});
    }

    res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching rewards points:', error);
        res.status(500).json({ error: 'Failed to fetch rewards points' });
    }
});

// PUT - Update rewards points for one member or add if the member is new
router.put('/:phone', async (req: Request, res: Response) => {
  const { phone } = req.params;
  const { points } = req.body;

  //MIGHT NEED ERROR HANDLING FOR TOO LONG/SHORT

  if(typeof points !== 'number' || !Number.isInteger(points)) {
    return res.status(400).json({error: 'Points must be an integer'});
  }

  try {
    // updates points if conflict or adds new member
    const result = await pool.query(
      'INSERT INTO rewards (phone, points) VALUES ($1, $2) ON CONFLICT (phone) DO UPDATE SET points = EXCLUDED.points RETURNING *;',
       [phone, points]
    );

    res.json({message: 'Points saved successfully', reward: result.rows[0]});

  } catch (error) {
    console.error('Error updating reward points:', error);
    res.status(500).json({ error: 'Failed to update reward points' });
  }
});

export default router;