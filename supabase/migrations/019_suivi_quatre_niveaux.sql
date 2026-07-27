-- 019_suivi_quatre_niveaux.sql
--
-- Le suivi des élèves passe du binaire (acquis / non acquis) aux QUATRE niveaux
-- du LSU : non_atteint, partiellement, atteint, depasse.
--
-- Pourquoi : le bilan périodique LSU demande un positionnement sur 4 niveaux.
-- Suivre en binaire toute l'année obligeait à inventer une règle de conversion.
-- Les éditeurs du marché (Edumoov) suivent directement dans l'échelle du LSU.
-- Décision de Christophe du 27/07/2026.
--
-- Migration ADDITIVE et réversible : la colonne `acquis` est conservée et tenue
-- à jour automatiquement par un trigger. Tout le code qui la lit encore
-- (export Word, bilan IA, confettis) continue donc de fonctionner sans
-- modification. « Acquis » vaut vrai pour 'atteint' et 'depasse'.

-- ── Le niveau, sur les deux tables de suivi ──────────────────────────────────

alter table public.acquisitions add column if not exists niveau text;
alter table public.acquisitions_criteres add column if not exists niveau text;

-- Reprise de l'existant : ce qui était acquis devient 'atteint', le reste
-- 'non_atteint'. On ne peut pas deviner mieux, et on ne perd rien.
update public.acquisitions
  set niveau = case when acquis then 'atteint' else 'non_atteint' end
  where niveau is null;

update public.acquisitions_criteres
  set niveau = case when acquis then 'atteint' else 'non_atteint' end
  where niveau is null;

alter table public.acquisitions alter column niveau set default 'non_atteint';
alter table public.acquisitions alter column niveau set not null;
alter table public.acquisitions_criteres alter column niveau set default 'non_atteint';
alter table public.acquisitions_criteres alter column niveau set not null;

do $$ begin
  alter table public.acquisitions add constraint acquisitions_niveau_valide
    check (niveau in ('non_atteint', 'partiellement', 'atteint', 'depasse'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.acquisitions_criteres add constraint acquisitions_criteres_niveau_valide
    check (niveau in ('non_atteint', 'partiellement', 'atteint', 'depasse'));
exception when duplicate_object then null; end $$;

-- ── `acquis` reste vrai, dérivé du niveau ────────────────────────────────────
-- On ne supprime pas la colonne : du code la lit encore. Le trigger garantit
-- qu'elle ne peut plus diverger du niveau, quelle que soit la voie d'écriture.

create or replace function public.synchroniser_acquis_depuis_niveau()
returns trigger
language plpgsql
as $$
begin
  new.acquis := new.niveau in ('atteint', 'depasse');
  return new;
end;
$$;

drop trigger if exists acquisitions_sync_acquis on public.acquisitions;
create trigger acquisitions_sync_acquis
  before insert or update on public.acquisitions
  for each row execute function public.synchroniser_acquis_depuis_niveau();

drop trigger if exists acquisitions_criteres_sync_acquis on public.acquisitions_criteres;
create trigger acquisitions_criteres_sync_acquis
  before insert or update on public.acquisitions_criteres
  for each row execute function public.synchroniser_acquis_depuis_niveau();

-- Remise à niveau des lignes existantes (le trigger ne s'applique qu'aux écritures).
update public.acquisitions set niveau = niveau;
update public.acquisitions_criteres set niveau = niveau;
