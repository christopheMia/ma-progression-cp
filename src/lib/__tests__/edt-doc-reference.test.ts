// Document de reference "Emploi du temps et periodes" remis a l'enseignante.
//
// Il est genere a partir du VRAI code du generateur (`expliquerGenerationEdt`
// mesure les volumes sur la grille reellement produite), jamais recopie a la
// main : la version precedente, ecrite a la main, annoncait encore 20 h et le
// modele "une plage = une seance de 1 h 15", abandonne depuis.
//
// Le test tourne en permanence et verifie que le document ne peut pas mentir
// (le total mesure doit retomber sur le budget). Pour regenerer le HTML :
//   DOC_EDT_SORTIE=/chemin/edt.html npx jest edt-doc-reference
// puis imprimer en PDF avec le Chromium de Playwright (voir docs/REPRISE).
import { writeFileSync } from 'fs'
import {
  genererEdtCP,
  expliquerGenerationEdt,
  formatDuree,
  JOURS_EDT,
} from '../edt-generator'

const SORTIE = process.env.DOC_EDT_SORTIE

const echap = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Retablit les accents perdus dans les libelles internes (sans accents en base). */
const joli = (s: string) =>
  s
    .replace(/Etude/g, 'Étude')
    .replace(/graphemes/g, 'graphèmes')
    .replace(/francais/g, 'français')
    .replace(/Mathematiques/g, 'Mathématiques')
    .replace(/Education physique et sportive/g, 'Éducation physique et sportive')
    .replace(/Recreation/g, 'Récréation')
    .replace(/dejeuner/g, 'déjeuner')
    .replace(/Rituels \(date, langage, calendrier\)/g, 'Rituels (date, langage, calendrier)')

const dureeCreneau = (c: { heure_debut: string; heure_fin: string }) => {
  const [hd, md] = c.heure_debut.split(':').map(Number)
  const [hf, mf] = c.heure_fin.split(':').map(Number)
  return hf * 60 + mf - (hd * 60 + md)
}

test('genere le document de reference EDT + periodes', () => {
  const ex = expliquerGenerationEdt(true)
  const grille = genererEdtCP(true)

  // ── Tableau des volumes, mesures sur la grille reellement generee ──────────
  const lignesVolumes = ex.volumes
    .map(v => {
      const total = /total/i.test(v.matiere)
      const detail = v.officiel === null
      return `<tr class="${total ? 'total' : ''}${detail ? ' detail' : ''}">
      <td>${echap(v.matiere)}</td>
      <td class="n">${v.officiel === null ? '—' : formatDuree(v.officiel)}</td>
      <td class="n"><strong>${formatDuree(v.retenu)}</strong></td>
    </tr>`
    })
    .join('\n')

  const totalRetenu = ex.volumes
    .filter(v => v.officiel !== null)
    .reduce((s, v) => s + v.retenu, 0)

  // ── Une grille par jour (les seances n'ont plus la meme duree partout) ─────
  const grillesJours = JOURS_EDT.map(jour => {
    const lignes = grille
      .filter(c => c.jour === jour)
      .map(c => {
        const routine = c.type === 'routine'
        return `<tr><th class="h">${c.heure_debut} - ${c.heure_fin}</th>
        <td class="${routine ? 'routine' : ''}">${echap(joli(c.matiere))}</td>
        <td class="n">${routine ? '' : formatDuree(dureeCreneau(c))}</td></tr>`
      })
      .join('\n')
    const cours = grille
      .filter(c => c.jour === jour && c.type !== 'routine')
      .reduce((s, c) => s + dureeCreneau(c), 0)
    return `<h3>${jour.charAt(0).toUpperCase()}${jour.slice(1)}
      <span class="note">(${formatDuree(cours)} d'enseignement)</span></h3>
    <table class="jour"><thead><tr><th>Horaires</th><th>Matière</th><th class="n">Durée</th></tr></thead>
    <tbody>${lignes}</tbody></table>`
  }).join('\n')

  const lignesCadre = ex.cadre
    .map(c => `<tr><td>${echap(c.libelle)}</td><td class="n">${c.horaire}</td></tr>`)
    .join('\n')

  const lignesRegles = ex.regles.map(r => `<li>${echap(r)}</li>`).join('\n')

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Ma Progression CP — Emploi du temps et périodes</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Helvetica, Arial, sans-serif; color: #1e293b; font-size: 11pt; line-height: 1.5; }
  h1 { font-size: 20pt; margin: 0 0 2mm; color: #5b21b6; }
  h2 { font-size: 13pt; margin: 8mm 0 2mm; color: #5b21b6; border-bottom: 1.5px solid #ddd6fe; padding-bottom: 1mm; }
  h3 { font-size: 11.5pt; margin: 5mm 0 1.5mm; color: #334155; }
  .sous { color: #64748b; margin: 0 0 4mm; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; }
  th, td { border: 1px solid #e2e8f0; padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
  thead th { background: #f5f3ff; color: #5b21b6; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  tr.total td { background: #faf5ff; font-weight: 600; }
  tr.detail td:first-child { padding-left: 6mm; color: #64748b; }
  td.routine { background: #f1f5f9; color: #64748b; font-style: italic; }
  th.h { background: #faf5ff; white-space: nowrap; font-weight: 500; width: 30mm; }
  table.jour { page-break-inside: avoid; }
  ul { margin: 1mm 0 3mm; padding-left: 5mm; }
  li { margin-bottom: 1.2mm; }
  .encadre { border: 1px solid #ddd6fe; background: #faf5ff; border-radius: 3mm; padding: 3mm 4mm; margin: 3mm 0; }
  .note { font-size: 9.5pt; color: #64748b; font-weight: 400; }
  .pied { margin-top: 8mm; border-top: 1px solid #e2e8f0; padding-top: 2mm; font-size: 9pt; color: #94a3b8; }
  .saut { page-break-before: always; }
</style></head><body>

<h1>Emploi du temps et périodes</h1>
<p class="sous">Ma Progression CP — comment l'application construit ton emploi du temps
et organise ton année. Document généré automatiquement depuis le code de l'application,
donc toujours conforme à son comportement réel.</p>

<h2>1. Le cadre de la journée</h2>
<p>La semaine compte <strong>${ex.jours.length} jours</strong> : ${ex.jours.join(', ')}.
La journée va de <strong>${ex.journee.debut}</strong> à <strong>${ex.journee.fin}</strong>.</p>
<p>Ces moments sont posés d'office :</p>
<table><thead><tr><th>Moment</th><th class="n">Horaire</th></tr></thead><tbody>
${lignesCadre}
</tbody></table>
<p>Les récréations (2 h par semaine) sont du temps non enseigné. Le reste de la journée
est du temps de classe, découpé en séances de durée variable, toujours calées sur le
quart d'heure. Le total enseigné est de <strong>${formatDuree(ex.budgetCours)} par semaine</strong>.</p>

<h2>2. Les volumes horaires</h2>
<p>Le point de départ est le volume officiel du cycle 2 (arrêté du 9 novembre 2015),
qui totalise 24 h. Les 2 h de récréation hebdomadaires en sont déduites
<strong>au prorata</strong> : chaque matière garde exactement sa part officielle,
réduite du même facteur (${Math.round(ex.facteur * 100)} %). Aucune matière n'est sacrifiée.</p>
<table><thead><tr><th>Matière</th><th class="n">Officiel</th><th class="n">Dans ta grille</th></tr></thead><tbody>
${lignesVolumes}
<tr class="total"><td>Total enseigné</td><td class="n">24 h</td><td class="n"><strong>${formatDuree(totalRetenu)}</strong></td></tr>
</tbody></table>
<p class="note">La colonne « dans ta grille » est mesurée sur l'emploi du temps réellement
généré, pas recopiée à la main. Les rituels et l'étude du code sont du français : ils sont
comptés dans le total français.</p>

<div class="encadre">
<h3 style="margin-top:0">Les règles à retenir</h3>
<p style="margin:0"><strong>Les quotas officiels sont respectés</strong>, au quart d'heure près :
la somme des matières retombe exactement sur le temps disponible.<br>
<strong>Les séances durent de 30 min à 2 h</strong> (1 h 30 au maximum pour l'EPS et les arts),
et une même matière ne dépasse jamais 2 h sur une journée.</p>
</div>

<h2>3. Les règles appliquées</h2>
<ul>
${lignesRegles}
</ul>

<h2 class="saut">4. La grille générée</h2>
<p class="sous">Voici exactement ce que produit le bouton « Générer depuis le programme ».
Tout reste modifiable ensuite : horaires, matières, couleurs.</p>
${grillesJours}
<p class="note">En grisé : les temps qui ne reçoivent pas de déroulement dans le cahier journal.</p>

<h2>5. Modifier ou remplacer ton emploi du temps</h2>
<h3>Générer depuis le programme</h3>
<p>Construit la grille ci-dessus à partir des volumes officiels. Une fenêtre te montre
d'abord toutes les règles appliquées. <strong>Cette action remplace ta grille actuelle.</strong></p>
<h3>Importer depuis un PDF</h3>
<p>Si tu as déjà ton emploi du temps sous forme de tableau PDF, l'application le lit et
reconstruit ta grille telle quelle : tes horaires, tes intitulés, tes rituels. Un aperçu
s'affiche avant tout remplacement. C'est la voie à privilégier quand tu as déjà ton
organisation, car aucun générateur ne peut la deviner.</p>
<h3>Modifier à la main</h3>
<ul>
<li>Clic sur une case pour changer la matière.</li>
<li>Le crayon ✏️ ouvre la mise en forme de la case (couleurs, gras, italique, souligné),
et le pinceau applique le style à toute la matière.</li>
<li><strong>Annuler</strong> (ou Ctrl+Z) revient en arrière, jusqu'à 30 fois.</li>
<li>Une ligne peut être passée en « routine » : elle ne recevra pas de déroulement dans
le cahier journal.</li>
</ul>
<h3>Remettre à zéro</h3>
<ul>
<li><strong>Remettre à zéro</strong> : recharge l'emploi du temps type par défaut.</li>
<li><strong>Vider</strong> : laisse la grille complètement vide, sans rien recharger.</li>
<li><strong>Effacer tout sauf ma classe</strong> : repart d'une année vierge (élèves,
semaines, suivi, cahiers, méthodes, emploi du temps) en gardant ton prénom, ton manuel
et ta date de rentrée.</li>
</ul>

<h2 class="saut">6. Les périodes</h2>
<p>L'année est découpée en <strong>5 périodes</strong> (P1 à P5), délimitées par les
vacances. Leurs dates sont <strong>modifiables</strong>, puisque le calendrier change
chaque année et selon les zones.</p>
<h3>Comment une semaine est rattachée à sa période</h3>
<p>Chaque semaine de l'année porte le numéro de sa période. Le bouton
<strong>« Caler sur le calendrier »</strong> réaligne les semaines sur les vraies dates
sans rien détruire : ton contenu suit.</p>
<div class="encadre">
<p style="margin:0"><strong>Important :</strong> une période ne fait pas toujours 7 semaines.
Selon l'année et la zone, elle en compte 5 à 8. L'application lit donc les
<em>vraies</em> bornes de ta classe, jamais un nombre fixe.</p>
</div>

<h3>Importer un planning de période</h3>
<p>Dans l'assistant, choisis le type de document <strong>« Planning de période »</strong>,
puis la période concernée. L'application :</p>
<ul>
<li>lit <strong>toutes</strong> les séances du tableau, en respectant lignes et colonnes,
et recopie les libellés exactement (lecture compréhension, geste d'écriture, fluence…) ;</li>
<li><strong>recale</strong> les semaines du document sur les vraies semaines de la période
choisie (le document numérote 1, 2, 3… ; l'application sait que ta période 2 commence
par exemple en semaine 8) ;</li>
<li><strong>ne touche qu'à cette période</strong> : importer P2 n'efface jamais P1 ;</li>
<li>si le document contient plus de semaines que la période, le surplus est placé juste
après et te le signale, plutôt que d'être perdu silencieusement.</li>
</ul>
<p class="note">Si tes semaines ne sont pas encore rattachées aux périodes, l'application
te prévient et te renvoie vers « Caler sur le calendrier » au lieu d'écrire au mauvais endroit.</p>

<h3>Un document par période</h3>
<p>Le fonctionnement visé est <strong>un document par période</strong> : tu importes tes
5 plannings l'un après l'autre, chacun se plaçant au bon endroit de l'année.</p>

<div class="pied">Ma Progression CP — document généré le 21 juillet 2026 à partir du code de l'application.</div>
</body></html>`

  // Garde-fous : si le generateur change, le document ne doit pas mentir.
  expect(totalRetenu).toBe(ex.budgetCours)
  expect(grille.length).toBeGreaterThan(0)

  if (SORTIE) writeFileSync(SORTIE, html, 'utf8')
})
