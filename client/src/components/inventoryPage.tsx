import React, { useEffect, useState } from 'react';
import { InventoryItem } from '../types/order';
import './inventoryPage.css';   

const API = 'http://localhost:8080';

const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [idText, setIdText] = useState('');
  const [name, setName] = useState('');
  const [leftText, setLeftText] = useState('');
  const [usedText, setUsedText] = useState('');
  const [saleText, setSaleText] = useState('');
  const [reorderText, setReorderText] = useState('');

  const fetchInventory = async () => {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`${API}/api/inventory`);
      const text = await response.text();

      if (!response.ok) throw new Error(text || 'Failed to fetch inventory');

      const data = JSON.parse(text);
      const rows = Array.isArray(data) ? data : (data.rows || data.data || []);

      setItems(
        rows.map((it: any) => ({
          id: it.id,
          name: it.name,
          quantityLeft: it.quantityLeft ?? it.quantity_left,
          quantityUsed: it.quantityUsed ?? it.quantity_used,
          salePrice: Number(it.salePrice ?? it.saleprice ?? it.sale_price),
          reorderPrice: Number(it.reorderPrice ?? it.reorderprice ?? it.reorder_price),
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Load failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const validateAddInputs = () => {
    if (!idText.trim() || !name.trim() || !leftText.trim() || !usedText.trim() || !saleText.trim() || !reorderText.trim()) {
      setError('Please fill in all fields');
      return false;
    }
    if (!/^\d+$/.test(idText.trim()) || !/^\d+$/.test(leftText.trim()) || !/^\d+$/.test(usedText.trim())) {
      setError('ID and quantities must be integers');
      return false;
    }
    if (isNaN(Number(saleText)) || isNaN(Number(reorderText))) {
      setError('Prices must be valid numbers');
      return false;
    }
    return true;
  };

  const clearForm = () => {
    setIdText('');
    setName('');
    setLeftText('');
    setUsedText('');
    setSaleText('');
    setReorderText('');
  };

  const getStatus = (item: InventoryItem) => {
    const q = item.quantityLeft ?? 0;
  
    if (q === 0) {
      return 'Out';
    }
  
    if (q <= 30) {
      return 'Low';
    }
  
    return 'OK';
  };
  

  const addInventory = async () => {
    setError(null);
    if (!validateAddInputs()) return;

    const payload = {
      id: Number(idText),
      name: name.trim(),
      quantityLeft: Number(leftText),
      quantityUsed: Number(usedText),
      salePrice: Number(saleText),
      reorderPrice: Number(reorderText),
    };

    setBusy(true);
    try {
      const r = await fetch(`${API}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      if (!r.ok) throw new Error(text);

      clearForm();
      await fetchInventory();
      alert('Inventory item added.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteInventory = async () => {
    setError(null);

    if (!idText.trim() && !name.trim()) {
      setError('Enter ID or Name to delete');
      return;
    }

    if (!window.confirm('Are you sure you want to delete?')) return;

    setBusy(true);
    try {
      const by = idText.trim() ? 'id' : 'name';
      const query = new URLSearchParams();
      query.set(by, by === 'id' ? idText.trim() : name.trim());

      const r = await fetch(`${API}/api/inventory?${query.toString()}`, { method: 'DELETE' });
      const text = await r.text();

      if (!r.ok) throw new Error(text);

      await fetchInventory();
      alert('Delete succeeded.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="employees-container">
      <div className="employees-box">
        <header className="employees-header">
          <h1 className="employees-title">Manager - Inventory</h1>
          <div className="inventory-actions">
            <button onClick={() => window.location.href = '/manager'} className="control-btn">Back</button>
            <button onClick={fetchInventory} disabled={busy} className="control-btn">Refresh</button>
            <button onClick={() => { clearForm(); setError(null); }} disabled={busy} className="control-btn">Clear</button>
          </div>
        </header>

        <div className="employees-content">

          {/* FORM PANEL (unchanged) */}
          <div className="inventory-form-panel">
            <h2>Add / Delete Item</h2>
            {error && <div className="inv-error">{error}</div>}

            <div className="form-row">
              <label>ID</label>
              <input value={idText} onChange={e => setIdText(e.target.value)} disabled={busy} />
            </div>
            <div className="form-row">
              <label>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} disabled={busy} />
            </div>
            <div className="form-row">
              <label>Quantity Left</label>
              <input value={leftText} onChange={e => setLeftText(e.target.value)} disabled={busy} />
            </div>
            <div className="form-row">
              <label>Quantity Used</label>
              <input value={usedText} onChange={e => setUsedText(e.target.value)} disabled={busy} />
            </div>
            <div className="form-row">
              <label>Sale Price</label>
              <input value={saleText} onChange={e => setSaleText(e.target.value)} disabled={busy} />
            </div>
            <div className="form-row">
              <label>Reorder Price</label>
              <input value={reorderText} onChange={e => setReorderText(e.target.value)} disabled={busy} />
            </div>

            <div className="form-buttons">
              <button onClick={addInventory} disabled={busy}>
                {busy ? 'Working…' : 'Add Inventory'}
              </button>
              <button onClick={deleteInventory} disabled={busy}>
                Delete Inventory
              </button>
            </div>
          </div>
          
          {/* TABLE VIEW (new) */}
          <div className="employees-table-container">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item</th>
                  <th>Quantity Left</th>
                  <th>Quantity Used</th>
                  <th>Sale Price</th>
                  <th>Reorder Price</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {items.map(item => {
                  const status = getStatus(item);
                  return (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.name}</td>
                      <td>{item.quantityLeft}</td>
                      <td>{item.quantityUsed}</td>
                      <td>${item.salePrice.toFixed(2)}</td>
                      <td>${item.reorderPrice.toFixed(2)}</td>
                      <td>
                        <span className={`stock-status-badge ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {items.length === 0 && <div className="no-results">No inventory items</div>}
          </div>


        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
