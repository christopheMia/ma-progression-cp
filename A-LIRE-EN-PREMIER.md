# À lire en premier

Le plan du projet. Une question, une destination. **Ne lis pas les autres documents en entier**, viens ici d'abord.

Ce fichier ne recopie rien : il oriente. Si une information vit ailleurs, il pointe dessus. Deux copies d'une même vérité finissent toujours par diverger.

---

## Où on en est, maintenant

| Ma question | Le document |
|---|---|
| **Où en est le chantier EN COURS ?** | **`AVANCEMENT-IMPORT-SEANCES.md`** : les 12 tâches, celles qui sont faites, les décisions prises, « comment reprendre » |
| Qu'est-ce que Codex doit traiter ? | `CONSIGNES-CODEX-2026-07-31.md` |
| Le backlog de fond, et le journal de passation entre assistants | `MARCHE-A-SUIVRE-CODEX-CLAUDE.md` (gros : y chercher une section, pas le lire en entier) |
| Les règles de sécurité en attente | `partage/MARCHE-A-SUIVRE-SECURITE.md` |

**Chantier en cours au 3 août 2026** : « une séance du document = un créneau du cahier journal ».
Branche `import-seances-un-creneau`, **non fusionnée**. `main` est intact.
Dernier commit : `5a84410`, 03/08 19:23. Tâche 1 sur 12 terminée et approuvée.

---

## Comprendre le projet

| Ma question | Le document |
|---|---|
| Qu'est-ce que fait l'application ? | `EXPLICATION-APPLI.md` |
| Comptes, hébergement, base, architecture auth | `CLAUDE.md` |
| Ce qui a été remis à Cécile | `GUIDE-ESSAI-CECILE.pdf` |
| Vu de loin, pour un non-technicien | La page `ma-progression-cp` du wiki de l'AIOS |

---

## Les points d'étape passés

Ils gardent la mémoire du **pourquoi**, pas de l'état courant. Ne pas les prendre pour la situation actuelle.

| Document | Ce qu'il explique encore utilement |
|---|---|
| `REPRISE-2026-07-31.md` | pourquoi le passage aux nouveaux modèles, et ses garde-fous |
| `REPRISE-2026-07-30.md` | le round contre la lenteur |
| `docs/REPRISE-2026-07-21.md` | l'état du produit à cette date |
| `docs/REPRISE-OPUS-2026-07-05.md`, `docs/REPRISE-SESSION-COMMERCIALISATION.md` | plus anciens, historiques |

---

## Deux règles qui viennent du terrain

**Un plan n'est pas juste parce qu'il est écrit.** La relecture qualité de la tâche 1 a trouvé deux bugs dans du code que le plan lui-même dictait. Ses blocs de code n'avaient été relus par personne au moment de leur rédaction.

**Les valeurs attendues d'un test ne s'alignent jamais en silence.** Si un créneau de maths ou d'EMC bouge après une migration, c'est une régression, pas une attente à mettre à jour. Ce point concerne la tâche 7 et demande l'accord de Christophe.

---

## Tenir ce fichier

Il est court exprès. Il change quand le **chantier en cours** change, pas à chaque session. Si sa première section ne décrit plus la réalité, c'est lui qu'il faut corriger en premier, avant de travailler.
