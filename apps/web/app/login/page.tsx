"use client";

import { useState } from "react";

import { useAuth } from "@/providers/AuthProvider";

export default function LoginPage() {
  const { configured, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mainContent">
      <div className="card stackLg" style={{ maxWidth: "32rem", margin: "4rem auto" }}>
        <div className="stackSm">
          <p className="eyebrow">Web sign-in</p>
          <h1 className="pageTitle">Sign in to StitchForecast</h1>
          <p className="pageCopy">
            Use a magic link to access your web workspace and cloud-saved temperature blanket projects.
          </p>
        </div>
        {!configured ? (
          <div className="banner warning">
            Supabase environment variables are not configured yet. The app currently runs in demo mode from `/app/projects`.
          </div>
        ) : (
          <>
            <label className="field">
              <span>Email address</span>
              <input className="input" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            </label>
            {message ? <div className="banner info">{message}</div> : null}
            {error ? <div className="banner danger">{error}</div> : null}
            <button
              className="primaryButton"
              onClick={async () => {
                try {
                  setError(null);
                  await signInWithEmail(email);
                  setMessage("Check your inbox for a magic link.");
                } catch (nextError) {
                  setError(nextError instanceof Error ? nextError.message : "Unable to sign in.");
                }
              }}
              type="button"
            >
              Send magic link
            </button>
          </>
        )}
      </div>
    </main>
  );
}
