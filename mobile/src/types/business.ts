export interface BusinessWithRole {
  id: string;
  name: string;
  gstin?: string | null;
  pan?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
  invoice_prefix?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  upi_id?: string | null;
  role: 'owner' | 'admin' | 'staff' | 'viewer' | 'accountant';
  membership_status?: 'active' | 'inactive' | 'pending';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BusinessAssignableRole = 'admin' | 'staff' | 'viewer' | 'accountant';

export interface BusinessMember {
  email: string;
  id: string;
  is_active: boolean;
  joined_at: string;
  name: string;
  role: 'owner' | BusinessAssignableRole;
}

export interface CreateBusinessInput {
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
