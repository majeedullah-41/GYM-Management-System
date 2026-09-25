import { type ReactNode, useEffect, useState } from "react";
import { User, Lock, KeyRound } from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  getAuthStatus,
  getRecoveryQuestion,
  login,
  resetPassword,
  verifyRecoveryAnswer,
  type AuthUser,
} from "../../lib/api/auth";
import { getAllSettings } from "../../lib/api/settings";

export function AuthGate({
  children,
}: {
  children: (
    user: AuthUser,
    signedOut: () => void,
    updated: (user: AuthUser) => void,
  ) => ReactNode;
}) {
  const [status, setStatus] = useState<"loading" | "login" | "ready">("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getAuthStatus()
      .then((result) => {
        setUser(result.user);
        setStatus(result.authenticated && result.user ? "ready" : "login");
      })
      .catch(() => setStatus("login"));
  }, []);

  if (status === "loading") {
    return (
      <AuthFrame>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#17613f] border-t-transparent" />
          <p className="mt-4 text-xs font-medium text-slate-500">Checking your account...</p>
        </div>
      </AuthFrame>
    );
  }

  if (status === "login") {
    return (
      <LoginForm
        onComplete={(next) => {
          setUser(next);
          setStatus("ready");
        }}
      />
    );
  }

  if (!user) return null;
  return <>{children(user, () => { setUser(null); setStatus("login"); }, setUser)}</>;
}

function AuthFrame({ children }: { children: ReactNode }) {
  const [gymName, setGymName] = useState("GOLD GYM");
  const [gymTagline, setGymTagline] = useState("Train Today Be Better");

  useEffect(() => {
    getAllSettings()
      .then((settings) => {
        if (settings?.gym?.gym_name) setGymName(settings.gym.gym_name);
        if (settings?.gym?.gym_tagline) setGymTagline(settings.gym.gym_tagline);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
      style={{
        background: `
          radial-gradient(circle at 12% 18%, rgba(200, 230, 212, 0.45) 0%, transparent 40%),
          radial-gradient(circle at 88% 82%, rgba(200, 230, 212, 0.45) 0%, transparent 45%),
          radial-gradient(circle at 50% 50%, rgba(246, 250, 247, 0.9) 0%, #edf6f0 100%)
        `,
      }}
    >
      {/* Background organic curved accent shapes */}
      <div className="pointer-events-none absolute -left-20 top-1/4 h-96 w-96 rounded-full border-[40px] border-emerald-900/[0.03]" />
      <div className="pointer-events-none absolute -right-20 top-10 h-[480px] w-[480px] rounded-full border-[50px] border-emerald-900/[0.03]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-80 w-80 rounded-full border-[35px] border-emerald-900/[0.02]" />

      {/* Main Card */}
      <div className="relative z-10 flex w-full max-w-[880px] min-h-[500px] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_25px_60px_-15px_rgba(23,97,63,0.12)] md:flex-row">
        {/* Left Visual Column */}
        <div className="relative flex w-full flex-col justify-between overflow-hidden bg-gradient-to-b from-[#e6f2eb] via-[#edf6f0] to-[#dfeee4] p-8 md:w-[44%]">
          {/* Subtle decorative curved rings */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full border-[28px] border-white/30" />
          <div className="pointer-events-none absolute -right-16 top-1/3 h-56 w-56 rounded-full border-[24px] border-white/25" />
          <div className="pointer-events-none absolute -left-10 bottom-16 h-60 w-60 rounded-full border-[28px] border-white/20" />

          {/* Dumbbell Icon & Brand Header */}
          <div className="relative z-10 mt-6 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center justify-center">
              <svg
                viewBox="0 0 72 72"
                className="h-16 w-16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="14" y="22" width="7" height="28" rx="3.5" fill="#17613f" />
                <rect x="23" y="16" width="7" height="40" rx="3.5" fill="#17613f" />
                <rect x="30" y="32" width="12" height="8" rx="2" fill="#17613f" />
                <rect x="42" y="16" width="7" height="40" rx="3.5" fill="#17613f" />
                <rect x="51" y="22" width="7" height="28" rx="3.5" fill="#17613f" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
              {gymName}
            </h1>
            <p className="mt-1 text-xs font-semibold tracking-wide text-slate-500">
              {gymTagline}
            </p>
          </div>

          {/* Dumbbell Photography Bottom Visual */}
          <div className="relative -mx-8 -mb-8 mt-8 h-48 overflow-hidden">
            <img
              src="/login-gym-bg.jpg"
              alt="Gym weights"
              className="h-full w-full object-cover object-bottom mix-blend-multiply opacity-80"
            />
            {/* Smooth gradient blend upwards */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#dfeee4]/60 to-[#dfeee4]" />
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full border-[20px] border-white/30 bg-emerald-800/5" />
          </div>
        </div>

        {/* Right Form Column */}
        <div className="flex w-full flex-col justify-center bg-white p-8 sm:p-12 md:w-[56%]">
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onComplete }: { onComplete: (user: AuthUser) => void }) {
  const [step, setStep] = useState<"login" | "unavailable" | "answer" | "reset">("login");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [gymName, setGymName] = useState("GOLD GYM");

  useEffect(() => {
    getAllSettings()
      .then((settings) => {
        if (settings?.gym?.gym_name) setGymName(settings.gym.gym_name);
      })
      .catch(() => {});
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (step === "unavailable") {
    return (
      <AuthFrame>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Password Recovery</h2>
          <p className="mt-1 text-xs text-slate-500">Security question status</p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
            <p>No security question has been configured for this account.</p>
            <p className="mt-2 font-semibold text-amber-950">Password recovery is unavailable.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-6 w-full text-xs"
            onClick={() => setStep("login")}
          >
            Back to Login
          </Button>
        </div>
      </AuthFrame>
    );
  }

  if (step === "answer") {
    return (
      <AuthFrame>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Account Recovery</h2>
          <p className="mt-1 text-xs text-slate-500">{question}</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await verifyRecoveryAnswer({ username, answer });
                setStep("reset");
              });
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="recovery-answer" className="block text-xs font-semibold text-slate-700">
                Security answer
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-3.5 text-slate-400">
                  <KeyRound size={16} />
                </div>
                <input
                  id="recovery-answer"
                  aria-label="Security answer"
                  required
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter your secret answer"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-[#17613f] focus:outline-none focus:ring-1 focus:ring-[#17613f]"
                />
              </div>
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                {error}
              </div>
            )}
            <Button
              type="submit"
              loading={busy}
              className="w-full rounded-lg bg-[#17613f] py-2.5 text-xs font-semibold text-white hover:bg-[#104b31]"
            >
              Verify Answer
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full text-xs"
              onClick={() => setStep("login")}
            >
              Back to Login
            </Button>
          </form>
        </div>
      </AuthFrame>
    );
  }

  if (step === "reset") {
    return (
      <AuthFrame>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Set a New Password</h2>
          <p className="mt-1 text-xs text-slate-500">Create a secure password with at least 8 characters</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await resetPassword({ new_password: newPassword, confirm_password: confirm });
                setPassword("");
                setStep("login");
              });
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700">
                New password
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-3.5 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="new-password"
                  aria-label="New password"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-[#17613f] focus:outline-none focus:ring-1 focus:ring-[#17613f]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700">
                Confirm password
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-3.5 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="confirm-password"
                  aria-label="Confirm password"
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-[#17613f] focus:outline-none focus:ring-1 focus:ring-[#17613f]"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={busy}
              className="w-full rounded-lg bg-[#17613f] py-2.5 text-xs font-semibold text-white hover:bg-[#104b31]"
            >
              Reset Password
            </Button>
          </form>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <div>
        <h2
          aria-label="Login"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
        >
          Welcome back
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Sign in to continue to {gymName}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => onComplete(await login({ username, password })));
          }}
        >
          {/* Username Input with User icon */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-xs font-semibold text-slate-700">
              Username
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 text-slate-400">
                <User size={16} />
              </div>
              <input
                id="username"
                aria-label="Username"
                type="text"
                required
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-[#17613f] focus:outline-none focus:ring-1 focus:ring-[#17613f]"
              />
            </div>
          </div>

          {/* Password Input with Lock icon */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute left-3.5 text-slate-400">
                <Lock size={16} />
              </div>
              <input
                id="password"
                aria-label="Password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-[#17613f] focus:outline-none focus:ring-1 focus:ring-[#17613f]"
              />
            </div>
          </div>

          {/* Show Password Checkbox */}
          <div className="pt-0.5">
            <label
              htmlFor="show-password"
              className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-500 select-none"
            >
              <input
                id="show-password"
                aria-label="Show Password"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#17613f] accent-[#17613f] focus:ring-[#17613f] cursor-pointer"
              />
              <span>Show Password</span>
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Login Button */}
          <Button
            type="submit"
            loading={busy}
            className="w-full rounded-lg bg-[#17613f] py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#104b31] transition-all"
          >
            Login
          </Button>

          {/* Forgot Password link */}
          <div className="pt-1 text-center">
            <button
              type="button"
              className="text-xs font-semibold text-[#17613f] hover:underline transition-colors"
              onClick={() =>
                run(async () => {
                  const result = await getRecoveryQuestion(username);
                  if (!result.recovery_available || !result.security_question) {
                    setStep("unavailable");
                    return;
                  }
                  setQuestion(result.security_question);
                  setStep("answer");
                })
              }
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>
    </AuthFrame>
  );
}
