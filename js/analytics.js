(() => {
  // Keep analytics failures outside registration and download control flow.
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };
  const params = new URLSearchParams(location.search);
  let variant = "conversation";
  try {
    const selected = params.get("hook");
    variant = ["jar", "conversation"].includes(selected)
      ? selected
      : sessionStorage.getItem("ekw_hook") === "jar"
        ? "jar"
        : "conversation";
    sessionStorage.setItem("ekw_hook", variant);
  } catch {
    variant = params.get("hook") === "jar" ? "jar" : "conversation";
  }
  window.ekwHook = variant;
  window.ekwTrack = (event, detail = {}) => {
    try {
      window.gtag("event", event, {
        source_page: location.pathname,
        language: document.documentElement.lang || "en",
        hook_variant: variant,
        ...detail,
      });
    } catch {
      /* Measurement must not block the experience. */
    }
  };
  // No submitted form values, download tokens or arbitrary URL parameters.
  const page = new URL(location.origin + location.pathname);
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]) {
    if (params.has(key))
      page.searchParams.set(key, params.get(key).slice(0, 120));
  }
  window.gtag("js", new Date());
  window.gtag("config", "G-SZ09833VVP", { page_location: page.href });
  if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-SZ09833VVP";
    document.head.append(script);
  }
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-hook-conversation]").forEach((element) => {
      element.textContent =
        element.dataset[variant === "jar" ? "hookJar" : "hookConversation"];
    });
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const url = new URL(link.href);
      if (url.hostname === "www.amazon.com" || url.hostname === "amazon.com") {
        window.ekwTrack("amazon_click", {
          placement: link.dataset.placement || "content",
          book:
            link.dataset.book ||
            url.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ||
            "catalog",
          format: link.dataset.format || "amazon_options",
        });
      } else if (link.dataset.cta) {
        window.ekwTrack("cta_click", { placement: link.dataset.cta });
      }
    });
  });
})();
