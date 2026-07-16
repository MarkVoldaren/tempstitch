"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | { id: string; email: string | null } | null;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<AuthContextValue["user"]>(
    configured ? null : { id: "demo-user", email: "demo@stitchforecast.local" },
  );

  useEffect(() => {
    if (!configured) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      async signInWithEmail(email) {
        const client = getSupabaseBrowserClient();
        if (!client) {
          throw new Error("Supabase is not configured.");
        }

        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo:
              typeof window === "undefined"
                ? undefined
                : `${window.location.origin}/app/projects`,
          },
        });

        if (error) {
          throw new Error(error.message);
        }
      },
      async signOut() {
        const client = getSupabaseBrowserClient();
        if (!client) {
          return;
        }

        await client.auth.signOut();
      },
    }),
    [configured, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
