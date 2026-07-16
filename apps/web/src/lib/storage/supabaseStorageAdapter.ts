import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AppData,
  type AppStorageAdapter,
  migrateAppData,
} from "@temperature-blanket/core";

type DatabaseRow = Record<string, unknown>;

function stripUserId<T extends DatabaseRow>(rows: T[]) {
  return rows.map(({ user_id: _userId, ...row }) => row);
}

export function createSupabaseStorageAdapter(
  supabase: SupabaseClient,
): AppStorageAdapter {
  return {
    async loadAppData(userId) {
      const [projectsResult, rangesResult, daysResult, progressResult, cacheResult] =
        await Promise.all([
          supabase.from("projects").select("*").eq("user_id", userId),
          supabase.from("temperature_ranges").select("*").eq("user_id", userId),
          supabase.from("temperature_days").select("*").eq("user_id", userId),
          supabase.from("build_progress_rows").select("*").eq("user_id", userId),
          supabase.from("weather_cache").select("*").eq("user_id", userId),
        ]);

      const firstError = [
        projectsResult.error,
        rangesResult.error,
        daysResult.error,
        progressResult.error,
        cacheResult.error,
      ].find(Boolean);

      if (firstError) {
        throw new Error(firstError.message);
      }

      return migrateAppData({
        projects: stripUserId((projectsResult.data ?? []) as DatabaseRow[]),
        ranges: stripUserId((rangesResult.data ?? []) as DatabaseRow[]),
        temperatureDays: stripUserId((daysResult.data ?? []) as DatabaseRow[]),
        progressRows: stripUserId((progressResult.data ?? []) as DatabaseRow[]),
        weatherCache: stripUserId((cacheResult.data ?? []) as DatabaseRow[]),
      });
    },
    async saveAppData(userId, data) {
      const projectIds = data.projects.map((project: AppData["projects"][number]) => project.id);

      if (projectIds.length > 0) {
        await Promise.all([
          supabase.from("build_progress_rows").delete().eq("user_id", userId),
          supabase.from("temperature_days").delete().eq("user_id", userId),
          supabase.from("temperature_ranges").delete().eq("user_id", userId),
          supabase.from("weather_cache").delete().eq("user_id", userId),
          supabase.from("projects").delete().eq("user_id", userId),
        ]);
      } else {
        await Promise.all([
          supabase.from("build_progress_rows").delete().eq("user_id", userId),
          supabase.from("temperature_days").delete().eq("user_id", userId),
          supabase.from("temperature_ranges").delete().eq("user_id", userId),
          supabase.from("weather_cache").delete().eq("user_id", userId),
          supabase.from("projects").delete().eq("user_id", userId),
        ]);
      }

      if (data.projects.length) {
        const result = await supabase.from("projects").insert(
          data.projects.map((project: AppData["projects"][number]) => ({
            user_id: userId,
            ...project,
          })),
        );
        if (result.error) {
          throw new Error(result.error.message);
        }
      }

      if (data.ranges.length) {
        const result = await supabase.from("temperature_ranges").insert(
          data.ranges.map((range: AppData["ranges"][number]) => ({
            user_id: userId,
            ...range,
          })),
        );
        if (result.error) {
          throw new Error(result.error.message);
        }
      }

      if (data.temperatureDays.length) {
        const result = await supabase.from("temperature_days").insert(
          data.temperatureDays.map((day: AppData["temperatureDays"][number]) => ({
            user_id: userId,
            ...day,
          })),
        );
        if (result.error) {
          throw new Error(result.error.message);
        }
      }

      if (data.progressRows.length) {
        const result = await supabase.from("build_progress_rows").insert(
          data.progressRows.map((row: AppData["progressRows"][number]) => ({
            user_id: userId,
            ...row,
          })),
        );
        if (result.error) {
          throw new Error(result.error.message);
        }
      }

      if (data.weatherCache.length) {
        const result = await supabase.from("weather_cache").insert(
          data.weatherCache.map((entry: AppData["weatherCache"][number]) => ({
            user_id: userId,
            ...entry,
          })),
        );
        if (result.error) {
          throw new Error(result.error.message);
        }
      }
    },
  };
}
