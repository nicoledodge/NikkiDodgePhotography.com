import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";
import { bookingPost, errorMessage } from "./api";

export default function SignatureForm({
  proposalId,
  initialName,
  onSigned,
  isAdmin = false,
}: {
  proposalId: string;
  initialName: string;
  onSigned: () => Promise<void>;
  isAdmin?: boolean;
}) {
  const prefix = useId();
  const [legalName, setLegalName] = useState(initialName);
  const [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [intent, setIntent] = useState(false);
  const [authority, setAuthority] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * 800) / rect.width,
      y: ((event.clientY - rect.top) * 220) / rect.height,
    };
  };
  const begin = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.strokeStyle = "#242923";
    ctx.fillStyle = "#242923";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    event.preventDefault();
    const p = point(event);
    const ctx = canvas.current?.getContext("2d");
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
    setHasDrawing(true);
  };
  const end = () => {
    drawing.current = false;
  };
  const clear = () => {
    canvas.current?.getContext("2d")?.clearRect(0, 0, 800, 220);
    setHasDrawing(false);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!legalName.trim() || !consent || !intent || !authority) {
      setError(
        "Enter your legal name and confirm each statement before signing.",
      );
      return;
    }
    if (method === "drawn" && !hasDrawing) {
      setError("Draw your signature, or choose the typed signature option.");
      return;
    }
    setPending(true);
    try {
      await bookingPost(
        `/api/booking/proposals/${encodeURIComponent(proposalId)}/sign`,
        {
          legalName: legalName.trim(),
          method,
          signature:
            method === "drawn"
              ? canvas.current?.toDataURL("image/png")
              : legalName.trim(),
          consentAccepted: true,
          intentAccepted: true,
          authorityAccepted: true,
          consentVersion: "2026-09-16",
        },
      );
      await onSigned();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  };
  return (
    <form className="booking-signature" onSubmit={submit}>
      <h3>{isAdmin ? "Sign and issue this proposal" : "Add your signature"}</h3>
      <p>
        Read the full agreement above before you sign. Your signature applies to
        this version of the agreement.
      </p>
      <label htmlFor={`${prefix}-name`}>Full legal name</label>
      <input
        id={`${prefix}-name`}
        required
        minLength={2}
        maxLength={160}
        autoComplete="name"
        value={legalName}
        onChange={(e) => setLegalName(e.target.value)}
      />
      <fieldset className="booking-signature-method">
        <legend>Choose how to sign</legend>
        <label>
          <input
            type="radio"
            name={`${prefix}-method`}
            checked={method === "typed"}
            onChange={() => setMethod("typed")}
          />
          Type my signature
        </label>
        <label>
          <input
            type="radio"
            name={`${prefix}-method`}
            checked={method === "drawn"}
            onChange={() => setMethod("drawn")}
          />
          Draw my signature
        </label>
      </fieldset>
      {method === "typed" ? (
        <div
          className="booking-typed-signature"
          aria-label="Typed signature preview"
        >
          {legalName.trim() || "Your signature"}
        </div>
      ) : (
        <div>
          <p className="booking-small" id={`${prefix}-draw-help`}>
            Draw with a mouse, touch, or pen. You can use a typed signature
            instead.
          </p>
          <canvas
            ref={canvas}
            width={800}
            height={220}
            aria-label="Draw your signature"
            aria-describedby={`${prefix}-draw-help`}
            onPointerDown={begin}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
          <button
            className="booking-plain-button"
            type="button"
            onClick={clear}
          >
            Clear signature
          </button>
        </div>
      )}
      <label className="booking-checkbox">
        <input
          required
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I consent to use electronic records and signatures for this agreement
          and can save or print a copy.
        </span>
      </label>
      <label className="booking-checkbox">
        <input
          required
          type="checkbox"
          checked={intent}
          onChange={(e) => setIntent(e.target.checked)}
        />
        <span>
          I have read this agreement and intend my electronic signature to be
          legally binding.
        </span>
      </label>
      <label className="booking-checkbox">
        <input
          required
          type="checkbox"
          checked={authority}
          onChange={(e) => setAuthority(e.target.checked)}
        />
        <span>
          I am the named signer and have authority to enter into this agreement.
        </span>
      </label>
      {error && (
        <p className="booking-alert" role="alert">
          {error}
        </p>
      )}
      <button className="button" type="submit" disabled={pending}>
        {pending
          ? "Saving your signature…"
          : isAdmin
            ? "Sign & issue proposal"
            : "Sign this agreement"}
      </button>
    </form>
  );
}
