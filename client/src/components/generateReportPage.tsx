import React, { useEffect, useState } from 'react';
import './generateReportPage.css';

// Use same pattern as InventoryPage
//const API = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
const API = 'http://localhost:8080';

type XReportRow = {
  hour: number;
  totalSales: number;
  totalOrders: number;
  totalDrinks: number;
};

type ActiveView = 'general' | 'x' | 'z';

const pad = (value: string | number, width: number): string => {
  const s = String(value);
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
};

const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [generalReport, setGeneralReport] = useState<string>('');
  const [xRows, setXRows] = useState<XReportRow[]>([]);
  const [zReport, setZReport] = useState<string>('');

  const [activeView, setActiveView] = useState<ActiveView>('general');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearInputs = () => {
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
  };

  const validateDateInputs = () => {
    if (!startDate.trim()) {
      setError('Please enter a Start Date (YYYY-MM-DD).');
      return false;
    }
    if (!endDate.trim()) {
      setError('Please enter an End Date (YYYY-MM-DD).');
      return false;
    }
    return true;
  };

  const runGeneralReport = async () => {
    setError(null);
    setActiveView('general');
    setXRows([]);
    setZReport('');

    if (!validateDateInputs()) return;

    const params = new URLSearchParams();
    params.set('startDate', startDate.trim());
    params.set('endDate', endDate.trim());
    if (startTime.trim()) params.set('startTime', startTime.trim());
    if (endTime.trim()) params.set('endTime', endTime.trim());

    setBusy(true);
    try {
      const r = await fetch(`${API}/api/reports/general?${params.toString()}`);
      const text = await r.text();
      if (!r.ok) {
        try {
          const obj = JSON.parse(text);
          throw new Error(obj?.error ?? obj?.message ?? text ?? `Failed (${r.status})`);
        } catch {
          throw new Error(text || `Failed (${r.status})`);
        }
      }

      try {
        const obj = JSON.parse(text);
        setGeneralReport(obj.reportText ?? text);
      } catch {
        setGeneralReport(text);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setGeneralReport('');
    } finally {
      setBusy(false);
    }
  };

  const runXReport = async () => {
    setError(null);
    setActiveView('x');
    setGeneralReport('');
    setZReport('');
    setXRows([]);

    setBusy(true);
    try {
      const r = await fetch(`${API}/api/reports/x`);
      const text = await r.text();
      if (!r.ok) {
        try {
          const obj = JSON.parse(text);
          throw new Error(obj?.error ?? obj?.message ?? text ?? `Failed (${r.status})`);
        } catch {
          throw new Error(text || `Failed (${r.status})`);
        }
      }

      let rows: any;
      try {
        const obj = JSON.parse(text);
        rows = Array.isArray(obj) ? obj : (obj.rows ?? obj.data ?? []);
      } catch {
        setActiveView('general');
        setGeneralReport(text);
        return;
      }

      setXRows(
        rows.map((row: any) => ({
          hour: Number(row.hour ?? row.Hour ?? row.H),
          totalSales: Number(row.totalSales ?? row.total_sales ?? row.TotalSales),
          totalOrders: Number(row.totalOrders ?? row.total_orders ?? row.TotalOrders),
          totalDrinks: Number(row.totalDrinks ?? row.total_drinks ?? row.TotalDrinks),
        }))
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setXRows([]);
    } finally {
      setBusy(false);
    }
  };

  const runZReport = async () => {
    setError(null);
    setActiveView('z');
    setGeneralReport('');
    setXRows([]);

    setBusy(true);
    try {
      const r = await fetch(`${API}/api/reports/z`);
      const text = await r.text();
      if (!r.ok) {
        try {
          const obj = JSON.parse(text);
          throw new Error(obj?.error ?? obj?.message ?? text ?? `Failed (${r.status})`);
        } catch {
          throw new Error(text || `Failed (${r.status})`);
        }
      }

      try {
        const obj = JSON.parse(text);
        setZReport(obj.reportText ?? text);
      } catch {
        setZReport(text);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setZReport('');
    } finally {
      setBusy(false);
    }
  };

  const renderGenericReportFromLines = (lines: string[], title: string) => {
    const headerLines: string[] = [];
    const footerLines: string[] = [];
    const tableRows: string[][] = [];
  
    let inTable = false;
  
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
  
      const cols = trimmed.split(/\s{2,}|\t+/);
      const looksLikeTableRow = cols.length > 1;
  
      const isHeader =
        /^[A-Za-z].*$/.test(trimmed) || 
        /^-+$/.test(trimmed) ||     
        trimmed.includes(':');       
        trimmed.toLowerCase().includes("peak sales");
  
      if (looksLikeTableRow) {
        inTable = true;
        tableRows.push(cols);
      } else if (!inTable && isHeader) {
        headerLines.push(trimmed);
      } else {
        footerLines.push(trimmed);
      }
    }
  
    return (
      <div className="reports-view">
        {title && (
          <h3 className="reports-section-title">{title}</h3>
        )}
  
        {headerLines.length > 0 && (
          <div className="reports-header-block">
            {headerLines.map((line, idx) => (
              <p key={idx} className="reports-header-line">
                {line}
              </p>
            ))}
          </div>
        )}
  
        {tableRows.length > 0 && (
          <table className="reports-table">
            <thead>
              <tr>
                {tableRows[0].map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ridx) => (
                <tr key={ridx}>
                  {row.map((cell, cidx) => (
                    <td key={cidx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
  
        {footerLines.length > 0 && (
          <div className="reports-footer-block">
            {footerLines.map((line, idx) => (
              <p key={idx} className="reports-footer-line">
                <strong>{line}</strong>
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const renderViewer = () => {
    if (activeView === "x") {
      if (!xRows.length) {
        return <div className="reports-empty">(no rows)</div>;
      }
  
      return (
        <div className="reports-view">
          <h3 className="reports-section-title">X Report – Hourly Summary</h3>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Hour</th>
                <th>Total Sales ($)</th>
                <th>Total Orders</th>
                <th>Total Drinks</th>
              </tr>
            </thead>
            <tbody>
              {xRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.hour}</td>
                  <td>{row.totalSales.toFixed(2)}</td>
                  <td>{row.totalOrders}</td>
                  <td>{row.totalDrinks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  
    if (activeView === "general") {
      if (!generalReport) {
        return <div className="reports-empty">(no report yet)</div>;
      }
      const lines = generalReport.split("\n");
      return renderGenericReportFromLines(lines, "General Report");
    }
  
    if (activeView === "z") {
      if (!zReport) {
        return <div className="reports-empty">(no report yet)</div>;
      }
  
      const allLines = zReport
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);
  
      const summaryLines: string[] = [];
      const employeeDataLines: string[] = [];
      const inventoryHeaderLines: string[] = [];
      const inventoryDataLines: string[] = [];
  
      let i = 0;
      while (i < allLines.length) {
        const line = allLines[i];
        const lower = line.toLowerCase();
  
        if (lower.startsWith("orders per employee")) {
          i++;
          break;
        }
        if (lower.startsWith("inventory information")) {
          break;
        }
  
        summaryLines.push(line);
        i++;
      }
  
      for (const line of allLines) {
        if (/^\d+\s+\d+$/.test(line)) {
          employeeDataLines.push(line);
        }
      }
  
      const invHeaderIdx = allLines.findIndex(l =>
        l.toLowerCase().startsWith("id") &&
        l.toLowerCase().includes("quantity") &&
        l.toLowerCase().includes("sales")
      );
  
      if (invHeaderIdx !== -1) {
        inventoryHeaderLines.push(allLines[invHeaderIdx]);
        for (let j = invHeaderIdx + 1; j < allLines.length; j++) {
          const line = allLines[j];
          if (/^\d+/.test(line)) {
            inventoryDataLines.push(line);
          }
        }
      }
  
      const employeeRows: string[][] = [];
      if (employeeDataLines.length > 0) {
        employeeRows.push(["ID", "Orders"]);
        for (const line of employeeDataLines) {
          const [id, orders] = line.split(/\s+/);
          employeeRows.push([id, orders]);
        }
      }
  
      const inventoryRows: string[][] = [];
      if (inventoryHeaderLines.length > 0) {
        const headerCols = inventoryHeaderLines[0].split(/\s{2,}|\t+/).filter(Boolean);
        inventoryRows.push(headerCols);
        for (const line of inventoryDataLines) {
          const cols = line.split(/\s{2,}|\t+/).filter(Boolean);
          if (cols.length >= 4) {
            inventoryRows.push(cols);
          }
        }
      }
  
      return (
        <div className="reports-view">
          <h3 className="reports-section-title">Z Report – End-of-Day Summary</h3>
  
          {summaryLines.length > 0 && (
            <div className="reports-header-block">
              {summaryLines.map((line, idx) => (
                <p key={idx} className="reports-header-line">
                  {line}
                </p>
              ))}
            </div>
          )}
  
          {employeeRows.length > 0 && (
            <div className="reports-employee-block">
              <h4 className="reports-section-subtitle">Orders per employee</h4>
              <table className="reports-table">
                <thead>
                  <tr>
                    {employeeRows[0].map((col, idx) => (
                      <th key={idx}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeRows.slice(1).map((row, ridx) => (
                    <tr key={ridx}>
                      {row.map((cell, cidx) => (
                        <td key={cidx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
  
          {inventoryRows.length > 0 && (
            <div className="reports-employee-block">
              <h4 className="reports-section-subtitle">Inventory Information</h4>
              <table className="reports-table">
                <thead>
                  <tr>
                    {inventoryRows[0].map((col, idx) => (
                      <th key={idx}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.slice(1).map((row, ridx) => (
                    <tr key={ridx}>
                      {row.map((cell, cidx) => (
                        <td key={cidx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }
    return <div className="reports-empty">(no report yet)</div>;
  };
  
    const [temp, setTemp] = useState<number | null>(null);
    const [weatherCode, setWeatherCode] = useState<number | null>(null);
    useEffect(() => {
      const fetchWeather = async () => {
        try {
          const res = await fetch(`${API}/api/weather`);
          const data = await res.json();
  
          if (res.ok && data.temp !== undefined) {
            setTemp(data.temp);
          } 
          if (res.ok && data.weatherCode !== undefined) {
            setWeatherCode(data.weatherCode);
          }
        } catch (err) {
          console.error(err);
        } 
      };
      fetchWeather();
    }, []);

  return (
    <div className="reports-container">
      <div className="reports-wrapper">
        <header className="reports-header">
          <h1 className="reports-title">Manager - Reports</h1>
          <div className="reports-actions">
            <button onClick={() => window.location.href = '/manager'} className="control-btn">Back</button>
            <button
              onClick={() => {
                clearInputs();
                setError(null);
              } }
              disabled={busy}
              className="control-btn"
            >
              Clear Inputs
            </button>
          </div>
        </header>

        <div className="reports-content">
          <div className="reports-view-panel">
            <h2>Report Viewer</h2>
            {error && <div className="reports-error">{error}</div>}
            <div className="reports-scroller">
              {renderViewer()}
            </div>
          </div>

          <div className="reports-form-panel">
            <h2>Generate Report</h2>
            <p className="reports-hint">
              Dates use <code>YYYY-MM-DD</code>. Times use <code>HH:MM</code> (24-hour).
            </p>

            <div className="reports-form-row">
              <label>Start Date</label>
              <input
                type="text"
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="reports-form-row">
              <label>End Date</label>
              <input
                type="text"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="reports-form-row">
              <label>Start Time</label>
              <input
                type="text"
                placeholder="HH:MM (24h)"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="reports-form-row">
              <label>End Time</label>
              <input
                type="text"
                placeholder="HH:MM (24h)"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="reports-buttons">
              <button
                className="btn-x"
                onClick={runXReport}
                disabled={busy}
              >
                {busy && activeView === 'x' ? 'Working…' : 'Generate X Report'}
              </button>
              <button
                className="btn-run"
                onClick={runGeneralReport}
                disabled={busy}
              >
                {busy && activeView === 'general' ? 'Working…' : 'Run Report'}
              </button>
              <button
                className="btn-z"
                onClick={runZReport}
                disabled={busy}
              >
                {busy && activeView === 'z' ? 'Working…' : 'Generate Z Report'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
