-- SIMU - Esquema inicial para prueba piloto
-- Datos de demostracion. No cargar informacion real sin autorizacion institucional.

create extension if not exists pgcrypto;

create table if not exists public.categorias_personal (
  codigo text primary key,
  nombre text not null,
  orden smallint not null unique,
  tipo text not null check (tipo in ('militar', 'civil')),
  activo boolean not null default true
);

insert into public.categorias_personal (codigo, nombre, orden, tipo) values
  ('OO_GG', 'OO. GG.', 1, 'militar'),
  ('OO_SUP', 'OO. SUP.', 2, 'militar'),
  ('OO_SUB', 'OO. SUB.', 3, 'militar'),
  ('SOFS', 'SOFS.', 4, 'militar'),
  ('SGTOS', 'SGTOS.', 5, 'militar'),
  ('SOF_BM', 'SOF. BM.', 6, 'militar'),
  ('SGTOS_BM', 'SGTOS. BM.', 7, 'militar'),
  ('OO_SERV', 'OO. SERV.', 8, 'militar'),
  ('SOF_SERV', 'SOF. SERV.', 9, 'militar'),
  ('SGTOS_SERV', 'SGTOS. SERV.', 10, 'militar'),
  ('PROFESIONALES', 'PROFESIONALES', 11, 'civil'),
  ('TECNICOS', 'TECNICOS', 12, 'civil'),
  ('ADMINISTRATIVO', 'ADMINISTRATIVO', 13, 'civil'),
  ('AP_ADM', 'AP. ADM.', 14, 'civil')
on conflict (codigo) do update set
  nombre = excluded.nombre,
  orden = excluded.orden,
  tipo = excluded.tipo;

create table if not exists public.tipos_situacion (
  codigo text primary key,
  nombre text not null,
  no_disponible boolean not null default true,
  requiere_fecha_fin boolean not null default false,
  orden smallint not null unique,
  activo boolean not null default true
);

insert into public.tipos_situacion
  (codigo, nombre, no_disponible, requiere_fecha_fin, orden) values
  ('DISPONIBLE', 'Disponible', false, false, 1),
  ('COMISION', 'Comision', true, false, 2),
  ('CURSO', 'Curso', true, false, 3),
  ('VACACION', 'Vacacion', true, true, 4),
  ('CUENTA_VACACION', 'Cuenta vacacion', true, true, 5),
  ('BAJA_MEDICA', 'Baja medica', true, false, 6),
  ('PERMISO', 'Permiso', true, true, 7),
  ('FALLECIDO', 'Fallecido', true, false, 8),
  ('OTRA_NOVEDAD', 'Otra novedad', true, false, 9)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  no_disponible = excluded.no_disponible,
  requiere_fecha_fin = excluded.requiere_fecha_fin,
  orden = excluded.orden;

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_visible text,
  rol text not null default 'consulta' check (
    rol in ('comandante', 'jefe_plana_mayor', 'g1', 'auxiliar_g1', 'consulta')
  ),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.personal (
  id uuid primary key default gen_random_uuid(),
  codigo_demo text not null unique,
  usuario_id uuid unique references auth.users(id) on delete set null,
  unidad text not null,
  categoria_codigo text not null references public.categorias_personal(codigo),
  grado text not null,
  nombres_apellidos text not null,
  fecha_alta date,
  activo boolean not null default true,
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.situaciones_personal (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.personal(id) on delete cascade,
  situacion_codigo text not null references public.tipos_situacion(codigo),
  fecha_desde date not null,
  fecha_hasta date,
  observacion text,
  referencia text,
  vigente boolean not null default true,
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint fechas_situacion_validas check (
    fecha_hasta is null or fecha_hasta >= fecha_desde
  )
);

create table if not exists public.partes_semanales (
  id uuid primary key default gen_random_uuid(),
  fecha_parte date not null unique,
  numero_referencia text,
  lugar_emision text,
  destinatario text,
  remitente text,
  estado text not null default 'borrador' check (
    estado in ('borrador', 'revisado', 'cerrado')
  ),
  instantanea jsonb,
  elaborado_por uuid references auth.users(id) on delete set null,
  revisado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id uuid,
  accion text not null,
  usuario_id uuid,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  creado_en timestamptz not null default now()
);

create or replace function public.asignar_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists perfiles_actualizado_en on public.perfiles;
create trigger perfiles_actualizado_en
before update on public.perfiles
for each row execute function public.asignar_actualizado_en();

drop trigger if exists personal_actualizado_en on public.personal;
create trigger personal_actualizado_en
before update on public.personal
for each row execute function public.asignar_actualizado_en();

drop trigger if exists situaciones_actualizado_en on public.situaciones_personal;
create trigger situaciones_actualizado_en
before update on public.situaciones_personal
for each row execute function public.asignar_actualizado_en();

drop trigger if exists partes_actualizado_en on public.partes_semanales;
create trigger partes_actualizado_en
before update on public.partes_semanales
for each row execute function public.asignar_actualizado_en();

create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_visible)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists crear_perfil_al_registrar on auth.users;
create trigger crear_perfil_al_registrar
after insert on auth.users
for each row execute function public.crear_perfil_usuario();

create or replace function public.rol_actual()
returns text
language sql
stable
security definer set search_path = public
as $$
  select rol from public.perfiles
  where id = auth.uid() and activo = true;
$$;

create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  fila_anterior jsonb;
  fila_nueva jsonb;
  identificador uuid;
begin
  fila_anterior := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  fila_nueva := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  identificador := coalesce(
    nullif(fila_nueva ->> 'id', '')::uuid,
    nullif(fila_anterior ->> 'id', '')::uuid
  );
  insert into public.auditoria
    (tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos)
  values
    (tg_table_name, identificador, tg_op, auth.uid(), fila_anterior, fila_nueva);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists auditar_personal on public.personal;
create trigger auditar_personal
after insert or update or delete on public.personal
for each row execute function public.registrar_auditoria();

drop trigger if exists auditar_situaciones on public.situaciones_personal;
create trigger auditar_situaciones
after insert or update or delete on public.situaciones_personal
for each row execute function public.registrar_auditoria();

drop trigger if exists auditar_partes on public.partes_semanales;
create trigger auditar_partes
after insert or update or delete on public.partes_semanales
for each row execute function public.registrar_auditoria();

create or replace view public.v_situacion_actual
with (security_invoker = true)
as
select
  p.id,
  p.codigo_demo,
  p.usuario_id,
  p.unidad,
  p.categoria_codigo,
  c.nombre as categoria,
  c.orden as categoria_orden,
  p.grado,
  p.nombres_apellidos,
  coalesce(s.situacion_codigo, 'DISPONIBLE') as situacion_codigo,
  coalesce(ts.nombre, 'Disponible') as situacion,
  coalesce(ts.no_disponible, false) as no_disponible,
  s.fecha_desde,
  s.fecha_hasta,
  s.observacion,
  s.referencia
from public.personal p
join public.categorias_personal c on c.codigo = p.categoria_codigo
left join lateral (
  select sp.*
  from public.situaciones_personal sp
  where sp.personal_id = p.id
    and sp.vigente = true
    and sp.fecha_desde <= current_date
    and (sp.fecha_hasta is null or sp.fecha_hasta >= current_date)
  order by sp.fecha_desde desc, sp.creado_en desc
  limit 1
) s on true
left join public.tipos_situacion ts on ts.codigo = s.situacion_codigo
where p.activo = true;

create or replace view public.v_resumen_efectivos
with (security_invoker = true)
as
select
  c.codigo,
  c.nombre,
  c.orden,
  count(v.id)::integer as efectivo_actual,
  count(v.id) filter (where v.no_disponible)::integer as no_disponibles,
  count(v.id) filter (where not v.no_disponible)::integer as disponibles
from public.categorias_personal c
left join public.v_situacion_actual v on v.categoria_codigo = c.codigo
where c.activo = true
group by c.codigo, c.nombre, c.orden
order by c.orden;

alter table public.categorias_personal enable row level security;
alter table public.tipos_situacion enable row level security;
alter table public.perfiles enable row level security;
alter table public.personal enable row level security;
alter table public.situaciones_personal enable row level security;
alter table public.partes_semanales enable row level security;
alter table public.auditoria enable row level security;

drop policy if exists categorias_lectura on public.categorias_personal;
create policy categorias_lectura on public.categorias_personal
for select to authenticated using (true);

drop policy if exists situaciones_catalogo_lectura on public.tipos_situacion;
create policy situaciones_catalogo_lectura on public.tipos_situacion
for select to authenticated using (true);

drop policy if exists perfil_propio_lectura on public.perfiles;
create policy perfil_propio_lectura on public.perfiles
for select to authenticated using (
  id = auth.uid() or public.rol_actual() in ('comandante', 'jefe_plana_mayor', 'g1')
);

drop policy if exists perfiles_g1_modificar on public.perfiles;
create policy perfiles_g1_modificar on public.perfiles
for update to authenticated
using (public.rol_actual() = 'g1')
with check (public.rol_actual() = 'g1');

drop policy if exists personal_lectura_autorizada on public.personal;
create policy personal_lectura_autorizada on public.personal
for select to authenticated using (
  public.rol_actual() in ('comandante', 'jefe_plana_mayor', 'g1', 'auxiliar_g1')
  or usuario_id = auth.uid()
);

drop policy if exists personal_g1_insertar on public.personal;
create policy personal_g1_insertar on public.personal
for insert to authenticated with check (
  public.rol_actual() in ('g1', 'auxiliar_g1')
);

drop policy if exists personal_g1_actualizar on public.personal;
create policy personal_g1_actualizar on public.personal
for update to authenticated
using (public.rol_actual() in ('g1', 'auxiliar_g1'))
with check (public.rol_actual() in ('g1', 'auxiliar_g1'));

drop policy if exists situaciones_lectura_autorizada on public.situaciones_personal;
create policy situaciones_lectura_autorizada on public.situaciones_personal
for select to authenticated using (
  public.rol_actual() in ('comandante', 'jefe_plana_mayor', 'g1', 'auxiliar_g1')
  or exists (
    select 1 from public.personal p
    where p.id = personal_id and p.usuario_id = auth.uid()
  )
);

drop policy if exists situaciones_g1_insertar on public.situaciones_personal;
create policy situaciones_g1_insertar on public.situaciones_personal
for insert to authenticated with check (
  public.rol_actual() in ('g1', 'auxiliar_g1')
);

drop policy if exists situaciones_g1_actualizar on public.situaciones_personal;
create policy situaciones_g1_actualizar on public.situaciones_personal
for update to authenticated
using (public.rol_actual() in ('g1', 'auxiliar_g1'))
with check (public.rol_actual() in ('g1', 'auxiliar_g1'));

drop policy if exists partes_lectura_autorizada on public.partes_semanales;
create policy partes_lectura_autorizada on public.partes_semanales
for select to authenticated using (
  public.rol_actual() in ('comandante', 'jefe_plana_mayor', 'g1', 'auxiliar_g1')
);

drop policy if exists partes_g1_insertar on public.partes_semanales;
create policy partes_g1_insertar on public.partes_semanales
for insert to authenticated with check (
  public.rol_actual() in ('g1', 'auxiliar_g1')
);

drop policy if exists partes_g1_actualizar on public.partes_semanales;
create policy partes_g1_actualizar on public.partes_semanales
for update to authenticated
using (public.rol_actual() in ('g1', 'auxiliar_g1'))
with check (public.rol_actual() in ('g1', 'auxiliar_g1'));

drop policy if exists auditoria_lectura_mando on public.auditoria;
create policy auditoria_lectura_mando on public.auditoria
for select to authenticated using (
  public.rol_actual() in ('comandante', 'jefe_plana_mayor', 'g1')
);

grant usage on schema public to authenticated;
grant select on public.categorias_personal, public.tipos_situacion to authenticated;
grant select on public.v_situacion_actual, public.v_resumen_efectivos to authenticated;
grant select, insert, update on public.personal, public.situaciones_personal, public.partes_semanales to authenticated;
grant select, update on public.perfiles to authenticated;
grant select on public.auditoria to authenticated;

alter publication supabase_realtime add table public.personal;
alter publication supabase_realtime add table public.situaciones_personal;
alter publication supabase_realtime add table public.partes_semanales;

-- Comprobacion final. Debe devolver dos filas con cantidades mayores a cero.
select 'categorias_personal' as tabla, count(*) as registros
from public.categorias_personal
union all
select 'tipos_situacion', count(*)
from public.tipos_situacion;
