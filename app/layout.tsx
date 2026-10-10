import type { Metadata } from "next";
import "./globals.css";
import "./marketplace.css";
import "./security-ui.css";
import "./landing.css";
import "./community.css";
import { MarketProvider } from "@/components/market-provider";
export const metadata: Metadata = {
  title: "Campus Connect | PAU's student marketplace",
  description:
    "Discover student-owned businesses, services and digital platforms at Pan-Atlantic University.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <MarketProvider>{children}</MarketProvider>
      </body>
    </html>
  );
}
