import { MockWeatherService } from "./mockWeatherService";
import { OpenMeteoWeatherService } from "./openMeteoWeatherService";
import { FetchWeatherOptions, WeatherService } from "./types";

const fallback = new MockWeatherService();

export function createWeatherService(): WeatherService {
  const primary = new OpenMeteoWeatherService();

  return {
    async searchLocations(query) {
      try {
        const results = await primary.searchLocations(query);
        if (results.length) {
          return results;
        }
      } catch (error) {
        console.warn("Location search falling back to mock suggestions", error);
      }

      return fallback.searchLocations(query);
    },
    async fetchDailyTemperatures(input, options?: FetchWeatherOptions) {
      const fallbackMode = options?.fallbackMode ?? "allowMock";

      if (fallbackMode === "mockOnly") {
        return fallback.fetchDailyTemperatures(input, options);
      }

      try {
        return await primary.fetchDailyTemperatures(input, options);
      } catch (error) {
        if (fallbackMode !== "allowMock") {
          throw error;
        }

        const result = await fallback.fetchDailyTemperatures(input, options);
        return {
          ...result,
          fallbackReason:
            error instanceof Error ? error.message : "Open-Meteo was unavailable.",
          warningMessage: "Using mock weather data because live weather could not be loaded.",
        };
      }
    },
  };
}
