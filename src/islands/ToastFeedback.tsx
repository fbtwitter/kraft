import { useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
export default function ToastFeedback() {
  const [messages, setMessages] = useState<{ id: number; type: string }[]>([]);
  const [undo, setUndo] = useState(false);
  return (
    <div className="w-full max-w-xl space-y-5">
      <div className="flex flex-wrap gap-3">
        {["Success", "Error", "Information", "Undo action"].map((type) => (
          <button
            className="btn"
            key={type}
            onClick={() => {
              setMessages((items) =>
                [...items, { id: Date.now() + Math.random(), type }].slice(-3),
              );
              setUndo(false);
            }}
          >
            {type}
          </button>
        ))}
      </div>
      <div
        className="min-h-48 space-y-3 rounded-lg border border-dashed border-rule p-4"
        aria-label="Notification preview"
      >
        {!messages.length && (
          <p className="muted">
            Trigger feedback above. Up to three messages stay visible.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex items-start gap-3 rounded-lg border border-rule bg-bg p-4"
            role={message.type === "Error" ? "alert" : "status"}
          >
            {message.type === "Success" ? (
              <CheckCircle2 size={20} />
            ) : message.type === "Error" ? (
              <AlertCircle size={20} />
            ) : (
              <Info size={20} />
            )}
            <div className="min-w-0 flex-1">
              <strong>{message.type}</strong>
              <p className="muted">
                {message.type === "Success"
                  ? "Your change was saved."
                  : message.type === "Error"
                    ? "That did not work. Your changes are still here."
                    : message.type === "Undo action"
                      ? "Sample item removed."
                      : "There is an update available."}
              </p>
              {message.type === "Undo action" && (
                <button
                  className="btn ghost mt-2"
                  onClick={() => {
                    setUndo(true);
                    setMessages((items) =>
                      items.filter((item) => item.id !== message.id),
                    );
                  }}
                >
                  Undo
                </button>
              )}
            </div>
            <button
              aria-label="Dismiss notification"
              onClick={() =>
                setMessages((items) =>
                  items.filter((item) => item.id !== message.id),
                )
              }
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="btn ghost"
        disabled={!messages.length && !undo}
        onClick={() => {
          setMessages([]);
          setUndo(false);
        }}
      >
        Clear all
      </button>
      <p role="status">
        {undo
          ? "Sample item restored."
          : "Messages stay until you dismiss them."}
      </p>
    </div>
  );
}
