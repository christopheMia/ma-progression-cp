# Import IA des méthodes de lecture — Design

**Date :** 2026-06-14
**Statut :** Validé (en attente relecture finale avant plan d'implémentation)

## Contexte & problème

L'outil contient des progressions de manuels **codées en dur** (`src/data/manuels/`).
Vérification faite (recherche en ligne sur le site de l'éditeur), la progression
« Au CP avec Méli » du fichier `au-cp-avec-meli.ts` **ne correspond pas** au vrai
manuel :

| Critère | Méthode officielle | Fichier actuel |
|---|---|---|
| Nombre de semaines | 32 | 36 ❌ |
| Rythme | 2 graphèmes/semaine | 1/semaine ❌ |
| Période 1 | 12 graphèmes | ~6-8 ❌ |
| Total | 54 études de graphèmes | ~45 ❌ |
| Début | 2 voyelles puis 1 consonne | 4 voyelles puis l ❌ |

Le label « ✅ vérifiée » de CLAUDE.md est donc faux. C'est le même défaut que les
6 manuels supprimés pour progressions « approximatives/inventées ».

**Vision retenue :** plutôt que coder chaque manuel en dur (faux et fragile),
l'outil doit **lire, comprendre et adapter** la méthode fournie par l'enseignant
(PDF du guide ou sommaire collé), avec l'enseignant qui garde le **pouvoir de
corriger** — y compris en **discutant avec une IA**.

## Décision : IA via API Anthropic

- **Compréhension réelle** d'un manuel = tâche de LLM → API payante nécessaire.
- Ceci **annule** la décision historique « pas d'API payante » (mémoire projet).
- Choix du fournisseur : **Anthropic** car (a) ne s'entraîne PAS sur les données
  envoyées via l'API (conforme RGPD pour des données d'élèves mineurs),
  (b) `@anthropic-ai/sdk` déjà installé dans le projet.
- **Free tier Gemini écarté** : il s'entraîne sur les données → interdit pour des
  données de mineurs.

### Modèles
- **Import du manuel = Claude Opus 4.8** (`claude-opus-4-8`) — étape critique et
  rare (~1×/an), meilleure qualité d'extraction. ~0,17 €/import.
- **Chat de correction + tableaux = Claude Sonnet 4.6** (`claude-sonnet-4-6`) —
  robuste, l'humain valide, peu coûteux.
- 1 seul compte, 1 seule clé API, 1 seul solde (le modèle est un paramètre de
  requête). Crédits prépayés (minimum de recharge ~5 $, à confirmer console).

## Architecture & sécurité

La clé API **ne doit jamais** atteindre le navigateur. Tout passe côté serveur.

```
Navigateur (Cécile)            Serveur Next.js              API Claude
   │ dépose PDF / correction      │                            │
   │ ────────────────────────────▶│ appelle Claude             │
   │                              │ (ANTHROPIC_API_KEY secrète) │
   │                              │ ──────────────────────────▶│
   │ affiche résultat éditable    │ ◀──────────────────────────│
   │ ◀────────────────────────────│                            │
```

- `src/app/api/ia-manuel/route.ts` — import PDF/sommaire → progression.
- `src/app/api/ia-chat/route.ts` — corrections conversationnelles.
- Variable d'env **`ANTHROPIC_API_KEY`** sur Vercel (secrète, PAS `NEXT_PUBLIC_`).
- Package : `@anthropic-ai/sdk` (déjà présent).

> ⚠️ Next.js 16 modifié — lire `node_modules/next/dist/docs/` avant d'écrire le
> code des routes (cf. AGENTS.md).

## Section 1 — Import (PDF → progression éditable)

```
1. Cécile dépose le PDF (ou colle le sommaire) — onglet "🤖 Import IA"
2. Serveur extrait le texte (pdf-parse, déjà en place) + envoie à Opus
3. Opus renvoie un JSON structuré (format garanti, voir ci-dessous)
4. Affichage en TABLEAU ÉDITABLE (colonnes = ProgressionSemaine)
5. Relecture/correction manuelle OU via chat (Section 2)
6. "✅ Utiliser cette progression" → enregistré comme manuel custom
```

### Format garanti
Sorties structurées Claude (`output_config.format` + schéma JSON) → l'IA est
**forcée** de répondre dans la forme du type existant :

```ts
{ numero: number, graphemes: string[], pages: string, mots_exemple: string[] }
```

→ Se branche directement sur l'appli (planning, suivi, cahier journal). Nombre de
semaines **non figé** (32/34/36… selon le manuel réel).

### Réutilisation
- Réutilise : `pdf-parse`, type `ProgressionSemaine`, `ManualSelector`
  (ajout d'un 3ᵉ onglet « 🤖 Import IA »), flux `onSelect('custom', progression)`.
- Ajoute : route `api/ia-manuel`, tableau éditable de relecture.
- Conserve en filet : imports PDF-regex et CSV actuels.

## Section 2 — Chat de correction

- Route `api/ia-chat` reçoit : progression actuelle (JSON) + message + historique
  court (~10 échanges max).
- Sonnet renvoie la progression modifiée (format garanti) + une phrase
  d'explication.
- L'appli remplace le tableau → résultat visible immédiatement.
- Rien n'est enregistré tant que « ✅ Utiliser cette progression » non cliqué.
- **Aucune donnée élève** ne transite ici (uniquement sons/semaines/pages).

### Boîte de dialogue personnalisée
- S'adresse à Cécile **par son prénom** (depuis profil/classe).
- Ton chaleureux, pédagogue, sans jargon (parle « sons/semaines/pages »).
- Réglé via la consigne système (ajustable librement).
- Allure cohérente thème violet (en-tête `violet-600→purple-600`, bulles
  arrondies, avatar 🤖, indicateur « ✍️ réfléchit… »). Réutilise les classes
  Tailwind existantes.

## Section 3 — Tableaux & bilans avec prénoms (données élèves)

Objectif : Cécile voit les vrais prénoms, l'IA ne les voit jamais.
**Substitution bidirectionnelle** côté serveur :

```
Vrais prénoms ──(remplace)──▶ "Élève 1, 2…" ──▶ IA travaille anonyme
Tableau réaffiché ◀──(réinjecte les vrais prénoms)── réponse IA
```

1. Avant l'envoi : chaque prénom de la classe → `Élève N` (table de
   correspondance en mémoire serveur, durée de la requête).
2. L'IA travaille sur des données anonymes → conforme RGPD.
3. À la réponse : réinjection des vrais prénoms.
4. Vaut aussi pour les prénoms tapés par Cécile dans sa demande.

### Limite
Prénom = mot courant / rare / mal orthographié → substitution imparfaite. Règle
prudente : en cas de doute, **ne pas envoyer le prénom brut** (basculer « Élève N »).

### Transparence RGPD
Mention discrète : « Cette fonction utilise une IA. Les prénoms ne sont jamais
transmis : ils sont remplacés par "Élève 1, 2…" puis réaffichés ici. »

## Section 4 — Plafonds & garde-fous de coût

1. **Plafond Anthropic** (console) : budget mensuel max (ex. 10 $) + alertes
   e-mail. Mur infranchissable.
2. **Limites appli** : 1 manuel à la fois ; compteur de corrections visible +
   avertissement doux (~50) ; PDF ≤ 30 Mo (déjà en place).
3. **Optimisations** : prompt caching sur le chat (~−80 % contexte répété) ;
   historique borné ; sorties structurées ; bons modèles par tâche.

### Budget réaliste
| Scénario | Coût/an/enseignante |
|---|---|
| Normal (1 import + ~15 corrections) | ~0,7 € |
| Intensif (1 import + 50 corrections) | ~2 € |
| Plafond de sécurité | bloqué à 10 $/mois |

## Tâches d'installation (une fois, par l'utilisateur)
1. Créer un compte console.anthropic.com.
2. Charger un petit montant (ex. 5 $).
3. Fixer un plafond mensuel (ex. 10 $) + alertes.
4. Générer 1 clé API → fournir via le terminal `!` (jamais dans le chat),
   l'ajouter en `ANTHROPIC_API_KEY` sur Vercel, redéployer.

## Hors périmètre (pour l'instant)
- Correction du fichier `au-cp-avec-meli.ts` en dur (sera obtenu via l'import IA,
  ou retrait du label « vérifiée »).
- Génération de bilans élèves automatiques au-delà du tableau (extension future).
