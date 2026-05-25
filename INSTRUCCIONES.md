# ASSUR Control — Instalación, Desarrollo Y Publicación

## Uso Local

```bash
npm install
npm run dev
```

Abrir:

```text
http://127.0.0.1:5174/
```

## Backend Local

```bash
npm run backend
```

Backend:

```text
http://127.0.0.1:8787
```

Validar:

```bash
npm run backend:check
npm run backend:test
```

## QA De Etapa

```bash
npm run stage:check
```

Incluye:

- provider config
- production readiness
- Supabase seed check
- Supabase push dry-run
- smoke checks
- auditoría funcional
- build

## Publicación Cloud

Documentación:

- `docs/publishing-checklist.md`
- `docs/data-model-cloud.md`
- `docs/integration-architecture.md`
- `docs/security-auth-plan.md`

Preparar seed:

```bash
npm run supabase:seed:preview
npm run supabase:seed:sql
```

Archivos generados:

- `supabase/seed.preview.json`
- `supabase/seed.preview.sql`

## Variables

Modo local:

```bash
VITE_DATA_PROVIDER=local
VITE_AUTH_MODE=demo
```

Modo Supabase:

```bash
VITE_DATA_PROVIDER=supabase_normalized
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

Solo backend/scripts:

```bash
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

Nunca poner `SUPABASE_SERVICE_ROLE_KEY` ni tokens Softland en frontend.

## Roles Demo Locales

| Usuario | Email | Password |
| --- | --- | --- |
| Administrador | admin@assur.cl | admin123 |
| Operaciones | oper@assur.cl | oper123 |
| Técnico | tec@assur.cl | tec123 |

Estos usuarios son solo para desarrollo. Producción debe usar Supabase Auth.

