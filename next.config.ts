import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse utilise pdfjs-dist (dépendance canvas native) — on l'exclut du bundle serveur
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
