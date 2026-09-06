import { AppShell } from "../components/layout/AppShell";
import { AuthGate } from "../features/auth/AuthGate";

export default function App() {
  return <AuthGate>{(user, signedOut, updated) => <AppShell user={user} onSignedOut={signedOut} onUserUpdated={updated} />}</AuthGate>;
}
