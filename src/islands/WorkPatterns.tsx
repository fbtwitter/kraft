import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  X,
  Command,
  CornerDownLeft,
} from "lucide-react";
import "../styles/work-patterns.css";

const sampleSteps = () => [
  { id: 1, title: "Sketch the idea", done: false },
  { id: 2, title: "Build a small prototype", done: false },
  { id: 3, title: "Try it on a phone", done: false },
];

export function TaskChecklist() {
  const [steps, setSteps] = useState(sampleSteps);
  const [title, setTitle] = useState("");
  const nextId = useRef(4);
  const completed = steps.filter((step) => step.done).length;
  return (
    <div className="pattern-demo demo-layout">
      <h2>Launch a small idea</h2>
      <p role="status">
        {completed} of {steps.length} steps complete
      </p>
      <progress
        value={completed}
        max={Math.max(steps.length, 1)}
        aria-label="Checklist progress"
      />
      <ul className="work-list">
        {steps.map((step) => (
          <li key={step.id}>
            <label>
              <input
                type="checkbox"
                checked={step.done}
                onChange={() =>
                  setSteps(
                    steps.map((item) =>
                      item.id === step.id
                        ? { ...item, done: !item.done }
                        : item,
                    ),
                  )
                }
              />
              <span
                style={{
                  textDecoration: step.done ? "line-through" : undefined,
                }}
              >
                {step.title}
              </span>
            </label>
            <button
              className="btn ghost"
              aria-label={`Remove ${step.title}`}
              onClick={() =>
                setSteps(steps.filter((item) => item.id !== step.id))
              }
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      {steps.length === 0 && <p>No steps yet. Add your first one.</p>}
      <form
        className="pattern-actions"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim() || steps.length >= 20) return;
          setSteps([
            ...steps,
            { id: nextId.current++, title: title.trim(), done: false },
          ]);
          setTitle("");
        }}
      >
        <label>
          New step
          <input
            value={title}
            maxLength={100}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <button
          className="btn primary"
          disabled={!title.trim() || steps.length >= 20}
        >
          Add step
        </button>
      </form>
      <button
        className="btn ghost"
        onClick={() => {
          setSteps(sampleSteps());
          setTitle("");
        }}
      >
        Reset checklist
      </button>
      <p className="muted">
        Sample checklist, kept in this demo only. Up to 20 steps.
      </p>
    </div>
  );
}

export function ListReordering() {
  const [items, setItems] = useState([
    "Explore",
    "Prototype",
    "Review",
    "Share",
  ]);
  const [announcement, setAnnouncement] = useState(
    "Drag a row or use its arrow buttons.",
  );
  const dragged = useRef<string | null>(null);
  function move(from: number, to: number) {
    if (from < 0 || to < 0 || to >= items.length || from === to) return;
    const ordered = [...items];
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item);
    setItems(ordered);
    setAnnouncement(`${item} moved to position ${to + 1} of ${items.length}.`);
  }
  return (
    <div className="pattern-demo demo-layout">
      <h2>Make room for what comes first</h2>
      <p className="muted">
        Sample priorities. Reorder by dragging on desktop or using the arrows on
        any device.
      </p>
      <ol className="work-list">
        {items.map((item, index) => (
          <li
            key={item}
            draggable
            onDragStart={(event) => {
              dragged.current = item;
              event.dataTransfer.setData("text/plain", item);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              dragged.current = null;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragged.current) move(items.indexOf(dragged.current), index);
              dragged.current = null;
            }}
          >
            <span className="work-row-title">
              <GripVertical size={18} aria-hidden="true" />
              {index + 1}. {item}
            </span>
            <span className="pattern-actions">
              <button
                className="btn ghost"
                disabled={index === 0}
                aria-label={`Move ${item} up`}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="btn ghost"
                disabled={index === items.length - 1}
                aria-label={`Move ${item} down`}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown size={16} />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p role="status">{announcement}</p>
      <button
        className="btn ghost"
        onClick={() => {
          setItems(["Explore", "Prototype", "Review", "Share"]);
          setAnnouncement("Original order restored.");
        }}
      >
        Reset order
      </button>
    </div>
  );
}

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function DatePresets() {
  const [base, setBase] = useState("2026-11-14");
  const [selected, setSelected] = useState("");
  useEffect(() => setBase(dateValue(new Date())), []);
  function choose(preset: string) {
    if (!base) return;
    const day = new Date(`${base}T12:00:00`);
    const delta =
      preset === "Tomorrow"
        ? 1
        : preset === "This weekend"
          ? (6 - day.getDay() + 7) % 7
          : preset === "Next week"
            ? (1 - day.getDay() + 7) % 7 || 7
            : 0;
    day.setDate(day.getDate() + delta);
    setSelected(dateValue(day));
  }
  return (
    <div className="pattern-demo demo-layout">
      <label>
        Reference date
        <input
          type="date"
          value={base}
          onChange={(event) => {
            setBase(event.target.value);
            setSelected("");
          }}
        />
      </label>
      <p className="muted">
        Try a Saturday, Sunday or Monday to see how the shortcuts behave.
      </p>
      <div className="pattern-actions">
        {["Today", "Tomorrow", "This weekend", "Next week"].map((preset) => (
          <button
            className="btn"
            key={preset}
            disabled={!base}
            onClick={() => choose(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
      <label>
        Due date
        <input
          type="date"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        />
      </label>
      <p role="status">
        {selected ? `Scheduled for ${selected}` : "No date selected"}
      </p>
      <button className="btn ghost" onClick={() => setSelected("")}>
        Clear date
      </button>
    </div>
  );
}

export function DebouncedSave() {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState("Ready");
  const [fail, setFail] = useState(false);
  const [revision, setRevision] = useState(0);
  const [edits, setEdits] = useState(0);
  const [writes, setWrites] = useState(0);
  useEffect(() => {
    if (!edits) return;
    setStatus("Waiting for a pause…");
    const timer = setTimeout(() => {
      if (fail) {
        setStatus("Save failed. Your draft is still here.");
        return;
      }
      setSaved(draft);
      setWrites((count) => count + 1);
      setStatus("Saved in demo memory");
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, fail, revision, edits]);
  return (
    <div className="pattern-demo demo-layout">
      <label>
        Draft
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setEdits((count) => count + 1);
          }}
          placeholder="Keep typing, then pause for half a second."
        />
      </label>
      <div className="pattern-actions">
        <label>
          <input
            type="checkbox"
            checked={fail}
            onChange={(event) => setFail(event.target.checked)}
          />
          Simulate failed save
        </label>
        <button
          className="btn"
          disabled={!edits}
          onClick={() => setRevision((value) => value + 1)}
        >
          Retry save
        </button>
      </div>
      <p role="status">{status}</p>
      <p>
        {edits} edits, {writes} saves
      </p>
      <div className="pattern-state">
        <span>Last saved snapshot</span>
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {saved || "Nothing saved yet"}
        </p>
      </div>
      <button
        className="btn ghost"
        onClick={() => {
          setDraft("");
          setSaved("");
          setEdits(0);
          setWrites(0);
          setFail(false);
          setStatus("Ready");
        }}
      >
        Reset demo
      </button>
      <p className="muted">
        Simulated saving in memory. Nothing is stored after leaving or sent to a
        server.
      </p>
    </div>
  );
}

export function CommandPalette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [result, setResult] = useState("No command run yet");
  const commands = [
    "Open inbox",
    "Create a note",
    "Show completed tasks",
    "Switch workspace",
  ];
  const matches = commands.filter((command) =>
    command.toLowerCase().includes(query.toLowerCase().trim()),
  );
  function open() {
    setQuery("");
    setActive(0);
    dialog.current?.showModal();
    input.current?.focus();
  }
  function run(command: string) {
    setResult(`Selected: ${command}`);
    dialog.current?.close();
  }
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        dialog.current?.open ? dialog.current.close() : open();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  return (
    <div className="pattern-demo demo-layout">
      <p className="muted">
        Jump straight to an action. Try Ctrl+K or Command+K, type to filter,
        then use the arrow keys and Enter.
      </p>
      <button ref={trigger} className="btn primary" onClick={open}>
        Open command palette
      </button>
      <p role="status">{result}</p>
      <dialog
        ref={dialog}
        className="work-palette"
        aria-label="Command palette"
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="pattern-demo demo-layout">
          <div className="palette-heading">
            <h2>
              <Command size={18} aria-hidden="true" />
              Command palette
            </h2>
            <button
              className="palette-close"
              aria-label="Close palette"
              onClick={() => dialog.current?.close()}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <label>
            Find an action
            <input
              ref={input}
              placeholder="Search actions…"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-results"
              aria-autocomplete="list"
              aria-activedescendant={
                matches[active] ? `command-${active}` : undefined
              }
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) =>
                    matches.length
                      ? (index +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          matches.length) %
                        matches.length
                      : 0,
                  );
                }
                if (event.key === "Enter" && matches[active]) {
                  event.preventDefault();
                  run(matches[active]);
                }
              }}
            />
          </label>
          <div className="palette-results">
            <ul
              id="command-results"
              role="listbox"
              aria-label="Actions"
              className="work-list"
            >
              {matches.map((command, index) => (
                <li
                  key={command}
                  role="option"
                  id={`command-${index}`}
                  aria-selected={active === index}
                  onPointerMove={() => setActive(index)}
                  onClick={() => run(command)}
                >
                  {command}
                  {active === index && (
                    <CornerDownLeft size={16} aria-hidden="true" />
                  )}
                </li>
              ))}
            </ul>
            {!matches.length && (
              <p role="status">No matching actions. Try another word.</p>
            )}
          </div>
          <footer className="palette-footer">
            <p>
              <kbd>↑</kbd>
              <kbd>↓</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Close
            </p>
            <p>Sample actions only. You stay on this page.</p>
          </footer>
        </div>
      </dialog>
    </div>
  );
}
