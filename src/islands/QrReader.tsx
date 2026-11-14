import { useEffect, useRef, useState } from "react";
import { Camera, Square, ImageUp } from "lucide-react";
import type QrScanner from "qr-scanner";

export default function QrReader() {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScanner | null>(null);
  const alive = useRef(true);
  const [status, setStatus] = useState(
    "Choose a QR image or start your camera.",
  );
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const stop = () => {
    scanner.current?.stop();
    scanner.current?.destroy();
    scanner.current = null;
    if (alive.current) setCameraActive(false);
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stop();
    };
  }, []);
  async function read(file?: File) {
    stop();
    setBusy(true);
    setResult("");
    try {
      const { default: Scanner } = await import("qr-scanner");
      if (!alive.current) return;
      if (file) {
        const decoded = await Scanner.scanImage(file, {
          returnDetailedScanResult: true,
        });
        if (alive.current) {
          setResult(decoded.data);
          setStatus("QR code decoded locally.");
        }
      } else {
        const instance = new Scanner(
          video.current!,
          (decoded) => {
            setResult(decoded.data);
            setStatus("QR code found. Camera stopped.");
            stop();
          },
          {
            preferredCamera: "environment",
            returnDetailedScanResult: true,
            maxScansPerSecond: 5,
          },
        );
        scanner.current = instance;
        await instance.start();
        if (!alive.current) {
          instance.destroy();
          return;
        }
        setStatus("Camera active. Point it at a QR code.");
        if (scanner.current === instance) setCameraActive(true);
      }
    } catch {
      stop();
      if (alive.current)
        setStatus(
          file
            ? "No readable QR code found. Try a clearer image."
            : "Camera unavailable or permission denied. You can still upload an image.",
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="demo-layout">
      <p className="muted">
        Images stay in this browser. Decoded links are shown as text and never
        opened automatically.
      </p>
      <div className="flex flex-wrap gap-3">
        <button className="btn" disabled={busy} onClick={() => read()}>
          <Camera size={16} aria-hidden="true" /> Start camera
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            stop();
            setStatus("Camera stopped.");
          }}
        >
          <Square size={16} aria-hidden="true" /> Stop camera
        </button>
        <label className="btn ghost">
          <ImageUp size={16} aria-hidden="true" /> QR image
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) read(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="scanner-frame">
        <video
          ref={video}
          muted
          playsInline
          aria-label="QR camera preview"
          className="scanner-preview"
        />
        {!cameraActive && (
          <div className="scanner-placeholder">
            <Camera size={32} aria-hidden="true" />
            <span>Camera preview</span>
            <p>Start your camera or choose a QR image.</p>
          </div>
        )}
      </div>
      <p role="status">{busy ? "Opening scanner…" : status}</p>
      {result && (
        <div className="rounded-lg border border-rule p-4">
          <strong>Decoded text</strong>
          <pre className="mt-2 break-all whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
