import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Vettly", template: "%s · Vettly" },
  description: "Smarter Hiring. Faster. Evidence-based recruitment for HR teams.",
  applicationName: "Vettly",
};

export const viewport: Viewport = {
  themeColor: "#163A2E",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${publicSans.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
