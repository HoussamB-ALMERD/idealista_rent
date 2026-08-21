import type { Metadata } from "next";
import { Share_Tech_Mono, VT323 } from "next/font/google";
import "./globals.css";

const terminalMono = Share_Tech_Mono({
  variable: "--font-terminal-mono",
  weight: "400",
  subsets: ["latin"],
});

const terminalDisplay = VT323({
  variable: "--font-terminal-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IDEALISTA-ALERT // TERMINAL",
  description: "Restricted access terminal: Italian rental surveillance network.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${terminalMono.variable} ${terminalDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
