import { Router, Request, Response } from 'express';
import { pool } from "../db.js";

const router = Router();

const STORE_OFFSET_HOURS = -6;

function toStoreLocal(dateLike: string | Date): Date {
  const d = new Date(dateLike);
  return new Date(d.getTime() + STORE_OFFSET_HOURS * 60 * 60 * 1000);
}

function storeLocalToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  sec = 0,
  ms = 0
): Date {
  const utcHour = hour - STORE_OFFSET_HOURS;
  return new Date(Date.UTC(year, monthIndex, day, utcHour, minute, sec, ms));
}

function parseStoreLocalDateTime(dateStr: string, timeStr?: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  let hour = 0;
  let minute = 0;

  if (timeStr && timeStr.trim()) {
    const [hStr, mStr] = timeStr.trim().split(':');
    hour = Number(hStr) || 0;
    minute = Number(mStr) || 0;
  }

  return storeLocalToUtc(year, month - 1, day, hour, minute);
}

function getStoreDayRange(d: Date = new Date()) {
  const storeNow = toStoreLocal(d);

  const year = storeNow.getUTCFullYear();
  const monthIndex = storeNow.getUTCMonth();
  const day = storeNow.getUTCDate();

  const labelDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const startUtcDate = storeLocalToUtc(year, monthIndex, day, 0, 0, 0, 0);
  const endUtcDate   = storeLocalToUtc(year, monthIndex, day + 1, 0, 0, 0, 0);

  return {
    labelDate,
    startUtc: startUtcDate.toISOString(),
    endUtcExclusive: endUtcDate.toISOString(),
  };
}

router.get('/general', async (req: Request, res: Response) => {
  const { startDate, endDate, startTime, endTime } = req.query as {
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };

  if (!startDate || !startDate.trim()) {
    return res.status(400).type('text/plain').send('Please enter a Start Date (YYYY-MM-DD).');
  }
  if (!endDate || !endDate.trim()) {
    return res.status(400).type('text/plain').send('Please enter an End Date (YYYY-MM-DD).');
  }

  const sDate = startDate.trim();
  const eDate = endDate.trim();
  const sTime = (startTime || '').trim();
  const eTime = (endTime || '').trim();

  try {
    if (!sTime && !eTime && sDate === eDate) {
      const peakText = await buildPeakSalesDayReport(sDate);
      return res.type('text/plain').send(peakText);
    }

    const startUtcDate = parseStoreLocalDateTime(sDate, sTime || '00:00');

    let endUtcDate: Date;
    if (eTime) {
      endUtcDate = parseStoreLocalDateTime(eDate, eTime);
    } else {
      const [y, m, d] = eDate.split('-').map(Number);
      endUtcDate = storeLocalToUtc(y, m - 1, d, 23, 59, 59, 999);
    }

    const startUtc = startUtcDate.toISOString();
    const endUtc   = endUtcDate.toISOString();
    // -----------------------------------------------

    const headerStartTime = sTime || '00:00';
    const headerEndTime = eTime || '23:59';

    let sb = '';
    sb += `Orders from ${sDate} to ${eDate} from ${headerStartTime} to ${headerEndTime}\n`;
    sb += '--------------------------------------------------\n';
    sb += `${pad('orderID', 10)} ${pad('time', 26)} ${pad('price', 10)}\n`;

    const sql = `
    SELECT
      orderid,
      ("time" - interval '6 hours')::text AS local_time,
      price
    FROM orders
    WHERE "time" >= $1::timestamptz AND "time" < $2::timestamptz
    ORDER BY "time"
  `;
  
  

    const { rows } = await pool.query(sql, [startUtc, endUtc]);

    if (!rows || rows.length === 0) {
      sb += '(no matching rows)\n';
    } else {
      for (const row of rows) {
        const orderId = row.orderid;
      
        const rawLocal: string = row.local_time || '';
        const timeStr = rawLocal.slice(0, 19); 
      
        const price = Number(row.price) || 0;
        sb += `${pad(orderId, 10)} ${pad(timeStr, 26)} ${pad(price.toFixed(2), 10)}\n`;
      }
      
      
    }

    return res.type('text/plain').send(sb);
  } catch (err: any) {
    console.error('Error in /api/reports/general:', err);
    return res.status(500).type('text/plain').send('DB error while generating report.');
  }
});


async function buildPeakSalesDayReport(date: string): Promise<string> {
  const [year, month, day] = date.split('-').map(Number);

  const startUtcDate = storeLocalToUtc(year, month - 1, day, 0, 0, 0, 0);
  const endUtcDate   = storeLocalToUtc(year, month - 1, day + 1, 0, 0, 0, 0);

  const dayStartUtc = startUtcDate.toISOString();
  const dayEndExclusiveUtc = endUtcDate.toISOString();

  let sb = '';
  sb += `Orders for ${date}\n`;
  sb += '--------------------------------------------------\n';
  sb += `${pad('orderID', 10)} ${pad('time', 26)} ${pad('price', 10)}\n`;

  const listSql = `
  SELECT
    o.orderid,
    (o."time" - interval '6 hours')::text AS local_time,
    o.price
  FROM orders o
  WHERE o."time" >= $1::timestamptz AND o."time" < $2::timestamptz
  ORDER BY o."time"
`;


  const client = await pool.connect();
  try {
    const listRes = await client.query(listSql, [dayStartUtc, dayEndExclusiveUtc]);
    if (listRes.rows.length === 0) {
      sb += '(no orders)\n';
    } else {
      for (const row of listRes.rows) {
        const orderId = row.orderid;
      
        const rawLocal: string = row.local_time || '';
        const timeStr = rawLocal.slice(0, 19); 
      
        const price = Number(row.price) || 0;
        sb += `${pad(orderId, 10)} ${pad(timeStr, 26)} ${pad(price.toFixed(2), 10)}\n`;
      }
      
      
    }


    sb += '\nPeak Sales (Top 10 orders) summary\n';
    sb += '--------------------------------------------------\n';

    const peakSumSql = `
      SELECT COALESCE(SUM(t.price), 0) AS "topTenPriceSum"
      FROM (
        SELECT o.orderid, o.price
        FROM salesHistory s
        JOIN orders o ON s.orderid = o.orderid
        WHERE o."time" >= $1::timestamptz AND o."time" < $2::timestamptz
        ORDER BY o.price DESC
        LIMIT 10
      ) AS t
    `;
    const peakRes = await client.query(peakSumSql, [dayStartUtc, dayEndExclusiveUtc]);

    const sum = peakRes.rows[0]?.topTenPriceSum ?? 0;
    sb += `Top 10 total: $${Number(sum).toFixed(2)}\n`;

    return sb;
  } finally {
    client.release();
  }
}

router.get('/x', async (_req: Request, res: Response) => {
  const nowUtc = new Date();
  const storeNow = new Date(nowUtc.getTime() + STORE_OFFSET_HOURS * 60 * 60 * 1000);

  const year = storeNow.getUTCFullYear();
  const monthIndex = storeNow.getUTCMonth();
  const day = storeNow.getUTCDate();
  const currentStoreHour = storeNow.getUTCHours();

  const OPEN_HOUR = 8; 

  const client = await pool.connect();
  try {
    const sql = `
      SELECT
        COALESCE(SUM(o.price), 0)              AS "totalSales",
        COALESCE(COUNT(DISTINCT o.orderid), 0) AS "totalOrders",
        COALESCE(COUNT(sh.drinkid), 0)         AS "totalDrinks"
      FROM orders o
      LEFT JOIN salesHistory sh ON o.orderid = sh.orderid
      WHERE o."time" >= $1::timestamptz
        AND o."time" <= $2::timestamptz
    `;

    const rows: {
      hour: number;
      totalSales: number;
      totalOrders: number;
      totalDrinks: number;
    }[] = [];

    if (currentStoreHour < OPEN_HOUR) {
      return res.json({ rows });
    }

    const storeLocalToUtc = (
      y: number,
      m: number,
      d: number,
      h: number,
      min: number,
      sec: number,
      ms: number
    ) => {
      const utcHour = h - STORE_OFFSET_HOURS; 
      return new Date(Date.UTC(y, m, d, utcHour, min, sec, ms));
    };

    for (let h = OPEN_HOUR; h <= currentStoreHour; h++) {
      const startUtcDate = storeLocalToUtc(year, monthIndex, day, h, 0, 0, 0);
      const endUtcDate   = storeLocalToUtc(year, monthIndex, day, h, 59, 59, 999);

      const startIso = startUtcDate.toISOString();
      const endIso   = endUtcDate.toISOString();

      const result = await client.query(sql, [startIso, endIso]);
      const row = result.rows[0] || {};

      rows.push({
        hour: h, 
        totalSales: Number(row.totalSales || 0),
        totalOrders: Number(row.totalOrders || 0),
        totalDrinks: Number(row.totalDrinks || 0),
      });
    }

    return res.json({ rows });
  } catch (err) {
    console.error('Error in /api/reports/x:', err);
    return res
      .status(500)
      .json({ error: 'Database error while generating X report.' });
  } finally {
    client.release();
  }
});

router.get('/z', async (_req: Request, res: Response) => {
  const now = new Date();

  const { labelDate: todayStr, startUtc, endUtcExclusive } = getStoreDayRange(now);

  const client = await pool.connect();
  try {
    let sb = '';

    await client.query(`
      CREATE TABLE IF NOT EXISTS zReportLog (
        run_date DATE PRIMARY KEY,
        run_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const logRes = await client.query(
      'SELECT run_date FROM zReportLog WHERE run_date = $1',
      [todayStr]
    );

    if ((logRes.rowCount ?? 0) > 0) {
      sb += `Z Report has already been run today. Values below are reset to 0 until the next business day.\n\n`;
      sb += `${todayStr}\n\n`;
      sb += `Total Sales: $0.00\n`;
      sb += `Total Tax: $0.00\n`;
      sb += `Total Orders: 0\n`;
      sb += `Average Price Per Order (Before Tax): $0.00\n\n`;

      const employeeIDQuery = `SELECT id FROM employees;`;
      const employeeRes = await client.query(employeeIDQuery);

      sb += 'Orders Per Employee:\n';
      sb += 'ID\tOrders\n';
      for (const row of employeeRes.rows) {
        sb += `${Number(row.id)}\t0\n`;
      }

      const totalItemsQuery = `
        SELECT id, name, quantityUsed, (salePrice * quantityUsed) AS sales
        FROM inventory
        ORDER BY id ASC
      `;
      const itemsRes = await client.query(totalItemsQuery);

      sb += '\nInventory Information:\n';
      sb += `${pad('ID', 10)}\t${pad('Item', 30)}\t${pad('Quantity Used', 10)}\t${pad('Sales ($)', 10)}\n`;
      for (const row of itemsRes.rows) {
        const id = Number(row.id);
        const name = String(row.name);
        const qtyUsed = Number(row.quantityused || row.quantityUsed || 0);
        const sales = Number(row.sales || 0);
        const line = `${pad(id, 10)}\t${pad(name, 30)}\t${pad(qtyUsed, 10)}\t${pad(sales.toFixed(2), 10)}`;
        sb += `${line}\n`;
      }

      return res.type('text/plain').send(sb);
    }

    const employeeIDQuery = `SELECT id FROM employees;`;
    const employeeRes = await client.query(employeeIDQuery);

    const employeeOrders = new Map<number, number>();
    for (const row of employeeRes.rows) {
      employeeOrders.set(Number(row.id), 0);
    }

    const employeeOrdersSql = `
      SELECT COUNT(orderid) AS cnt
      FROM orders
      WHERE employeeid = $1
        AND "time" >= $2::timestamptz
        AND "time" <  $3::timestamptz
    `;

    for (const [id] of employeeOrders) {
      const r = await client.query(employeeOrdersSql, [id, startUtc, endUtcExclusive]);
      const cnt = Number(r.rows[0]?.cnt || 0);
      employeeOrders.set(id, cnt);
    }

    const totalOrdersSql = `
      SELECT COUNT(orderid) AS cnt
      FROM orders
      WHERE "time" >= $1::timestamptz
        AND "time" <  $2::timestamptz
    `;
    const totalOrdersRes = await client.query(totalOrdersSql, [startUtc, endUtcExclusive]);
    const totalOrders = Number(totalOrdersRes.rows[0]?.cnt || 0);

    const totalSalesQuery = `
      SELECT COALESCE(SUM(price), 0) AS "totalSales"
      FROM orders
      WHERE "time" >= $1::timestamptz
        AND "time" <  $2::timestamptz
    `;
    const totalSalesRes = await client.query(totalSalesQuery, [startUtc, endUtcExclusive]);
    const totalSales = Number(totalSalesRes.rows[0]?.totalSales || 0);

    const totalTax = totalSales * 0.0825;

    const totalItemsQuery = `
      SELECT id, name, quantityUsed, (salePrice * quantityUsed) AS sales
      FROM inventory
      ORDER BY id ASC
    `;
    const itemsRes = await client.query(totalItemsQuery);

    const itemInfo: string[] = [];
    const itemIDs: number[] = [];

    for (const row of itemsRes.rows) {
      const id = Number(row.id);
      const name = String(row.name);
      const qtyUsed = Number(row.quantityused || row.quantityUsed || 0);
      const sales = Number(row.sales || 0);

      const line = `${pad(id, 10)}\t${pad(name, 30)}\t${pad(qtyUsed, 10)}\t${pad(sales.toFixed(2), 10)}`;
      itemIDs.push(id);
      itemInfo.push(line);
    }

    const resetSql = `UPDATE inventory SET quantityUsed = 0 WHERE id = $1`;
    for (const id of itemIDs) {
      await client.query(resetSql, [id]);
    }

    sb += `${todayStr}\n\n`;
    sb += `Total Sales: $${totalSales.toFixed(2)}\n`;
    sb += `Total Tax: $${totalTax.toFixed(2)}\n`;
    sb += `Total Orders: ${totalOrders}\n`;
    const avgPrice = totalOrders > 0 ? totalSales / totalOrders : 0;
    sb += `Average Price Per Order (Before Tax): $${avgPrice.toFixed(2)}\n\n`;

    sb += 'Orders Per Employee:\n';
    sb += 'ID\tOrders\n';
    for (const [id, cnt] of employeeOrders) {
      sb += `${id}\t${cnt}\n`;
    }

    sb += '\nInventory Information:\n';
    sb += `${pad('ID', 10)}\t${pad('Item', 30)}\t${pad('Quantity Used', 10)}\t${pad('Sales ($)', 10)}\n`;
    for (const line of itemInfo) {
      sb += `${line}\n`;
    }

    await client.query(
      `INSERT INTO zReportLog(run_date) VALUES ($1)
       ON CONFLICT (run_date) DO NOTHING`,
      [todayStr]
    );

    return res.type('text/plain').send(sb);
  } catch (err) {
    console.error('Error in /api/reports/z:', err);
    return res
      .status(500)
      .type('text/plain')
      .send('Database error while generating Z report.');
  } finally {
    client.release();
  }
});

function pad(value: string | number, width: number): string {
  const s = String(value);
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
}

export default router;
