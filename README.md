# TV Indicadores

App para exponer en un link publico, tipo diapositivas, un PDF que se actualiza
todos los dias desde Power BI (via Power Automate).

Flujo:

```
Power BI (actualiza 7 AM)
  -> Power Automate exporta el reporte a PDF (4 paginas)
  -> Power Automate hace POST del PDF a /api/upload
  -> Esta app guarda el PDF en Vercel Blob
  -> /  muestra cada pagina del PDF a pantalla completa, avanzando sola
```

## 1. Deploy en Vercel

1. Subi esta carpeta a un repo de GitHub (o `vercel --prod` directo desde acá).
2. Importa el repo en Vercel.
3. En el proyecto de Vercel, andá a **Storage -> Create Database -> Blob** y
   conectalo al proyecto. Esto crea automaticamente la variable de entorno
   `BLOB_READ_WRITE_TOKEN`.
4. En **Settings -> Environment Variables** agregá:
   - `UPLOAD_SECRET`: un token secreto inventado por vos (ej. generalo con
     `openssl rand -hex 32`). Power Automate lo va a usar para autenticarse.
5. Redeploy.

## 2. Configurar el flujo en Power Automate

Despues de que Power Automate exporte el PDF (accion "Export To File" de
Power BI, formato PDF), agregá una accion **HTTP**:

- Metodo: `POST`
- URI: `https://TU-APP.vercel.app/api/upload`
- Headers:
  - `Authorization`: `Bearer TU_UPLOAD_SECRET`
  - `Content-Type`: `application/pdf`
- Body: el contenido binario del PDF (el output del paso "Export To File").

Cada vez que corra el flujo, el PDF nuevo reemplaza al anterior en la misma
URL (`dashboard.pdf`), así no hace falta cambiar nada mas.

## 3. Ver las diapositivas

Abrí `https://TU-APP.vercel.app/` en la Smart TV / Chromecast / navegador.

Parámetros opcionales por query string:

- `?seconds=20` — segundos por diapositiva (default: 15).
- `?poll=10` — cada cuantos minutos revisa si hay un PDF nuevo (default: 5).

Ejemplo: `https://TU-APP.vercel.app/?seconds=20&poll=10`

La pagina detecta sola cuando Power Automate sube un PDF nuevo (por el
polling) y recarga las diapositivas sin que haya que tocar nada en la TV.

## Desarrollo local

```bash
npm install
npm run dev
```

Necesitás las variables `BLOB_READ_WRITE_TOKEN` (la das de alta con
`vercel env pull` una vez linkeado el proyecto) y `UPLOAD_SECRET` en un
archivo `.env.local`.

Para probar la subida manualmente:

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer TU_UPLOAD_SECRET" \
  -H "Content-Type: application/pdf" \
  --data-binary "@reporte.pdf"
```
