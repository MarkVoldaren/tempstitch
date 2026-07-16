import { enumerateDateRange } from "../../utils/date";
import { LocationSuggestion, WeatherDayRecord } from "../../types/models";

import { FetchWeatherInput, FetchWeatherOptions, FetchWeatherResult, WeatherService } from "./types";

type OpenMeteoGeocodeResult = {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }>;
};

type OpenMeteoArchiveResult = {
  daily?: {
    time?: string[];
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    temperature_2m_mean?: Array<number | null>;
  };
  error?: boolean;
  reason?: string;
};

function toUnitParam(unit: FetchWeatherInput["unit"]) {
  return unit === "fahrenheit" ? "fahrenheit" : "celsius";
}

function parseLatLongQuery(query: string): LocationSuggestion[] | null {
  const match = query.trim().match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  );

  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [
    {
      id: `manual-${latitude}-${longitude}`,
      name: `Coordinates (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
      latitude,
      longitude,
    },
  ];
}

function normalizeMissing(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export class OpenMeteoWeatherService implements WeatherService {
  async searchLocations(query: string): Promise<LocationSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const manualCoordinates = parseLatLongQuery(trimmed);
    if (manualCoordinates) {
      return manualCoordinates;
    }

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed,
    )}&count=6&language=en&format=json`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error("Location search could not reach Open-Meteo.");
    }

    if (!response.ok) {
      throw new Error("Open-Meteo could not search that location.");
    }

    const json = (await response.json()) as OpenMeteoGeocodeResult;
    if (!Array.isArray(json.results)) {
      return [];
    }

    return json.results.map((result) => ({
      id: String(result.id),
      name: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
      latitude: result.latitude,
      longitude: result.longitude,
      country: result.country,
      admin1: result.admin1,
    }));
  }

  async fetchDailyTemperatures(
    input: FetchWeatherInput,
    _options?: FetchWeatherOptions,
  ): Promise<FetchWeatherResult> {
    const search = new URLSearchParams({
      latitude: String(input.latitude),
      longitude: String(input.longitude),
      start_date: input.startDate,
      end_date: input.endDate,
      daily: "temperature_2m_max,temperature_2m_min,temperature_2m_mean",
      temperature_unit: toUnitParam(input.unit),
      timezone: "auto",
    });

    const url = `https://archive-api.open-meteo.com/v1/archive?${search.toString()}`;
    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      throw new Error("Open-Meteo could not be reached for historical weather.");
    }

    if (!response.ok) {
      throw new Error(`Open-Meteo weather request failed with ${response.status}.`);
    }

    const json = (await response.json()) as OpenMeteoArchiveResult;
    if (json.error) {
      throw new Error(json.reason || "Open-Meteo reported an archive data error.");
    }

    const responseDates = json.daily?.time ?? [];
    if (!responseDates.length) {
      throw new Error("Open-Meteo returned no daily weather rows for that request.");
    }

    const maxList = json.daily?.temperature_2m_max ?? [];
    const minList = json.daily?.temperature_2m_min ?? [];
    const avgList = json.daily?.temperature_2m_mean ?? [];

    const byDate = new Map<string, WeatherDayRecord>();
    responseDates.forEach((date, index) => {
      byDate.set(date, {
        date,
        tempHigh: normalizeMissing(maxList[index]),
        tempLow: normalizeMissing(minList[index]),
        tempAvg: normalizeMissing(avgList[index]),
      });
    });

    let missingDays = 0;
    const daily = enumerateDateRange(input.startDate, input.endDate).map((date) => {
      const row = byDate.get(date);
      if (!row) {
        missingDays += 1;
        return {
          date,
          tempHigh: null,
          tempLow: null,
          tempAvg: null,
        };
      }

      if (row.tempHigh === null && row.tempLow === null && row.tempAvg === null) {
        missingDays += 1;
      }

      return row;
    });

    return {
      cacheKey: [
        input.latitude.toFixed(3),
        input.longitude.toFixed(3),
        input.startDate,
        input.endDate,
        input.unit,
        "open-meteo",
      ].join(":"),
      daily,
      source: "open-meteo",
      providerLabel: "Open-Meteo",
      missingDays,
      warningMessage:
        missingDays > 0
          ? `${missingDays} day${missingDays === 1 ? "" : "s"} had incomplete weather data.`
          : null,
      fallbackReason: null,
    };
  }
}
