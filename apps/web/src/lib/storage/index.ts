import type { AppStorageAdapter } from "@temperature-blanket/core";

import { browserStorageAdapter } from "./browserStorageAdapter";
import { createSupabaseStorageAdapter } from "./supabaseStorageAdapter";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function createWebStorageAdapter(): AppStorageAdapter {
  if (isSupabaseConfigured()) {
    const client = getSupabaseBrowserClient();
    if (client) {
      return createSupabaseStorageAdapter(client);
    }
  }

  return browserStorageAdapter;
}
