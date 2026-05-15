import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

interface PendingState extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const lockRef = useRef(false);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const handle = useCallback(
    (value: boolean) => {
      if (!pending || lockRef.current) return;
      lockRef.current = true;
      pending.resolve(value);
      setPending(null);
      setTimeout(() => {
        lockRef.current = false;
      }, 0);
    },
    [pending]
  );

  const tone = pending?.tone ?? "danger";
  const Icon = tone === "danger" ? AlertTriangle : ShieldCheck;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!pending}
        onClose={() => handle(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2">
            <span
              className={
                tone === "danger"
                  ? "flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                  : "flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-200"
              }
            >
              <Icon className="h-4 w-4" />
            </span>
            <span>{pending?.title ?? ""}</span>
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => handle(false)}>
              {pending?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={tone === "danger" ? "danger" : "primary"} onClick={() => handle(true)}>
              {pending?.confirmLabel ?? (tone === "danger" ? "Delete" : "Confirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-700">
          {pending?.description ?? "Are you sure?"}
        </p>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
