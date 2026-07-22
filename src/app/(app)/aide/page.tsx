import Link from 'next/link'

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl p-5">
      <h2 className="font-bold text-gray-800 mb-3">{titre}</h2>
      <div className="space-y-2 text-sm text-gray-700 leading-relaxed">{children}</div>
    </section>
  )
}

function Exemple({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 text-violet-900">
      <span className="font-semibold">Exemple :</span> {children}
    </p>
  )
}

export default function AidePage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-violet-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Mode d&apos;emploi</h1>
      </div>

      <p className="text-gray-600 text-sm">
        Ce guide t&apos;explique le chemin normal. La première configuration se fait en 4 étapes ;
        tu peux ensuite retrouver tes réglages dans <strong>⚙️ Paramètres</strong>.
      </p>

      <Bloc titre="📖 1. La méthode et sa progression">
        <p>Dépose le PDF utile de ta méthode, son sommaire, un planning de période ou une
          programmation annuelle. Tu peux aussi coller directement le texte du document.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>L&apos;IA reconnaît automatiquement le type de document.</li>
          <li>Elle répartit le contenu semaine par semaine et affiche un aperçu modifiable.</li>
          <li>Si elle reconnaît un planning de période, tu choisis seulement la période où le placer.</li>
        </ul>
        <Exemple>tu déposes le sommaire de Taoki, l&apos;IA reconnaît un manuel et prépare les sons, pages et mots de chaque semaine.</Exemple>
        <p className="text-gray-500">Envoie seulement les pages utiles de programmation. Tu pourras corriger
          l&apos;aperçu avant de l&apos;enregistrer.</p>
      </Bloc>

      <Bloc titre="📅 2. La date de rentrée">
        <p>Indique le <strong>premier jour de classe</strong> de l&apos;année. L&apos;outil calcule
          automatiquement les dates des 36 semaines à partir de cette date.</p>
        <p>Choisis aussi ta <strong>zone scolaire</strong>. L&apos;application crée P1 à P5
          avec le calendrier officiel et saute les semaines de vacances.</p>
        <Exemple>zone A, rentrée le 1er septembre 2026 : P2 commence à la reprise du 2 novembre.</Exemple>
        <p className="text-gray-500">Si tu la modifies plus tard, les dates se recalculent sans
          effacer ton suivi ni tes cahiers journaux.</p>
      </Bloc>

      <Bloc titre="👧 3. Les élèves">
        <p>Tape <strong>un prénom</strong> dans le champ, puis appuie sur <strong>Entrée</strong>
          (ou le bouton <strong>Ajouter</strong>). Répète pour chaque élève.</p>
        <p>Pour retirer un élève, clique sur le <strong>×</strong> à côté de son prénom.</p>
        <Exemple>Lina, puis Entrée — Tom, puis Entrée — Aya, puis Entrée…</Exemple>
        <p className="text-gray-500">Un seul prénom à la fois. Évite deux élèves avec exactement le
          même prénom : ajoutez une initiale (ex : <code>Tom B</code>, <code>Tom L</code>).</p>
      </Bloc>

      <Bloc titre="🕐 4. L'emploi du temps">
        <p>Choisis l&apos;emploi du temps type ou une grille vide. Dans la grille :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>clique sur une case pour choisir la matière ;</li>
          <li>utilise le crayon pour changer ses horaires, ses couleurs ou son style ;</li>
          <li>ouvre les trois points de la colonne horaire pour gérer toute la tranche.</li>
        </ul>
        <p>Le bouton <strong>+ Ajouter une tranche horaire</strong> complète la journée si nécessaire.</p>
        <Exemple>clique sur la case du lundi à 09:00, puis choisis Lecture.</Exemple>
        <p className="text-gray-500">Cet emploi du temps sert à pré-remplir automatiquement les
          cahiers journaux.</p>
      </Bloc>

      <Bloc titre="📅 Lire le planning annuel">
        <p>Le planning montre les 36 semaines regroupées par période. Cliquez sur une semaine pour
          ouvrir sa fiche détaillée (lecture, explorer le monde, suivi, cahier journal).</p>
      </Bloc>

      <Bloc titre="✅ Le suivi des élèves">
        <p>Dans une semaine, clique sur l&apos;<strong>étoile</strong> quand un élève a
          <strong> acquis</strong> le graphème correspondant (★ = acquis, ☆ = pas encore).
          La sauvegarde est automatique. Quand un élève a tout acquis, une petite animation 🎉 apparaît !</p>
      </Bloc>

      <Bloc titre="📋 Le cahier journal">
        <p>Clique sur <strong>Générer le cahier journal</strong> : il se remplit à partir de ton
          emploi du temps. Tu peux ensuite modifier chaque ligne
          (<strong>objectif</strong>, <strong>activité</strong>, <strong>matériel</strong>). Tout se sauvegarde
          automatiquement.</p>
        <p>Boutons disponibles : <strong>📄 Word</strong> (télécharger un document modifiable) et
          <strong> 🖨️ PDF</strong> (imprimer le journal).</p>
      </Bloc>

      <Bloc titre="🖨️ Imprimer">
        <p>Un bouton <strong>🖨️</strong> est disponible sur le planning, sur la fiche d&apos;une semaine,
          sur le suivi des élèves et sur le cahier journal. Il ouvre l&apos;aperçu d&apos;impression de
          ton navigateur (tu peux aussi y choisir « Enregistrer en PDF »).</p>
      </Bloc>

      <Bloc titre="⚙️ Modifier mes réglages">
        <p>La page <strong>Paramètres</strong> permet de changer à tout moment vos élèves, l&apos;emploi
          du temps, la date de rentrée et le manuel.</p>
        <p className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
          ⚠️ <strong>Changer de manuel</strong> régénère toute la progression et efface le suivi des élèves
          ainsi que les cahiers journaux déjà remplis. Une confirmation t&apos;est demandée.
        </p>
        <p>Tout en bas de la page Paramètres, <strong>🗑️ Repartir de zéro</strong> efface entièrement la
          configuration et relance l&apos;assistant — pratique pour refaire une installation propre.</p>
      </Bloc>
    </div>
  )
}
