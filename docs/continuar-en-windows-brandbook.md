# Continuar El Proyecto En Windows

Esta guia deja el entorno listo para continuar el trabajo desde un PC Windows sin perder el avance del brandbook ni exponer variables privadas.

## 1. Que Se Sincroniza

Usa GitHub para el codigo del proyecto:

- `src/`
- `public/brand/`
- `docs/`
- `package.json`
- configuracion de Vite, Supabase y despliegue

Usa Google Drive, OneDrive o Dropbox para archivos pesados o editables del brandbook:

- presentaciones
- PDFs finales
- archivos de Photoshop, Illustrator, Figma exportado o imagenes pesadas
- logos maestros no optimizados
- referencias visuales

No subas a Git:

- `.env.local`
- claves privadas
- service role keys
- tokens de Softland
- carpetas `node_modules/`, `dist/`, `tmp/`

## 2. Preparar Este Mac

Desde esta carpeta:

```bash
git status
git add .
git commit -m "Guardar avance inicial del proyecto"
```

Despues crea un repositorio en GitHub y conecta el remoto:

```bash
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

Si prefieres SSH:

```bash
git remote add origin git@github.com:TU-USUARIO/TU-REPO.git
git push -u origin main
```

## 3. Preparar Windows

Instala:

- Git for Windows: https://git-scm.com/download/win
- Node.js LTS: https://nodejs.org/
- Visual Studio Code: https://code.visualstudio.com/

Luego abre PowerShell o la terminal de VS Code:

```powershell
git clone https://github.com/TU-USUARIO/TU-REPO.git
cd TU-REPO
npm install
copy .env.example .env.local
```

Edita `.env.local` en Windows y completa los mismos valores privados que existen en este Mac.

## 4. Variables Que Deben Existir En Windows

Estas variables existen localmente en este Mac y deben recrearse en el `.env.local` de Windows:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ASSUR_BACKEND_URL=
VITE_DATA_PROVIDER=
VITE_AUTH_MODE=
VITE_BACKEND_SYNC_ENABLED=
ASSUR_BACKEND_PORT=
ASSUR_BACKEND_HOST=
ASSUR_DATA_FILE=
ASSUR_BACKEND_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Importante: `SUPABASE_SERVICE_ROLE_KEY` solo debe usarse en backend o scripts locales. Nunca debe quedar expuesta en frontend, capturas, documentos publicos ni repositorios.

## 5. Ejecutar En Windows

Frontend:

```powershell
npm run dev
```

Normalmente abre:

```text
http://127.0.0.1:5173/
```

Backend local, si lo necesitas:

```powershell
npm run backend
```

Backend:

```text
http://127.0.0.1:8787
```

Validacion rapida:

```powershell
npm run build
npm run backend:check
```

## 6. Flujo Diario Mac/Windows

Antes de cambiar de computador:

```bash
git status
git add .
git commit -m "Guardar avance brandbook"
git push
```

Al llegar al otro computador:

```bash
git pull
npm install
npm run dev
```

Si cambias variables en `.env.local`, copialas manualmente al otro equipo o guardalas en un gestor seguro de claves. No las subas al repo.

## 7. Dónde Esta El Material De Marca En Este Proyecto

Activos actuales:

- `public/brand/`
- `src/assets/brand/`
- `public/design-preview.html`
- `public/quote-template-preview.html`
- `public/ux-operational-preview.html`

Documentacion tecnica:

- `INSTRUCCIONES.md`
- `docs/`

Si el brandbook va a crecer, crea una carpeta compartida externa para los archivos fuente pesados y conserva en el repo solo los assets optimizados que usa la app.
