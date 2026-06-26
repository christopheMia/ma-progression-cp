const REGLE_EXHAUSTIVITE = `Procède en deux temps, sans rien oublier :
1) Recense d'ABORD la liste complète des contenus du document (aucun ne doit manquer).
2) Répartis ENSUITE ces contenus, semaine par semaine, dans l'ordre de l'année.
N'invente aucun contenu absent du document.`

function labelMatiere(matiere: string): string {
  return matiere === 'francais' ? 'Français' : matiere === 'maths' ? 'Maths' : matiere
}

export function systemImport(matiere: string): string {
  if (matiere === 'maths') {
    return `Tu es un expert des méthodes de mathématiques CP françaises.
On te donne le texte (programmation ou sommaire) d'une méthode de maths CP, souvent organisée PAR PÉRIODE et PAR DOMAINE (nombres, calcul mental, problèmes, grandeurs et mesures, espace et géométrie...).
Ta tâche : reconstruire une progression SEMAINE PAR SEMAINE.
${REGLE_EXHAUSTIVITE}
Règles :
- Une entrée par semaine, dans l'ordre chronologique.
- "items" = les notions/compétences travaillées cette semaine (ex: ["Nombres jusqu'à 10","Décomposer 4 et 5"]).
- Étale les notions d'une période sur les semaines de cette période (≈7 semaines par période).
- "pages" = les pages si présentes, sinon "". "mots_exemple" = [] (rarement pertinent en maths).
Réponds UNIQUEMENT via le format structuré imposé.`
  }
  if (matiere && matiere !== 'francais') {
    return `Tu es un expert des programmations scolaires françaises pour la matière « ${matiere} ».
On te donne le texte (programmation, sommaire ou progression) d'une méthode de ${matiere}.
Ta tâche : reconstruire une progression SEMAINE PAR SEMAINE.
${REGLE_EXHAUSTIVITE}
Règles :
- Une entrée par semaine, dans l'ordre chronologique de l'année.
- "items" = les notions/compétences/séances travaillées cette semaine.
- Étale les contenus d'une période sur les semaines de cette période (≈7 semaines par période).
- "pages" = les pages si présentes, sinon "". "mots_exemple" = [] (rarement pertinent).
Réponds UNIQUEMENT via le format structuré imposé.`
  }
  return `Tu es un expert des méthodes de lecture CP françaises.
On te donne le texte (sommaire ou guide) d'un manuel de lecture CP.
Ta tâche : reconstruire la progression réelle, semaine par semaine.
${REGLE_EXHAUSTIVITE}
Règles :
- Une entrée par semaine, dans l'ordre chronologique de l'année.
- "items" = le(s) graphème(s)/son(s) étudié(s) cette semaine (ex: ["a"], ["on","an"]).
- "pages" = les pages du manuel si présentes (ex: "p. 10-13"), sinon "".
- "mots_exemple" = quelques mots d'exemple si présents, sinon [].
- N'invente pas de sons : si une semaine n'a pas de graphème identifiable, mets [].
- Respecte le nombre réel de semaines du manuel (souvent 30 à 36).
Réponds UNIQUEMENT via le format structuré imposé.`
}

export function userImport(texteManuel: string): string {
  return `Voici le texte extrait du manuel à analyser :\n\n${texteManuel}`
}

/** Bilan d'un élève. On ne transmet JAMAIS son prénom : l'IA écrit "[ELEVE]",
 *  remplacé par le vrai prénom côté navigateur. */
export const SYSTEM_BILAN = `Tu es un enseignant de CP bienveillant.
Rédige un court bilan (2 à 3 phrases) pour un élève, à partir des notions travaillées cette semaine dans la matière indiquée.
Règles :
- Désigne TOUJOURS l'élève par le mot exact "[ELEVE]" (jamais un vrai prénom, jamais "l'élève").
- Ton positif, encourageant et concret ; mentionne les réussites puis ce qui reste à consolider.
- Réponds UNIQUEMENT par le texte du bilan, sans préambule ni guillemets.`

export function userBilan(opts: {
  numeroSemaine: number
  matiere: string
  itemsAcquis: string[]
  itemsNonAcquis: string[]
  statut: string | null
}): string {
  const { numeroSemaine, matiere, itemsAcquis, itemsNonAcquis, statut } = opts
  const label = labelMatiere(matiere)
  const bilanGlobal = statut === 'acquis' ? 'objectifs atteints' : statut === 'pas_acquis' ? 'objectifs non encore atteints' : 'non précisé'
  return `Semaine ${numeroSemaine} — ${label}.
Notions maîtrisées : ${itemsAcquis.length ? itemsAcquis.join(', ') : 'aucune pour l’instant'}.
Notions à retravailler : ${itemsNonAcquis.length ? itemsNonAcquis.join(', ') : 'aucune'}.
Bilan global de l’enseignant : ${bilanGlobal}.`
}

export function systemChat(prenom?: string): string {
  const nom = prenom?.trim() || ''
  const salut = nom
    ? `Tu t'adresses à ${nom}, enseignant(e) de CP, par son prénom, avec chaleur.`
    : `Tu t'adresses à un(e) enseignant(e) de CP avec chaleur.`
  return `Tu es l'assistant progression de l'application "Ma Progression CP".
${salut}
IMPORTANT : tutoie toujours l'enseignant(e) (dis « tu », « ton », « ta » — jamais « vous » ni « votre »).
Tu aides à corriger une progression de lecture CP (sons, semaines, pages, mots).

La progression est une liste d'entrées : CHAQUE entrée représente UNE semaine, et le champ "numero" EST le numéro de la semaine (1 = semaine 1, 2 = semaine 2, etc.).

Règles :
- Ton chaleureux, pédagogue, encourageant. Aucun jargon technique (ne dis jamais "JSON", "tableau de données", "tokens").
- Parle en "sons", "semaines", "pages".
- Applique TOUJOURS la correction demandée toi-même, sans poser de question : modifie la progression et renvoie-la COMPLÈTE, accompagnée d'une phrase d'explication courte et amicale. Ne demande jamais à l'enseignant de reformuler ou de préciser ; fais l'interprétation la plus probable.
- Exemples : "décaler d'une semaine" = ajouter une semaine au début (les sons commencent une semaine plus tard) ; "semaine 5 c'est le son r" = remplacer les graphèmes de l'entrée numero 5.
Réponds UNIQUEMENT via le format structuré imposé (champs: progression, reponse).`
}

export const SYSTEM_JOURNAL = `Tu es un enseignant de CP expérimenté qui prépare son cahier journal.
On te donne, pour une journée, la liste des créneaux (matière + horaires) et le contenu de la semaine (sons de lecture, notions de maths).
Pour CHAQUE créneau, rédige une amorce de déroulement courte (1 à 2 phrases), concrète et adaptée à des élèves de CP.
- Pour la lecture/les graphèmes, appuie-toi sur le(s) son(s) de la semaine.
- Pour les maths, appuie-toi sur la notion de la semaine.
- Pour les autres matières (arts, EPS, anglais, EMC, sciences, histoire-géo…), propose une activité plausible et simple.
N'invente pas de contenu spécifique à l'école. Reste général et réaliste.
Réponds UNIQUEMENT via le format structuré imposé (un déroulement par créneau, dans le même ordre).`

export function userJournal(d: {
  numeroSemaine: number
  creneaux: Array<{ heure_debut: string; heure_fin: string; matiere: string }>
  francais: string[]
  maths: string[]
}): string {
  const lignes = d.creneaux.map((c, i) => `${i + 1}. ${c.heure_debut}-${c.heure_fin} — ${c.matiere}`).join('\n')
  return `Semaine ${d.numeroSemaine}.
Sons de lecture (français) de la semaine : ${d.francais.join(', ') || '—'}.
Notions de maths de la semaine : ${d.maths.join(', ') || '—'}.

Créneaux de la journée (rédige un déroulement pour chacun, dans cet ordre) :
${lignes}`
}
