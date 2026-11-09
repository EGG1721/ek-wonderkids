# Recorrido comercial y medición

Actualizado: 9 de noviembre de 2026. Cambios preparados en una rama de trabajo. No constituyen datos de resultados.

## Informe que debe configurarse en GA4

No se ha accedido a la propiedad ni creado un informe remoto. Esta especificación permite configurarlo sin tratar descargas como ventas o suscripciones comerciales.

Segmentar por idioma, página de entrada, dispositivo, fuente/medio de sesión, campaña y contenido UTM. Medir usuarios además de número de eventos y mantener el mismo período y zona horaria. En una exploración de embudo, usar secuencia dentro de la sesión y revisar ambos recorridos:

1. Compra: sesión de entrada → `section_view` con `section=inside` → `sample_open` o `sample_read` → `amazon_click`.
2. Recurso: `section_view` con `section=resource` → `resource_form_start` → `resource_request_success` → `resource_received` → `cta_click` con `placement=resource_next_story` → `amazon_click`.

Las acciones no son obligatorias ni equivalentes: un comprador puede ir directo a Amazon; una solicitud puede completarse sin abrir una muestra. Revisar también los clics directos.

Los eventos `section_view` se emiten una vez por sección y carga cuando entra en la zona central de la pantalla; no prueban lectura. `resource_form_start` se emite en la primera edición de nombre o correo y no transmite su valor. `resource_request_success` significa que la API guardó la solicitud; sustituye al ambiguo `email_signup`. Documentar el corte de nomenclatura y no sumar ambos como dos solicitudes. `resource_received` sólo confirma recepción de un PDF por el navegador; no demuestra lectura, impresión ni apertura.

Registrar como dimensiones personalizadas de evento `section`, `placement`, `resource`, `language`, `source_page` y `hook_variant` si todavía no existen. Revisar límites de la propiedad antes de crear dimensiones duplicadas. La variante de titular conservada por sesión no es asignación aleatoria ni un A/B concluyente.

## Tabla semanal

| Semana y canal/idioma | Impresiones | Guardados | Clics salientes | Sesiones | Usuarios que vieron muestra | Usuarios que iniciaron formulario | Solicitudes guardadas | PDF recibidos | Usuarios que hicieron clic a Amazon | Ventas atribuibles verificadas |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Completar con exportaciones reales | — | — | — | — | — | — | — | — | — | No disponible |

En Pinterest, separar clics en el pin de clics salientes. Comparar contenidos de antigüedad similar. No equiparar clics de Pinterest con sesiones de GA4 ni ventas de KDP con ventas atribuibles a una publicación. Las compras sólo se atribuyen si existe un mecanismo verificable disponible para esta cuenta.

## Decisiones comerciales

- Si nadie llega al sitio, revisar distribución y la promesa del contenido.
- Si llegan pero no exploran el cuento, comprobar correspondencia del pin, idioma y legibilidad móvil.
- Si solicitan el PDF pero no exploran el libro, evaluar su utilidad y el siguiente paso; no incorporarlos automáticamente a marketing.
- Si salen a Amazon pero no hay ventas suficientes, revisar edición, mercado, formato, envío, ficha y propuesta de valor. Sin atribución no puede aislarse el efecto de un canal.
- Antes de invertir, calcular regalía neta por formato/mercado y coste de adquisición admisible. No hay presupuesto publicitario autorizado en esta entrega.

No hay objetivos de ingresos inventados ni un incremento de conversión garantizado.
