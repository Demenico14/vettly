import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Vettly", template: "%s · Vettly" },
  description: "Smarter Hiring. Faster. Evidence-based recruitment for HR teams.",
  applicationName: "Vettly",
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
