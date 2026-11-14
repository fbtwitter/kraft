import { useEffect, useId, useRef, useState } from "react";
import SelectField from "./SelectField";
import "../styles/scroll-navigation.css";

const sections = [
  [
    "Make room for the content",
    "Scroll down inside this preview. The header moves away once you pass the opening section, leaving more room to read.",
  ],
  [
    "Reverse direction",
    "Scroll back up a little. The header returns without requiring a trip to the top of the page.",
  ],
  [
    "Keep an action nearby",
    "The floating action stays available while the footer is out of view. It takes you directly to the end of this preview.",
  ],
  [
    "Leave room for the footer",
    "As the footer enters this scroll area, its own action takes over and the floating action disappears.",
  ],
  [
    "Try the keyboard",
    "Focus this scroll area and use Page Down, Page Up, Home or End. Tab can also reach the header action, which stays visible while focused.",
  ],
  [
    "Reach the end",
    "Continue to the footer to see the floating action yield its place. Scroll upward again to bring it back.",
  ],
];

export default function ScrollAwareNavigation() {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const footer = useRef<HTMLElement>(null);
  const [preset, setPreset] = useState("long");
  const [hidden, setHidden] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const root = viewport.current;
    const end = footer.current;
    if (!root || !end) return;
    root.scrollTop = 0;
    setHidden(false);
    let anchor = 0;
    const onScroll = () => {
      const current = Math.max(
        0,
        Math.min(root.scrollTop, root.scrollHeight - root.clientHeight),
      );
      if (current <= 64 || header.current?.contains(document.activeElement)) {
        setHidden(false);
        anchor = current;
      } else if (Math.abs(current - anchor) >= 8) {
        setHidden(current > anchor);
        anchor = current;
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { root },
    );
    observer.observe(end);
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", onScroll);
    };
  }, [preset]);

  function toFooter() {
    const root = viewport.current;
    if (!root) return;
    root.scrollTop = root.scrollHeight;
    footer.current?.focus({ preventScroll: true });
  }

  return (
    <div className="demo-layout scroll-navigation">
      <p className="field-help">
        Scroll inside the preview to test its header and floating action.
      </p>
      <label htmlFor={`${id}-preset`}>
        Content length
        <SelectField
          id={`${id}-preset`}
          aria-label="Content length"
          value={preset}
          onValueChange={setPreset}
        >
          <option value="long">Long page</option>
          <option value="short">Short page</option>
        </SelectField>
      </label>
      <div className="scroll-preview-shell">
        <div
          ref={viewport}
          className="scroll-preview"
          role="region"
          aria-label="Scroll navigation preview"
          aria-describedby={`${id}-help`}
          tabIndex={0}
        >
          <header
            ref={header}
            className="scroll-preview-header"
            data-hidden={hidden}
            onFocusCapture={() => setHidden(false)}
          >
            <strong>Field notes</strong>
            <button className="btn ghost" onClick={toFooter}>
              Go to footer
            </button>
          </header>
          <div className="scroll-preview-content">
            {preset === "long" ? (
              sections.map(([title, text], index) => (
                <section key={title}>
                  <p className="field-help">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </section>
              ))
            ) : (
              <section className="scroll-preview-short">
                <h2>A short read</h2>
                <p>
                  When the footer already fits in view, its action is enough.
                </p>
              </section>
            )}
          </div>
          <footer ref={footer} className="scroll-preview-footer" tabIndex={-1}>
            <p>End of the preview</p>
            <button
              className="btn ghost"
              onClick={() => {
                if (viewport.current) viewport.current.scrollTop = 0;
                setHidden(false);
                viewport.current?.focus({ preventScroll: true });
              }}
            >
              Back to top
            </button>
          </footer>
        </div>
        {!footerVisible && (
          <button
            className="btn primary scroll-floating-action"
            onClick={toFooter}
          >
            Jump to footer ↓
          </button>
        )}
      </div>
      <p id={`${id}-help`} className="field-help">
        Focus the preview to use Page Up / Down and Home / End. The header stays
        visible while one of its controls has focus.
      </p>
      <p role="status">
        Header {hidden ? "hidden" : "visible"} · Floating action{" "}
        {footerVisible
          ? "hidden: footer in view"
          : "visible: footer out of view"}
      </p>
      <button
        className="btn ghost"
        onClick={() => {
          setPreset("long");
          if (viewport.current) viewport.current.scrollTop = 0;
          setHidden(false);
        }}
      >
        Reset
      </button>
    </div>
  );
}
