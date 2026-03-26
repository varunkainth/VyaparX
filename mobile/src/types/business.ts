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
  role: 'owner' | 'admin' | 'staff' | 'viewer' | 'accountant';
  membership_status?: 'active' | 'inactive' | 'pending';
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
