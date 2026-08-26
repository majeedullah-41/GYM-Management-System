import { createContext, useContext } from "react";
import type { Page } from "../../types";

interface NavigationContextValue {
  navigateTo: (page: Page) => void;
  navigateToMember: (memberId: string) => void;
  openAddMember: () => void;
  openRecordPayment: () => void;
}

export const NavigationContext = createContext<NavigationContextValue>({
  navigateTo: () => {},
  navigateToMember: () => {},
  openAddMember: () => {},
  openRecordPayment: () => {},
});

export function useNavigation() {
  return useContext(NavigationContext);
}
