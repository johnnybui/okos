import { tool } from '@langchain/core/tools';
import ky from 'ky';
import { z } from 'zod';

/**
 * Tool for getting weather information from OpenWeatherMap API
 */
export const weatherTool = tool(
  async ({ location, units = 'metric', forecast = false }) => {
    try {
      const apiKey = process.env.OPENWEATHERMAP_API_KEY;

      if (!apiKey) {
        return 'Error: OpenWeatherMap API key is not configured. Please set the OPENWEATHERMAP_API_KEY environment variable.';
      }

      // Format temperature unit symbol
      const tempUnit = units === 'imperial' ? '°F' : '°C';
      const speedUnit = units === 'imperial' ? 'mph' : 'm/s';

      if (forecast) {
        // Get 5-day forecast
        const forecastUrl = new URL('https://api.openweathermap.org/data/2.5/forecast');
        forecastUrl.searchParams.append('q', location);
        forecastUrl.searchParams.append('units', units);
        forecastUrl.searchParams.append('appid', apiKey);

        const forecastResponse = await ky.get(forecastUrl.toString()).json<{
          list: Array<{
            dt: number;
            main: {
              temp: number;
              feels_like: number;
              humidity: number;
            };
            weather: Array<{ description: string }>;
            wind: { speed: number };
            dt_txt: string;
          }>;
          city: {
            name: string;
            country: string;
          };
        }>();

        const cityName = forecastResponse.city.name;
        const country = forecastResponse.city.country;

        // Group forecast data by day
        const dailyForecasts: Record<string, any> = {};

        forecastResponse.list.forEach((item) => {
          const date = new Date(item.dt * 1000);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          if (!dailyForecasts[dateStr]) {
            dailyForecasts[dateStr] = {
              date: dateStr,
              temps: [],
              descriptions: [],
              humidity: [],
              windSpeed: [],
            };
          }
          
          dailyForecasts[dateStr].temps.push(item.main.temp);
          dailyForecasts[dateStr].descriptions.push(item.weather[0]?.description);
          dailyForecasts[dateStr].humidity.push(item.main.humidity);
          dailyForecasts[dateStr].windSpeed.push(item.wind.speed);
        });

        // Calculate daily averages and get most common weather description
        const dailySummaries = Object.values(dailyForecasts).map((day: any) => {
          const avgTemp = day.temps.reduce((sum: number, temp: number) => sum + temp, 0) / day.temps.length;
          const avgHumidity = day.humidity.reduce((sum: number, hum: number) => sum + hum, 0) / day.humidity.length;
          const avgWindSpeed = day.windSpeed.reduce((sum: number, speed: number) => sum + speed, 0) / day.windSpeed.length;
          
          // Get most frequent weather description
          const descriptionCounts: Record<string, number> = {};
          day.descriptions.forEach((desc: string) => {
            descriptionCounts[desc] = (descriptionCounts[desc] || 0) + 1;
          });
          const mostCommonDescription = Object.entries(descriptionCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
          
          // Format date to be more readable
          const dateObj = new Date(day.date);
          const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          
          return `${formattedDate}: ${mostCommonDescription}, ${avgTemp.toFixed(1)}${tempUnit}, humidity ${avgHumidity.toFixed(0)}%, wind ${avgWindSpeed.toFixed(1)} ${speedUnit}`;
        });

        return `5-day weather forecast for ${cityName}, ${country}:\n\n${dailySummaries.join('\n')}`;
      } else {
        // Get current weather
        const url = new URL('https://api.openweathermap.org/data/2.5/weather');
        url.searchParams.append('q', location);
        url.searchParams.append('units', units);
        url.searchParams.append('appid', apiKey);

        // Make the API request using ky
        const response = await ky.get(url.toString()).json<{
          weather: Array<{ description: string }>;
          main: {
            temp: number;
            feels_like: number;
            humidity: number;
            pressure: number;
          };
          wind: {
            speed: number;
          };
          name: string;
          sys: {
            country: string;
          };
        }>();

        // Format the response
        const weather = response.weather[0]?.description || 'unknown';
        const temp = response.main.temp;
        const feelsLike = response.main.feels_like;
        const humidity = response.main.humidity;
        const windSpeed = response.wind.speed;
        const cityName = response.name;
        const country = response.sys.country;

        return `Current weather in ${cityName}, ${country}: ${weather}. Temperature: ${temp}${tempUnit} (feels like ${feelsLike}${tempUnit}). Humidity: ${humidity}%. Wind speed: ${windSpeed} ${speedUnit}.`;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          return `Could not find weather data for "${location}". Please check the location name and try again.`;
        }
        return `Error fetching weather data: ${error.message}`;
      }
      return 'An unknown error occurred while fetching weather data.';
    }
  },
  {
    name: 'get_weather',
    description: 'Get current weather or 5-day forecast for a specific location.',
    schema: z.object({
      location: z
        .string()
        .describe('The city name, e.g., "London", "New York", "Tokyo", or "Paris, FR" for more specificity.'),
      units: z
        .enum(['metric', 'imperial'])
        .optional()
        .describe('Units of measurement. Use "metric" for Celsius or "imperial" for Fahrenheit. Defaults to metric.'),
      forecast: z
        .boolean()
        .optional()
        .describe('If true, returns a 5-day weather forecast. If false or omitted, returns current weather only.'),
    }),
  }
);
