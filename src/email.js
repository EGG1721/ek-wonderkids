export async function sendNewsletterConfirmation(env, to) {
  try {
    if (!env.RESEND_API_KEY || !env.FROM_EMAIL_NEWSLETTER) return { ok: false };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
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
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function sendResourceEmail(
  env,
  to,
  name,
  resourceTitle,
  downloadUrl,
  language = "en",
) {
  try {
    const isSpanish = language === "es";
    const safeName = escapeHtml(name);
    const safeTitle = escapeHtml(resourceTitle);

    const subject = isSpanish
      ? `Tu recurso gratuito: ${resourceTitle}`
      : `Your free resource: ${resourceTitle}`;

    const greeting = isSpanish ? `Hola ${safeName},` : `Hi ${safeName},`;
    const bodyCopy = isSpanish
      ? `Gracias por tu interés en <strong>${safeTitle}</strong>. Tu recurso gratuito está listo — haz clic en el botón para descargarlo.`
      : `Thank you for your interest in <strong>${safeTitle}</strong>! Your free companion resource is ready — just click below to download it.`;
    const buttonLabel = isSpanish
      ? "Descargar mi recurso"
      : "Download My Resource";
    const privacyNote = isSpanish
      ? "El enlace permite nuevas descargas durante 7 días. No lo compartas públicamente."
      : "You can download again for 7 days. Please keep this link private.";
    const footer = isSpanish
      ? "EK WonderKids · Preparando pequeñas mentes para grandes futuros."
      : "EK WonderKids · Preparing little minds for big futures.";

    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) return { ok: false };
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [to],
        subject,
        html: `
          <div style="font-family: 'Nunito', Arial, sans-serif; max-width:520px; margin:0 auto; background:#FDF6E9;">
            <div style="background:#1B4332; padding:28px 32px; text-align:center;">
              <div style="font-family: Arial, sans-serif; font-weight:800; font-size:20px; color:#fff; letter-spacing:0.02em;">
                EK <span style="color:#F4A825;">WonderKids</span>
              </div>
            </div>
            <div style="padding:36px 32px; background:#ffffff;">
              <p style="font-size:16px; color:#2B2116; margin:0 0 16px;">${greeting}</p>
              <p style="font-size:15px; color:#4A3F2F; line-height:1.6; margin:0 0 24px;">
                ${bodyCopy}
              </p>
              <div style="text-align:center; margin:0 0 24px;">
                <a href="${downloadUrl}"
                   style="background:#F4A825; color:#1B4332; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:15px; display:inline-block;">
                  ${buttonLabel}
                </a>
              </div>
              <p style="font-size:12.5px; color:#8A7D68; text-align:center; margin:0;">
                ${privacyNote}
              </p>
            </div>
            <div style="padding:20px 32px; text-align:center; background:#FDF6E9;">
              <p style="font-size:12.5px; color:#8A7D68; margin:0;">
                ${footer}
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

function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
