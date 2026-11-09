document.addEventListener("DOMContentLoaded", () => {
  const updateLanguage = () => {
    document.querySelectorAll("a.language").forEach((link) => {
      const target = new URL(link.href);
      if (target.origin !== location.origin) return;
      const hash = location.hash;
      target.hash = /^#[a-z][a-z0-9-]*$/i.test(hash) ? hash : "";
      link.href = target.href;
    });
  };
  updateLanguage();
  window.addEventListener("hashchange", updateLanguage);
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        window.ekwTrack?.("section_view", { section: entry.target.id });
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0, rootMargin: "-15% 0px -15% 0px" },
  );
  document
    .querySelectorAll("#inside, #resource")
    .forEach((section) => observer.observe(section));
});
