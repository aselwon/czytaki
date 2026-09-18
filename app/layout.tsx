import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Czytaki — Twoja własna przygoda",
  description: "Czytaj, słuchaj i odkrywaj. Opowieści, w których dziecko jest bohaterem — w jego własnym tempie.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
