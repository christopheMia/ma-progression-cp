# 📌 REPRISE DE SESSION — Commercialisation & méthodes par matière

> Fichier de reprise écrit le **2026-06-24**. But : repartir **exactement** où on s'est arrêtés.
> Lire ce fichier en entier au début de la prochaine session.

---

## 🔴 OÙ ON EN EST EXACTEMENT (point d'arrêt)

On a lancé le **skill brainstorming** pour concevoir la fonction **« méthodes par matière »** (voir §3).

**Dernière action faite :** j'ai posé la question du **compagnon visuel** (montrer des maquettes dans le navigateur pendant la réflexion). **L'utilisateur n'a pas encore répondu.**

**➡️ PROCHAINE ÉTAPE EN REPRENANT :**
1. Demander/confirmer s'il veut le **compagnon visuel** (oui/non).
2. Puis commencer les **questions de clarification une par une** (voir §3, liste de questions préparées).
3. Suivre le flux brainstorming → design → spec dans `docs/superpowers/specs/` → writing-plans.

Les **tâches** du brainstorming sont déjà créées (TaskList #1 à #7). #1 (exploration du code) est de fait déjà fait cette session.

---

## 1. CONTEXTE GÉNÉRAL DE LA SESSION

L'utilisateur (Christophe) veut **commercialiser** l'appli « Ma Progression CP », aujourd'hui taillée pour **Cécile** (une seule maîtresse, sur son PC, avec des boutons perso Gemini/NotebookLM).

Trois grands sujets ont été traités :
- **A.** Documentation de l'appli + de l'API IA (fait → fichier `EXPLICATION-APPLI.md`).
- **B.** Recherche concurrents + stratégie business (fait, voir §2 et §4).
- **C.** Lancement de la réflexion sur la **fonction clé « méthodes par matière »** (en cours, voir §3).

### Fichier déjà produit
- **`EXPLICATION-APPLI.md`** (racine) : explique tout le fonctionnement de l'appli + l'API IA en détail + toutes les fonctions. À copier-coller pour expliquer l'appli à une IA ou un dev.

---

## 2. DÉCISIONS BUSINESS PRISES

### Modèle économique (validé)
- **Modèle abonnement (SaaS)** : **une seule clé API Anthropic** (la tienne, côté serveur), les clientes paient un abonnement, tu paies Anthropic avec leurs paiements. Les clientes ne voient jamais la clé, ne créent pas de compte Anthropic.
- **Pas de recharges à l'unité** au début → on monte de **formule** à la place.
- **Quota par cliente** (pas le plafond global actuel de 8 €). La table `ia_usage` existe déjà et permet de compter par classe/mois → à transformer en quota par cliente.

### Grille tarifaire envisagée (à affiner)
| Formule | Prix/mois | Séances IA incluses/mois |
|---|---|---|
| Découverte | gratuit | 5 |
| Classe | 4 € | 50 |
| Confort | 7 € | « illimité » avec plafond caché (~150/mois) |

### Économie (chiffres de référence donnés)
- Coût IA ≈ **2 centimes/séance** générée. ~6-10 €/an/cliente active.
- Tu gardes ≈ **80 % du prix** (≈ 3 €/mois/cliente sur la formule de base).
- Bénéfice ≈ **30 €/an/cliente payante** en moyenne.
- Échelle : 100 clientes ≈ 3 000 €/an ; 1 000 ≈ 30 000 €/an ; 2 000 (~5 % du marché des 40 000 classes de CP FR) ≈ 60 000 €/an.
- **Coûts d'infra** : domaine ~10 €/an ; Vercel gratuit puis ~20 €/mois ; Supabase gratuit puis ~25 €/mois ; Stripe ~1,5 % + 0,25 €/paiement. **Démarrage possible pour ~30 € sur l'année.**
- Règle clé : **les coûts montent seulement quand les revenus montent.**

### Paiement
- Outil = **Stripe** (standard, tu ne touches jamais les cartes). Il faut juste stocker « quelle formule » par cliente et comparer la conso (`ia_usage`) au quota.
- ⚠️ Le danger = la formule « illimité » → mettre un **plafond caché** pour rester rentable.

### Prévenir la cliente que ce n'est pas illimité (UX)
- Jauge « 18 / 50 séances ce mois-ci » (réutiliser `BudgetIaIndicator`, mais **par cliente**).
- Messages doux : « inclus dans ton abonnement », « se recharge chaque mois » — **jamais** « limité/bloqué ».
- Atteinte de la limite = **opportunité de vente** (passer à Confort).

---

## 3. ⭐ LA FONCTION À CONCEVOIR : « MÉTHODES PAR MATIÈRE » (cœur du brainstorming)

### La vision (validée avec l'utilisateur)
> La maîtresse ajoute **une méthode par matière** (lecture, maths, anglais, etc.). Pour chaque méthode, l'IA construit la progression sur 36 semaines. Ensuite **tout le reste se remplit tout seul** : les créneaux de l'emploi du temps (EDT), le cahier journal, le suivi des élèves — chacun avec le bon contenu, à la bonne semaine, dans l'ordre chronologique.

Exemple : créneau « Lecture » de l'EDT → semaine 1 affiche le son de la semaine 1, semaine 2 le son de la semaine 2, etc. Et pareil pour **n'importe quelle matière** ajoutée, pas seulement Français/Maths.

C'est **LA fonction différenciante** (aucun concurrent ne le fait bien).

### Ce qui existe DÉJÀ dans le code (base à débloquer)
- Table **`progression`** : déjà générique avec colonne `matiere` + `numero` + `items[]` + `pages` + `mots_exemple`. **MAIS** limitée en pratique à 2 matières.
- `src/lib/matieres.ts` : **code en dur** `MATIERES_METHODE = ['francais','maths']` + `LABELS_MATIERE`. ⬅️ **point à généraliser**.
- `src/lib/cahier-journal.ts` → fonction **`matiereMethode()`** : mappe un libellé de créneau vers `'francais'`/`'maths'` **par mots-clés en dur** (« graphème/graphe » → francais ; « math/calcul » → maths). ⬅️ **point central à généraliser** (lien méthode ↔ créneau).
- `deroulementInitial()` (même fichier) : pré-remplit déjà le déroulement d'un créneau « cours » depuis la progression de la matière. Les créneaux `type: 'routine'` restent vides.
- `src/lib/actions/progression-matiere.ts` → `enregistrerProgressionMatiere(matiere, semaines)` : remplace UNIQUEMENT les lignes d'une matière (non destructif entre matières). Déjà prêt pour le multi-matières.
- Import IA par matière : route `api/ia-manuel` reçoit déjà un champ `matiere`.

### La décision centrale du design
Passer d'une **liste fermée (2 matières)** à un **système ouvert** :
1. la maîtresse crée une méthode et choisit **à quel(s) créneau(x)** de SON EDT elle correspond (ex : « cette méthode = mes créneaux Anglais ») ;
2. l'IA génère la progression ;
3. l'appli relie automatiquement **méthode ↔ créneau ↔ semaine**.
→ Une fois ce lien rendu « libre », **EDT, cahier journal et suivi suivent automatiquement** (tout part de la table `progression`).

### ⚠️ Coût IA de cette fonction
- **Import d'une méthode = 1 grosse demande, rare (≈ 1×/an/matière)** → quelques centimes. Négligeable.
- Ce qui consomme vraiment = la **génération de séances** chaque semaine (sujet lié, voir §5).

### Questions de clarification préparées (à poser UNE PAR UNE en reprenant)
1. Comment la maîtresse relie une méthode à un créneau : (a) elle choisit dans une liste de ses créneaux EDT, (b) on devine par le nom du créneau avec confirmation, (c) elle tape le nom de la matière au moment de l'import ?
2. Une matière peut-elle avoir **plusieurs créneaux** dans la semaine (ex. Lecture lundi + mardi + jeudi) qui affichent tous le même contenu de la semaine ? (probable : oui)
3. Le suivi des élèves (étoiles) doit-il exister **pour toutes les matières** ou seulement lecture/maths au début ?
4. Que se passe-t-il pour les créneaux **sans méthode** (EPS, arts…) : rester vide, ou amorce IA générique ?
5. Périmètre v1 : on garde 36 semaines fixes ? niveaux PS→CM2 dès maintenant ou plus tard ?

---

## 4. RECHERCHE CONCURRENTS (faite)

Marché « cahier journal + EDT + suivi » **déjà occupé**, mais **angle IA rare** :
- **Teetsh** (leader, ~3 €/mois, a commencé un peu d'IA), **Edumoov** (~10 €/an, pas d'IA), **Classyc** (freemium), **PrimSchool** (gratuit, hors-ligne RGPD), **monCahierJournal** (gratuit basique).
- Outils IA lecture (**Lalilo, GraphoGame, ECRIMO, Abalect**) = tournés **élève**, pas planification enseignant → pas concurrents directs.

**Différenciateurs de notre appli :** import IA d'un manuel → progression ; correction en langage naturel ; bilans élèves RGPD strict (prénom jamais envoyé, placeholder `[ELEVE]`) ; multi-méthodes Français+Maths (à généraliser).

**Avance déterminante visée :** internaliser l'IA (remplacer les boutons Gemini/NotebookLM par des fonctions internes) → « l'assistant de prépa qui connaît MON manuel » (séances IA + chat sur ses propres manuels) + effet de réseau (progressions vérifiées mutualisées).

---

## 5. SUJET LIÉ : LES « SÉANCES » (à concevoir plus tard, après méthodes par matière)

- **Cahier journal** = vue d'ensemble (1 ligne/créneau, déjà fait).
- **Séance / fiche de prép** = le détail d'UN cours (objectif, étapes, matériel, différenciation). **Pas encore fait.** C'est le **produit d'appel** pour justifier l'abonnement.
- Technique : générer **une séance à la fois** (pas toute la semaine d'un coup) pour éviter les timeouts Vercel (« erreur réseau »). Pour la maîtresse = un seul bouton ; en coulisses = demandes découpées. Bonus : affichage au fur et à mesure, pas de tout-ou-rien.
- Base existante : route `api/ia-journal` (amorce déjà les déroulements) → à enrichir vers de vraies séances détaillées.

---

## 6. NOM DU PRODUIT (vérifié)

L'appli n'est plus limitée au CP : le concept marche **de la PS au CM2** → besoin d'un nouveau nom (plus « CP »).

**RÈGLE UTILISATEUR (importante) :** toujours **vérifier la disponibilité AVANT de proposer** un nom (concurrents + domaine). Mémoire : `feedback_verifier_noms`.

### Nom retenu / favori : **« Mon Assistant au Fil de l'Année »**
Vérifié le 2026-06-24 :
- ✅ Aucun concurrent / produit scolaire à ce nom.
- ✅ Domaines `.fr` **LIBRES** : `monassistantaufildelannee.fr`, `assistantaufildelannee.fr`, `aufildelannee.fr` (court), `assistant-classe.fr` (secours).
- 💡 Conseil donné : marque = nom complet, **domaine court = `aufildelannee.fr`**.
- ⏳ Reste à vérifier (non bloquant) : **marque INPI** (data.inpi.fr).

### Noms écartés (déjà pris)
- ❌ **Marelle** (police d'écriture connue dans le scolaire), ❌ **Plume/Class'Plume** (grosse appli edtech), ❌ **Toute mon Année / Mon Année de Classe** (TouteMonAnnée.com, ENT 50 000 classes), ❌ **monassistant.fr** (domaine pris depuis 2008).

### Domaine — explication donnée
On **reste sur Vercel + Supabase**. Le domaine = juste une jolie adresse qui pointe vers le même Vercel. Achat : via **Vercel** (le + simple) ou **OVH** (français, ~7-10 €/an pour `.fr`) ou **Cloudflare** (le moins cher). Refuser les options vendues en plus. Pas urgent.
Vérif domaine `.fr` faite via RDAP AFNIC : `https://rdap.nic.fr/domain/<nom>.fr` (404 = libre). ⚠️ `nslookup` local non fiable (la box renvoie une IP « parking » pour tout).

---

## 7. PROTÉGER LE COMPTE DE CÉCILE (avant d'inviter des testeuses)

- L'appli **isole déjà** les comptes (auth Supabase, chaque user voit seulement SA classe) → d'autres inscriptions ne touchent pas Cécile.
- Le vrai risque = **le code/les migrations** quand on développe la nouvelle fonction.
- **Plan recommandé (à exécuter avant de coder la grosse fonction) :**
  1. **Sauvegarde** des données de la classe de Cécile (via Supabase) — d'autant que la prod a déjà été réinitialisée une fois (cf. mémoire `project_schema_prod_drift`).
  2. **Développer sur une copie de test** (env. de staging), pas sur l'appli de Cécile.
  3. **Inviter les testeuses sur le stable** (chacune son compte) seulement quand la fonction est prête et vérifiée.

---

## 8. RAPPELS PROJET UTILES
- GitHub : `christopheMia/ma-progression-cp`. Vercel : ma-progression-cp.vercel.app. Supabase : `odwgkakeepcqbgpsfugl`.
- Next.js 16 (protection via `src/proxy.ts`, PAS middleware). Import IA = `claude-sonnet-4-6` (Opus dépasse le timeout serverless).
- Toute évolution de schéma = migration versionnée Supabase (migration `006` idempotente = source de vérité).
- La prod est (était) vide → Cécile recrée sa classe via `/setup`.

---

## ✅ TODO IMMÉDIAT EN REPRENANT
1. Confirmer compagnon visuel (oui/non).
2. Poser les questions de clarification §3 (une par une).
3. Choisir une approche → présenter le design → spec `docs/superpowers/specs/AAAA-MM-JJ-methodes-par-matiere-design.md` → writing-plans.
4. (Avant code) sauvegarde Cécile + copie de test.
