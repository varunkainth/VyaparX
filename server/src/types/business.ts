import type { UserRole } from "./user";

export interface CreateBusinessInput {
    owner_id: string;
    name: string;
    gstin?: string;
    pan?: string;
    state_code: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    website?: string;
    logo_url?: string;
    signature_url?: string;
    invoice_prefix?: string;
    bank_name?: string;
    bank_account_no?: string;
    bank_ifsc?: string;
    bank_branch?: string;
    upi_id?: string;
}

export type CreateBusinessBody = Omit<CreateBusinessInput, "owner_id">;

export interface BusinessIdParams {
    business_id: string;
    [key: string]: string;
}

export interface BusinessMemberParams extends BusinessIdParams {
    user_id: string;
}

export interface BusinessMemberMutationInput {
    businessId: string;
    userId: string;
    role: UserRole;
}

export interface BusinessMemberInviteInput extends BusinessMemberMutationInput {
    invitedBy: string;
}

export interface BusinessMemberStatusInput {
    businessId: string;
    userId: string;
    isActive: boolean;
}

export type BusinessAssignableRole = "admin" | "staff" | "viewer" | "accountant";

export interface InviteBusinessMemberBody {
    email: string;
    role: BusinessAssignableRole;
}

export interface UpdateBusinessMemberRoleBody {
    role: BusinessAssignableRole;
}

export interface UpdateBusinessMemberStatusBody {
    is_active: boolean;
}
