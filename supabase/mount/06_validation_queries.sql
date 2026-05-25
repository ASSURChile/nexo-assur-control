-- Validaciones post montaje ASSUR Control.
-- Ejecutar despues de aplicar 01-05.

select 'companies' as table_name, count(*) as rows from public.companies
union all select 'profiles', count(*) from public.profiles
union all select 'clients', count(*) from public.clients
union all select 'sites', count(*) from public.sites
union all select 'projects', count(*) from public.projects
union all select 'project_tasks', count(*) from public.project_tasks
union all select 'commercial_packages', count(*) from public.commercial_packages
union all select 'quick_quotes', count(*) from public.quick_quotes
union all select 'invoices', count(*) from public.invoices
union all select 'accounts_payable', count(*) from public.accounts_payable
order by table_name;

select id, full_name, email, role, active
from public.profiles
order by role, email;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'clients','sites','projects','project_tasks','invoices',
    'accounts_payable','recurring_services','service_billing_expectations',
    'commercial_packages','commercial_package_items','commercial_package_services','quick_quotes'
  )
order by tablename;

select id, public
from storage.buckets
where id in ('project-evidence','project-reports','signatures','service-documents')
order by id;
