document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll("[data-preview]");
  if (!links.length || typeof HTMLDialogElement === "undefined") return;
  const es = document.documentElement.lang === "es";
  const dialog = document.createElement("dialog");
  dialog.className = "sample-dialog";
  dialog.setAttribute("aria-labelledby", "sample-dialog-caption");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "sample-dialog-close";
  close.textContent = es ? "Cerrar ×" : "Close ×";
  const figure = document.createElement("figure");
  const image = document.createElement("img");
  image.width = 1600;
  image.height = 1600;
  const caption = document.createElement("figcaption");
  caption.id = "sample-dialog-caption";
  figure.append(image, caption);
  dialog.append(close, figure);
  document.body.append(dialog);
  let trigger;
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      trigger = link;
      image.src = link.href;
      image.alt = link.querySelector("img").alt;
      caption.textContent = link.dataset.caption;
      dialog.showModal();
      window.ekwTrack?.("sample_open", { scene: link.dataset.scene });
    });
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    image.removeAttribute("src");
    trigger?.focus({ preventScroll: true });
  });
  document
    .querySelector(".sample-reading")
    ?.addEventListener("toggle", (event) => {
      if (event.target.open)
        window.ekwTrack?.("sample_read", { scene: "talking-with-dad" });
    });
});
