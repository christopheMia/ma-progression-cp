# Consignes pour Codex, 31 juillet 2026 au soir

Passation écrite dans l'urgence (quota hebdomadaire de Claude presque épuisé).
Tout est commité et poussé sur `main` jusqu'à **`20bbe65`**. Rien n'est en
suspens dans le répertoire de travail. `tsc` propre, **672 tests verts**, build
vert, déployé.

Lire d'abord le §8 de `MARCHE-A-SUIVRE-CODEX-CLAUDE.md`, puis ce fichier.

---

## 1. Les deux règles de Christophe. Elles priment sur tout le reste.

**a. « Si ça génère n'importe quoi je perdrai tous les clients. »**

Un cahier journal faux est pire qu'un cahier journal vide : il a l'air juste et
personne ne le relit. J'allais écrire un algorithme qui devine dans quelle case
va chaque item de progression, par comparaison de mots (« Vocabulaire » vers le
créneau « Étude de la langue : vocabulaire ou grammaire »). **Ne l'écris pas.**
Un mécanisme qui place juste la plupart du temps, sans que personne puisse dire
quand il se trompe, est exactement la façon de perdre un client en silence.

Quand un rattachement est ambigu, deux issues acceptables, jamais une troisième :
- élargir (afficher sur tous les créneaux de la matière), c'est visible et
  rattrapable ;
- demander à l'enseignante de le déclarer explicitement (lien créneau vers
  méthode), c'est elle qui décide.

**b. « Quand il n'y a pas de progression on met la matière et l'utilisateur
remplira. »**

Recopier un libellé que l'enseignante a saisi elle-même dans son emploi du temps
n'affirme rien de faux. Rédiger une séance plausible, si. C'est ce que faisait
l'ancien bouton « Générer la journée », supprimé le 26/07, et dont la prose
inventée traînait encore en base ce matin (« Anglais : séance de découverte des
salutations… » alors qu'aucune progression d'anglais n'existe).

---

## 2. Ce qui a été fait aujourd'hui sur le cahier journal

Point de départ : « comment on peut avoir des jour 1 jour 2 dans la première
heure du lundi ». Un seul fil tiré, cinq défauts trouvés.

| Commit | Quoi |
|---|---|
| `5a910de` | Les items datés « Jour N » ne paraissent plus que leur jour, préfixe retiré. **Piège : « Jour 3 » = troisième jour d'ÉCOLE, donc jeudi sans mercredi.** |
| `d494191` | Une **virgule** empêchait un rattachement : `familleMatiere` retirait les accents mais pas la ponctuation, donc « Chut, je lis. » ne correspondait à aucune famille malgré la règle `chut je lis`. Échec silencieux. |
| `b25c1ed` | Le lien créneau vers méthode l'emporte sur le libellé. |
| `96d45f7` | Un créneau sans progression affiche sa matière au lieu du vide. |
| `6166cb4` | Le cahier journal se réaffiche au retour sur la semaine (`lireJournal`, qui **lit et ne crée jamais**). |
| `20bbe65` | Impression corrigée (`display:none` au lieu de `visibility:hidden`), choix du jour, impression d'un seul jour, ancre `#cahier-journal`. |

**Fait structurant sur le classement de Christophe** : chez lui, **histoire,
géographie et sciences SONT de l'EMC**, un seul bloc (sa méthode s'appelle
« Histoire Géographie Sciences EMC »). Le programme officiel les sépare, et
l'application suit le programme officiel. **Aucune règle automatique ne peut
deviner ça** : ses 4 créneaux concernés ont été reliés à la main à sa méthode.
C'est la démonstration vivante de la règle 1.a.

---

## 3. Le filet, à ne pas contourner

`src/lib/__tests__/cahier-journal-lundi-reel.test.ts` rejoue le **lundi réel** de
Cécile : ses 17 créneaux avec leurs vrais libellés (fautes de frappe comprises,
« production d'cérits »), sa vraie progression, et ce que chaque case doit
recevoir.

**C'est ce test qui a trouvé le bug de la virgule**, en une exécution, alors que
des dizaines de tests sur données inventées ne l'avaient jamais vu.

Le mettre à jour **en connaissance de cause**, jamais pour faire passer une
suite. S'il échoue, c'est qu'un contenu s'est déplacé dans le cahier journal
d'une vraie enseignante.

---

## 4. Chantiers ouverts, par priorité

### C0a. Rebrancher les liens créneau vers méthode après un import d'EDT

**Priorité haute, c'est le défaut le plus dangereux.**

`executerCreationClasse` relie bien les créneaux aux méthodes à la création de
la classe. Mais **l'import d'un emploi du temps remplace les créneaux sans
refaire les liens** : les 90 créneaux de Christophe avaient tous
`methode_id = null`. Tout retombait alors sur le rapprochement par libellé, qui
marche par coïncidence de noms et échoue sans rien dire.

Conséquence pour un client : sa progression existe, s'affiche dans
l'application, et n'alimente aucun créneau. Personne ne comprend pourquoi.

À faire :
- après un import d'EDT, relier chaque créneau à la méthode de sa matière
  (`lierCreneaux` existe déjà, `src/lib/actions/methodes.ts`) ;
- décider ce qui arrive quand un ancien créneau relié disparaît ;
- **signaler dans l'interface les créneaux non rattachés** : c'est le point qui
  transforme un échec silencieux en information.

Note au passage : `lierCreneaux` filtre sur `methode_id` et `id` **sans**
`class_id`, en s'appuyant sur la RLS. La règle du projet
(`cp-multiclasse-remplacants`) dit de ne jamais retirer un filtre `class_id`.
À resserrer pendant que tu y es.

### C0b. Faire du cahier journal un reflet plutôt qu'une photo

Aujourd'hui il est calculé une fois à la première ouverture, puis **stocké**.
Celui de Christophe datait du 26/07 15h46, son import de maths de 15h58 : il a
affiché une progression périmée pendant cinq jours.

**La règle exacte, précisée par lui aujourd'hui, concilie ses deux exigences :**

- **le contenu calculé suit toujours** l'emploi du temps et les progressions du
  moment (« l'emploi du temps peut changer donc ça doit suivre ») ;
- **ce que l'enseignante a écrit ne bouge jamais** (« vu que j'ai généré le
  cahier journal ça ne devrait pas bouger »).

Donc : ne stocker que ses retouches, recomposer le reste à la lecture.

Question de conception déjà tranchée : **si le créneau qui portait une retouche
disparaît ou se déplace, ne PAS supprimer le texte.** L'afficher sur la journée,
signalé comme rattaché à un créneau qui n'existe plus, à elle de le replacer ou
de l'effacer. Effacer en silence le travail de quelqu'un est le piège qu'on a
passé la journée à débusquer.

Le test du lundi réel sert de garde-fou pendant l'opération.

### C0c. Supprimer la table d'archive

`public.cahier_journal_archive_20260731` contient la copie du cahier journal
prise avant la régénération du 31/07 (RLS activée, aucune politique, donc
illisible via l'API). **Demander à Christophe avant de la supprimer.**

### Le reste

Voir le tableau C du §8 de `MARCHE-A-SUIVRE-CODEX-CLAUDE.md` : point 2.1 (bouton
« Valider » après chaque saisie de progression), import ciblé sur une semaine,
plusieurs méthodes au setup, vue par période éditable, démarrage à froid, base
de test séparée.

---

## 5. Ce qui attend Christophe, pas nous

1. Ouvrir sa semaine 1 et juger le cahier journal régénéré. **Attention** : il a
   été régénéré à 17h25 UTC, donc AVANT le lien EMC et avant l'affichage de la
   matière. Il lui reste 4 cases vides (2 « Anglais », 2 « Histoire, géographie,
   sciences et technologie »). **Une dernière régénération les remplira**, il
   n'a rien écrit dedans. Je lui ai proposé, il n'a pas encore répondu.
2. Faire un import PDF réel : c'est le premier test de Sonnet 5 **et** de la
   jauge de crédit, qui n'a encore jamais mesuré un appel depuis la migration
   024. Si le montant reste à 0,00 $ après un import, l'enregistrement ne se
   fait pas.
3. Deux réglages Supabase : « Leaked password protection », et mot de passe
   minimum à 8 (le formulaire y est déjà, pas le serveur).

---

## 6. Rappels techniques déjà payés cher

- **Ne jamais lever une erreur destinée à l'enseignante depuis une action
  serveur.** Next efface le texte en production. Utiliser `resultat()` /
  `Resultat<T>` (`src/lib/resultat.ts`).
- **Une ancre sur une page à squelette de chargement est morte** si sa cible
  n'existe pas encore. Poser la cible sur un conteneur toujours rendu, côté
  serveur (voir `#cahier-journal` dans `semaine/[id]/page.tsx`).
- **`visibility: hidden` ne retire pas du flux.** Pour imprimer un bloc seul,
  `display: none` sur les frères du chemin (voir `src/lib/print.ts`).
- **Générer un cahier journal ne consomme AUCUN crédit IA** : `journal.ts` ne
  contient aucun appel à Anthropic, la composition est déterministe. La question
  s'est posée aujourd'hui, la réponse est vérifiée.
- **Sonnet 5 : ne pas passer de champ `thinking` ACTIVE la réflexion.** Voir
  `REFLEXION_ETEINTE` dans `src/lib/ia/anthropic.ts`.
- **Toute nouvelle route `/api` appelle `refuserSiDeconnecte` en première
  ligne**, et lit `stop_reason` après `enregistrerUsageIA`, avant le parsing.
