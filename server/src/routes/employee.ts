import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

interface Employee {
  id: number;
  employee: string;
  classification: string;
}

// GET all employees
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, employee, classification FROM employees ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// POST - Add new employee
router.post('/', async (req: Request, res: Response) => {
  const { id, employee, classification } = req.body;
  
  if (!employee || !classification) {
    return res.status(400).json({ error: 'Employee name and classification are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO employees (id, employee, classification) VALUES ($1, $2, $3) RETURNING *',
      [id, employee, classification]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

// PUT - Update employee
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { employee, classification } = req.body;

  if (!employee || !classification) {
    return res.status(400).json({ error: 'Employee name and classification are required' });
  }

  try {
    const result = await pool.query(
      'UPDATE employees SET employee = $1, classification = $2 WHERE id = $3 RETURNING *',
      [employee, classification, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE - Remove employee
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully', employee: result.rows[0] });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router;