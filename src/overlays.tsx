import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "./cn";

// ===========================================================================
// Overlay system — the ONE popup/message-box language for every sub-app.
//
//   <Modal>            controlled dialog (forms, details, confirms)
//   useToast()         transient messages: toast.success/error/warning/info
//   useConfirm()       promise-based confirm dialog (replaces window.confirm)
//
// Mount <OverlayProvider> once at the app root; it provides both toast + confirm.
// All visuals follow the Apple-inspired tokens (rounded-2xl, hairline borders,
// soft shadow, backdrop blur, accent = the app's `brand`).
// ===========================================================================

// ---------------------------------------------------------------------------
// Modal — the base dialog. Centered card on desktop, bottom-sheet on mobile.
// ---------------------------------------------------------------------------

// Stack of currently-open modals. With stacked modals (e.g. a delete-confirm over an
// edit form) every modal used to bind its own document-level Escape handler — one press
// closed BOTH (losing unsaved edits beneath) — and whichever closed first restored
// body.overflow while the other was still open. Escape now only closes the TOP modal,
// and the scroll lock is released only when the last modal closes.
const modalStack: Array<symbol> = [];

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Its width: sm 24rem, md 32rem, lg 42rem, xl 48rem, 2xl 56rem, 3xl 64rem, 4xl 72rem (content beside a side panel). */
  size?: ModalSize;
}) {
  // Keep the latest onClose out of the effect deps: re-running the effect on every
  // callback identity change would pop/push this modal and scramble the stack order.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const panelRef = useRef<HTMLDivElement>(null);

  // What had focus when the dialog opened, read as it opens: React focuses an autoFocus field
  // inside while committing the dialog, before any effect here runs.
  const openerRef = useRef<HTMLElement | null>(null);
  const shownRef = useRef(false);
  if (open !== shownRef.current) {
    if (open) openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    shownRef.current = open;
  }

  useEffect(() => {
    if (!open) return;
    const entry = Symbol("modal");
    modalStack.push(entry);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (modalStack[modalStack.length - 1] === entry) onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Focus moves into the dialog — unless a field in it already took it — so the keyboard isn't
    // left on the page behind, and goes back to whatever opened it once it closes.
    const panel = panelRef.current;
    const opener = openerRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      const at = modalStack.indexOf(entry);
      if (at >= 0) modalStack.splice(at, 1);
      if (modalStack.length === 0) document.body.style.overflow = "";
      // Only once the dialog is really gone: in development React runs this effect twice, and
      // the dialog is still on screen between the two.
      if (panel && !panel.isConnected && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  const widths: Record<ModalSize, string> = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-3xl",
    "2xl": "sm:max-w-4xl",
    "3xl": "sm:max-w-5xl",
    "4xl": "sm:max-w-6xl",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fade_0.15s_ease]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full flex-col supports-[height:100dvh]:max-h-[90dvh] overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none dark:bg-slate-900 sm:rounded-2xl",
          "animate-[sheet_0.2s_cubic-bezier(0.32,0.72,0,1)] sm:animate-[pop_0.16s_ease]",
          widths[size],
        )}
      >
        {title != null && (
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-3.5 dark:border-white/[0.08]">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 active:scale-95 touch:-mr-1 touch:h-10 touch:w-10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] px-5 py-3 dark:border-white/[0.08]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
type ToastKind = "success" | "error" | "warning" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: ReactNode;
}
interface ToastApi {
  success: (m: ReactNode) => void;
  error: (m: ReactNode) => void;
  warning: (m: ReactNode) => void;
  info: (m: ReactNode) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);
export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <OverlayProvider>");
  return ctx;
}

const TOAST_META: Record<ToastKind, { icon: ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, ring: "border-emerald-500/30" },
  error: { icon: <XCircle className="h-5 w-5 text-rose-500" />, ring: "border-rose-500/30" },
  warning: { icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, ring: "border-amber-500/30" },
  info: { icon: <Info className="h-5 w-5 text-brand-500" />, ring: "border-brand-500/30" },
};

// ---------------------------------------------------------------------------
// Confirm dialog (promise-based)
// ---------------------------------------------------------------------------
interface ConfirmOpts {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
type ConfirmFn = (opts: ConfirmOpts) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn | null>(null);
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within <OverlayProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider — wires toasts + confirm + injects the keyframes once.
// ---------------------------------------------------------------------------
export function OverlayProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, message: ReactNode) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toastApi = useRef<ToastApi>({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    warning: (m) => push("warning", m),
    info: (m) => push("info", m),
  }).current;

  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setConfirmState({ ...opts, resolve })),
    [],
  );
  const settle = (v: boolean) => {
    confirmState?.resolve(v);
    setConfirmState(null);
  };

  return (
    <ToastCtx.Provider value={toastApi}>
      <ConfirmCtx.Provider value={confirm}>
        {children}

        {/* Toast stack — top on mobile (full width), top-right on desktop. */}
        {createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3 sm:inset-x-auto sm:right-0 sm:items-end">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white/90 px-4 py-3 text-sm shadow-lg backdrop-blur-xl dark:bg-slate-900/90",
                  "animate-[toast_0.2s_ease]",
                  TOAST_META[t.kind].ring,
                )}
              >
                {TOAST_META[t.kind].icon}
                <div className="min-w-0 flex-1 pt-0.5 text-slate-700 dark:text-slate-200">{t.message}</div>
                <button onClick={() => dismiss(t.id)} className="rounded-md text-slate-400 transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 touch:-m-2 touch:p-2" aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}

        {/* Confirm dialog */}
        <Modal
          open={!!confirmState}
          onClose={() => settle(false)}
          title={confirmState?.title ?? "Are you sure?"}
          size="sm"
          footer={
            <>
              <button
                onClick={() => settle(false)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200 active:scale-[0.98] max-sm:flex-1 max-sm:py-3 max-sm:text-[15px] dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {confirmState?.cancelText ?? "Cancel"}
              </button>
              <button
                onClick={() => settle(true)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition active:scale-[0.98] max-sm:flex-1 max-sm:py-3 max-sm:text-[15px]",
                  confirmState?.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-500 hover:bg-brand-600",
                )}
              >
                {confirmState?.confirmText ?? "Confirm"}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">{confirmState?.message}</p>
        </Modal>

        <style>{`
          @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes pop { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
          @keyframes sheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
          @keyframes toast { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}
