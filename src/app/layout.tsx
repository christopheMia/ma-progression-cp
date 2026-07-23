import type { Metadata, Viewport } from "next";
import { Quicksand, Playfair_Display, Geist_Mono, Dancing_Script } from "next/font/google";
import "./globals.css";

// Texte courant : Quicksand (geometrique arrondi, doux et lisible).
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

// Titres : Playfair Display (serif chic a fort contraste, facon "Chloe").
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

// Logo / nom de l'appli : Dancing Script (calligraphie elegante et lisible).
// Utilisee uniquement pour le wordmark "Ma Progression CP", via .font-logo.
const dancingScript = Dancing_Script({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={`${quicksand.variable} ${playfair.variable} ${dancingScript.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
