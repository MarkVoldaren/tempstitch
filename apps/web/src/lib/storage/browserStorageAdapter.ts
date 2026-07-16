import {
  type AppStorageAdapter,
  migrateAppData,
  serializeAppData,
  type AppData,
} from "@temperature-blanket/core";

function getKey(userId: string) {
  return `temperature-blanket:web:${userId}`;
}

export const browserStorageAdapter: AppStorageAdapter = {
  async loadAppData(userId) {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(getKey(userId));
    if (!raw) {
      return null;
    }

    return migrateAppData(JSON.parse(raw));
  },
  async saveAppData(userId, data) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      getKey(userId),
      JSON.stringify(serializeAppData(data as AppData)),
    );
  },
};
