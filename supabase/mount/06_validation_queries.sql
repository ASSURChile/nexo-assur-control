-- Validaciones post montaje NEXO por ASSUR.
-- Ejecutar despues de aplicar el kit completo.

select 'companies' as table_name, count(*) as rows from public.companies
union all select 'profiles', count(*) from public.profiles
union all select 'clients', count(*) from public.clients
union all select 'sites', count(*) from public.sites
union all select 'projects', count(*) from public.projects
union all select 'project_tasks', count(*) from public.project_tasks
union all select 'roles', count(*) from public.roles
union all select 'role_permissions', count(*) from public.role_permissions
union all select 'legal_entities', count(*) from public.legal_entities
union all select 'business_units', count(*) from public.business_units
union all select 'commercial_packages', count(*) from public.commercial_packages
union all select 'quick_quotes', count(*) from public.quick_quotes
union all select 'invoices', count(*) from public.invoices
union all select 'accounts_payable', count(*) from public.accounts_payable
union all select 'assistant_threads', count(*) from public.assistant_threads
union all select 'assistant_messages', count(*) from public.assistant_messages
union all select 'assistant_tool_calls', count(*) from public.assistant_tool_calls
union all select 'assistant_usage_limits', count(*) from public.assistant_usage_limits
order by table_name;

select id, full_name, email, role, active
from public.profiles
order by role, email;

select r.code as role, rp.module_id, rp.action, rp.allowed
from public.roles r
join public.role_permissions rp on rp.role_id = r.id and rp.company_id = r.company_id
where rp.allowed = true
order by r.code, rp.module_id, rp.action;

select le.name as legal_entity, bu.name as business_unit, bu.code, bu.status
from public.business_units bu
left join public.legal_entities le on le.id = bu.legal_entity_id
order by le.name, bu.name;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'clients','sites','projects','project_tasks','invoices',
    'accounts_payable','recurring_services','service_billing_expectations',
    'commercial_packages','commercial_package_items','commercial_package_services','quick_quotes',
    'roles','role_permissions','profile_permissions','attachments','activity_events','error_logs',
    'assistant_threads','assistant_messages','assistant_tool_calls','assistant_feedback','assistant_usage_limits'
  )
order by tablename;

select id, public
from storage.buckets
where id in ('project-evidence','project-reports','signatures','service-documents')
order by id;
