import type { Metadata, Viewport } from "next";
import { Lexend, Geist_Mono } from "next/font/google";
import "./globals.css";

// Lexend : police concue pour faciliter la lecture (adaptee au CP).
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ma Progression CP",
  description:
    "L'appli qui prépare ton année de CP : progression, suivi des élèves et cahier journal, avec l'IA qui lit ta méthode.",
};

/**
 * `viewportFit: 'cover'` est indispensable pour que `env(safe-area-inset-*)`
 * renvoie autre chose que 0 sur iPhone. Sans ca, le bouton flottant "Mon
 * assistant" pouvait se retrouver sous la barre du navigateur ou sous
 * l'indicateur d'accueil, donc invisible sur mobile.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${lexend.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
