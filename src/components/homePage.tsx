import React, { useState, useEffect } from 'react';
import GoogleTranslate from "./GoogleTranslate";
import './homePage.css';

//const API = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
// for running locally
const API = 'http://localhost:8080';

interface HomePageProps {
  onStartOrder: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onStartOrder }) => {
  // update date and time
  const [dAndT, setDandT] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setDandT(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

   // add weather
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
    <div className="home-container">
      <div className="home-box">
        <header className="home-header">
          <h1 className="home-title">ChiCha San Chen</h1>
          <div className="home-date-info">
            <div className="weather-info">
              {weatherCode == 0 ? <div>☀️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 1 ? <div>🌤️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 2 ? <div>⛅ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 3 ? <div>☁️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 45 || weatherCode == 48 ? <div>🌫️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 51 || weatherCode == 53 || weatherCode == 55 ? <div>🌦️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 56 || weatherCode == 57 || weatherCode == 66 || weatherCode == 67 ? <div>🌧️❄️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 61 || weatherCode == 63 || weatherCode == 65 ? <div>🌧️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 71 || weatherCode == 72 || weatherCode == 73 || weatherCode == 75 || weatherCode == 77? <div>❄️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 80 || weatherCode == 81 ? <div>🌧️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 82 || weatherCode == 95 ? <div>⛈️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 85 || weatherCode == 86 ? <div>🌨️ {temp?.toFixed(1)}°F</div> : null}
              {weatherCode == 96 || weatherCode == 99 ? <div>⛈️❄️ {temp?.toFixed(1)}°F</div> : null}
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
        
        {/* homePage content */}
        <div className="home-content">
          <h2 className="home-heading">
            Welcome to ChiCha SanChen!
          </h2>
          <button
            onClick={onStartOrder}
            className="start-button"
          >
            Start Your Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;