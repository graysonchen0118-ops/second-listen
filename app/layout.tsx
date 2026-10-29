import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Second Listen | Conversation QA", template: "%s | Second Listen" },
  description: "Daily quality review for voice and chat conversations: bot health, vendor score audits, calibration rulings and fix testing.",
};

export const viewport: Viewport = {
  themeColor: "#0c1a29",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={lexend.className}>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
