import { invokeCommand } from "../tauri";

export interface PlanResponse {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanRequest {
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
}

export interface UpdatePlanRequest {
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
}

export async function createPlan(
  request: CreatePlanRequest,
): Promise<PlanResponse> {
  return invokeCommand<PlanResponse>("create_plan", { request });
}

export async function getPlan(id: string): Promise<PlanResponse> {
  return invokeCommand<PlanResponse>("get_plan", { id });
}

export async function listPlans(): Promise<PlanResponse[]> {
  return invokeCommand<PlanResponse[]>("list_plans");
}

export async function listActivePlans(): Promise<PlanResponse[]> {
  return invokeCommand<PlanResponse[]>("list_active_plans");
}

export async function updatePlan(
  id: string,
  request: UpdatePlanRequest,
): Promise<PlanResponse> {
  return invokeCommand<PlanResponse>("update_plan", { id, request });
}

export async function deactivatePlan(id: string): Promise<PlanResponse> {
  return invokeCommand<PlanResponse>("deactivate_plan", { id });
}
