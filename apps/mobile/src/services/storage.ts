import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppData } from "@/types/models";
import { migrateAppData, serializeAppData } from "@/utils/persistence";

const STORAGE_KEY = "temperature-blanket:v2";

export async function loadAppData() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return migrateAppData(JSON.parse(raw));
  } catch (error) {
    console.warn("Unable to parse persisted app data", error);
    throw new Error("Saved data was corrupted and could not be loaded.");
  }
}

export async function saveAppData(data: AppData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serializeAppData(data)));
}
