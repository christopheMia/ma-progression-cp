// Génère le SQL de création de la classe de Cécile à partir des 3 PDF de docsmethodes/.
// Données : Français = Les P'tites Poules, Maths = Accès, EDT = trame CP de Cécile.
// Sortie : scripts/classe-cecile.sql  (à appliquer via Supabase MCP execute_sql).
import { writeFileSync } from 'node:fs'

const EMAIL = 'azylis69@hotmail.fr'
const RENTREE = '2026-09-01'
const PRENOM = 'Cécile'

// ── EDM (copié à l'identique de src/data/edm/progression-cp.ts) ─────────────
const EDM = [
  { theme: 'Moi', competences: "Identifier les parties du corps. Se repérer dans l'espace proche." },
  { theme: 'Moi', competences: 'Utiliser ses sens pour explorer son environnement.' },
  { theme: "L'école", competences: 'Se repérer dans un espace connu. Lire un plan simple.' },
  { theme: 'Le temps', competences: 'Ordonner des événements. Utiliser un calendrier de classe.' },
  { theme: 'Le temps', competences: 'Reconnaître les saisons. Observer les changements dans la nature.' },
  { theme: 'Le vivant', competences: 'Distinguer animaux sauvages et domestiques. Décrire leurs caractéristiques.' },
  { theme: 'Le vivant', competences: "Observer la germination. Comprendre les besoins d'une plante." },
  { theme: 'La matière', competences: 'Identifier les matériaux (bois, métal, plastique). Classer des objets.' },
  { theme: 'La matière', competences: "Observer les états de l'eau (solide, liquide). Faire des expériences simples." },
  { theme: 'La société', competences: 'Décrire sa famille. Comprendre les liens familiaux.' },
  { theme: 'La société', competences: "Comprendre l'importance des règles. Distinguer droits et devoirs." },
  { theme: "L'espace", competences: "Se repérer dans l'espace local. Utiliser des repères spatiaux." },
  { theme: 'Le vivant', competences: "Découvrir l'hibernation. Observer l'adaptation des animaux aux saisons." },
  { theme: 'Le temps', competences: 'Situer des événements dans le temps. Utiliser un axe chronologique simple.' },
  { theme: 'La matière', competences: 'Observer la formation des ombres. Comprendre que la lumière se propage en ligne droite.' },
  { theme: 'Le vivant', competences: "Identifier les aliments. Comprendre l'équilibre alimentaire." },
  { theme: 'La société', competences: 'Découvrir différents métiers. Comprendre la notion de travail.' },
  { theme: 'Le vivant', competences: "Comprendre les gestes d'hygiène. Connaître les règles de sécurité simples." },
  { theme: 'Le temps', competences: "Observer les caractéristiques de l'hiver. Comparer les saisons." },
  { theme: "L'espace", competences: 'Identifier différents types de paysages (mer, montagne, plaine). Localiser sur une carte simple.' },
  { theme: 'La société', competences: 'Découvrir les différents moyens de transport. Comprendre leur utilité.' },
  { theme: 'Le vivant', competences: 'Observer la croissance des plantes. Comprendre la photosynthèse de manière simple.' },
  { theme: 'Le temps', competences: 'Observer les changements du printemps. Reconnaître les plantes qui fleurissent.' },
  { theme: 'La matière', competences: 'Distinguer mélanges homogènes et hétérogènes. Réaliser des expériences simples.' },
  { theme: 'La société', competences: 'Découvrir les institutions de base. Comprendre les règles de la vie en commun.' },
  { theme: "L'espace", competences: 'Situer la France en Europe. Découvrir quelques pays voisins.' },
  { theme: 'Le vivant', competences: "Comprendre le cycle de vie d'un animal (oeuf → adulte). Observer des métamorphoses." },
  { theme: 'La matière', competences: 'Identifier des outils et machines simples. Comprendre leur fonctionnement de base.' },
  { theme: 'Le temps', competences: 'Comprendre que le passé laisse des traces. Observer des documents anciens.' },
  { theme: "L'espace", competences: 'Comparer la ville et la campagne. Identifier les activités humaines selon les espaces.' },
  { theme: 'Le vivant', competences: "Comprendre l'importance de protéger l'environnement. Découvrir les gestes éco-responsables." },
  { theme: 'Le temps', competences: "Reconnaître les caractéristiques de l'été. Faire le bilan des 4 saisons." },
  { theme: 'La société', competences: 'Découvrir les fêtes du calendrier. Comprendre les traditions culturelles.' },
  { theme: 'La matière', competences: "Comprendre que l'air existe et a des propriétés. Faire des expériences avec l'air." },
  { theme: 'Révision', competences: 'Réviser les notions sur le vivant : animaux, plantes, corps humain, santé.' },
  { theme: 'Révision', competences: 'Réviser les notions de repérage dans le temps et l\'espace.' },
]

// ── Français : Les P'tites Poules (extrait du sommaire) ─────────────────────
// { items: graphèmes/sons, pages, mots: mots-repères }
const FR = [
  { items: ['a', 'i', 'y', 'o', 'u'], pages: '8-9', mots: [] },
  { items: ['e', 'é', 'l'], pages: '10-11', mots: ['lit'] },
  { items: ['r', 'f'], pages: '12-13', mots: ['rat', 'fée'] },
  { items: ['j', 'ou'], pages: '14-15', mots: ['jars', 'loup'] },
  { items: ['v', 'ch'], pages: '18-19', mots: ['vol', 'chat'] },
  { items: ['e', 's', 't', 'h'], pages: '20-25', mots: ['lettres muettes'] },
  { items: ['p', 't'], pages: '26-27', mots: ['poule', 'tomate'] },
  { items: ['b', 'd'], pages: '28-29', mots: ['balle', 'doudou'] },
  { items: ['m', 'n'], pages: '32-33', mots: ['mouche', 'nid'] },
  { items: ['z', 's'], pages: '34-35', mots: ['zoo', 'souris'] },
  { items: ['s', 'è', 'ê'], pages: '38-39', mots: ['rose', 'sirène'] },
  { items: ['es', 'eu', 'œu'], pages: '40-41', mots: ['les', 'jeu', 'œuf'] },
  { items: ['a', 'd'], pages: '42-47', mots: ['lettres muettes'] },
  { items: ['c', 'k'], pages: '48-49', mots: ['canard', 'kimono'] },
  { items: ['q', 'qu', 'g', 'gu'], pages: '50-51', mots: ['coq', 'queue', 'goutte', 'guitare'] },
  { items: ['an', 'am', 'en', 'em'], pages: '54-55', mots: ['maman', 'vent'] },
  { items: ['on', 'om', 'in', 'im'], pages: '56-57', mots: ['mouton', 'poussin'] },
  { items: ['oi', 'oin'], pages: '60-61', mots: ['étoile', 'point'] },
  { items: ['au', 'eau'], pages: '62-63', mots: ['taupe', 'oiseau'] },
  { items: ['b', 'f', 'c'], pages: '64-69', mots: ['lettres muettes'] },
  { items: ['ai', 'ei', 'err', 'ess', 'ett', 'eil', 'enn'], pages: '70-71', mots: ['laine', 'reine', 'terre'] },
  { items: ['e', 'et'], pages: '73-74', mots: ['mer', 'poulet'] },
  { items: ['er', 'ez', 'ph'], pages: '78-79', mots: ['rocher', 'nez', 'phoque'] },
  { items: ['c', 'ç', 'sc'], pages: '81-82', mots: ['glace', 'garçon', 'piscine'] },
  { items: ['g', 'ge'], pages: '86-87', mots: ['girafe', 'pigeon'] },
  { items: ['gn', 'ain', 'ein'], pages: '89-90', mots: ['cigogne', 'copain', 'peinture'] },
  { items: ['g', 'l', 'p'], pages: '92-97', mots: ['lettres muettes'] },
  { items: ['ier', 'ieu', 'ion', 'ian', 'ien'], pages: '98-99', mots: ['cahier', 'chien'] },
  { items: ['x', 'ti'], pages: '104-105', mots: ['xylophone', 'addition'] },
  { items: ['y', 'ay', 'oy', 'ey', 'uy'], pages: '112-113', mots: ['yaourt', 'crayon'] },
  { items: ['ill', 'ail', 'eil', 'euil', 'ouil'], pages: '118-119', mots: ['coquille', 'soleil'] },
  { items: ['w'], pages: '126-127', mots: ['kiwi'] },
  { items: [], pages: '132-135', mots: ['cas particuliers'] },
  { items: [], pages: '', mots: ['révision'] },
  { items: [], pages: '', mots: ['révision'] },
  { items: [], pages: '', mots: ['révision'] },
]

// ── Maths : Accès (programmation par période, répartie sur les semaines) ────
const MA = [
  ['Nombres jusqu’à 10', 'Repérage dans l’espace'],
  ['Décomposer 4 et 5', 'Tables d’addition : les suivants'],
  ['Nombres ordinaux', 'Les doubles'],
  ['Groupements par 5 et par 10', 'Les presque doubles'],
  ['Tables d’addition : sommes inférieures à 10', 'Ajouter ou soustraire 2'],
  ['Problèmes additifs en une étape', 'Égalisation, parties-tout, transformation'],
  ['Problèmes ouverts', 'Révision période 1'],
  ['Représentations d’un même nombre', 'Ajouter ou soustraire 10'],
  ['Nombres entiers jusqu’à 59', 'Ajouter ou soustraire 1 ou 2'],
  ['Compléments à 10', 'Monnaie'],
  ['Comparaison de nombres jusqu’à 99', 'Soustraire un nombre à 10'],
  ['Nombres entiers jusqu’à 79', 'Doubles des nombres de 1 à 10'],
  ['Écriture chiffrée des nombres jusqu’à 99', 'Doubles des dizaines entières'],
  ['Tables d’addition : le passage par 10', 'Solides', 'Problèmes additifs (parties-tout, transformation)'],
  ['Nombres entiers jusqu’à 100', 'Complément à la dizaine supérieure'],
  ['Tableau des nombres jusqu’à 100', 'Ajouter un nombre inférieur à 9'],
  ['Comparaison de longueurs', 'Moitié d’un nombre pair de 2 à 20'],
  ['Mesure de longueurs par report de l’unité', 'Ajouter ou soustraire 10'],
  ['Unité de mesure : le centimètre', 'Ajouter ou soustraire 20, 30, … 90'],
  ['Repérage sur un quadrillage', 'Ajouter deux nombres inférieurs à 100'],
  ['Problèmes multiplicatifs (recherche du tout, du nombre de parts)', 'Problèmes additifs (transformation)'],
  ['Problèmes ouverts', 'Révision période 3'],
  ['Écriture en lettres des nombres jusqu’à 59', 'Additions et soustractions avec le matériel de numération'],
  ['Nombres ordinaux', 'Calcul posé : addition'],
  ['Ajouter deux nombres inférieurs à 100', 'Ajouter 9'],
  ['Soustraire un nombre < 10 à un nombre entier de dizaines', 'Unité de mesure : le mètre'],
  ['Tables d’addition : presque doubles, passage par 10', 'Formes planes'],
  ['Moitié d’un nombre pair', 'Tracés à la règle et alignements'],
  ['Problèmes additifs en deux étapes', 'Problèmes multiplicatifs (valeur d’une part)', 'Déplacements sur un quadrillage'],
  ['Révision : ajouter deux nombres < 100', 'Lecture de l’heure'],
  ['Révision : ajouter ou soustraire 20 à 90', 'Comparaison d’objets selon leur masse'],
  ['Révision : tables d’addition', 'Formes planes'],
  ['Ajouter un nombre inférieur à 9', 'Assemblage de figures planes'],
  ['Moitié d’un nombre pair', 'Tableaux et diagrammes en barres'],
  ['Méli-mélo de calculs', 'Tableaux à double entrée'],
  ['Codage du déplacement d’un robot', 'Problèmes ouverts — types variés', 'Révision période 5'],
]

// ── EDT : trame CP (copie de src/data/trame-edt.ts) ─────────────────────────
function couleurMatiere(m) {
  m = m.toLowerCase()
  if (m.includes('graphème') || m.includes('graphe') || m.includes('écriture') || m.includes('ecriture') ||
      m.includes('phono') || m.includes('vocabulaire') || m.includes('lecture-écriture') || m.includes('lecture-ecriture')) return '#dbeafe'
  if (m.includes('math') || m.includes('calcul')) return '#fbcfe8'
  if (m.includes('arts')) return '#ddd6fe'
  if (m.includes('anglais')) return '#fed7aa'
  if (m.includes('eps')) return '#fef08a'
  return null
}
const JOURS = ['lundi', 'mardi', 'jeudi', 'vendredi']
const LIGNES = [
  { d: '08:20', f: '08:30', t: 'routine', c: 'Accueil dans la cour' },
  { d: '08:30', f: '08:45', t: 'routine', c: 'Rituels du jour, appel…' },
  { d: '08:45', f: '09:15', t: 'cours', c: 'Appropriation des graphèmes' },
  { d: '09:15', f: '09:45', t: 'cours', p: ['Écriture', 'Phonologie', 'Écriture', 'Phonologie'] },
  { d: '09:45', f: '10:00', t: 'cours', p: ['Vocabulaire', 'Lecture-écriture', 'Vocabulaire', 'Lecture-écriture'] },
  { d: '10:00', f: '10:15', t: 'routine', c: 'Récréation' },
  { d: '10:15', f: '10:30', t: 'cours', c: 'Calcul mental' },
  { d: '10:30', f: '11:30', t: 'cours', c: 'Mathématiques' },
  { d: '11:30', f: '13:20', t: 'routine', c: 'Pause déjeuner / APC' },
  { d: '13:20', f: '13:30', t: 'routine', c: 'Accueil dans la cour' },
  { d: '13:30', f: '13:45', t: 'cours', c: 'Chut je lis' },
  { d: '13:45', f: '14:15', t: 'cours', p: ['Lecture compréhension', "Production d'écrits", 'Lecture compréhension', "Production d'écrits"] },
  { d: '14:15', f: '14:45', t: 'cours', p: ['Histoire géographie', 'Arts visuels', 'Sciences et technologie', 'Anglais'] },
  { d: '14:45', f: '15:00', t: 'cours', p: ['Écriture', 'Vocabulaire', 'Écriture', 'Vocabulaire'] },
  { d: '15:00', f: '15:15', t: 'routine', c: 'Récréation' },
  { d: '15:15', f: '15:45', t: 'cours', p: ['EPS', 'Anglais', 'EPS', 'Arts visuels'] },
  { d: '15:45', f: '16:15', t: 'cours', p: ['EPS', 'EMC', 'EPS', 'EMC'] },
  { d: '16:15', f: '16:30', t: 'routine', p: ['Bilan de la journée, devoirs, cartable', 'Bilan de la journée, cartable', 'Bilan de la journée, cartable', 'Bilan de la journée, cartable'] },
]
const EDT = []
let ordre = 0
for (const l of LIGNES) {
  JOURS.forEach((jour, i) => {
    const matiere = l.c ?? l.p[i]
    EDT.push({ jour, hd: l.d, hf: l.f, matiere, type: l.t, couleur: l.t === 'routine' ? '#f3f4f6' : couleurMatiere(matiere), ordre: ordre++ })
  })
}

// ── Helpers SQL ─────────────────────────────────────────────────────────────
const q = s => `'${String(s).replace(/'/g, "''")}'`
const arr = a => a.length ? `array[${a.map(q).join(',')}]` : `'{}'::text[]`
const arrN = a => (a && a.length) ? `array[${a.map(q).join(',')}]` : 'null'

let sql = `-- Création de la classe de Cécile (généré depuis docsmethodes/).
do $$
declare
  v_user uuid;
  v_class uuid;
begin
  select id into v_user from auth.users where email = ${q(EMAIL)};
  if v_user is null then raise exception 'Utilisateur % introuvable', ${q(EMAIL)}; end if;

  -- Non destructif : on n'écrit QUE si aucune classe n'existe encore pour ce compte.
  if exists (select 1 from classes where user_id = v_user) then
    raise notice 'Une classe existe deja pour ce compte : aucune insertion.';
    return;
  end if;

  insert into classes (user_id, manuel_id, rentree_date, prenom_enseignant)
    values (v_user, 'custom', ${q(RENTREE)}, ${q(PRENOM)})
    returning id into v_class;

  -- ── semaines (36) ──
  insert into semaines (class_id, numero, date_debut, graphemes, edm_theme, edm_competences, manuel_pages, mots_exemple, note) values
`
sql += FR.map((s, i) => {
  const date = `(${q(RENTREE)}::date + ${i * 7})`
  const pages = s.pages ? q(s.pages) : 'null'
  return `    (v_class, ${i + 1}, ${date}, ${arr(s.items)}, ${q(EDM[i].theme)}, ${q(EDM[i].competences)}, ${pages}, ${arrN(s.mots)}, null)`
}).join(',\n') + ';\n\n'

// ── progression français ──
sql += `  insert into progression (class_id, matiere, numero, items, pages, mots_exemple) values\n`
sql += FR.map((s, i) =>
  `    (v_class, 'francais', ${i + 1}, ${arr(s.items)}, ${s.pages ? q(s.pages) : 'null'}, ${arrN(s.mots)})`
).join(',\n') + ';\n\n'

// ── progression maths ──
sql += `  insert into progression (class_id, matiere, numero, items, pages, mots_exemple) values\n`
sql += MA.map((items, i) =>
  `    (v_class, 'maths', ${i + 1}, ${arr(items)}, null, null)`
).join(',\n') + ';\n\n'

// ── emploi du temps ──
sql += `  insert into emploi_du_temps (class_id, jour, heure_debut, heure_fin, matiere, ordre, couleur, type) values\n`
sql += EDT.map(c =>
  `    (v_class, ${q(c.jour)}, ${q(c.hd)}, ${q(c.hf)}, ${q(c.matiere)}, ${c.ordre}, ${c.couleur ? q(c.couleur) : 'null'}, ${q(c.type)})`
).join(',\n') + ';\n\n'

sql += `  raise notice 'Classe creee : %', v_class;\nend $$;\n`

writeFileSync(new URL('./classe-cecile.sql', import.meta.url), sql)
console.log('OK — scripts/classe-cecile.sql écrit (' + sql.length + ' octets)')
console.log('Semaines:', FR.length, '| Progression FR:', FR.length, '| Maths:', MA.length, '| EDT:', EDT.length)
