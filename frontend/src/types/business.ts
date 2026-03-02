export type BusinessRole = "owner" | "admin" | "staff" | "viewer" | "accountant";
export type MemberStatus = "active" | "inactive" | "pending";

export interface Business {
  id: string;
  name: string;
  gstin?: string | null;
  pan?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  owner_id: string;
  owner_name?: string | null;
  owner_email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  is_active: boolean;
  invited_by?: string | null;
  invited_at: string;
  created_at: string;
  updated_at: string;
  name?: string;
  email?: string;
}

export interface BusinessWithRole extends Business {
  role: BusinessRole;
  membership_status: MemberStatus;
}

export interface CreateBusinessInput {
  name: string;
  gstin?: string;
  pan?: string;
  address_line1: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  phone?: string;
  email?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
}

export interface InviteMemberInput {
  email: string;
  role: BusinessRole;
}

export interface UpdateMemberRoleInput {
  role: BusinessRole;
}

export interface UpdateMemberStatusInput {
  is_active: boolean;
}

export interface BusinessState {
  businesses: BusinessWithRole[];
  currentBusiness: BusinessWithRole | null;
  isLoading: boolean;
}
