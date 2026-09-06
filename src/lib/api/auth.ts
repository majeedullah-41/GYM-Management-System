import { invokeCommand } from "../tauri";

export interface AuthUser {
  id: string;
  username: string;
  security_question: string | null;
  uses_default_credentials: boolean;
  created_at: string;
  password_changed_at: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: AuthUser | null;
}

export const getAuthStatus = () => invokeCommand<AuthStatus>("get_auth_status");
export const login = (request: { username: string; password: string }) => invokeCommand<AuthUser>("login", { request });
export const logout = () => invokeCommand<void>("logout");
export const getRecoveryQuestion = (username: string) => invokeCommand<{ recovery_available: boolean; security_question: string | null }>("get_recovery_question", { username });
export const verifyRecoveryAnswer = (request: { username: string; answer: string }) => invokeCommand<{ verified: boolean }>("verify_recovery_answer", { request });
export const resetPassword = (request: { new_password: string; confirm_password: string }) => invokeCommand<void>("reset_password", { request });
export const changeUsername = (request: { username: string; current_password: string }) => invokeCommand<AuthUser>("change_username", { request });
export const changePassword = (request: { current_password: string; new_password: string; confirm_password: string }) => invokeCommand<void>("change_password", { request });
export const changeSecurityQuestion = (request: { current_password: string; security_question: string; security_answer: string }) => invokeCommand<void>("change_security_question", { request });
