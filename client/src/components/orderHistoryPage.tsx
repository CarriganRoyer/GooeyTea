import React, { useState, useEffect } from 'react';
import './orderHistory.css';

//local hosting
const API = 'http://localhost:8080';

interface IngredientUsage {
  itemid: number;
  name: string;
  type: string;
  used: number;
}

const OrderHistoryPage = () => {
  const [ingredientData, setIngredientData] = useState<IngredientUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dAndT, setDandT] = useState(new Date());

  //effects
  useEffect(() => {
    const interval = setInterval(() => setDandT(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchIngredientUsage();
  }, []);

  const fetchIngredientUsage = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/order-history/ingredient-usage`);
      if (!response.ok) throw new Error('Failed to fetch ingredient usage data');
      const data = await response.json();
      setIngredientData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ordering trends');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchIngredientUsage();
  };

  const [temp, setTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`${API}/api/weather`);
        const data = await res.json();

        if (res.ok && data.temp !== undefined) setTemp(data.temp);
        if (res.ok && data.weatherCode !== undefined) setWeatherCode(data.weatherCode);
      } catch (err) {
        console.error(err);
      }
    };
    fetchWeather();
  }, []);

  const renderMonospace = () => {
    if (!ingredientData || ingredientData.length === 0) {
      return <pre className="inv-empty">(no rows)</pre>;
    }

    const pad = (s: string, width: number) => {
      const str = String(s);
      return str.length >= width ? str.slice(0, width) : str + ' '.repeat(width - str.length);
    };

    const cols = {
      name: 30,
      type: 12,
      used: 10,
    };

    const header = [
      pad('Name', cols.name),
      pad('Type', cols.type),
      pad('Used', cols.used),
    ].join(' ');

    const rows = ingredientData.map(item => {
      return [
        pad(String(item.name), cols.name),
        pad(String(item.type), cols.type),
        pad(String(item.used), cols.used),
      ].join(' ');
    });

    return (
      <pre className="inv-pre">
        {header}
        {'\n'}
        {rows.join('\n')}
      </pre>
    );
  };

  const maxValue = Math.max(...ingredientData.map(d => d.used), 1);
  const chartMax = Math.ceil(maxValue / 20) * 20 || 20;

  return (
    <div className="report-container">
      <div className="report-box">
        <header className="report-header">
          <h1 className="report-title">Manager - Order History</h1>
          
          <div className="report-date-info">
            <div className="weather-info">
              {weatherCode === 0 && <div>☀️ {temp?.toFixed(1)}°F</div>}
              {weatherCode === 1 && <div>🌤️ {temp?.toFixed(1)}°F</div>}
              {weatherCode === 2 && <div>⛅ {temp?.toFixed(1)}°F</div>}
              {weatherCode === 3 && <div>☁️ {temp?.toFixed(1)}°F</div>}
            </div>

            <span>
              {dAndT.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span>
              {dAndT.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </header>

        <div className="trends-content">
          <div className="trends-controls">
            <h2 className="page-subtitle">Ordering Trends</h2>
            <div className="history-actions">
              <button onClick={() => window.location.href = '/manager'} className="control-btn">Back</button>
              <button onClick={handleRefresh} className="control-btn" disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading-message">Loading ordering trends...</div>
          ) : (
            <div className="trends-layout">

              {/* ==== bar chart section ==== */}
              <div className="chart-section">
                <h3 className="section-title">Trends</h3>

                <div className="chart-container">
                  <div className="chart-wrapper">

                    <div className="y-axis">
                      {Array.from({ length: 13 }, (_, i) =>
                        chartMax - (i * (chartMax / 12))
                      ).map((value, idx) => (
                        <div key={idx} className="y-axis-label">
                          {Math.round(value)}
                        </div>
                      ))}
                    </div>
                    <div className="chart-area">
                      <div className="bars-container">
                        {ingredientData.map((item) => {
                          const heightPercent = (item.used / chartMax) * 100;
                          return (
                            <div key={`${item.type}-${item.itemid}`} className="bar-wrapper">
                              <div className="bar-column">
                                <div
                                  className="bar"
                                  style={{ height: `${heightPercent}%` }}
                                  title={`${item.name} (${item.type}): ${item.used}`}
                                >
                                <span className="bar-value">{item.used}</span>
                                </div>
                              </div>
                              <div className="bar-label">{item.name}</div>
                              </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* data table */}
              <div className="data-section">
                <h3 className="section-title">Ingredient Usage Data</h3>
                <div className="inv-scroller">
                  {renderMonospace()}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderHistoryPage;