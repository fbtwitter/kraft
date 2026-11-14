import { useEffect, useState } from "react";
import SelectField from "../islands/SelectField";

export default function TopicSelectControl() {
  const [select, setSelect] = useState<HTMLSelectElement | null>(null);
  const [value, setValue] = useState("");
  useEffect(() => {
    const native =
      document.querySelector<HTMLSelectElement>("#experiment-topic");
    if (!native) return;
    const sync = () => setValue(native.value);
    const reset = () => queueMicrotask(sync);
    sync();
    setSelect(native);
    native.hidden = true;
    native.addEventListener("change", sync);
    native.form?.addEventListener("reset", reset);
    return () => {
      native.hidden = false;
      native.removeEventListener("change", sync);
      native.form?.removeEventListener("reset", reset);
    };
  }, []);
  if (!select) return null;
  return (
    <SelectField
      value={value || "all-topics"}
      aria-label="Category"
      onValueChange={(next) => {
        select.value = next === "all-topics" ? "" : next;
        setValue(select.value);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }}
    >
      {Array.from(select.options).map((option) => (
        <option key={option.value} value={option.value || "all-topics"}>
          {option.text}
        </option>
      ))}
    </SelectField>
  );
}
