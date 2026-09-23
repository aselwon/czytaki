import type { Metadata } from "next";
import "./globals.css";
import "./studio.css";
import "./hero.css";
import "./comic.css";
import "./editor.css";

export const metadata: Metadata = {
  title: "Czytaki — Ze zdjęcia do własnej książeczki",
  description: "Wgraj zdjęcie dziecka, pupila lub kogoś bliskiego. Stwórz spersonalizowany komiks albo bajkę i zamów gotowy PDF na e-mail.",
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
