import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const fontDisplay = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const fontBody = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// The reference site uses the generic system monospace stack, not a loaded
// web font — no next/font import needed.
const monoStack =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export const metadata: Metadata = {
  title: "LiveDrop Arena",
  description:
    "Academic research prototype studying livestream gaming recruitment and disclosure behaviour.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}
      style={{ "--font-mono": monoStack } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col bg-background">
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-center" theme="dark" />
        </TooltipProvider>
      </body>
    </html>
  );
}
