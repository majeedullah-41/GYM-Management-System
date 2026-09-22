import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAllSettings, type GymSettings } from "../lib/api/settings";
import { getLicenseStatus } from "../lib/api/license";

interface GymContextValue {
  gymName: string;
  gymLogo: string | null;
  gymTagline: string | null;
  loading: boolean;
  setGymInfo: (info: Partial<GymSettings>) => void;
  refreshGym: () => Promise<void>;
}

const GymContext = createContext<GymContextValue>({
  gymName: "Gym POS",
  gymLogo: null,
  gymTagline: null,
  loading: true,
  setGymInfo: () => {},
  refreshGym: async () => {},
});

function resolveGymName(configuredName: string, licensedGymName: string | null): string {
  const trimmed = configuredName.trim();
  if (trimmed && trimmed !== "Gym POS") {
    return trimmed;
  }
  if (licensedGymName) {
    return licensedGymName;
  }
  return "Gym POS";
}

export function GymProvider({ children }: { children: ReactNode }) {
  const [gymName, setGymName] = useState("Gym POS");
  const [gymLogo, setGymLogo] = useState<string | null>(null);
  const [gymTagline, setGymTagline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const licensedGymNameRef = useRef<string | null>(null);

  const refreshGym = useCallback(async () => {
    try {
      const [settingsResult, licenseResult] = await Promise.allSettled([
        getAllSettings(),
        getLicenseStatus(),
      ]);

      let licenseGymName = licensedGymNameRef.current;
      if (licenseResult.status === "fulfilled" && licenseResult.value.license?.gym_name) {
        licenseGymName = licenseResult.value.license.gym_name.trim() || null;
      }
      licensedGymNameRef.current = licenseGymName;

      if (settingsResult.status === "fulfilled") {
        const gym = settingsResult.value.gym;
        const configuredName = gym?.gym_name ? gym.gym_name.trim() : "";
        setGymName(resolveGymName(configuredName, licenseGymName));
        setGymLogo(gym?.gym_logo || null);
        setGymTagline(gym?.gym_tagline || null);
      }
    } catch {
      // Keep current values when a request fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshGym();
  }, [refreshGym]);

  const setGymInfo = useCallback((info: Partial<GymSettings>) => {
    if (info.gym_name !== undefined) {
      setGymName(resolveGymName(info.gym_name, licensedGymNameRef.current));
    }
    if (info.gym_logo !== undefined) {
      setGymLogo(info.gym_logo);
    }
    if (info.gym_tagline !== undefined) {
      setGymTagline(info.gym_tagline);
    }
  }, []);

  return (
    <GymContext.Provider
      value={{
        gymName,
        gymLogo,
        gymTagline,
        loading,
        setGymInfo,
        refreshGym,
      }}
    >
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  return useContext(GymContext);
}
