import { type ReactNode, useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getAuthStatus, getRecoveryQuestion, login, resetPassword, verifyRecoveryAnswer, type AuthUser } from "../../lib/api/auth";

export function AuthGate({ children }: { children: (user: AuthUser, signedOut: () => void, updated: (user: AuthUser) => void) => ReactNode }) {
  const [status, setStatus] = useState<"loading" | "login" | "ready">("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getAuthStatus().then((result) => {
      setUser(result.user);
      setStatus(result.authenticated && result.user ? "ready" : "login");
    }).catch(() => setStatus("login"));
  }, []);

  if (status === "loading") return <AuthFrame><p className="text-sm text-text-muted">Checking your account...</p></AuthFrame>;
  if (status === "login") return <LoginForm onComplete={(next) => { setUser(next); setStatus("ready"); }} />;
  if (!user) return null;
  return <>{children(user, () => { setUser(null); setStatus("login"); }, setUser)}</>;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-secondary-bg p-6">
    <div className="w-full max-w-md rounded-xl border border-border bg-surface p-7 shadow-sm">
      <div className="mb-6 text-center"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white"><LockKeyhole size={22} /></div><h1 className="text-xl font-semibold text-text-primary">Gym POS</h1></div>
      {children}
    </div>
  </div>;
}

function PasswordInput({ showLabel = false, ...props }: React.ComponentProps<typeof Input> & { showLabel?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div className={showLabel ? "space-y-2" : "relative"}><Input {...props} type={visible ? "text" : "password"} className={showLabel ? "" : "pr-10"} />{showLabel ? <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} className="h-4 w-4 accent-primary"/>Show Password</label> : <button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)} className="absolute bottom-2 right-3 text-text-muted">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>}</div>;
}

function LoginForm({ onComplete }: { onComplete: (user: AuthUser) => void }) {
  const [step, setStep] = useState<"login" | "unavailable" | "answer" | "reset">("login");
  const [username, setUsername] = useState("admin"); const [password, setPassword] = useState(""); const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(""); try { await action(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); } };
  if (step === "unavailable") return <AuthFrame><h2 className="mb-3 text-lg font-semibold">Password Recovery</h2><div className="rounded-lg bg-secondary-bg p-4 text-sm text-text-muted"><p>No security question has been configured for this account.</p><p className="mt-2 font-medium text-text-primary">Password recovery is unavailable.</p></div><Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => setStep("login")}>Back to Login</Button></AuthFrame>;
  if (step === "answer") return <AuthFrame><h2 className="mb-1 text-lg font-semibold">Account recovery</h2><p className="mb-4 text-sm text-text-muted">{question}</p><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await verifyRecoveryAnswer({ username, answer }); setStep("reset"); }); }}><Input label="Security answer" required autoFocus value={answer} onChange={(e) => setAnswer(e.target.value)} />{error && <p className="text-sm text-danger">{error}</p>}<Button type="submit" loading={busy} className="w-full">Verify Answer</Button><Button type="button" variant="secondary" className="w-full" onClick={() => setStep("login")}>Back to Login</Button></form></AuthFrame>;
  if (step === "reset") return <AuthFrame><h2 className="mb-4 text-lg font-semibold">Set a new password</h2><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await resetPassword({ new_password: newPassword, confirm_password: confirm }); setPassword(""); setStep("login"); }); }}><PasswordInput label="New password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><PasswordInput label="Confirm password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />{error && <p className="text-sm text-danger">{error}</p>}<Button type="submit" loading={busy} className="w-full">Reset Password</Button></form></AuthFrame>;
  return <AuthFrame><h2 className="mb-1 text-lg font-semibold text-text-primary">Login</h2><p className="mb-5 text-sm text-text-muted">Sign in to continue.</p><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => onComplete(await login({ username, password }))); }}><Input label="Username" required autoFocus value={username} onChange={(e) => setUsername(e.target.value)} /><PasswordInput showLabel label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />{error && <p className="text-sm text-danger">{error}</p>}<Button type="submit" loading={busy} className="w-full">Login</Button><button type="button" className="w-full text-sm font-medium text-primary hover:underline" onClick={() => run(async () => { const result = await getRecoveryQuestion(username); if (!result.recovery_available || !result.security_question) { setStep("unavailable"); return; } setQuestion(result.security_question); setStep("answer"); })}>Forgot Password?</button></form></AuthFrame>;
}
