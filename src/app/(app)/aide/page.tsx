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
    <p className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-indigo-900">
      <span className="font-semibold">Exemple :</span> {children}
    </p>
  )
}

export default function AidePage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/planning" className="text-indigo-600 hover:underline text-sm">← Planning</Link>
        <h1 className="text-xl font-bold text-gray-800">Mode d&apos;emploi</h1>
      </div>

      <p className="text-gray-600 text-sm">
        Ce guide explique comment remplir chaque champ. La première configuration se fait en 4 étapes ;
        vous pouvez tout modifier ensuite dans <strong>⚙️ Paramètres</strong>.
      </p>

      <Bloc titre="📖 1. Le manuel de lecture">
        <p>Choisissez votre manuel dans la liste proposée. Sa progression annuelle (les graphèmes
          semaine par semaine) est déjà prête.</p>
        <p>Si votre manuel n&apos;est pas dans la liste, cliquez sur
          <strong> « Mon manuel n&apos;est pas dans la liste »</strong> pour importer votre progression :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>PDF</strong> : importez le PDF numérique du manuel (texte sélectionnable, pas un scan).
            La détection est automatique mais approximative — vérifiez ensuite dans le planning.</li>
          <li><strong>CSV</strong> : téléchargez le modèle, remplissez-le dans un tableur (Excel, LibreOffice),
            puis importez-le.</li>
        </ul>
        <p className="font-semibold text-gray-800 pt-1">Comment remplir le modèle CSV :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>semaine</strong> : le numéro (1 à 36), déjà rempli.</li>
          <li><strong>graphemes</strong> : les sons étudiés cette semaine-là, <strong>séparés par un espace</strong>.</li>
          <li><strong>pages</strong> : les pages du manuel (facultatif).</li>
          <li><strong>mots_exemple</strong> : des mots, <strong>séparés par un espace</strong> (facultatif).</li>
        </ul>
        <Exemple>ligne semaine 3 → graphemes : <code>an am en em</code> · mots_exemple : <code>enfant dent</code></Exemple>
        <p className="text-gray-500">À ne pas faire : mettre des virgules entre les graphèmes
          (écrivez <code>an am</code>, pas <code>an, am</code>).</p>
      </Bloc>

      <Bloc titre="📅 2. La date de rentrée">
        <p>Indiquez le <strong>premier jour de classe</strong> de l&apos;année. L&apos;outil calcule
          automatiquement les dates des 36 semaines à partir de cette date.</p>
        <Exemple>rentrée le 1er septembre 2025 → semaine 1 = 1er septembre, semaine 2 = 8 septembre, etc.</Exemple>
        <p className="text-gray-500">Si vous la modifiez plus tard, les dates se recalculent sans
          effacer votre suivi ni vos cahiers journaux.</p>
      </Bloc>

      <Bloc titre="👧 3. Les élèves">
        <p>Tapez <strong>un prénom</strong> dans le champ, puis appuyez sur <strong>Entrée</strong>
          (ou le bouton <strong>Ajouter</strong>). Répétez pour chaque élève.</p>
        <p>Pour retirer un élève, cliquez sur le <strong>×</strong> à côté de son prénom.</p>
        <Exemple>Lina, puis Entrée — Tom, puis Entrée — Aya, puis Entrée…</Exemple>
        <p className="text-gray-500">Un seul prénom à la fois. Évitez deux élèves avec exactement le
          même prénom : ajoutez une initiale (ex : <code>Tom B</code>, <code>Tom L</code>).</p>
      </Bloc>

      <Bloc titre="🕐 4. L'emploi du temps">
        <p>Ajoutez vos créneaux un par un. Pour chaque créneau :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Jour</strong> : lundi à vendredi.</li>
          <li><strong>Heure de début</strong> et <strong>heure de fin</strong>.</li>
          <li><strong>Matière</strong> : choisissez dans la liste.</li>
        </ul>
        <p>Puis cliquez sur <strong>+ Ajouter ce créneau</strong>. Recommencez pour toute la semaine.</p>
        <Exemple>lundi · 09:00 → 09:45 · Lecture, puis lundi · 09:45 → 10:15 · Écriture…</Exemple>
        <p className="text-gray-500">Cet emploi du temps sert à pré-remplir automatiquement les
          cahiers journaux.</p>
      </Bloc>

      <Bloc titre="📅 Lire le planning annuel">
        <p>Le planning montre les 36 semaines regroupées par période. Cliquez sur une semaine pour
          ouvrir sa fiche détaillée (lecture, explorer le monde, suivi, cahier journal).</p>
      </Bloc>

      <Bloc titre="✅ Le suivi des élèves">
        <p>Dans une semaine, cliquez sur l&apos;<strong>étoile</strong> quand un élève a
          <strong> acquis</strong> le graphème correspondant (★ = acquis, ☆ = pas encore).
          La sauvegarde est automatique. Quand un élève a tout acquis, une petite animation 🎉 apparaît !</p>
      </Bloc>

      <Bloc titre="📋 Le cahier journal">
        <p>Cliquez sur <strong>Générer le cahier journal</strong> : il se remplit à partir de votre
          emploi du temps. Vous pouvez ensuite modifier chaque ligne
          (<strong>objectif</strong>, <strong>activité</strong>, <strong>matériel</strong>). Tout se sauvegarde
          automatiquement.</p>
        <p>Boutons disponibles : <strong>📄 Word</strong> (télécharger un document modifiable) et
          <strong> 🖨️ PDF</strong> (imprimer le journal).</p>
      </Bloc>

      <Bloc titre="🖨️ Imprimer">
        <p>Un bouton <strong>🖨️</strong> est disponible sur le planning, sur la fiche d&apos;une semaine,
          sur le suivi des élèves et sur le cahier journal. Il ouvre l&apos;aperçu d&apos;impression de
          votre navigateur (vous pouvez aussi y choisir « Enregistrer en PDF »).</p>
      </Bloc>

      <Bloc titre="⚙️ Modifier mes réglages">
        <p>La page <strong>Paramètres</strong> permet de changer à tout moment vos élèves, l&apos;emploi
          du temps, la date de rentrée et le manuel.</p>
        <p className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
          ⚠️ <strong>Changer de manuel</strong> régénère toute la progression et efface le suivi des élèves
          ainsi que les cahiers journaux déjà remplis. Une confirmation vous est demandée.
        </p>
        <p>Tout en bas de la page Paramètres, <strong>🗑️ Repartir de zéro</strong> efface entièrement la
          configuration et relance l&apos;assistant — pratique pour refaire une installation propre.</p>
      </Bloc>
    </div>
  )
}
