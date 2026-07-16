import {
  LocationSuggestion,
  TemperatureUnit,
  WeatherDataSource,
  WeatherDayRecord,
} from "@/types/models";

export type FetchWeatherInput = {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  unit: TemperatureUnit;
};

export type FetchWeatherOptions = {
  fallbackMode?: "none" | "allowMock" | "mockOnly";
};

export type FetchWeatherResult = {
  cacheKey: string;
  daily: WeatherDayRecord[];
  source: WeatherDataSource;
  providerLabel: string;
  missingDays: number;
  warningMessage?: string | null;
  fallbackReason?: string | null;
};

export interface WeatherService {
  searchLocations(query: string): Promise<LocationSuggestion[]>;
  fetchDailyTemperatures(
    input: FetchWeatherInput,
    options?: FetchWeatherOptions,
  ): Promise<FetchWeatherResult>;
}
