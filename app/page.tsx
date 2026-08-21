"use client";

import { useState, type FormEvent } from "react";

const PRICE_OPTIONS = ["500", "600", "700", "800", "900", "1000", "1100", "1200", "1300", "1400", "1500", "1600", "1800", "2000", "2500", "3000"];

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

const inputClass =
  "w-full bg-black border border-[var(--term-green-dim)] text-[var(--term-green-bright)] px-3 py-2 " +
  "font-mono tracking-wide placeholder-[var(--term-green-dim)] outline-none rounded-none " +
  "focus:border-[var(--term-green)] focus:shadow-[0_0_8px_rgba(51,255,102,0.5)] transition-shadow";

const labelClass =
  "block text-xs uppercase tracking-[0.2em] mb-1 text-[var(--term-green-bright)] term-glow";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("Salerno");
  const [maxPrice, setMaxPrice] = useState("1500");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [passcode, setPasscode] = useState("");
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setState({ status: "submitting" });

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, location, maxPrice, telegramBotToken, passcode }),
      });
      const json = await res.json();

      if (res.ok) {
        setState({ status: "success" });
      } else {
        setState({ status: "error", message: json.message ?? "UNKNOWN FAULT." });
      }
    } catch {
      setState({ status: "error", message: "CONNECTION LOST. CHECK UPLINK AND RETRY." });
    }
  }

  if (state.status === "success") {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="term-boot w-full max-w-md border border-[var(--term-green)] bg-[var(--term-bg-panel)] p-6 text-center space-y-4 shadow-[0_0_24px_rgba(51,255,102,0.25)]">
          <div className="text-xs tracking-[0.3em] text-[var(--term-green-dim)]">
            [ IDEALISTA-ALERT NET // AUTH MODULE ]
          </div>
          <div className="font-display text-4xl text-[var(--term-green-bright)] term-glow">
            ACCESS GRANTED
          </div>
          <p className="text-sm text-[var(--term-green)] leading-relaxed">
            SURVEILLANCE ACTIVE. CHECK YOUR TELEGRAM UPLINK FOR CONFIRMATION.
            <br />
            NEW ASSETS WILL BE TRANSMITTED AS THEY ARE ACQUIRED.
          </p>
          <div className="text-xs text-[var(--term-green-dim)] pt-2">
            STATUS: ONLINE <span className="term-cursor" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="border border-[var(--term-green)] bg-[var(--term-bg-panel)] px-4 py-3 shadow-[0_0_20px_rgba(51,255,102,0.2)]">
          <div className="flex items-center justify-between text-[10px] tracking-[0.25em] text-[var(--term-green-dim)] mb-2">
            <span>CLASSIFIED // EYES ONLY</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--term-green)] animate-pulse" />
              LIVE
            </span>
          </div>
          <h1 className="font-display text-3xl text-[var(--term-green-bright)] term-glow leading-none">
            IDEALISTA-ALERT<span className="term-cursor" />
          </h1>
          <p className="text-[10px] tracking-[0.2em] text-[var(--term-green-dim)] mt-1">
            RENTAL SURVEILLANCE NETWORK — TERMINAL ACCESS
          </p>
        </div>

        <div className="border border-[var(--term-green-dim)] bg-[var(--term-bg-panel)] px-4 py-3 text-xs leading-relaxed space-y-1">
          <p className="text-[var(--term-green-bright)] tracking-[0.15em] mb-2">{"// OPERATIVE SETUP SEQUENCE"}</p>
          <p>
            <span className="text-[var(--term-green-bright)]">[1]</span> Contact{" "}
            <a
              className="underline decoration-dotted underline-offset-2 hover:text-[var(--term-green-bright)]"
              href="https://t.me/BotFather"
              target="_blank"
              rel="noreferrer"
            >
              @BotFather
            </a>{" "}
            on Telegram → deploy a new bot → copy its access token.
          </p>
          <p>
            <span className="text-[var(--term-green-bright)]">[2]</span> Open a channel with your bot — send any
            transmission (e.g. /start).
          </p>
          <p>
            <span className="text-[var(--term-green-bright)]">[3]</span> Complete the fields below and authorize.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="displayName">
              &gt; CODENAME <span className="text-[var(--term-green-dim)] normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="displayName"
              className={inputClass}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. MARIA"
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="location">
              &gt; TARGET CITY
            </label>
            <input
              id="location"
              required
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Salerno"
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="maxPrice">
              &gt; MAX PRICE THRESHOLD (€/MO)
            </label>
            <select
              id="maxPrice"
              className={inputClass + " appearance-none cursor-pointer"}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{ colorScheme: "dark" }}
            >
              {PRICE_OPTIONS.map((p) => (
                <option key={p} value={p} className="bg-black text-[var(--term-green-bright)]">
                  €{p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="telegramBotToken">
              &gt; BOT AUTH TOKEN
            </label>
            <input
              id="telegramBotToken"
              required
              className={inputClass + " text-sm"}
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="123456789:AAF5..."
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="passcode">
              &gt; ACCESS CODE
            </label>
            <input
              id="passcode"
              required
              type="password"
              className={inputClass}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="••••"
              autoComplete="off"
            />
          </div>

          {state.status === "error" && (
            <p className="text-sm text-[var(--term-red)] border border-[var(--term-red)] px-3 py-2 bg-black/40 tracking-wide">
              &gt;&gt;&gt; ACCESS DENIED: {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={state.status === "submitting"}
            className="w-full border border-[var(--term-green)] text-[var(--term-green-bright)] py-2.5 font-mono
                       tracking-[0.2em] uppercase transition-colors
                       hover:bg-[var(--term-green)] hover:text-black
                       disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--term-green-bright)]"
          >
            {state.status === "submitting" ? "TRANSMITTING…" : "[ INITIATE SURVEILLANCE ]"}
          </button>
        </form>

        <p className="text-center text-[10px] tracking-[0.2em] text-[var(--term-green-dim)]">
          UNAUTHORIZED ACCESS IS A VIOLATION OF THE LANDLORD PROTOCOL
        </p>
      </div>
    </main>
  );
}
