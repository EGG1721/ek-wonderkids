import { sendResourceEmail, sendNewsletterConfirmation } from "./email.js";

export const RESOURCES = Object.freeze({
  book01: {
    key: "the-waiting-jar-guia.pdf",
    title: "The Waiting Jar — Parent Guide",
    language: "en",
  },
  book02: {
    key: "the-grand-spring-festival-guia.pdf",
    title: "The Grand Spring Festival — Parent Guide",
    language: "en",
  },
  book03: {
    key: "when-compass-pointed-north-guia.pdf",
    title: "When the Compass Pointed North — Parent Guide",
    language: "en",
  },
  book_en_04: {
    key: "ready-for-the-rain-guia.pdf",
    title: "Ready for Rain, Ready for Stars — Parent Guide",
    language: "en",
  },
  book_es_04: {
    key: "listo-para-la-lluvia-listo-para-las-estrellas-guia.pdf",
    title:
      "Listo para la Lluvia, Listo para las Estrellas — Recurso para Padres",
    language: "es",
  },
  // Only an English kit is configured. The Spanish UI explicitly labels it as English.
  family_kit: {
    key: "wonderkids-family-kit.pdf",
    title: "The WonderKids Family Kit",
    language: "en",
  },
});

const WEEK = 7 * 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (body, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const isSubscribe =
      pathname === "/api/subscribe" || pathname === "/subscribe";
    const isDownload = pathname === "/api/download";
    if (!isSubscribe && !isDownload) return env.ASSETS.fetch(request);
    const method = isDownload ? "GET" : "POST";
    if (request.method !== method)
      return json({ error: "method_not_allowed" }, 405, { Allow: method });
    try {
      if (isDownload) return await download(request, env);
      return await subscribe(request, env, pathname === "/subscribe");
    } catch {
      // Never log submitted names, addresses, tokens or provider responses.
      console.error(
        JSON.stringify({ event: "request_failed", route: pathname }),
      );
      return json({ error: "service_unavailable" }, 503);
    }
  },
};

async function readBody(request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return { response: json({ error: "json_required" }, 415) };
  }
  if (Number(request.headers.get("content-length")) > 4096)
    return { response: json({ error: "body_too_large" }, 413) };
  const reader = request.body?.getReader();
  if (!reader) return { response: json({ error: "invalid_request" }, 400) };
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      return { response: json({ error: "body_too_large" }, 413) };
    }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return { data };
  } catch {
    return { response: json({ error: "invalid_request" }, 400) };
  }
}

async function subscribe(request, env, newsletter) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "origin_not_allowed" }, 403);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  if (!env.SUBSCRIBE_LIMITER)
    return json({ error: "service_unavailable" }, 503);
  const { success } = await env.SUBSCRIBE_LIMITER.limit({
    key: "subscribe:" + ip,
  });
  if (!success)
    return json({ error: "too_many_requests" }, 429, { "Retry-After": "60" });
  const parsed = await readBody(request);
  if (parsed.response) return parsed.response;
  const data = parsed.data;
  if (data.website) return json({ error: "invalid_request" }, 400);
  const email =
    typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254)
    return json({ error: "invalid_email" }, 400);
  if (newsletter) {
    const saved = await env.DB.prepare(
      "INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)",
    )
      .bind(email)
      .run();
    const result =
      saved.meta.changes > 0
        ? await sendNewsletterConfirmation(env, email)
        : null;
    return json({
      success: true,
      emailStatus: result
        ? result.ok
          ? "accepted"
          : "failed"
        : "not_requested",
      message: "Subscribed successfully.",
    });
  }
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name))
    return json({ error: "invalid_name" }, 400);
  if (typeof data.book !== "string" || !Object.hasOwn(RESOURCES, data.book))
    return json({ error: "invalid_resource" }, 400);
  if (data.language !== undefined && !["en", "es"].includes(data.language))
    return json({ error: "invalid_language" }, 400);
  const resource = RESOURCES[data.book];
  const language = data.language || resource.language;
  if (!(await env.RESOURCES.head(resource.key)))
    return json({ error: "resource_unavailable" }, 503);
  const recent = await env.DB.prepare(
    "SELECT id FROM leads WHERE email = ? AND book = ? AND created_at > datetime('now', '-1 minute') LIMIT 1",
  )
    .bind(email, data.book)
    .first();
  if (recent)
    return json({ error: "too_many_requests" }, 429, { "Retry-After": "60" });
  const token = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO leads (name, email, book, language, resource_key, token) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(name, email, data.book, language, resource.key, token)
      .run();
  } catch (error) {
    if (
      !/no column named language|has no column named language/i.test(
        String(error.message),
      )
    )
      throw error;
    await env.DB.prepare(
      "INSERT INTO leads (name, email, book, resource_key, token) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(name, email, data.book, resource.key, token)
      .run();
  }
  const downloadUrl =
    new URL(request.url).origin + "/api/download?token=" + token;
  const result = await sendResourceEmail(
    env,
    email,
    name,
    resource.title,
    downloadUrl,
    language,
  );
  if (result.ok) {
    try {
      await env.DB.prepare("UPDATE leads SET email_sent = 1 WHERE token = ?")
        .bind(token)
        .run();
    } catch {
      console.error(JSON.stringify({ event: "email_status_write_failed" }));
    }
  } else {
    console.warn(
      JSON.stringify({
        event: "resource_email_not_accepted",
        resource: data.book,
      }),
    );
  }
  return json({
    success: true,
    downloadUrl,
    emailStatus: result.ok ? "accepted" : "failed",
    resourceLanguage: resource.language,
  });
}

async function download(request, env) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !TOKEN.test(token))
    return json({ error: "invalid_download" }, 400);
  const lead = await env.DB.prepare(
    "SELECT resource_key, created_at FROM leads WHERE token = ?",
  )
    .bind(token)
    .first();
  const created = lead && Date.parse(lead.created_at.replace(" ", "T") + "Z");
  if (
    !lead ||
    !Number.isFinite(created) ||
    Date.now() - created > WEEK ||
    created > Date.now() + 60000
  ) {
    return json({ error: "download_expired" }, 410);
  }
  const object = await env.RESOURCES.get(lead.resource_key);
  if (!object) return json({ error: "resource_unavailable" }, 503);
  try {
    await env.DB.prepare(
      "UPDATE leads SET downloaded_at = COALESCE(downloaded_at, datetime('now')) WHERE token = ?",
    )
      .bind(token)
      .run();
  } catch {
    console.error(JSON.stringify({ event: "download_status_write_failed" }));
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/pdf");
  headers.set(
    "Content-Disposition",
    'attachment; filename="' + lead.resource_key + '"',
  );
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(object.body, { headers });
}
