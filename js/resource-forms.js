document.addEventListener("DOMContentLoaded", () => {
  const es = document.documentElement.lang === "es";
  const text = es
    ? {
        sending: "Preparando tu recurso…",
        ready: "Tu recurso está listo.",
        accepted:
          "El servicio de correo aceptó el envío. Revisa también la carpeta de spam.",
        failed:
          "No pudimos enviar el correo. Puedes descargar el recurso aquí.",
        download: "Descargar PDF",
        retry: "No pudimos descargarlo. Pulsa el botón para intentar de nuevo.",
        received:
          "El PDF se ha recibido. Revisa las descargas de tu navegador.",
        error: "No pudimos completar la solicitud. Inténtalo de nuevo.",
        wait: "Espera un minuto antes de volver a solicitar el recurso.",
        unavailable:
          "Este recurso no está disponible ahora. Inténtalo más tarde.",
        note: "Usaremos tu nombre y correo para entregar este recurso. Esta solicitud no te suscribe al boletín.",
        english:
          "Este kit está disponible en inglés. Para un recurso en español, elige el Frasco Listo.",
      }
    : {
        sending: "Preparing your resource…",
        ready: "Your resource is ready.",
        accepted:
          "The email service accepted the message. Please check your spam folder too.",
        failed:
          "We could not send the email. You can download your resource here.",
        download: "Download PDF",
        retry: "We could not download it. Use the button to try again.",
        received: "The PDF was received. Check your browser downloads.",
        error: "We could not complete your request. Please try again.",
        wait: "Please wait a minute before requesting the resource again.",
        unavailable:
          "This resource is unavailable right now. Please try again later.",
        note: "We use your name and email to deliver this resource. This request does not subscribe you to a newsletter.",
      };
  document.querySelectorAll("form").forEach((form, index) => {
    if (!form.elements.namedItem("book")) return;
    const status = document.createElement("div");
    status.className = "resource-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const note = document.createElement("p");
    note.className = "resource-privacy-note";
    note.textContent =
      text.note +
      (es && form.elements.namedItem("book").value === "family_kit"
        ? " " + text.english
        : "");
    const privacy = document.createElement("a");
    privacy.href = es ? "/es/privacy.html" : "/privacy.html";
    privacy.textContent = es ? " Privacidad" : " Privacy";
    note.append(privacy);
    form.after(status, note);
    for (const field of form.querySelectorAll('input:not([type="hidden"])')) {
      field.id = field.id || "resource-" + index + "-" + field.name;
      if (!document.querySelector('label[for="' + field.id + '"]')) {
        const label = document.createElement("label");
        label.htmlFor = field.id;
        label.textContent =
          field.name === "name"
            ? es
              ? "Tu nombre"
              : "Your name"
            : es
              ? "Tu correo"
              : "Your email";
        label.className = "resource-label";
        field.before(label);
      }
      field.autocomplete = field.name === "name" ? "given-name" : "email";
      field.maxLength = field.name === "name" ? 100 : 254;
    }
    const trap = document.createElement("input");
    trap.type = "hidden";
    trap.name = "website";
    trap.value = "";
    form.append(trap);
    let busy = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) return;
      busy = true;
      const button = form.querySelector(
        'button[type="submit"], button:not([type])',
      );
      const original = button.textContent;
      button.disabled = true;
      button.textContent = text.sending;
      status.replaceChildren();
      const payload = {
        name: form.elements.namedItem("name").value,
        email: form.elements.namedItem("email").value,
        book: form.elements.namedItem("book").value,
        language: es ? "es" : "en",
        website: trap.value,
      };
      window.ekwTrack?.("resource_request", {
        resource: payload.book,
        placement: form.id,
      });
      try {
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          status.textContent =
            response.status === 429
              ? text.wait
              : data.error === "resource_unavailable"
                ? text.unavailable
                : text.error;
          window.ekwTrack?.("resource_request_failed", {
            resource: payload.book,
            status: response.status,
          });
          return;
        }
        const downloadUrl = new URL(data.downloadUrl, location.origin);
        if (
          downloadUrl.origin !== location.origin ||
          downloadUrl.pathname !== "/api/download"
        )
          throw new Error("Invalid download URL");
        form.hidden = true;
        const heading = document.createElement("strong");
        heading.textContent = text.ready;
        const emailNote = document.createElement("p");
        emailNote.textContent =
          data.emailStatus === "accepted" ? text.accepted : text.failed;
        const downloadButton = document.createElement("button");
        downloadButton.type = "button";
        downloadButton.className = "resource-download";
        downloadButton.textContent = text.download;
        const downloadNote = document.createElement("p");
        status.append(heading, emailNote, downloadButton, downloadNote);
        window.ekwTrack?.("email_signup", {
          resource: payload.book,
          placement: form.id,
        });
        let downloading = false;
        const receive = async () => {
          if (downloading) return;
          downloading = true;
          downloadButton.disabled = true;
          try {
            const file = await fetch(downloadUrl, {
              cache: "no-store",
              signal: AbortSignal.timeout(30000),
            });
            if (
              !file.ok ||
              !file.headers.get("content-type")?.includes("application/pdf")
            )
              throw new Error("Download failed");
            const blob = await file.blob();
            if (!blob.size) throw new Error("Empty file");
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = payload.book + ".pdf";
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            downloadNote.textContent = text.received;
            window.ekwTrack?.("resource_received", { resource: payload.book });
          } catch {
            downloadNote.textContent = text.retry;
            window.ekwTrack?.("resource_download_failed", {
              resource: payload.book,
            });
          } finally {
            downloading = false;
            downloadButton.disabled = false;
          }
        };
        downloadButton.addEventListener("click", receive);
        await receive();
      } catch {
        status.textContent = text.error;
      } finally {
        busy = false;
        button.disabled = false;
        button.textContent = original;
      }
    });
  });
});
