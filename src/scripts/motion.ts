export function setupMotion() {
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  if (preference.matches) return;
  const animations = new Set<Animation>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (preference.matches) continue;
        const animation = entry.target.animate(
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 420, easing: "cubic-bezier(.2,.7,.2,1)" },
        );
        animations.add(animation);
        animation.finished
          .finally(() => animations.delete(animation))
          .catch(() => {});
      }
    },
    { threshold: 0.12 },
  );
  document
    .querySelectorAll(
      ".featured-copy, .featured-preview, .catalog-intro, .experiment-card, .listing header, .listing-card",
    )
    .forEach((element) => observer.observe(element));
  const cancel = () => {
    observer.disconnect();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  };
  preference.addEventListener("change", cancel, { once: true });
  document.addEventListener(
    "astro:before-swap",
    () => {
      cancel();
      preference.removeEventListener("change", cancel);
    },
    { once: true },
  );
}
