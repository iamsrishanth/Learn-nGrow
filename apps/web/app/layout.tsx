import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn-nGrow",
  description: "Baseline app shell for Learn-nGrow"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
