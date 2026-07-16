import { enumerateDateRange } from "@/utils/date";
import { LocationSuggestion, WeatherDayRecord } from "@/types/models";

import { FetchWeatherInput, FetchWeatherOptions, FetchWeatherResult, WeatherService } from "./types";

function seededTemperature(date: string, latitude: number) {
  const dayOfYear =
    Math.floor(
      (new Date(`${date}T12:00:00`).getTime() -
        new Date(`${date.slice(0, 4)}-01-01T12:00:00`).getTime()) /
        86400000,
    ) + 1;
  const seasonalCurve = Math.sin(((dayOfYear - 80) / 365) * Math.PI * 2);
  const latitudeOffset = Math.max(0, Math.abs(latitude) / 4);
  const avg = 58 + seasonalCurve * (24 - latitudeOffset);
  const high = avg + 8;
  const low = avg - 9;

  return {
    tempHigh: Math.round(high * 10) / 10,
    tempLow: Math.round(low * 10) / 10,
    tempAvg: Math.round(avg * 10) / 10,
  };
}

export class MockWeatherService implements WeatherService {
  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    const fallback: LocationSuggestion[] = [
      {
        id: "mock-chicago",
        name: "Chicago, Illinois",
        latitude: 41.8781,
        longitude: -87.6298,
      },
      {
        id: "mock-denver",
        name: "Denver, Colorado",
        latitude: 39.7392,
        longitude: -104.9903,
      },
      {
        id: "mock-portland",
        name: "Portland, Oregon",
        latitude: 45.5152,
        longitude: -122.6784,
      },
    ];

    return fallback.filter((item) =>
      item.name.toLowerCase().includes(query.trim().toLowerCase()),
    );
  }

  async fetchDailyTemperatures(
    input: FetchWeatherInput,
    _options?: FetchWeatherOptions,
  ): Promise<FetchWeatherResult> {
    const daily: WeatherDayRecord[] = enumerateDateRange(
      input.startDate,
      input.endDate,
    ).map((date) => ({
      date,
      ...seededTemperature(date, input.latitude),
    }));

    return {
      cacheKey: [
        input.latitude.toFixed(3),
        input.longitude.toFixed(3),
        input.startDate,
        input.endDate,
        input.unit,
        "mock",
      ].join(":"),
      daily,
      source: "mock",
      providerLabel: "Mock fallback",
      missingDays: 0,
      warningMessage: null,
      fallbackReason: null,
    };
  }
}
