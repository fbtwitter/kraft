import { useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
export default function ToastFeedback() {
  const [messages, setMessages] = useState<{ id: number; type: string }[]>([]);
  const [undo, setUndo] = useState(false);
  return (
    <div className="demo-layout">
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
      <div className="toast-preview" aria-label="Notification preview">
        {!messages.length && (
          <p className="muted">
            Trigger feedback above. Up to three messages stay visible.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className="toast-message"
            data-tone={message.type}
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
              className="toast-dismiss"
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
