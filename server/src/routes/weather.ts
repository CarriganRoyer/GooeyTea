import { Router } from "express";
import { fetchWeatherApi } from "openmeteo";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=30.62&longitude=-96.32&current_weather=true";

        const response = await fetch(url);
        const data = await response.json();

        const temp = data.current_weather.temperature * (9/5) + 32;

        const weatherCode = data.current_weather.weathercode;

        res.json({
            temp,
            weatherCode
        });
    } catch (err) {
        res.status(400).json({ error: String(err) });
    }
});

export default router;