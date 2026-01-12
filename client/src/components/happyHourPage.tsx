import React, { useState, useEffect } from 'react';
import './employees.css';        // re-use styling
import './generateReportPage.css';

// const API = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
const API = 'http://localhost:8080';

type Option = 'generateReport' | 'orderHistory' | 'employees' | 'inventory' | 'happyHour';

interface HappyHourSettings {
  startTime: string;    
  endTime: string;      
  discountPercent: number;  
  isActive: boolean;        
}

interface HappyHourProps {
  onSelectOption: (option: Option) => void;
}

const HappyHourPage: React.FC<HappyHourProps> = ({ onSelectOption }) => {
  const [settings, setSettings] = useState<HappyHourSettings>({
    startTime: '14:00',
    endTime: '16:00',
    discountPercent: 25,
    isActive: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dAndT, setDandT] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setDandT(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API}/api/happy-hour`);
        if (!res.ok) throw new Error('Failed to fetch happy hour settings');

        const data = await res.json();
        setSettings({
          startTime: data.startTime,
          endTime: data.endTime,
          discountPercent: data.discountPercent,
          isActive: data.isActive,
        });
      } catch (err) {
        console.error('Error fetching happy hour settings:', err);
        alert('Error loading Happy Hour settings from database');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings.startTime || !settings.endTime) {
      alert('Please select both start and end times.');
      return;
    }
    if (settings.discountPercent <= 0 || settings.discountPercent >= 100) {
      if (
        !window.confirm(
          'Discount is 0 or ≥ 100. Are you sure you want to continue?'
        )
      ) {
        return;
      }
    }

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/happy-hour`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save happy hour settings');
      alert('Happy Hour settings saved!');
    } catch (err) {
      console.error('Error saving happy hour settings:', err);
      alert('Failed to save Happy Hour settings');
    } finally {
      setSaving(false);
    }
  };

  const isCurrentlyActive = (() => {
    if (!settings.isActive) return false;

    const now = dAndT;
    const [startH, startM] = settings.startTime.split(':').map(Number);
    const [endH, endM] = settings.endTime.split(':').map(Number);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes < endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    if (startMinutes > endMinutes) {
      return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
    return false;
  })();

  if (loading) {
    return <div className="employees-container">Loading...</div>;
  }

  return (
    <div className="employees-container">
      <div className="employees-box">
        <header className="employees-header">
          <h1 className="employees-title">ChiCha San Chen</h1>
          <div className="employees-date-info">
            <span>🌐</span>
            <span>☁️</span>
            <span>
              {dAndT.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span>
              {dAndT.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        </header>

        <div className="employees-content">
          <div className="employees-controls">
            <h2 className="employees-heading">Happy Hour Settings</h2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <span
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  backgroundColor: isCurrentlyActive ? '#dcfce7' : '#fee2e2',
                  color: isCurrentlyActive ? '#166534' : '#b91c1c',
                }}
              >
                {isCurrentlyActive ? 'Active right now' : 'Not active now'}
              </span>
              <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                {settings.isActive
                  ? `Daily from ${settings.startTime} to ${settings.endTime} at ${settings.discountPercent}% off`
                  : 'Happy Hour is currently disabled.'}
              </span>
            </div>

            <div className="add-form">
              <h3>Configure Happy Hour</h3>
              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Start time</label>
                <input
                  type="time"
                  value={settings.startTime}
                  onChange={(e) =>
                    setSettings({ ...settings, startTime: e.target.value })
                  }
                  className="form-input"
                  style={{ maxWidth: '200px' }}
                />
                <label style={{ minWidth: '120px' }}>End time</label>
                <input
                  type="time"
                  value={settings.endTime}
                  onChange={(e) =>
                    setSettings({ ...settings, endTime: e.target.value })
                  }
                  className="form-input"
                  style={{ maxWidth: '200px' }}
                />
              </div>

              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <label style={{ minWidth: '120px' }}>Discount (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.discountPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      discountPercent: Number(e.target.value),
                    })
                  }
                  className="form-input"
                  style={{ maxWidth: '200px' }}
                />

                <label style={{ minWidth: '120px' }}>Enabled</label>
                <select
                  value={settings.isActive ? 'true' : 'false'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      isActive: e.target.value === 'true',
                    })
                  }
                  className="form-select"
                  style={{ maxWidth: '200px' }}
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div
                className="form-row"
                style={{ justifyContent: 'space-between', marginTop: '0.5rem' }}
              >
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => window.location.href = '/manager'} className="control-btn">Back</button>
                  <button
                    className="save-button"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HappyHourPage;
