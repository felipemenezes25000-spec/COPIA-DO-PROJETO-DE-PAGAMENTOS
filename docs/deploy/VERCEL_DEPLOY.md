# Deploy Vercel — RenoveJá+

## Configuração obrigatória

Em **Settings → Build and Deployment**:

| Campo | Valor |
|-------|--------|
| **Root Directory** | `frontend-web` |
| **Framework Preset** | Other ou Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

## Rotas SPA

O `vercel.json` contém rewrites para que `/admin`, `/admin/login`, `/verify/:id` etc. retornem `index.html` e o React Router funcione.

## 404.html

O build copia `index.html` para `404.html` como fallback adicional.
