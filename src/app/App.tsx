import { AppShell } from "../components/layout/AppShell";
import { ToastProvider } from "../components/feedback/ToastProvider";
import { AuthGate } from "../features/auth/AuthGate";
import { LicenseGate } from "../features/licensing/components/LicenseGate";

export default function App() {
  return (
    // Above the auth gate so messages raised by the last command of a session,
    // such as a restore that signs the user out, outlive the sign-out.
    <ToastProvider>
      <LicenseGate>
        <AuthGate>
          {(user, signedOut, updated) => (
            <AppShell user={user} onSignedOut={signedOut} onUserUpdated={updated} />
          )}
        </AuthGate>
      </LicenseGate>
    </ToastProvider>
  );
}
