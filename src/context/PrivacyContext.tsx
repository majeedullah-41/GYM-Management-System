import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { verifyPassword } from "../lib/api/auth";

const PRIVACY_HIDDEN_KEY = "app:privacy_hidden";
const DASHBOARD_HIDDEN_KEY = "dashboard:hidden";
export const MASK_PLACEHOLDER = "••••••";

export function maskValue(placeholder = MASK_PLACEHOLDER): string {
  return placeholder;
}

function loadInitialHidden(): boolean {
  try {
    const val = localStorage.getItem(PRIVACY_HIDDEN_KEY);
    if (val !== null) return val !== "0";
    const dashVal = localStorage.getItem(DASHBOARD_HIDDEN_KEY);
    if (dashVal !== null) return dashVal !== "0";
    return true;
  } catch {
    return true;
  }
}

function persistHidden(hidden: boolean) {
  try {
    const str = hidden ? "1" : "0";
    localStorage.setItem(PRIVACY_HIDDEN_KEY, str);
    localStorage.setItem(DASHBOARD_HIDDEN_KEY, str);
  } catch {
    // Ignore storage errors
  }
}

interface PrivacyContextValue {
  hidden: boolean;
  hide: () => void;
  reveal: () => void;
  requestUnhide: () => void;
  closeUnhide: () => void;
  mask: (val: string | number, placeholder?: string) => string;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  hidden: false,
  hide: () => {},
  reveal: () => {},
  requestUnhide: () => {},
  closeUnhide: () => {},
  mask: (val) => String(val),
});

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(loadInitialHidden);
  const [unhideOpen, setUnhideOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef(0);

  const hide = useCallback(() => {
    setHidden(true);
    persistHidden(true);
  }, []);

  const reveal = useCallback(() => {
    setHidden(false);
    persistHidden(false);
  }, []);

  const requestUnhide = useCallback(() => {
    setPassword("");
    setError(null);
    setSubmitting(false);
    setUnhideOpen(true);
  }, []);

  const closeUnhide = useCallback(() => {
    requestIdRef.current += 1;
    setUnhideOpen(false);
    setPassword("");
    setError(null);
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Enter the admin password");
      return;
    }
    const reqId = ++requestIdRef.current;
    setSubmitting(true);
    setError(null);
    try {
      await verifyPassword(password);
      if (reqId !== requestIdRef.current) return;
      setPassword("");
      reveal();
      setUnhideOpen(false);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Password verification failed");
    } finally {
      if (reqId === requestIdRef.current) setSubmitting(false);
    }
  };

  const mask = useCallback(
    (val: string | number, placeholder = MASK_PLACEHOLDER): string => {
      if (!hidden) return String(val);
      return placeholder;
    },
    [hidden],
  );

  return (
    <PrivacyContext.Provider
      value={{
        hidden,
        hide,
        reveal,
        requestUnhide,
        closeUnhide,
        mask,
      }}
    >
      {children}

      <Modal
        isOpen={unhideOpen}
        onClose={closeUnhide}
        title="Unhide Details"
        footer={
          <>
            <Button variant="secondary" onClick={closeUnhide}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="privacy-unhide-form"
              loading={submitting}
              className="bg-[#17613f] hover:bg-[#104b31]"
            >
              Unhide
            </Button>
          </>
        }
      >
        <form id="privacy-unhide-form" onSubmit={handleVerify}>
          <p className="text-xs text-text-muted">
            Enter the admin password to reveal financial details, dues, and transaction figures.
          </p>
          <div className="mt-4">
            <Input
              label="Admin password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
              autoFocus
              className="text-xs"
            />
          </div>
        </form>
      </Modal>
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function HideToggleButton({ className = "" }: { className?: string }) {
  const { hidden, hide, requestUnhide } = usePrivacy();

  return (
    <Button
      variant="secondary"
      onClick={hidden ? requestUnhide : hide}
      title={hidden ? "Show details (requires admin password)" : "Hide details"}
      aria-pressed={hidden}
      className={className}
    >
      {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
      {hidden ? "Show Details" : "Hide Details"}
    </Button>
  );
}
