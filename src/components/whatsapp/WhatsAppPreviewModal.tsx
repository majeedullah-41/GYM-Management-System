import { useEffect, useState } from "react";
import { Copy, RotateCcw, Globe, Monitor, Phone } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useToast } from "../feedback/ToastProvider";
import { WhatsAppIcon } from "./WhatsAppIcon";
import {
  getWhatsAppSettings,
  openWhatsAppUrl,
  type WhatsAppSettings,
} from "../../lib/api/settings";
import {
  DEFAULT_MEMBER_DUES_TEMPLATE,
  DEFAULT_SUPPLIER_DUES_TEMPLATE,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
  renderTemplate,
} from "../../lib/whatsapp";

export interface WhatsAppTarget {
  recipientType: "member" | "supplier";
  recipientName: string;
  rawPhone: string | null | undefined;
  variables: Record<string, string>;
}

interface WhatsAppPreviewModalProps {
  target: WhatsAppTarget | null;
  onClose: () => void;
}

export function WhatsAppPreviewModal({
  target,
  onClose,
}: WhatsAppPreviewModalProps) {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<WhatsAppSettings>({
    default_country_code: "92",
    launch_mode: "web",
    member_dues_template: DEFAULT_MEMBER_DUES_TEMPLATE,
    supplier_dues_template: DEFAULT_SUPPLIER_DUES_TEMPLATE,
  });
  const [fallbackPhone, setFallbackPhone] = useState("");
  const [message, setMessage] = useState("");
  const [launchMode, setLaunchMode] = useState<"web" | "desktop">("web");
  const [sending, setSending] = useState(false);

  const hasSavedContact = Boolean(target?.rawPhone && target.rawPhone.trim());

  useEffect(() => {
    if (!target) return;
    let cancelled = false;

    const initialTpl =
      target.recipientType === "member"
        ? settings.member_dues_template
        : settings.supplier_dues_template;
    setFallbackPhone(target.rawPhone?.trim() ?? "");
    setMessage(renderTemplate(initialTpl, target.variables));

    (async () => {
      try {
        const loaded = await getWhatsAppSettings();
        if (cancelled) return;
        setSettings(loaded);
        setLaunchMode(loaded.launch_mode);
        const tpl =
          target.recipientType === "member"
            ? loaded.member_dues_template
            : loaded.supplier_dues_template;
        setMessage(renderTemplate(tpl, target.variables));
      } catch {
        // Fallback already applied above
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  const sourcePhone = hasSavedContact ? target.rawPhone! : fallbackPhone;
  const normalizedPhone = normalizeWhatsAppPhone(
    sourcePhone,
    settings.default_country_code,
  );

  const handleResetMessage = () => {
    const tpl =
      target.recipientType === "member"
        ? settings.member_dues_template
        : settings.supplier_dues_template;
    setMessage(renderTemplate(tpl, target.variables));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      addToast({ title: "Message copied to clipboard", variant: "success" });
    } catch {
      addToast({ title: "Could not copy message", variant: "error" });
    }
  };

  const handleSend = async () => {
    if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      addToast({
        title: "Valid WhatsApp contact required",
        message: hasSavedContact
          ? `The saved contact "${target.rawPhone}" is not a valid mobile number.`
          : "Please add a contact number to this profile first.",
        variant: "error",
      });
      return;
    }
    if (!message.trim()) {
      addToast({ title: "Message cannot be empty", variant: "error" });
      return;
    }

    setSending(true);
    try {
      const url = buildWhatsAppUrl(normalizedPhone, message, launchMode);
      await openWhatsAppUrl(url);
      addToast({
        title: "Opening WhatsApp...",
        message: `Prepared chat for ${target.recipientName} (+${normalizedPhone})`,
        variant: "success",
      });
      onClose();
    } catch (err) {
      addToast({
        title: "Failed to launch WhatsApp",
        message: String(err),
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={onClose}
      title={`Send WhatsApp Reminder — ${target.recipientName}`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            loading={sending}
            onClick={() => void handleSend()}
            className="gap-1.5 bg-[#17613f] hover:bg-[#104b31] text-white"
          >
            <WhatsAppIcon size={15} />
            {sending ? "Opening WhatsApp..." : "Send on WhatsApp"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="space-y-4 text-xs"
      >
        {/* Structured Recipient & Contact Info Card matching app theme */}
        <div className="grid grid-cols-1 gap-3.5 rounded-lg border border-border bg-[#fafbfa] p-4 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              {target.recipientType === "member" ? "Member" : "Supplier"}
            </div>
            <div className="mt-1 font-semibold text-text-primary truncate">
              {target.recipientName}
            </div>
            <div className="mt-0.5 text-[11px] text-text-muted">
              {target.recipientType === "member"
                ? target.variables.member_number
                  ? `#${target.variables.member_number}`
                  : "Gym Member"
                : target.variables.company || "Supplement Supplier"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Contact Number
            </div>
            {hasSavedContact ? (
              <>
                <div className="mt-1 inline-flex items-center gap-1.5 font-mono font-bold text-text-primary">
                  <Phone size={12} className="text-[#17613f]" />
                  {target.rawPhone}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-text-muted">
                  WhatsApp: +{normalizedPhone}
                </div>
              </>
            ) : (
              <div className="mt-1 font-medium text-amber-700">Not saved</div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Balance Due
            </div>
            <div className="mt-1 text-sm font-bold text-[#17613f]">
              {target.variables.due_amount || "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-text-muted">
              {target.recipientType === "member"
                ? target.variables.plan_name || "Membership"
                : "Supplier Account"}
            </div>
          </div>
        </div>

        {/* Fallback input ONLY if an older record has no phone saved */}
        {!hasSavedContact && (
          <Input
            label="Contact Number (Not found in profile — enter once) *"
            value={fallbackPhone}
            onChange={(e) => setFallbackPhone(e.target.value)}
            placeholder="03001234567"
            required
          />
        )}

        {/* Segmented Launch Mode Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Open WhatsApp Using
          </label>
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-[#fafbfa] p-1">
            <button
              type="button"
              onClick={() => setLaunchMode("web")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                launchMode === "web"
                  ? "bg-[#17613f] text-white shadow-xs"
                  : "text-text-muted hover:bg-secondary-bg hover:text-text-primary"
              }`}
            >
              <Globe size={13} />
              WhatsApp Web
            </button>
            <button
              type="button"
              onClick={() => setLaunchMode("desktop")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                launchMode === "desktop"
                  ? "bg-[#17613f] text-white shadow-xs"
                  : "text-text-muted hover:bg-secondary-bg hover:text-text-primary"
              }`}
            >
              <Monitor size={13} />
              Desktop App
            </button>
          </div>
        </div>

        {/* Editable Message Section */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Message Preview (Editable) *
            </label>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleResetMessage}
                className="inline-flex items-center gap-1 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
                title="Reset to template"
              >
                <RotateCcw size={12} />
                Reset
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#17613f] transition-colors hover:text-[#104b31]"
              >
                <Copy size={12} />
                Copy Text
              </button>
            </div>
          </div>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-xs leading-relaxed text-text-primary transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            required
          />
          <p className="text-[11px] text-text-muted">
            You can customize default templates in{" "}
            <strong className="text-text-primary">Settings → WhatsApp</strong>.
          </p>
        </div>
      </form>
    </Modal>
  );
}

