# Emploi du temps généré depuis le volume horaire officiel (CP)

Date : 2026-07-19
Statut : design, à valider par Christophe/Cécile avant implémentation.

## Problème

Aujourd'hui l'emploi du temps est une **trame figée** (`src/data/trame-edt.ts`,
la vraie trame de Cécile transcrite en dur). On veut le **générer** à partir du
**volume horaire officiel des programmes** de CP (cycle 2), tout en le laissant
entièrement **modifiable** ensuite.

## Règles imposées (Christophe, 19/07/2026)

1. Répartir le temps selon le **volume horaire officiel** de chaque matière.
2. **Déduire 30 min de récréation par jour**, de manière **équitable entre
   toutes les matières** (pas au détriment d'une seule).
3. **Le matin, privilégier** pour les CP : les **maths**, l'**étude de la langue**
   (français) et l'**étude du code** (lecture / graphèmes / phonologie).
4. Rester **modifiable** (l'enseignant ajuste après génération).
5. **Récréations fixes** : 10h00-10h15 et 15h00-15h15 (= 2 × 15 min = 30 min/jour).
6. **Temps rituel à chaque entrée en classe** (matin, et retour de cantine).
7. **Retour de cantine à 13h30** : **temps calme (lecture) de 15 min** (13h30-13h45).

## Volume horaire officiel cycle 2 (arrêté 9/11/2015)

| Matière | Par semaine (nominal) |
|---|---|
| Français | 10 h |
| Mathématiques | 5 h |
| Questionner le monde (dont EMC) | 2 h 30 |
| Éducation physique et sportive | 3 h |
| Enseignements artistiques | 2 h |
| Langue vivante | 1 h 30 |
| **Total** | **24 h** |

## Cadre de journée par défaut (modifiable)

Jours : lundi, mardi, jeudi, vendredi. Présence 8h30-16h30, pause déjeuner
11h30-13h30.

| Créneau | Type | Contenu |
|---|---|---|
| 08h30-08h45 | rituel | Rituel d'entrée (accueil, appel, date, météo…) |
| 08h45-10h00 | cours | Matin priorité 1 (code / langue / maths) |
| 10h00-10h15 | récré | Récréation |
| 10h15-11h30 | cours | Matin priorité 2 (code / langue / maths) |
| 11h30-13h30 | pause | Déjeuner / cantine |
| 13h30-13h45 | temps calme | Lecture (retour de cantine) |
| 13h45-15h00 | cours | Après-midi (autres matières + reste français/maths) |
| 15h00-15h15 | récré | Récréation |
| 15h15-16h30 | cours | Après-midi |

Bilan par jour : rituel 15 min + temps calme 15 min + récré 30 min +
**5 h de cours effectif** → **20 h de cours/semaine** à répartir entre les matières.

## Algorithme de génération

1. **Budget de cours effectif** : le cadre de journée dégage `T` heures de cours
   par semaine (20 h avec le cadre par défaut). Les temps rituel, récré et temps
   calme sont posés en dur (règles 5-7).
2. **Déduction équitable de la récré** : la somme nominale des matières est 24 h,
   mais on ne dispose que de `T` = 20 h de cours (le reste = rituel + récré +
   temps calme). Chaque matière est donc mise à l'échelle par le **même facteur**
   `T / 24` (ici 0,833) : c'est la « déduction équitable ». Exemple :
   Français 10 h → 8 h 20 ; Maths 5 h → 4 h 10 ; QLM 2 h 30 → 2 h 05 ; EPS 3 h →
   2 h 30 ; Arts 2 h → 1 h 40 ; LV 1 h 30 → 1 h 15. Somme ≈ 20 h.
3. **Découpage en blocs** : chaque matière est découpée en blocs de 15 min
   (granularité de la grille) pour son quota mis à l'échelle.
4. **Placement avec priorité matin** : on remplit d'abord les créneaux du **matin**
   (10 h/semaine avec le cadre) avec, dans l'ordre, **étude du code** (lecture,
   graphèmes, phonologie), **étude de la langue** (français : écriture, vocabulaire,
   production d'écrits) et **maths**. Le débordement de ces matières + toutes les
   autres (QLM, EPS, arts, LV, EMC) partent l'**après-midi**.
5. **Couleur + type** : réutiliser `couleurMatiere()` ; type `cours` ou `routine`
   (rituel/récré/temps calme/déjeuner = routine).
6. **Sortie** : même forme que `TRAME_EDT_CP` (liste de créneaux jour × heure),
   insérée dans `emploi_du_temps`. Donc **100 % modifiable** ensuite dans la grille
   existante, et re-générable.

## Ce qui reste paramétrable (règle 4)

- Heures de début/fin de journée et de la pause déjeuner.
- Durée du rituel et du temps calme.
- Volumes horaires par matière (si Cécile veut renforcer le code en CP au-delà du
  nominal, ex. lecture quotidienne).
- Placement (drag & drop / édition manuelle après génération).

## Couleurs personnalisables des cases (demande Christophe)

L'enseignant doit pouvoir choisir, par case (ou par matière) :
- la **couleur de fond** de la case,
- la **couleur du texte**.

État actuel : `emploi_du_temps` a déjà une colonne `couleur` (fond, posée par
`couleurMatiere()`). Il manque la **couleur du texte**.

Ajout prévu (additif) : colonne `emploi_du_temps.couleur_texte text` (nullable,
défaut = noir/gris hérité). UI : un petit sélecteur de 2 couleurs (fond + texte)
sur chaque case de la grille, avec une palette par défaut par matière et
possibilité de surcharger. Réutiliser la logique `couleurMatiere()` comme valeur
initiale du fond.

## Ce qui n'est PAS dans ce lot

- Le réalignement calendaire des 36 semaines (chantier périodes, séparé).
- L'APC / 108 h.

## Décisions validées (Christophe, 19/07/2026)

1. **Cadre de journée** : 8h30-16h30, déjeuner 11h30-13h30, récrés 10h00-10h15 et
   15h00-15h15. VALIDÉ.
2. **Volumes** : **code/lecture renforcé** en CP. On garde les volumes officiels
   comme base mais on **garantit un bloc lecture/graphèmes/code CHAQUE matin**
   (les 4 jours), quitte à rogner un peu sur les matières de l'après-midi. Reste
   ajustable à la main.
3. **Génération remplace l'EDT courant** avec confirmation (2 temps), et le
   résultat reste 100 % éditable dans la grille. VALIDÉ.
