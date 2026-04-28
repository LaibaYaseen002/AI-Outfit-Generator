import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Outfit Generator",
  description: "Smart fashion assistant — personalized outfits powered by AI"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
