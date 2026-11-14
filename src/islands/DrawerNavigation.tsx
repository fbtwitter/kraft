import SelectField from "./SelectField";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
export default function DrawerNavigation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [history, setHistory] = useState(["Preferences"]);
  const [side, setSide] = useState("right");
  const [saved, setSaved] = useState(false);
  const current = history[history.length - 1];
  return (
    <div className="demo-layout">
      <label>
        Preset{" "}
        <SelectField value={side} onValueChange={(value) => setSide(value)}>
          <option value="right">Side drawer</option>
          <option value="bottom">Bottom sheet</option>
        </SelectField>
      </label>
      <div>
        <button
          className="btn primary"
          onClick={() => {
            setHistory(["Preferences"]);
            setSaved(false);
            dialog.current?.showModal();
          }}
        >
          Open panel
        </button>
      </div>
      <p role="status">
        {saved
          ? "Preferences saved for this demo."
          : "Open a panel, drill into a setting, then go back."}
      </p>
      <dialog
        ref={dialog}
        className={`demo-drawer demo-drawer-${side}`}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-rule pb-4">
          <h3 className="text-xl">{current}</h3>
          <button
            className="btn ghost"
            aria-label="Close panel"
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        {history.length > 1 && (
          <button
            className="btn ghost mt-4"
            onClick={() => setHistory((items) => items.slice(0, -1))}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {current === "Preferences" ? (
          <div className="mt-6 space-y-3">
            {["Appearance", "Reminders"].map((name) => (
              <button
                key={name}
                className="btn flex w-full justify-between"
                onClick={() => setHistory((items) => [...items, name])}
              >
                {name}
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" defaultChecked /> Enable{" "}
              {current.toLowerCase()}
            </label>
            <button
              className="btn primary"
              onClick={() => {
                setSaved(true);
                dialog.current?.close();
              }}
            >
              Save and close
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
