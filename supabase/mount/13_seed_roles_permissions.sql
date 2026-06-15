-- Semilla productiva de roles y matriz base de permisos por modulo/accion.
-- Ejecutar despues de 01_schema.sql y 03_bootstrap_profiles_TEMPLATE.sql.

begin;

insert into public.roles (id, company_id, code, name, status, metadata)
values
  ('role-admin', '00000000-0000-0000-0000-000000000001', 'admin', 'Administrador', 'Activo', '{"system":true}'::jsonb),
  ('role-gerente-general', '00000000-0000-0000-0000-000000000001', 'gerente_general', 'Gerente General', 'Activo', '{"system":true,"scope":"all"}'::jsonb),
  ('role-gerente-operaciones-admin', '00000000-0000-0000-0000-000000000001', 'gerente_operaciones_admin', 'Gerente Operaciones y Administracion', 'Activo', '{"scope":"consolidated","restricted_config":true}'::jsonb),
  ('role-gerencia', '00000000-0000-0000-0000-000000000001', 'gerencia', 'Gerencia', 'Activo', '{}'::jsonb),
  ('role-comercial', '00000000-0000-0000-0000-000000000001', 'comercial', 'Vendedor', 'Activo', '{}'::jsonb),
  ('role-jefe-comercial', '00000000-0000-0000-0000-000000000001', 'jefe_comercial', 'Jefe comercial', 'Activo', '{}'::jsonb),
  ('role-operaciones', '00000000-0000-0000-0000-000000000001', 'operaciones', 'Operaciones', 'Activo', '{}'::jsonb),
  ('role-administrativo-operaciones', '00000000-0000-0000-0000-000000000001', 'administrativo_operaciones', 'Administrativo operaciones', 'Activo', '{}'::jsonb),
  ('role-supervisor', '00000000-0000-0000-0000-000000000001', 'supervisor', 'Supervisor', 'Activo', '{}'::jsonb),
  ('role-tecnico', '00000000-0000-0000-0000-000000000001', 'tecnico', 'Tecnico terreno', 'Activo', '{}'::jsonb),
  ('role-monitoreo', '00000000-0000-0000-0000-000000000001', 'monitoreo', 'Monitoreo', 'Activo', '{}'::jsonb),
  ('role-finanzas', '00000000-0000-0000-0000-000000000001', 'finanzas', 'Finanzas', 'Activo', '{}'::jsonb),
  ('role-almacen', '00000000-0000-0000-0000-000000000001', 'almacen', 'Almacen', 'Activo', '{}'::jsonb),
  ('role-viewer', '00000000-0000-0000-0000-000000000001', 'viewer', 'Solo lectura', 'Activo', '{}'::jsonb)
on conflict (id) do update set
  company_id = excluded.company_id,
  code = excluded.code,
  name = excluded.name,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = now();

delete from public.role_permissions
where company_id = '00000000-0000-0000-0000-000000000001'
  and role_id in (
    'role-admin','role-gerente-general','role-gerente-operaciones-admin',
    'role-gerencia','role-comercial','role-jefe-comercial',
    'role-operaciones','role-administrativo-operaciones','role-supervisor',
    'role-tecnico','role-monitoreo','role-finanzas','role-almacen','role-viewer'
  );

with
modules(module_id) as (
  values
    ('dashboard'), ('comercial_dashboard'), ('clientes'), ('pipeline'),
    ('solicitudes_cotizacion'), ('cotizacion_rapida'), ('bandeja_cotizaciones'),
    ('cotizaciones'), ('paquetes'), ('propuestas'), ('instalaciones'),
    ('proyectos'), ('aprobaciones'), ('personal'), ('materiales'), ('almacen'),
    ('supervisor'), ('incidencias'), ('servicios'), ('finanzas'), ('hitos'),
    ('analisis'), ('config'), ('assistant')
),
actions(action) as (
  values
    ('ver'), ('crear'), ('editar'), ('eliminar'), ('aprobar'), ('convertir'),
    ('exportar'), ('gestionar_costos'), ('gestionar_materiales')
),
allowances(role_id, module_id, action) as (
  -- Admin: control total.
  select 'role-admin', module_id, action from modules cross join actions

  union all
  select 'role-gerente-general', module_id, action from modules cross join actions

  union all
  select 'role-gerente-operaciones-admin', module_id, action
  from (values
    ('dashboard'), ('comercial_dashboard'), ('clientes'), ('pipeline'),
    ('solicitudes_cotizacion'), ('cotizacion_rapida'), ('bandeja_cotizaciones'),
    ('cotizaciones'), ('paquetes'), ('propuestas'), ('instalaciones'),
    ('proyectos'), ('aprobaciones'), ('personal'), ('materiales'), ('almacen'),
    ('supervisor'), ('incidencias'), ('servicios'), ('finanzas'), ('hitos'),
    ('analisis'), ('assistant')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('finanzas','hitos','analisis')
        then array['ver','exportar']
      when m.module_id in ('cotizaciones','propuestas','proyectos','servicios')
        then array['ver','aprobar','exportar']
      when m.module_id in ('clientes','pipeline','solicitudes_cotizacion','instalaciones')
        then array['ver','crear','editar','exportar']
      when m.module_id in ('materiales','almacen','personal','supervisor','incidencias')
        then array['ver','exportar']
      when m.module_id = 'cotizacion_rapida'
        then array['ver','crear']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-gerencia', module_id, action
  from (values
    ('dashboard'), ('comercial_dashboard'), ('clientes'), ('pipeline'),
    ('solicitudes_cotizacion'), ('cotizacion_rapida'), ('bandeja_cotizaciones'),
    ('cotizaciones'), ('paquetes'), ('propuestas'), ('instalaciones'),
    ('proyectos'), ('aprobaciones'), ('personal'), ('materiales'), ('almacen'),
    ('supervisor'), ('incidencias'), ('servicios'), ('finanzas'), ('hitos'),
    ('analisis')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('cotizaciones','paquetes','propuestas')
        then array['ver','crear','editar','aprobar','convertir','gestionar_costos','gestionar_materiales']
      when m.module_id in ('aprobaciones','servicios')
        then array['ver','aprobar']
      when m.module_id = 'cotizacion_rapida'
        then array['ver','crear']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-comercial', module_id, action
  from (values
    ('dashboard'), ('comercial_dashboard'), ('clientes'), ('pipeline'),
    ('solicitudes_cotizacion'), ('cotizacion_rapida'), ('paquetes'),
    ('propuestas'), ('instalaciones')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('clientes','pipeline','solicitudes_cotizacion','instalaciones')
        then array['ver','crear','editar']
      when m.module_id = 'cotizacion_rapida'
        then array['ver','crear']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-jefe-comercial', module_id, action
  from (values
    ('dashboard'), ('comercial_dashboard'), ('clientes'), ('pipeline'),
    ('solicitudes_cotizacion'), ('cotizacion_rapida'), ('bandeja_cotizaciones'),
    ('cotizaciones'), ('paquetes'), ('propuestas'), ('instalaciones'),
    ('aprobaciones'), ('materiales'), ('servicios'), ('analisis')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('clientes','pipeline','solicitudes_cotizacion','instalaciones')
        then array['ver','crear','editar']
      when m.module_id in ('cotizacion_rapida')
        then array['ver','crear']
      when m.module_id in ('propuestas')
        then array['ver','editar']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-operaciones', module_id, action
  from (values
    ('dashboard'), ('clientes'), ('solicitudes_cotizacion'), ('bandeja_cotizaciones'), ('cotizaciones'),
    ('paquetes'), ('propuestas'), ('instalaciones'), ('proyectos'),
    ('aprobaciones'), ('personal'), ('materiales'), ('almacen'), ('supervisor'),
    ('incidencias'), ('servicios')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('cotizaciones','paquetes','propuestas','proyectos')
        then array['ver','crear','editar','convertir','gestionar_costos','gestionar_materiales']
      when m.module_id in ('clientes','solicitudes_cotizacion')
        then array['ver','crear','editar']
      when m.module_id = 'aprobaciones'
        then array['ver','aprobar']
      when m.module_id in ('materiales','almacen')
        then array['ver','crear','editar','gestionar_materiales']
      when m.module_id in ('bandeja_cotizaciones','instalaciones','personal','supervisor','incidencias','servicios')
        then array['ver','crear','editar']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-administrativo-operaciones', module_id, action
  from (values
    ('dashboard'), ('clientes'), ('bandeja_cotizaciones'), ('cotizaciones'),
    ('paquetes'), ('propuestas'), ('instalaciones'), ('proyectos'),
    ('aprobaciones'), ('personal'), ('materiales'), ('almacen'), ('incidencias'),
    ('servicios')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('materiales','almacen','cotizaciones','paquetes','proyectos')
        then array['ver','crear','editar','gestionar_materiales']
      when m.module_id in ('bandeja_cotizaciones','incidencias')
        then array['ver','editar']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-supervisor', module_id, action
  from (values
    ('dashboard'), ('instalaciones'), ('proyectos'), ('aprobaciones'),
    ('personal'), ('materiales'), ('supervisor'), ('incidencias'), ('servicios')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('proyectos','supervisor','incidencias')
        then array['ver','editar']
      when m.module_id = 'aprobaciones'
        then array['ver','aprobar']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-monitoreo', module_id, action
  from (values
    ('dashboard'), ('clientes'), ('instalaciones'), ('proyectos'),
    ('incidencias'), ('servicios')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id = 'servicios'
        then array['ver','crear','editar','aprobar']
      when m.module_id = 'incidencias'
        then array['ver','crear']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-finanzas', module_id, action
  from (values
    ('dashboard'), ('clientes'), ('propuestas'), ('instalaciones'), ('proyectos'),
    ('servicios'), ('finanzas'), ('hitos'), ('analisis')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('finanzas','hitos')
        then array['ver','crear','editar','eliminar','exportar']
      else array['ver']
    end) as action
  ) a

  union all
  select 'role-almacen', module_id, action
  from (values
    ('dashboard'), ('proyectos'), ('aprobaciones'), ('materiales'), ('almacen')
  ) m(module_id)
  cross join lateral (
    select unnest(case
      when m.module_id in ('materiales','almacen')
        then array['ver','crear','editar','gestionar_materiales']
      else array['ver']
    end) as action
  ) a

  union all
  select role_id, 'assistant', 'ver'
  from (values
    ('role-gerente-general'), ('role-gerente-operaciones-admin'),
    ('role-gerencia'), ('role-comercial'), ('role-jefe-comercial'),
    ('role-operaciones'), ('role-administrativo-operaciones'), ('role-supervisor'),
    ('role-tecnico'), ('role-monitoreo'), ('role-finanzas'), ('role-almacen'),
    ('role-viewer')
  ) r(role_id)

  union all
  select 'role-viewer', module_id, 'ver'
  from modules
  where module_id <> 'config'
)
insert into public.role_permissions (id, company_id, role_id, module_id, action, allowed)
select distinct
  concat(role_id, '-', module_id, '-', action),
  '00000000-0000-0000-0000-000000000001'::uuid,
  role_id,
  module_id,
  action,
  true
from allowances
on conflict (company_id, role_id, module_id, action) do update set
  allowed = excluded.allowed,
  updated_at = now();

commit;
