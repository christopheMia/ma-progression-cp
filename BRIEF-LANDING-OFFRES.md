# Brief — Modifications landing page & offres tarifaires

> Document de travail pour Claude Code — modifications à apporter sur la landing page et la structure des offres d'**Au Fil de l'Année**.

---

## 1. Corrections landing page

### 1.1 Supprimer les claims prématurés (aucune base utilisateur encore)

- **Supprimer** le badge `⭐ Le préféré des maîtresses` sur le plan Classe
- **Modifier** la phrase finale : `« Rejoignez les enseignants qui laissent leur assistant remplir l'année à leur place »` → reformuler sans impliquer une communauté existante (ex. : `« Laissez votre assistant remplir l'année à votre place »`)

### 1.2 Portée de l'appli

- **Supprimer** `« De la PS au CM2 »` dans la meta description — l'appli n'a été testée qu'en CP pour l'instant
- Remplacer par une formulation neutre sur l'adaptation à n'importe quel manuel, sans mentionner les niveaux non testés

### 1.3 Témoignage Cécile

- Conserver tel quel — il est authentique et crédible

---

## 2. Structure des offres tarifaires

### 2.1 Supprimer le plan gratuit permanent

- **Supprimer** le plan `Découverte` à 0€ pour toujours
- Le remplacer par un **essai gratuit de 30 jours** (accès complet, sans carte bancaire requise) — affiché comme bandeau ou mention en haut de la section tarifs, pas comme un plan à part entière

### 2.2 Plan Classe — 4€/mois

- Conserver
- Préciser le quota IA : **50 générations IA / mois** (déjà présent, à garder)
- C'est le plan cible de conversion après l'essai gratuit

### 2.3 Plan Confort — 7€/mois

- **Différenciation principale** : générations IA illimitées (pour les utilisatrices qui atteignent le plafond du plan Classe)
- **Différenciation secondaire à évaluer** : gestion de plusieurs classes simultanées (pertinent pour les enseignantes multi-niveaux en milieu rural) — **à implémenter seulement si l'architecture Supabase le permet déjà**
- Supprimer les formulations vagues : `« Tout Classe en plus grand »`, `« Priorité sur les nouveautés »`, `« Générations IA en abondance »`
- Reformuler de façon concrète et tangible uniquement

### 2.4 Offre de lancement (temporaire)

- Ajouter un bandeau ou une mention visible sur la section tarifs
- Format proposé : **50% sur les 3 premiers mois** pour toute inscription avant une date limite à définir (ex. 31 octobre 2026)
- Applicable sur les plans Classe et Confort
- Mention : `Sans engagement · Résiliable en un clic`

---

## 3. Flux de conversion cible

```
Inscription → 30 jours gratuits (accès complet)
→ Rappel J-7 avant fin de l'essai
→ Bascule automatique vers plan Classe (4€/mois)
→ Si quota IA atteint → proposition upgrade Confort (7€/mois)
```

---

## 4. Ce qu'il ne faut PAS changer

- La FAQ — elle est solide et répond aux vraies objections
- Le mock animé et le design général — bon niveau
- Le témoignage Cécile
- La mention RGPD (`Les prénoms ne sont jamais envoyés à l'IA`)
- `Sans engagement · Paiement sécurisé Stripe · Résiliable en un clic`

---

## 5. Points en suspens (décisions non encore prises)

- **Quota exact du plan Gratuit/Essai** : à définir selon consommation réelle observée pendant le beta (données issues de `ia_usage`)
- **Plusieurs classes sur le plan Confort** : valider si l'architecture Supabase supporte déjà plusieurs classes par utilisateur — si oui, c'est la meilleure différenciation pour justifier 7€
- **Date limite de l'offre de lancement** : à fixer selon date de lancement réelle
