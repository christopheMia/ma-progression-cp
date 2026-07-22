-- Remplace une progression dans une transaction PostgreSQL unique.
-- Si une insertion ou une mise a jour echoue, le delete est automatiquement
-- annule par PostgreSQL et l'ancienne progression reste intacte.
create or replace function remplacer_progression(
  p_class_id uuid,
  p_methode_id uuid,
  p_matiere text,
  p_numeros integer[],
  p_lignes jsonb,
  p_sync_semaines boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from classes
    where id = p_class_id and user_id = auth.uid()
  ) then
    raise exception 'Classe introuvable ou non autorisee';
  end if;

  if not exists (
    select 1 from methodes
    where id = p_methode_id and class_id = p_class_id and matiere = p_matiere
  ) then
    raise exception 'Methode incompatible avec la classe ou la matiere';
  end if;

  if jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes de progression doivent former une liste';
  end if;

  if p_numeros is not null and exists (
    select 1
    from jsonb_to_recordset(p_lignes) as x(numero integer)
    where not (x.numero = any(p_numeros))
  ) then
    raise exception 'Une semaine sort de la zone de remplacement';
  end if;

  delete from progression
  where class_id = p_class_id
    and matiere = p_matiere
    and (p_numeros is null or numero = any(p_numeros));

  insert into progression (
    class_id, methode_id, matiere, numero, items, pages, mots_exemple
  )
  select
    p_class_id,
    p_methode_id,
    p_matiere,
    x.numero,
    coalesce(x.items, '{}'),
    nullif(x.pages, ''),
    x.mots_exemple
  from jsonb_to_recordset(p_lignes) as x(
    numero integer,
    items text[],
    pages text,
    mots_exemple text[]
  );

  if p_sync_semaines then
    if p_matiere <> 'francais' then
      raise exception 'La synchronisation des semaines est reservee au francais';
    end if;

    update semaines s
    set graphemes = coalesce(x.items, '{}'),
        manuel_pages = nullif(x.pages, ''),
        mots_exemple = coalesce(x.mots_exemple, '{}')
    from jsonb_to_recordset(p_lignes) as x(
      numero integer,
      items text[],
      pages text,
      mots_exemple text[]
    )
    where s.class_id = p_class_id and s.numero = x.numero;
  end if;
end;
$$;

revoke all on function remplacer_progression(uuid, uuid, text, integer[], jsonb, boolean) from public;
grant execute on function remplacer_progression(uuid, uuid, text, integer[], jsonb, boolean) to authenticated;
