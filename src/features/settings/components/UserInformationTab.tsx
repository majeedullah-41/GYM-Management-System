import { type FormEvent, useState } from "react";
import { KeyRound, ShieldQuestion, UserRound } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { Select } from "../../../components/ui/Select";
import { useToast } from "../../../components/feedback/ToastProvider";
import { changePassword, changeSecurityQuestion, changeUsername, type AuthUser } from "../../../lib/api/auth";

type Dialog = "username" | "password" | "security" | null;
const SECURITY_QUESTIONS = [
  "What was the name of your first school?",
  "What was the name of your first teacher?",
  "What city were you born in?",
  "What was the name of your childhood best friend?",
  "What was the name of your first pet?",
];

export function UserInformationTab({ user, onUserUpdated, onSignedOut }: { user: AuthUser; onUserUpdated: (user: AuthUser) => void; onSignedOut: () => void }) {
  const { addToast } = useToast(); const [dialog, setDialog] = useState<Dialog>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [form, setForm] = useState({ username: user.username, current: "", password: "", confirm: "", question: user.security_question ?? "", answer: "" });
  const [questionMode, setQuestionMode] = useState(user.security_question && SECURITY_QUESTIONS.includes(user.security_question) ? user.security_question : user.security_question ? "custom" : "");
  const open = (next: Dialog) => { const question = user.security_question ?? ""; setForm({ username: user.username, current: "", password: "", confirm: "", question, answer: "" }); setQuestionMode(SECURITY_QUESTIONS.includes(question) ? question : question ? "custom" : ""); setError(""); setDialog(next); };
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setError(""); try {
    if (dialog === "username") { const next = await changeUsername({ username: form.username, current_password: form.current }); onUserUpdated(next); addToast({ variant: "success", title: "Username updated" }); }
    if (dialog === "password") { await changePassword({ current_password: form.current, new_password: form.password, confirm_password: form.confirm }); addToast({ variant: "success", title: "Password updated", message: "Sign in with your new password." }); onSignedOut(); }
    if (dialog === "security") { await changeSecurityQuestion({ current_password: form.current, security_question: form.question, security_answer: form.answer }); onUserUpdated({ ...user, security_question: form.question.trim() }); addToast({ variant: "success", title: "Recovery question updated" }); }
    setDialog(null);
  } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); } };
  return <div className="rounded-lg border border-border bg-surface p-5"><h3 className="text-base font-semibold text-text-primary">User Information</h3><p className="mb-5 mt-1 text-sm text-text-muted">Manage the administrator account and recovery details.</p>
    {user.uses_default_credentials && <div className="mb-4 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><p className="font-medium">Default administrator credentials are still in use.</p><p className="mt-0.5">For improved security, change the username or password.</p></div>}
    <div className="mb-4 grid max-w-2xl gap-3 sm:grid-cols-2"><div className="rounded-lg bg-secondary-bg p-3"><p className="text-xs text-text-muted">Account type</p><p className="text-sm font-medium text-text-primary">Administrator</p></div><div className="rounded-lg bg-secondary-bg p-3"><p className="text-xs text-text-muted">Account created</p><p className="text-sm font-medium text-text-primary">{new Date(user.created_at).toLocaleDateString()}</p></div></div>
    <div className="max-w-2xl divide-y divide-border rounded-lg border border-border">
      <SettingRow icon={<UserRound size={18}/>} label="Username" value={user.username} action="Change" onClick={() => open("username")} />
      <SettingRow icon={<KeyRound size={18}/>} label="Password" value={`Last changed ${new Date(user.password_changed_at).toLocaleDateString()}`} action="Change" onClick={() => open("password")} />
      <SettingRow icon={<ShieldQuestion size={18}/>} label="Security question" value={user.security_question ?? "Not configured"} action={user.security_question ? "Change" : "Set"} onClick={() => open("security")} />
    </div>
    <Modal isOpen={dialog !== null} onClose={() => setDialog(null)} title={dialog === "username" ? "Change username" : dialog === "password" ? "Change password" : "Change security question"} footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" form="user-settings-form" loading={busy}>Save</Button></>}>
      <form id="user-settings-form" onSubmit={submit} className="space-y-3">
        {dialog === "username" && <Input label="New username" required minLength={3} maxLength={50} value={form.username} onChange={(e) => setForm({...form, username:e.target.value})}/>} 
        {dialog === "password" && <><Input label="New password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({...form, password:e.target.value})}/><Input label="Confirm new password" type="password" required minLength={8} value={form.confirm} onChange={(e) => setForm({...form, confirm:e.target.value})}/></>}
        {dialog === "security" && <><Select label="Security question" required placeholder="Select question..." value={questionMode} options={[...SECURITY_QUESTIONS.map((question) => ({ value: question, label: question })), { value: "custom", label: "Custom Question" }]} onChange={(e) => { const mode = e.target.value; setQuestionMode(mode); setForm({...form, question: mode === "custom" ? "" : mode}); }}/>{questionMode === "custom" && <Input label="Custom question" required value={form.question} onChange={(e) => setForm({...form, question:e.target.value})}/>}<Input label="Security answer" required value={form.answer} onChange={(e) => setForm({...form, answer:e.target.value})}/></>}
        <Input label="Current password" type="password" required value={form.current} onChange={(e) => setForm({...form, current:e.target.value})}/>{error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </Modal>
  </div>;
}

function SettingRow({ icon, label, value, action, onClick }: { icon: React.ReactNode; label: string; value: string; action: string; onClick: () => void }) {
  return <div className="flex items-center gap-3 p-4"><span className="text-text-muted">{icon}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-text-primary">{label}</p><p className="truncate text-sm text-text-muted">{value}</p></div><Button size="sm" variant="secondary" onClick={onClick}>{action}</Button></div>;
}
