import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateUser } from '../middleware/auth';
import { getWeatherForLocation, getWeatherRecommendations } from '../services/weatherService';

const router = express.Router();

/**
 * GET /api/v1/weather
 * Get weather data for location
 */
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const { lat, lon, timestamp } = req.query;

  if (!lat || !lon) {
    res.status(400).json({ error: 'Latitude and longitude are required' });
    return;
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    res.status(400).json({ error: 'Invalid coordinates' });
    return;
  }

  const weather = await getWeatherForLocation(
    latitude,
    longitude,
    timestamp ? new Date(timestamp as string) : undefined
  );

  const recommendations = getWeatherRecommendations(weather);

  res.json({
    ...weather,
    recommendations,
  });
}));

export default router;
