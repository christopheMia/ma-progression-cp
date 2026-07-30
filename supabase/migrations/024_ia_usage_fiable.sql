-- Rend le compteur de consommation IA fiable.
--
-- Trois defauts constates le 30/07/2026, alors que la console Anthropic
-- affichait 3,26 $ consommes pendant que la jauge en affichait 0,18 :
--
-- 1. Seuls `input_tokens` et `output_tokens` etaient enregistres. L API en
--    renvoie quatre : les tokens de cache manquaient completement.
-- 2. `class_id` etait en `on delete cascade`. Chaque reinitialisation de classe
--    effacait tout l historique, pendant que la facture, elle, continuait.
-- 3. Un appel passe avant la creation de la classe (assistant pendant le setup)
--    n etait jamais enregistre, faute de `class_id` a rattacher.
--
-- La consommation appartient desormais a l UTILISATEUR, pas a la classe.

-- 1. Rattachement a l utilisateur ------------------------------------------

alter table public.ia_usage
  add column if not exists user_id uuid references auth.users on delete cascade;

-- Les lignes existantes sont rattachees via leur classe, tant qu elle existe.
update public.ia_usage u
set user_id = c.user_id
from public.classes c
where c.id = u.class_id and u.user_id is null;

-- 2. Une classe supprimee n efface plus la consommation ----------------------

alter table public.ia_usage alter column class_id drop not null;

do $$ begin
  alter table public.ia_usage drop constraint if exists ia_usage_class_id_fkey;
  alter table public.ia_usage
    add constraint ia_usage_class_id_fkey
    foreign key (class_id) references public.classes(id) on delete set null;
end $$;

-- 3. Les compteurs qui manquaient -------------------------------------------

alter table public.ia_usage
  add column if not exists cache_creation_tokens integer not null default 0,
  add column if not exists cache_read_tokens integer not null default 0,
  -- Le cout est fige a l instant de l appel : changer un tarif demain ne doit
  -- pas reecrire le passe.
  add column if not exists cout_usd numeric(12, 6) not null default 0,
  -- De quoi auditer : quelle route, quel modele.
  add column if not exists route text,
  add column if not exists modele text;

-- 4. La politique suit le nouveau proprietaire -------------------------------

drop policy if exists "Users manage own ia_usage" on public.ia_usage;

do $$ begin
  create policy "Users manage own ia_usage" on public.ia_usage
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

create index if not exists ia_usage_user_id_idx on public.ia_usage (user_id, created_at desc);

-- 5. Le point de repere ------------------------------------------------------
--
-- L API de couts d Anthropic est reservee aux comptes organisation, donc
-- l application ne peut PAS lire le solde reel. Elle ne sait qu estimer.
-- L utilisateur releve son solde sur console.anthropic.com et le note ici ;
-- la jauge affiche alors « solde releve moins consommation estimee depuis ».
-- Toute derive se corrige d elle-meme au prochain releve.

create table if not exists public.ia_solde (
  user_id uuid primary key references auth.users on delete cascade,
  solde_usd numeric(12, 4) not null,
  releve_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ia_solde enable row level security;

do $$ begin
  create policy "Users manage own ia_solde" on public.ia_solde
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
