import { useState } from "react";
import { Bell } from "lucide-react";
export default function BrowserNotifications() {
  const [status, setStatus] = useState(
    "Notifications are off until you choose to allow them.",
  );
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      if (!("Notification" in window)) {
        setStatus(
          "This browser does not support system notifications. Try the local preview.",
        );
        return;
      }
      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
      if (permission !== "granted") {
        setStatus("Permission was not granted. The local preview still works.");
        return;
      }
      const notification = new Notification("A small reminder", {
        body: "Your sample task is ready to review.",
        tag: "kraft-demo-reminder",
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      setStatus(
        "Notification sent to this device. Check system notification settings if it is hidden.",
      );
    } catch {
      setStatus(
        "System notifications are unavailable here. Try the local preview instead.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="demo-layout">
      <div className="flex flex-wrap gap-3">
        <button className="btn primary" disabled={busy} onClick={send}>
          <Bell size={16} /> Allow and send
        </button>
        <button className="btn ghost" onClick={() => setPreview(true)}>
          Preview without permission
        </button>
      </div>
      <p role="status">{status}</p>
      {preview && (
        <div className="rounded-lg border border-rule p-5" role="status">
          <p className="meta">Local simulation</p>
          <h3 className="mt-2 text-lg">A small reminder</h3>
          <p className="muted">Your sample task is ready to review.</p>
          <button className="btn ghost mt-4" onClick={() => setPreview(false)}>
            Dismiss preview
          </button>
        </div>
      )}
      <p className="muted">
        This sends a local notification, not a server push. No account or remote
        messaging service is used.
      </p>
    </div>
  );
}
