export function setupSectionScroll(root: HTMLElement) {
  const controller = new AbortController();
  const { signal } = controller;
  const sections = [...root.querySelectorAll<HTMLElement>(":scope > section")];
  const footer = document.querySelector<HTMLElement>(".ftr");
  const stops = footer ? [...sections, footer] : sections;
  const highlight = () => {
    const center = innerHeight / 2;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      section.toggleAttribute(
        "data-active",
        rect.top <= center && rect.bottom > center,
      );
    }
  };
  window.addEventListener("scroll", highlight, { passive: true, signal });
  highlight();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let locked = false;
  let timer = 0;
  let delta = 0;
  let lastWheel = 0;
  const inset = () =>
    document.querySelector(".hdr")!.getBoundingClientRect().height;
  const top = (element: HTMLElement) =>
    element.getBoundingClientRect().top + scrollY - inset();
  function move(direction: number) {
    if (locked) return;
    const current = stops.reduce(
      (best, element, index) => (top(element) <= scrollY + 3 ? index : best),
      0,
    );
    const section = stops[current];
    const end = top(section) + section.offsetHeight - (innerHeight - inset());
    // Taller sections keep document scrolling until their content has been read.
    if (direction > 0 && scrollY < end - 3) return false;
    if (direction < 0 && scrollY > top(section) + 3) return false;
    const target =
      stops[Math.max(0, Math.min(stops.length - 1, current + direction))];
    locked = true;
    window.scrollTo({
      top: top(target),
      behavior: reduced.matches ? "instant" : "smooth",
    });
    timer = window.setTimeout(
      () => {
        locked = false;
      },
      reduced.matches ? 100 : 750,
    );
    return true;
  }
  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))
        return;
      if (locked) {
        event.preventDefault();
        return;
      }
      const now = performance.now();
      if (now - lastWheel > 160 || Math.sign(delta) !== Math.sign(event.deltaY))
        delta = 0;
      lastWheel = now;
      delta +=
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.abs(delta) < 45) {
        event.preventDefault();
        return;
      }
      const handled = move(Math.sign(delta));
      delta = 0;
      if (handled !== false) event.preventDefault();
    },
    { passive: false, signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        (event.target as HTMLElement).closest(
          "a,button,input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      const direction = ["ArrowDown", "PageDown", " "].includes(event.key)
        ? event.shiftKey
          ? -1
          : 1
        : ["ArrowUp", "PageUp"].includes(event.key)
          ? -1
          : 0;
      if (direction && move(direction) !== false) event.preventDefault();
    },
    { signal },
  );
  document.addEventListener(
    "astro:before-swap",
    () => {
      controller.abort();
      clearTimeout(timer);
    },
    { once: true },
  );
}
