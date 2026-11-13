export function setupTyping() {
  const element = document.querySelector<HTMLElement>(".typed-phrase");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (!element || reduced.matches) return;
  const phrases = ["try this?", "change that?", "build it?"];
  let phrase = 0;
  let length = phrases[0].length;
  let deleting = true;
  let timer = 0;
  const stop = () => {
    clearTimeout(timer);
    element.textContent = phrases[0];
  };
  function tick() {
    if (document.hidden || element!.getBoundingClientRect().bottom < 0) {
      timer = window.setTimeout(tick, 500);
      return;
    }
    length += deleting ? -1 : 1;
    element!.textContent = phrases[phrase].slice(0, length) || "\u00a0";
    let delay = deleting ? 45 : 90;
    if (length === 0) {
      phrase = (phrase + 1) % phrases.length;
      deleting = false;
      delay = 250;
    } else if (length === phrases[phrase].length && !deleting) {
      deleting = true;
      delay = 2400;
    }
    timer = window.setTimeout(tick, delay);
  }
  timer = window.setTimeout(tick, 2400);
  reduced.addEventListener("change", stop, { once: true });
  document.addEventListener(
    "astro:before-swap",
    () => {
      stop();
      reduced.removeEventListener("change", stop);
    },
    { once: true },
  );
}
