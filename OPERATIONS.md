# Revisión y publicación

## Arquitectura

HTML/CSS/JavaScript estáticos, Cloudflare Workers, D1 para solicitudes, R2 para PDF y Resend para correo. Google Analytics 4 utiliza la propiedad ya presente en las portadas. No hay integración activa de MailerLite en este código.

`npm run build` copia únicamente archivos públicos a `dist/`. El Worker usa ese directorio como assets. No publiques la raíz del repositorio como carpeta de assets. `.wrangler/` conserva el estado local y no debe versionarse ni publicarse.

## Comprobaciones locales

Node 24 recomendado. Ejecuta `npm ci`, `npm test`, `npm run check`, `npm run build` y `npm run test:browser`. Para Playwright: `npx playwright install chromium` si no hay Edge instalado. `npm run preview` muestra únicamente los archivos estáticos; las pruebas de navegador interceptan la API con respuestas simuladas. `npm run dev` ejecuta el Worker con almacenamiento local.

`npm run deploy:check` valida la configuración y el empaquetado sin publicar. Puede requerir permiso para ejecutar el runtime de Cloudflare. GitHub Actions repite las comprobaciones; no despliega.

## Antes de publicar

### Publicaciones de ramas de trabajo

La versión financiera `ba6e895` quedó pública por la integración automática de Cloudflare y el dueño confirmó que desea mantenerla. Las siguientes revisiones se preparan sin reemplazar esa versión. `scripts/deployment-policy.mjs` detiene Workers Builds cuando `WORKERS_CI=1` y la rama no es `main`, incluso si falta la variable de rama. Este bloqueo intencional aparece como un build detenido en Cloudflare; GitHub Actions y las pruebas locales pueden seguir comprobando los cambios.

Este control del repositorio no cambia la configuración de la cuenta. En Cloudflare, revisar **Settings > Build > Branch control** para usar `main` como rama de producción y configurar previews aisladas. No activar `main` hasta incorporar la versión financiera que el dueño quiere conservar; `main` todavía contiene el sitio anterior. El guard no protege commits antiguos que no lo incluyen ni sustituye los permisos de despliegue de la cuenta.

Contacto público indicado por el dueño: `contac@ekwonderkids.com`. Su funcionamiento como buzón todavía requiere verificación.

### Verificación real del recurso financiero

El 28 de octubre de 2026 se realizaron dos solicitudes de producción autorizadas por el dueño, una por idioma. La interfaz informó aceptación del envío y recepción del PDF en ambos casos; el dueño confirmó que recibió ambos correos en su buzón. No se repitieron envíos adicionales. La dirección privada de prueba no se publica en este documento. Esto valida el recorrido del recurso financiero, no todos los recursos del catálogo ni el nuevo buzón de contacto.

1. Confirmar que Cloudflare usa `wrangler.jsonc` y construye `dist/`, y que el despliegue de producción sigue la rama prevista. El README anterior decía Pages; la configuración del repositorio corresponde a Workers.
2. Confirmar en el entorno de destino los bindings `DB`, `RESOURCES`, `ASSETS` y `SUBSCRIBE_LIMITER`. El límite básico es de 10 solicitudes/minuto por IP y centro de datos; no es una defensa global contra bots distribuidos. La comprobación adicional de solicitudes recientes por correo reduce repeticiones, pero no garantiza exclusión de carreras concurrentes.
3. Mantener `RESEND_API_KEY`, `FROM_EMAIL` y `FROM_EMAIL_NEWSLETTER` como secretos/configuración privada. No introducir sus valores en Git. Verificar dominio remitente, SPF/DKIM y registros del proveedor antes de probar correo real con una dirección del dueño autorizada.
4. Confirmar en R2 cada nombre de archivo de `src/index.js`, abrir cada PDF y comprobar idioma/contenido. La existencia se valida antes de guardar una solicitud; esa validación no verifica el idioma del PDF. `family_kit` tiene un único archivo etiquetado como inglés. No se anuncia una traducción inexistente.
5. Confirmar que la migración de idioma ya está aplicada. No ejecutar `migration_add_language.sql` dos veces. El servicio mantiene compatibilidad con el esquema anterior; no se ejecutó ninguna migración remota durante estos cambios.
6. Verificar el dominio preferido (con/sin www), redirecciones y los eventos en la propiedad GA4 existente. Las páginas usan el dominio público observado `ekwonderkids.com` y URLs canónicas sin `.html` para los recursos, conforme al redireccionamiento de assets HTML.
7. Validar con el dueño el texto de privacidad, un canal de contacto para solicitudes sobre datos, la política de retención de contactos y los requisitos de consentimiento de los mercados elegidos. No se implementó una eliminación automática de contactos. El vencimiento de enlaces NO borra el registro.
8. Revisar páginas reales del libro cuando el dueño las facilite. No hay reseñas, fotografías familiares ni páginas interiores inventadas. La edición española muestra la portada inglesa con una aclaración visible hasta recibir la portada correspondiente.

## Registro y correo

`POST /api/subscribe`: JSON con `name`, `email`, `book`, `language` (opcional) y `website` vacío. Los libros admitidos se enumeran en `src/index.js`. Requiere mismo origen si se envía la cabecera Origin, valida datos y limita frecuencia. Retorna `success`, `downloadUrl`, `emailStatus` (`accepted` o `failed`) y `resourceLanguage`. `accepted` significa aceptación HTTP del proveedor, no llegada al buzón. Si el correo falla, el recurso sigue disponible.

El navegador ofrece descarga manual y comprueba que recibió una respuesta PDF antes de emitir `resource_received`. Ese evento no demuestra que el usuario abrió o guardó el archivo. `email_signup` indica solicitud guardada y no inscripción a una campaña de marketing.

El endpoint histórico `POST /subscribe` conserva el registro único y el correo de bienvenida en inglés; no se usa para los recursos nuevos. No se añadieron campañas automáticas ni se inscribió a los contactos existentes en listas nuevas.

`GET /api/download?token=...`: enlaces privados reutilizables durante siete días desde su creación, incluidos registros antiguos. Enlaces antiguos vencidos requieren una nueva solicitud. No hay borrado de datos ni consumo de un solo uso. `downloaded_at` conserva el primer acceso; `no-store` evita el almacenamiento en caché.

## Medición y hooks

Comparar `/?hook=conversation` frente a `/?hook=jar`, y `/es/?hook=conversation` frente a `/es/?hook=jar`. Las páginas del libro admiten los mismos parámetros. La variante se conserva solo durante la sesión del navegador. No hay reparto aleatorio: son variantes para campañas controladas, no un experimento con significación estadística garantizada.

Eventos: `cta_click`, `amazon_click`, `resource_request`, `email_signup`, `resource_request_failed`, `resource_received`, `resource_download_failed`. Llevan ubicación, idioma y variante; no nombres, correos ni tokens. `amazon_click` no representa una venta. Mantener fuentes y audiencias comparables, recopilar una línea base y configurar Amazon Attribution en una cuenta elegible antes de evaluar compras.

## Limpieza y recuperación

Se retiran del seguimiento Git los archivos locales de `.wrangler/`; permanecen en el disco del entorno de trabajo. No se modifica el historial existente. Revisar esos archivos de forma privada antes de decidir si hace falta retirar información histórica. No se comprobó ni se afirma una filtración de credenciales.

Para revertir, usar un commit de reversión o la versión anterior del Worker. No se requiere migración de base de datos para desplegar estas correcciones. No mezclar ni publicar hasta completar las comprobaciones del entorno real.
