import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse utilise pdfjs-dist (dépendance canvas native) — on l'exclut du bundle serveur
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  experimental: {
    // Memoire de navigation cote navigateur : une page deja visitee se
    // reaffiche sans repasser par le serveur pendant 30 s. C'est ce qui rend
    // les allers-retours de menu instantanes (retour de Christophe du 30/07 :
    // « l'appli devrait reagir au clic comme une autre application »).
    // Sur : chaque enregistrement passe par une action serveur qui fait
    // revalidatePath, ce qui purge cette memoire pour la page touchee.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
