import { AppShell } from "../components/layout/AppShell";
import { AuthGate } from "../features/auth/AuthGate";
import { LicenseGate } from "../features/licensing/components/LicenseGate";

export default function App() {
  return (
    <LicenseGate>
      <AuthGate>
        {(user, signedOut, updated) => (
          <AppShell user={user} onSignedOut={signedOut} onUserUpdated={updated} />
        )}
      </AuthGate>
    </LicenseGate>
  );
}