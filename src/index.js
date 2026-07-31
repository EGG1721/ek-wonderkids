// src/index.js
//
// Este Worker maneja TRES sistemas independientes:
//
// 1. POST /subscribe      -> Newsletter general "Coming Soon" -> D1 + Resend
// 2. POST /api/subscribe  -> Lead magnet de recurso por libro -> D1 + Resend
// 3. GET  /api/download   -> Entrega del PDF vía token de un solo uso -> D1 + R2
//
// Todo lo demás (HTML, CSS, JS, imágenes) lo sirve el binding de assets.

// Mapa de recursos: agrega una entrada por cada libro que tenga su propio lead magnet.
// El "key" debe coincidir EXACTO con el nombre del archivo que subas a R2.
const RESOURCES = {
  book01: {
    key: "the-waiting-jar-guia.pdf",
    title: "The Waiting Jar — Parent Guide",
  },
  book02: {
    key: "the-grand-spring-festival-guia.pdf",
    title: "The Grand Spring Festival — Parent Guide",
  },
  book03: {
    key: "when-compass-pointed-north-guia.pdf",
    title: "When the Compass Pointed North — Parent Guide",
  },
  book_en_04: {
    key: "ready-for-the-rain-guia.pdf",
    title: "Ready for the Rain — Parent Guide",
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Newsletter general ──
    if (url.pathname === "/subscribe" && request.method === "POST") {
      return handleNewsletterSubscribe(request, env);
    }

    // ── Lead magnet por libro ──
    if (url.pathname === "/api/subscribe" && request.method === "POST") {
      return handleResourceSubscribe(request, env);
    }

    // ── Entrega del recurso vía token ──
    if (url.pathname === "/api/download" && request.method === "GET") {
      return handleDownload(request, env);
    }

    // Todo lo demás lo sirve el binding de assets
    return env.ASSETS.fetch(request);
  },
};

// ═══════════════════════════════════════════════════════════
// Newsletter general -> D1 + Resend
// ═══════════════════════════════════════════════════════════
async function handleNewsletterSubscribe(request, env) {
  try {
    const { email } = await request.json();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return Response.json(
        { message: "Please enter a valid email." },
        { status: 400 }
      );
    }

    // INSERT OR IGNORE evita error si el correo ya existe (no se duplica)
    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)`
    )
      .bind(cleanEmail)
      .run();

    const isNewSubscriber = result.meta.changes > 0;

    // Solo mandamos el correo de confirmación si es alguien nuevo,
    // para no reenviarlo cada vez que alguien reintenta con el mismo email.
    if (isNewSubscriber) {
      await sendNewsletterConfirmation(env, cleanEmail);
    }

    return Response.json({ message: "Subscribed successfully." }, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: "We could not save your email right now." },
      { status: 500 }
    );
  }
}

async function sendNewsletterConfirmation(env, to) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL_NEWSLETTER,
        to: [to],
        subject: "Welcome to EK WonderKids! 🚀",
        html: `
          <div style="font-family: 'Nunito', Arial, sans-serif; max-width:520px; margin:0 auto; background:#FFFBE6;">
            <div style="background:#06134a; padding:28px 32px; text-align:center;">
              <div style="font-family: Arial, sans-serif; font-weight:800; font-size:20px; color:#fff; letter-spacing:0.02em;">
                EK <span style="color:#F5C15E;">WonderKids</span>
              </div>
            </div>
            <div style="padding:36px 32px; background:#ffffff;">
              <p style="font-size:16px; color:#1a1a1a; margin:0 0 16px;">Hi there,</p>
              <p style="font-size:15px; color:#4a4a4a; line-height:1.6; margin:0 0 16px;">
                Thank you for your interest in <strong>EK WonderKids</strong> — you're officially on the list! 🎉
              </p>
              <p style="font-size:15px; color:#4a4a4a; line-height:1.6; margin:0 0 24px;">
                You'll be the first to know about new book launches, free companion resources, and early access. No spam, ever — just wonder.
              </p>
              <div style="text-align:center; margin:0 0 8px;">
                <a href="https://www.amazon.com/stores/EK-WonderKids/author/B0GJ16T794"
                   style="background:#e5231a; color:#ffffff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:15px; display:inline-block;">
                  Explore Our Books
                </a>
              </div>
            </div>
            <div style="padding:20px 32px; text-align:center; background:#06134a;">
              <p style="font-size:12.5px; color:rgba(255,255,255,0.6); margin:0;">
                EK WonderKids · Preparing little minds for big futures.
              </p>
            </div>
          </div>
        `,
      }),
    });
  } catch {
    // Si falla el correo, no rompemos la suscripción — el registro en D1 ya quedó guardado.
  }
}

// ═══════════════════════════════════════════════════════════
// Lead magnet por libro -> D1 + Resend
// ═══════════════════════════════════════════════════════════
async function handleResourceSubscribe(request, env) {
  try {
    const data = await request.json();
    const name = (data.name || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    const bookId = data.book;

    if (!name || !email || !RESOURCES[bookId]) {
      return Response.json({ error: "Datos incompletos" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Correo inválido" }, { status: 400 });
    }

    const resource = RESOURCES[bookId];
    const token = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO leads (name, email, book, resource_key, token) VALUES (?, ?, ?, ?, ?)`
    )
      .bind(name, email, bookId, resource.key, token)
      .run();

    const origin = new URL(request.url).origin;
    const downloadUrl = `${origin}/api/download?token=${token}`;

    const emailResult = await sendResourceEmail(env, email, name, resource.title, downloadUrl);
    if (emailResult.ok) {
      await env.DB.prepare(`UPDATE leads SET email_sent = 1 WHERE token = ?`)
        .bind(token)
        .run();
    }

    // Aunque el correo falle, dejamos que el usuario descargue de inmediato.
    return Response.json({ success: true, downloadUrl });
  } catch (error) {
    return Response.json({ error: "Error interno, intenta de nuevo" }, { status: 500 });
  }
}

async function sendResourceEmail(env, to, name, resourceTitle, downloadUrl) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [to],
        subject: `Your free resource: ${resourceTitle}`,
        html: `
          <div style="font-family: 'Nunito', Arial, sans-serif; max-width:520px; margin:0 auto; background:#FDF6E9;">
            <div style="background:#1B4332; padding:28px 32px; text-align:center;">
              <div style="font-family: Arial, sans-serif; font-weight:800; font-size:20px; color:#fff; letter-spacing:0.02em;">
                EK <span style="color:#F4A825;">WonderKids</span>
              </div>
            </div>
            <div style="padding:36px 32px; background:#ffffff;">
              <p style="font-size:16px; color:#2B2116; margin:0 0 16px;">Hi ${escapeHtml(name)},</p>
              <p style="font-size:15px; color:#4A3F2F; line-height:1.6; margin:0 0 24px;">
                Thank you for your interest in <strong>${escapeHtml(resourceTitle)}</strong>! Your free companion resource is ready — just click below to download it.
              </p>
              <div style="text-align:center; margin:0 0 24px;">
                <a href="${downloadUrl}"
                   style="background:#F4A825; color:#1B4332; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:15px; display:inline-block;">
                  Download My Resource
                </a>
              </div>
              <p style="font-size:12.5px; color:#8A7D68; text-align:center; margin:0;">
                This link is personal — please don't share it publicly.
              </p>
            </div>
            <div style="padding:20px 32px; text-align:center; background:#FDF6E9;">
              <p style="font-size:12.5px; color:#8A7D68; margin:0;">
                EK WonderKids · Preparing little minds for big futures.
              </p>
            </div>
          </div>
        `,
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

// ═══════════════════════════════════════════════════════════
// Entrega del recurso vía token -> R2
// ═══════════════════════════════════════════════════════════
async function handleDownload(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Falta el token de descarga", { status: 400 });
  }

  const lead = await env.DB.prepare(`SELECT resource_key FROM leads WHERE token = ?`)
    .bind(token)
    .first();

  if (!lead) {
    return new Response("Enlace inválido o expirado", { status: 404 });
  }

  const object = await env.RESOURCES.get(lead.resource_key);
  if (!object) {
    return new Response("Recurso no encontrado", { status: 404 });
  }

  await env.DB.prepare(`UPDATE leads SET downloaded_at = datetime('now') WHERE token = ?`)
    .bind(token)
    .run();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Disposition", `attachment; filename="${lead.resource_key}"`);
  headers.set("Cache-Control", "private, no-store");

  return new Response(object.body, { headers });
}

function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}