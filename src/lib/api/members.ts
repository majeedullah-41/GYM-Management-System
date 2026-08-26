import { invokeCommand } from "../tauri";

export interface MemberResponse {
  id: string;
  member_number: string;
  full_name: string;
  father_name: string | null;
  phone: string | null;
  cnic: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  is_archived: boolean;
  membership_plan_name: string | null;
  membership_start_date: string | null;
  membership_expiry_date: string | null;
  membership_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMemberRequest {
  full_name: string;
  father_name: string | null;
  phone: string | null;
  cnic: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
}

export interface UpdateMemberRequest {
  full_name: string;
  father_name: string | null;
  phone: string | null;
  cnic: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
}

export async function createMember(
  request: CreateMemberRequest,
): Promise<MemberResponse> {
  return invokeCommand<MemberResponse>("create_member", { request });
}

export async function getMember(id: string): Promise<MemberResponse> {
  return invokeCommand<MemberResponse>("get_member", { id });
}

export async function listMembers(args: {
  search?: string;
  status?: string;
  include_archived?: boolean;
}): Promise<MemberResponse[]> {
  return invokeCommand<MemberResponse[]>("list_members", {
    search: args.search ?? null,
    status: args.status ?? null,
    include_archived: args.include_archived ?? false,
  });
}

export async function updateMember(
  id: string,
  request: UpdateMemberRequest,
): Promise<MemberResponse> {
  return invokeCommand<MemberResponse>("update_member", { id, request });
}

export async function archiveMember(id: string): Promise<MemberResponse> {
  return invokeCommand<MemberResponse>("archive_member", { id });
}
