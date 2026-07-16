import type { Metadata } from "next";

import { Providers } from "@/providers/Providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "StitchForecast Web",
  description: "Temperature blanket planning and build tracking on the web.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
