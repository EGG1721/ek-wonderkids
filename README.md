# EK WonderKids

Sitio bilingüe de cuentos y recursos familiares. HTML/CSS/JavaScript, Cloudflare Workers, D1, R2 y Resend.

## Desarrollo

Node 24 recomendado.

```sh
npm ci
npm test
npm run check
npm run build
npm run test:browser
npm run deploy:check
```

`npm run preview` muestra el sitio estático en http://127.0.0.1:4173. `npm run dev` ejecuta el Worker con almacenamiento local. Las páginas HTML son la fuente editable; las imágenes WebP se generan con `node scripts/optimize-images.mjs` al añadir nuevos originales.

Ver [OPERATIONS.md](OPERATIONS.md) para configuración, correo, privacidad, recursos, medición, hooks y verificaciones antes de publicar. No se publica automáticamente desde GitHub Actions.
