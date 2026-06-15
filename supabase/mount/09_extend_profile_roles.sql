alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'admin',
      'gerente_general',
      'gerente_operaciones_admin',
      'gerencia',
      'comercial',
      'jefe_comercial',
      'operaciones',
      'administrativo_operaciones',
      'supervisor',
      'tecnico',
      'monitoreo',
      'finanzas',
      'almacen',
      'viewer'
    )
  );
