'use server'
import { createClient } from '@/lib/supabase/server'
import { genererProgression, genererProgressionFrancais } from '@/lib/progression'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supprimerClassesUtilisateur } from '@/lib/reset-classe'
import type { ProgressionSemaine } from '@/data/manuels'
import { TRAME_EDT_CP } from '@/data/trame-edt'
import { genererEdtCP } from '@/lib/edt-generator'
import { datesSemainesCalendaires } from '@/lib/calendrier-semaines'
import { ensureMethode } from '@/lib/methodes-db'
import { remplacerSansPerte } from '@/lib/safe-replacement'
import { estZoneScolaire, periodesOfficielles, type ZoneScolaire } from '@/lib/calendrier-officiel'

type Creneau = { jour: string; heure_debut: string; heure_fin: string; matiere: string; ordre: number; couleur: string | null; couleur_texte: string | null; texte_gras: boolean; texte_italique: boolean; texte_souligne: boolean; type: 'cours' | 'routine'; visible_journal: boolean }
type NouveauCreneau = Omit<Creneau, 'ordre'> & { ordre?: number }

/**
 * Remplace un EDT sans supprimer la version actuelle avant que la nouvelle ne
 * soit entierement enregistree. En cas d'echec d'insertion, l'ancien EDT reste
 * intact. En cas d'echec du nettoyage final, les nouvelles lignes sont retirees
 * pour revenir a l'etat initial.
 */
async function remplacerEmploiDuTempsSansPerte(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classId: string,
  creneaux: NouveauCreneau[],
) {
  const { data: anciens, error: lectureError } = await supabase
    .from('emploi_du_temps').select('id').eq('class_id', classId)
  if (lectureError) throw new Error(`Lecture de l'emploi du temps impossible : ${lectureError.message}`)
  const anciensIds = (anciens ?? []).map(c => c.id)

  await remplacerSansPerte({
    anciensIds,
    insererNouveau: async () => {
      if (!creneaux.length) return []
      const { data: nouveaux, error } = await supabase
        .from('emploi_du_temps')
        .insert(creneaux.map((c, i) => ({ ...c, class_id: classId, ordre: c.ordre ?? i })))
        .select('id')
      if (error || !nouveaux) {
        throw new Error(`Enregistrement du nouvel emploi du temps impossible : ${error?.message ?? 'réponse vide'}`)
      }
      return nouveaux.map(c => c.id)
    },
    supprimerIds: async ids => {
      if (!ids.length) return
      const { error } = await supabase.from('emploi_du_temps').delete().in('id', ids)
      if (error) throw new Error(`Suppression de l'emploi du temps impossible : ${error.message}`)
    },
  })
}

async function getClasse() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')
  const { data: classe } = await supabase.from('classes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!classe) throw new Error('Classe introuvable')
  return { supabase, classe }
}

/** Enregistre le prénom de l'enseignant (pour le « Bonjour … » et l'assistant IA). */
export async function updatePrenomEnseignant(prenom: string) {
  const { supabase, classe } = await getClasse()
  await supabase.from('classes').update({ prenom_enseignant: prenom.trim() || null }).eq('id', classe.id)
  revalidatePath('/accueil')
  revalidatePath('/parametres')
}

/**
 * Met à jour la liste des élèves en préservant le suivi des élèves conservés.
 * Identité par prénom : on garde ceux dont le prénom existe encore (donc leurs acquisitions),
 * on insère les nouveaux, on supprime ceux retirés (et leurs acquisitions).
 */
export async function updateEleves(prenoms: string[]) {
  const { supabase, classe } = await getClasse()
  const noms = prenoms.map(p => p.trim()).filter(Boolean)

  const { data: existants } = await supabase.from('eleves').select('*').eq('class_id', classe.id)
  const existingNames = new Set((existants ?? []).map(e => e.prenom))

  const supprimes = (existants ?? []).filter(e => !noms.includes(e.prenom))
  if (supprimes.length) {
    const ids = supprimes.map(e => e.id)
    await supabase.from('acquisitions').delete().in('eleve_id', ids)
    await supabase.from('eleves').delete().in('id', ids)
  }

  const nouveaux = noms.filter(p => !existingNames.has(p))
  if (nouveaux.length) {
    await supabase.from('eleves').insert(nouveaux.map(prenom => ({ class_id: classe.id, prenom, ordre: 0 })))
  }

  // Réordonne selon l'ordre saisi
  const { data: tous } = await supabase.from('eleves').select('*').eq('class_id', classe.id)
  const byName = new Map((tous ?? []).map(e => [e.prenom, e]))
  for (let i = 0; i < noms.length; i++) {
    const e = byName.get(noms[i])
    if (e && e.ordre !== i) await supabase.from('eleves').update({ ordre: i }).eq('id', e.id)
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/** Remplace l'emploi du temps (sans impact sur la progression ni les journaux déjà enregistrés). */
export async function updateEmploiDuTemps(creneaux: Omit<Creneau, 'ordre'>[]) {
  const { supabase, classe } = await getClasse()
  await remplacerEmploiDuTempsSansPerte(supabase, classe.id, creneaux)
  revalidatePath('/parametres')
}

/**
 * Génère l'emploi du temps depuis le volume horaire officiel CP (remplace l'EDT
 * courant). Reste 100% modifiable ensuite. codeRenforce garantit un bloc code
 * chaque matin.
 */
export async function genererEmploiDuTemps(codeRenforce = true) {
  const { supabase, classe } = await getClasse()
  const edt = genererEdtCP(codeRenforce)
  await remplacerEmploiDuTempsSansPerte(
    supabase,
    classe.id,
    edt.map(c => ({
      jour: c.jour,
      heure_debut: c.heure_debut,
      heure_fin: c.heure_fin,
      matiere: c.matiere,
      type: c.type,
      couleur: c.couleur,
      ordre: c.ordre,
    })) as NouveauCreneau[],
  )
  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/** Repart de la trame CP par défaut (efface l'EDT courant). */
export async function rechargerEmploiDuTempsType() {
  const { supabase, classe } = await getClasse()
  await remplacerEmploiDuTempsSansPerte(
    supabase,
    classe.id,
    TRAME_EDT_CP as NouveauCreneau[],
  )
  revalidatePath('/parametres')
}

/**
 * Change la date de rentrée et recalcule la date de chaque semaine existante,
 * EN CONSERVANT les semaines (donc le suivi des élèves et les cahiers journaux).
 */
export async function updateRentreeDate(newDate: string, zone: ZoneScolaire) {
  const { supabase, classe } = await getClasse()
  const periodes = periodesOfficielles(newDate, zone)
  if (periodes.length !== 5) {
    throw new Error('Le calendrier officiel de cette année scolaire n’est pas encore disponible dans l’application.')
  }

  const { error: classeError } = await supabase.from('classes')
    .update({ rentree_date: newDate, zone_scolaire: zone }).eq('id', classe.id)
  if (classeError) throw new Error(`Mise à jour de la classe impossible : ${classeError.message}`)

  const { error: periodesError } = await supabase.from('periodes').upsert(
    periodes.map(p => ({ ...p, class_id: classe.id })),
    { onConflict: 'class_id,numero' },
  )
  if (periodesError) throw new Error(`Mise à jour des périodes impossible : ${periodesError.message}`)

  const { data: semaines, error: semainesError } = await supabase
    .from('semaines').select('id, numero').eq('class_id', classe.id).order('numero')
  if (semainesError) throw new Error(`Lecture des semaines impossible : ${semainesError.message}`)
  const calendrier = datesSemainesCalendaires(periodes, semaines?.length ?? 0)
  const parNumero = new Map(calendrier.map(c => [c.numero, c]))
  for (const s of semaines ?? []) {
    const c = parNumero.get(s.numero)
    if (!c) continue
    const { error } = await supabase.from('semaines')
      .update({ date_debut: c.date_debut, periode_numero: c.periode_numero }).eq('id', s.id)
    if (error) throw new Error(`Semaine ${s.numero} impossible à recaler : ${error.message}`)
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/**
 * Réaligne les semaines existantes sur le VRAI calendrier scolaire (saute les
 * vacances), d'après les bornes de périodes. NON DESTRUCTIF : ne change que
 * `date_debut` et `periode_numero` de chaque semaine ; le suivi des élèves et
 * les cahiers journaux (liés par `semaine_id`) sont préservés.
 */
export async function realignerSemaines() {
  const { supabase, classe } = await getClasse()
  let { data: periodes, error: periodesLectureError } = await supabase
    .from('periodes').select('numero, date_debut, date_fin').eq('class_id', classe.id)
  if (periodesLectureError) throw new Error(`Lecture des périodes impossible : ${periodesLectureError.message}`)
  if (!periodes?.length) {
    const zone = estZoneScolaire(classe.zone_scolaire) ? classe.zone_scolaire : 'A'
    const officielles = periodesOfficielles(classe.rentree_date, zone)
    if (officielles.length !== 5) {
      throw new Error('Le calendrier officiel de cette année scolaire n’est pas encore disponible dans l’application.')
    }
    const { error } = await supabase.from('periodes').upsert(
      officielles.map(p => ({ ...p, class_id: classe.id })),
      { onConflict: 'class_id,numero' },
    )
    if (error) throw new Error(`Création des périodes impossible : ${error.message}`)
    periodes = officielles
  }
  const { data: semaines } = await supabase
    .from('semaines').select('id, numero').eq('class_id', classe.id).order('numero')
  if (!semaines?.length) return

  const cal = datesSemainesCalendaires(periodes, semaines.length)
  const parNumero = new Map(cal.map(c => [c.numero, c]))
  for (const s of semaines) {
    const c = parNumero.get(s.numero)
    if (c) {
      await supabase.from('semaines')
        .update({ date_debut: c.date_debut, periode_numero: c.periode_numero })
        .eq('id', s.id)
    }
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
  revalidatePath('/accueil')
}

/**
 * Change le manuel : ⚠️ régénère toute la progression annuelle.
 * Supprime les semaines existantes (et donc le suivi des élèves + cahiers journaux).
 */
export async function updateManuel(manuelId: string, customProgression?: ProgressionSemaine[]) {
  const { supabase, classe } = await getClasse()

  const progression = genererProgression(manuelId, classe.rentree_date, customProgression)
  const progFr = genererProgressionFrancais(manuelId, customProgression)
  const methodeId = progFr.length > 0
    ? await ensureMethode(supabase, classe.id, 'francais')
    : null

  const [{ data: anciennesSemaines, error: semainesLectureError },
    { data: ancienneProgression, error: progressionLectureError }] = await Promise.all([
    supabase.from('semaines').select('id').eq('class_id', classe.id),
    supabase.from('progression')
      .select('class_id, methode_id, matiere, numero, items, pages, mots_exemple')
      .eq('class_id', classe.id).eq('matiere', 'francais'),
  ])
  if (semainesLectureError) throw new Error(`Lecture des semaines actuelles impossible : ${semainesLectureError.message}`)
  if (progressionLectureError) throw new Error(`Lecture de la progression actuelle impossible : ${progressionLectureError.message}`)

  const anciensIds = (anciennesSemaines ?? []).map(s => s.id)
  let nouvellesSemainesIds: string[] = []

  try {
    // Les nouvelles semaines sont preparees a cote des anciennes. Le suivi et
    // les journaux restent donc intacts jusqu'a la toute derniere operation.
    const { data: nouvellesSemaines, error: insertionSemainesError } = await supabase
      .from('semaines')
      .insert(progression.map(s => ({ ...s, class_id: classe.id })))
      .select('id')
    if (insertionSemainesError || !nouvellesSemaines) {
      throw new Error(`Création des nouvelles semaines impossible : ${insertionSemainesError?.message ?? 'réponse vide'}`)
    }
    nouvellesSemainesIds = nouvellesSemaines.map(s => s.id)

    // La contrainte (classe, matiere, numero) permet de mettre a jour chaque
    // ligne sans effacer d'abord toute la progression.
    if (progFr.length > 0 && methodeId) {
      const { error } = await supabase.from('progression').upsert(
        progFr.map(p => ({
          ...p,
          class_id: classe.id,
          methode_id: methodeId,
          matiere: 'francais' as const,
        })),
        { onConflict: 'class_id,matiere,numero' },
      )
      if (error) throw new Error(`Mise à jour de la progression impossible : ${error.message}`)
    }

    const numerosConserves = new Set(progFr.map(p => p.numero))
    const numerosASupprimer = (ancienneProgression ?? [])
      .map(p => p.numero as number)
      .filter(numero => !numerosConserves.has(numero))
    if (numerosASupprimer.length) {
      const { error } = await supabase.from('progression').delete()
        .eq('class_id', classe.id).eq('matiere', 'francais').in('numero', numerosASupprimer)
      if (error) throw new Error(`Nettoyage de l'ancienne progression impossible : ${error.message}`)
    }

    const { error: classeError } = await supabase
      .from('classes').update({ manuel_id: manuelId }).eq('id', classe.id)
    if (classeError) throw new Error(`Mise à jour du manuel impossible : ${classeError.message}`)

    // Cette suppression est une seule requete SQL. Si elle reussit, les FK
    // retirent le suivi et les journaux de l'ancien manuel comme annonce.
    if (anciensIds.length) {
      const { error } = await supabase.from('semaines').delete().in('id', anciensIds)
      if (error) throw new Error(`Suppression des anciennes semaines impossible : ${error.message}`)
    }
  } catch (error) {
    // Retour a la progression et au libelle precedents. Les anciennes semaines
    // n'ont pas encore ete supprimees si une etape precedente a echoue.
    const erreursRetour: string[] = []
    if (nouvellesSemainesIds.length) {
      const { error: retourSemainesError } = await supabase
        .from('semaines').delete().in('id', nouvellesSemainesIds)
      if (retourSemainesError) erreursRetour.push(`semaines : ${retourSemainesError.message}`)
    }
    const { error: nettoyageProgressionError } = await supabase.from('progression').delete()
      .eq('class_id', classe.id).eq('matiere', 'francais')
    if (nettoyageProgressionError) {
      erreursRetour.push(`nettoyage progression : ${nettoyageProgressionError.message}`)
    }
    if (ancienneProgression?.length) {
      const { error: retourProgressionError } = await supabase
        .from('progression').insert(ancienneProgression)
      if (retourProgressionError) erreursRetour.push(`progression : ${retourProgressionError.message}`)
    }
    const { error: retourClasseError } = await supabase.from('classes')
      .update({ manuel_id: classe.manuel_id }).eq('id', classe.id)
    if (retourClasseError) erreursRetour.push(`manuel : ${retourClasseError.message}`)

    if (erreursRetour.length) {
      const initial = error instanceof Error ? error.message : String(error)
      throw new Error(`${initial}. Retour arrière incomplet (${erreursRetour.join(' ; ')}).`)
    }
    throw error
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
}

/**
 * Remet à zéro UN bloc de la classe (utile à chaque nouvelle année), sans tout
 * supprimer :
 *  - 'eleves'   : efface tous les élèves et leur suivi (acquisitions, bilans).
 *  - 'edt'      : réinitialise l'emploi du temps à la trame CP par défaut.
 *  - 'edt-vide' : VIDE complètement l'emploi du temps (aucune trame rechargée).
 *  - 'methodes' : efface les méthodes importées et leur progression.
 *  - 'suivi'    : efface le suivi des élèves (étoiles + bilans), garde les élèves.
 *  - 'journaux' : efface tous les cahiers journaux.
 */
export async function reinitialiserBloc(
  scope: 'eleves' | 'edt' | 'edt-vide' | 'methodes' | 'suivi' | 'journaux',
) {
  const { supabase, classe } = await getClasse()
  const classId = classe.id

  if (scope === 'eleves') {
    const { data: eleves } = await supabase.from('eleves').select('id').eq('class_id', classId)
    const ids = (eleves ?? []).map(e => e.id)
    if (ids.length) {
      await supabase.from('acquisitions').delete().in('eleve_id', ids)
      await supabase.from('appreciations').delete().in('eleve_id', ids)
      await supabase.from('eleves').delete().in('id', ids)
    }
  } else if (scope === 'edt') {
    await remplacerEmploiDuTempsSansPerte(
      supabase,
      classId,
      TRAME_EDT_CP as NouveauCreneau[],
    )
  } else if (scope === 'edt-vide') {
    // Volontairement AUCUNE reinsertion : l'enseignante veut parfois repartir
    // d'une grille reellement vide, pas de la trame par defaut.
    await remplacerEmploiDuTempsSansPerte(supabase, classId, [])
  } else if (scope === 'methodes') {
    await supabase.from('progression').delete().eq('class_id', classId)
    await supabase.from('methodes').delete().eq('class_id', classId)
  } else if (scope === 'suivi' || scope === 'journaux') {
    const { data: semaines } = await supabase.from('semaines').select('id').eq('class_id', classId)
    const sids = (semaines ?? []).map(s => s.id)
    if (sids.length) {
      if (scope === 'suivi') {
        await supabase.from('acquisitions').delete().in('semaine_id', sids)
        await supabase.from('appreciations').delete().in('semaine_id', sids)
      } else {
        await supabase.from('cahier_journal').delete().in('semaine_id', sids)
      }
    }
  }

  revalidatePath('/parametres')
  revalidatePath('/planning')
  revalidatePath('/accueil')
}

/**
 * Efface TOUT le contenu de la classe mais CONSERVE la classe elle-même
 * (son nom, le prénom de l'enseignante, le manuel, la date de rentrée).
 *
 * Différence avec `reinitialiserConfiguration`, qui supprime la classe et
 * renvoie vers l'assistant : ici l'enseignante reste connectée à sa classe et
 * repart d'une page blanche pour une nouvelle année. L'emploi du temps est
 * VIDE (et non rechargé depuis la trame), conformément à la demande du 20/07.
 */
export async function reinitialiserContenuClasse() {
  const { supabase, classe } = await getClasse()
  const classId = classe.id

  const { data: semaines } = await supabase.from('semaines').select('id').eq('class_id', classId)
  const sids = (semaines ?? []).map(s => s.id)
  if (sids.length) {
    await supabase.from('acquisitions').delete().in('semaine_id', sids)
    await supabase.from('appreciations').delete().in('semaine_id', sids)
    await supabase.from('cahier_journal').delete().in('semaine_id', sids)
    await supabase.from('semaines').delete().in('id', sids)
  }
  await supabase.from('progression').delete().eq('class_id', classId)
  await supabase.from('methodes').delete().eq('class_id', classId)
  await supabase.from('eleves').delete().eq('class_id', classId)
  // Emploi du temps vide, pas de trame rechargee.
  await supabase.from('emploi_du_temps').delete().eq('class_id', classId)

  revalidatePath('/parametres')
  revalidatePath('/planning')
  revalidatePath('/accueil')
}

/**
 * Réinitialise TOUTE la configuration : supprime la classe et toutes ses données
 * (semaines, suivi des élèves, cahiers journaux, élèves, emploi du temps),
 * puis renvoie vers l'assistant de configuration. ⚠️ Irréversible.
 */
export async function reinitialiserConfiguration() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non connecté')

  await supprimerClassesUtilisateur(supabase, user.id)

  revalidatePath('/planning')
  revalidatePath('/parametres')
  redirect('/setup')
}
