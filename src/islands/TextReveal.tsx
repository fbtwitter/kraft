import { useEffect, useId, useRef, useState } from "react";
import SelectField from "./SelectField";
import "../styles/text-reveal.css";

const sample =
  "Start with a small idea.\nGive it room to change.\nSee what happens next.";

export default function TextReveal() {
  const id = useId();
  const [text, setText] = useState(sample);
  const [mode, setMode] = useState("typewriter");
  const [speed, setSpeed] = useState(50);
  const [pause, setPause] = useState(300);
  const [stagger, setStagger] = useState(400);
  const [phase, setPhase] = useState<
    "ready" | "playing" | "paused" | "complete"
  >("ready");
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef(0);
  const [reduced, setReduced] = useState(false);
  const characters = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
    (part) => part.segment,
  );
  const lines = text.split("\n");
  const duration =
    pause +
    (mode === "typewriter"
      ? characters.length * speed
      : (lines.length - 1) * stagger + 200);
  const showAll = reduced || phase === "ready" || phase === "complete";
  const count = Math.max(0, Math.floor((elapsed - pause) / speed));

  function ready() {
    clock.current = 0;
    setElapsed(0);
    setPhase("ready");
  }

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(media.matches);
      if (media.matches) setPhase("ready");
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (phase !== "playing" || reduced) return;
    let frame: number;
    let previous = performance.now();
    const tick = (now: number) => {
      clock.current = Math.min(duration, clock.current + now - previous);
      previous = now;
      setElapsed(clock.current);
      if (clock.current >= duration) setPhase("complete");
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, reduced, duration]);

  return (
    <div className="demo-layout text-reveal">
      <p className="field-help">
        Edit the words, choose an effect, then replay. Each newline starts a new
        reveal block; long lines wrap naturally.
      </p>
      <label htmlFor={`${id}-text`}>
        Sample text
        <textarea
          id={`${id}-text`}
          maxLength={500}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            ready();
          }}
        />
      </label>
      <label htmlFor={`${id}-mode`}>
        Effect
        <SelectField
          id={`${id}-mode`}
          aria-label="Effect"
          value={mode}
          onValueChange={(value) => {
            setMode(value);
            ready();
          }}
        >
          <option value="typewriter">Typewriter</option>
          <option value="lines">Line reveal</option>
        </SelectField>
      </label>
      <div className="reveal-timing">
        <label>
          Character delay: {speed} ms
          <input
            type="range"
            aria-label="Character delay"
            min={20}
            max={150}
            step={10}
            disabled={mode !== "typewriter"}
            value={speed}
            onChange={(event) => {
              setSpeed(Number(event.target.value));
              ready();
            }}
          />
        </label>
        <label>
          Start pause: {pause} ms
          <input
            type="range"
            aria-label="Start pause"
            min={0}
            max={1500}
            step={100}
            value={pause}
            onChange={(event) => {
              setPause(Number(event.target.value));
              ready();
            }}
          />
        </label>
        <label>
          Line stagger: {stagger} ms
          <input
            type="range"
            aria-label="Line stagger"
            min={100}
            max={1000}
            step={100}
            disabled={mode !== "lines"}
            value={stagger}
            onChange={(event) => {
              setStagger(Number(event.target.value));
              ready();
            }}
          />
        </label>
      </div>
      <div className="reveal-actions">
        <button
          className="btn primary"
          disabled={reduced || !text.trim()}
          onClick={() => {
            clock.current = 0;
            setElapsed(0);
            setPhase("playing");
          }}
        >
          Replay
        </button>
        <button
          className="btn ghost"
          disabled={reduced || (phase !== "playing" && phase !== "paused")}
          onClick={() => setPhase(phase === "playing" ? "paused" : "playing")}
        >
          {phase === "paused" ? "Resume" : "Pause"}
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setText(sample);
            setMode("typewriter");
            setSpeed(50);
            setPause(300);
            setStagger(400);
            ready();
          }}
        >
          Reset
        </button>
      </div>
      <section className="reveal-preview" aria-label="Text preview">
        <span className="sr-only">{text || "Enter some text to preview."}</span>
        <div aria-hidden="true">
          {!text.trim() ? (
            <p className="field-help">Enter some text to preview.</p>
          ) : mode === "typewriter" ? (
            <p className="reveal-typewriter">
              {showAll ? text : characters.slice(0, count).join("")}
            </p>
          ) : (
            lines.map((line, index) => (
              <p
                key={index}
                className="reveal-line"
                data-visible={showAll || elapsed >= pause + index * stagger}
              >
                {line || "\u00a0"}
              </p>
            ))
          )}
        </div>
      </section>
      <p role="status">
        {reduced
          ? "Reduced motion: full text shown; playback is disabled."
          : !text.trim()
            ? "Enter some text to begin."
            : phase === "ready"
              ? "Ready. Replay to start."
              : phase === "complete"
                ? "Complete."
                : phase === "paused"
                  ? "Paused."
                  : "Playing."}
      </p>
    </div>
  );
}
