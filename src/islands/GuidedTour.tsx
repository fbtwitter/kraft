import SelectField from "./SelectField";
import { useEffect, useId, useRef, useState } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function GuidedTour() {
  const id = useId().replace(/[^a-z0-9]/gi, "");
  const instance = useRef<Driver | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [preset, setPreset] = useState("tour");
  const [drawer, setDrawer] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Choose a preset, then start.");
  const stop = () => {
    clearTimeout(timer.current);
    instance.current?.destroy();
    instance.current = null;
  };
  useEffect(() => () => stop(), []);
  function start() {
    stop();
    setDrawer(false);
    setReady(false);
    const launch = () => {
      const target =
        preset === "drawer"
          ? "settings"
          : preset === "delayed"
            ? "loaded"
            : "create";
      const steps = [
        {
          element: `#${id}-${target}`,
          popover: {
            title: "Start here",
            description: "A focused hint points to the next useful action.",
          },
        },
      ];
      if (preset === "tour")
        steps.push(
          {
            element: `#${id}-filter`,
            popover: {
              title: "Narrow the list",
              description: "A tour can introduce one control at a time.",
            },
          },
          {
            element: `#${id}-list`,
            popover: {
              title: "Your workspace",
              description: "The tour ends here. You can start it again.",
            },
          },
        );
      instance.current = driver({
        steps,
        showProgress: steps.length > 1,
        animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
        onDestroyed: () =>
          setStatus("Tour closed. Try another preset or restart."),
      });
      instance.current.drive();
      setStatus("Tour active. Escape closes it.");
    };
    if (preset === "drawer") {
      setDrawer(true);
      timer.current = setTimeout(launch, 100);
    } else if (preset === "delayed") {
      setStatus("Simulating a one-second load before highlighting the target…");
      timer.current = setTimeout(() => {
        setReady(true);
        timer.current = setTimeout(launch, 100);
      }, 1000);
    } else launch();
  }
  return (
    <div className="w-full max-w-2xl space-y-5">
      <label className="block">
        Preset{" "}
        <SelectField
          value={preset}
          onValueChange={(value) => {
            stop();
            setPreset(value);
            setDrawer(false);
            setReady(false);
          }}
        >
          <option value="single">Single coachmark</option>
          <option value="tour">Multi-step tour</option>
          <option value="drawer">Target inside a panel</option>
          <option value="delayed">Wait for a target</option>
        </SelectField>
      </label>
      <div className="pattern-actions">
        <button className="btn primary" onClick={start}>
          Start tour
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            stop();
            setDrawer(false);
            setReady(false);
            setStatus("Choose a preset, then start.");
          }}
        >
          Reset
        </button>
      </div>
      <p role="status">{status}</p>
      <div className="space-y-4 rounded-lg border border-rule p-5">
        <div className="flex flex-wrap gap-3">
          <button
            id={`${id}-create`}
            className="btn"
            onClick={() => setStatus("Sample item created.")}
          >
            Create item
          </button>
          <label>
            Filter{" "}
            <input
              id={`${id}-filter`}
              className="rounded border border-rule p-2"
              placeholder="Search sample items"
            />
          </label>
        </div>
        <ul id={`${id}-list`} className="space-y-2">
          <li>Sketch an idea</li>
          <li>Try an interaction</li>
          <li>Review the result</li>
        </ul>
        {drawer && (
          <aside
            id={`${id}-settings`}
            className="rounded border border-rule p-4"
          >
            <h3>Sample settings panel</h3>
            <p>The panel is opened before the tour tries to find its target.</p>
          </aside>
        )}
        {ready && (
          <div id={`${id}-loaded`} className="rounded border border-rule p-4">
            The delayed target is ready.
          </div>
        )}
      </div>
    </div>
  );
}
