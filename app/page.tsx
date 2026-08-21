"use client";

import { useState, type FormEvent } from "react";

const PRICE_OPTIONS = ["500", "600", "700", "800", "900", "1000", "1100", "1200", "1300", "1400", "1500", "1600", "1800", "2000", "2500", "3000"];

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

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
        setState({ status: "error", message: json.message ?? "Something went wrong." });
      }
    } catch {
      setState({ status: "error", message: "Network error — check your connection and try again." });
    }
  }

  if (state.status === "success") {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-semibold">You&apos;re all set!</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Check Telegram for a confirmation message. New rental listings will start arriving
            there, with buttons to save or dismiss each one.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Idealista Rental Alerts</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Get new Italian rental listings DMed to your own Telegram bot, checked every 6 hours.
          </p>
        </div>

        <ol className="text-sm space-y-1 text-neutral-600 dark:text-neutral-400 list-decimal list-inside">
          <li>
            Create a bot with{" "}
            <a
              className="underline"
              href="https://t.me/BotFather"
              target="_blank"
              rel="noreferrer"
            >
              @BotFather
            </a>{" "}
            on Telegram and copy its token.
          </li>
          <li>Open a chat with your new bot and send it any message, e.g. /start.</li>
          <li>Fill in the form below and click Start.</li>
        </ol>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="displayName">
              Your name (optional)
            </label>
            <input
              id="displayName"
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Maria"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="location">
              City
            </label>
            <input
              id="location"
              required
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Salerno"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="maxPrice">
              Max price (€/month)
            </label>
            <select
              id="maxPrice"
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            >
              {PRICE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  €{p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="telegramBotToken">
              Telegram bot token
            </label>
            <input
              id="telegramBotToken"
              required
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 font-mono text-sm"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="123456789:AAF5..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="passcode">
              Passcode
            </label>
            <input
              id="passcode"
              required
              type="password"
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Ask the owner if you don't have this"
            />
          </div>

          {state.status === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={state.status === "submitting"}
            className="w-full rounded bg-black text-white dark:bg-white dark:text-black py-2 font-medium disabled:opacity-50"
          >
            {state.status === "submitting" ? "Starting…" : "Start"}
          </button>
        </form>
      </div>
    </main>
  );
}
