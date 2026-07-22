import type { Metadata, Viewport } from "next";
import { Poppins, Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";

// Texte courant : Nunito (arrondie, chaleureuse, tres lisible).
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

// Titres : Poppins (geometrique, avec du caractere). Poppins n'est pas une
// police variable, on charge donc les graisses utilisees.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      className={`${nunito.variable} ${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
