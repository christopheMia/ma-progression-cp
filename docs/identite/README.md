# Identité ProfEnPoche

Atelier d'identité visuelle, ouvert le 09/08/2026. Le produit change de nom :
« Ma Progression CP » (et « Mon Assistant au Fil de l'Année » côté landing)
deviennent **ProfEnPoche**, en un seul mot, avec le R de « Prof ».

## Comment déposer une proposition

| Dossier | Qui | Quoi |
|---|---|---|
| `propositions-gemini/` | Christophe | Ce que Gemini a produit. Un fichier par piste. |
| `propositions-claude/` | Claude | Les pistes proposées en face, pour comparer. |

Un fichier HTML autonome par piste (le CSS et le SVG à l'intérieur, aucun lien
vers l'extérieur), pour qu'il s'ouvre d'un double-clic sans rien installer.
Nommer le fichier par ce qu'il montre, pas par sa date : `logo-livre-poche.html`
plutôt que `test3.html`.

## Périmètre : l'appli seulement

Décidé le 09/08 par Christophe : **la landing est hors sujet pour ce chantier**,
elle sera refaite dans un second temps. On ne touche donc pas à
`landing/index.html` ni à `landing/index-v2.html` pour l'instant, même si elles
portent encore l'ancien nom commercial « Mon Assistant au Fil de l'Année ».

## Où en est le produit aujourd'hui

- L'appli **n'a aucun logo**, seulement le nom écrit en Dancing Script
  (classe `.font-logo`, déclarée dans `src/app/layout.tsx`).
- `public/` ne contient **aucune icône ni favicon**.
- Le seul actif graphique existant du projet est un petit livre en SVG inline
  dans les landings, avec la police Fraunces. Il peut servir de point de départ,
  mais il n'engage à rien.
- **31 fichiers** du dépôt mentionnent encore l'ancien nom, et le projet Vercel
  s'appelle toujours `ma-progression-cp`.

Le renommage lui-même passe par une spec dans `docs/superpowers/specs/` avant
tout code.
