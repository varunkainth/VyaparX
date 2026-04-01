import type { BusinessRole } from "@/types/business";

export type PermissionKey =
  | "viewData"
  | "createEdit"
  | "delete"
  | "manageMembers"
  | "businessSettings";

export type RoleCapabilities = Record<PermissionKey, boolean>;

const ROLE_CAPABILITIES: Record<BusinessRole, RoleCapabilities> = {
  owner: {
    viewData: true,
    createEdit: true,
    delete: true,
    manageMembers: true,
    businessSettings: true,
  },
  admin: {
    viewData: true,
    createEdit: true,
    delete: true,
    manageMembers: true,
    businessSettings: true,
  },
  staff: {
    viewData: true,
    createEdit: true,
    delete: false,
    manageMembers: false,
    businessSettings: false,
  },
  accountant: {
    viewData: true,
    createEdit: true,
    delete: false,
    manageMembers: false,
    businessSettings: false,
  },
  viewer: {
    viewData: true,
    createEdit: false,
    delete: false,
    manageMembers: false,
    businessSettings: false,
  },
};

const NO_ACCESS_CAPABILITIES: RoleCapabilities = {
  viewData: false,
  createEdit: false,
  delete: false,
  manageMembers: false,
  businessSettings: false,
};

export function getRoleCapabilities(
  role: BusinessRole | null | undefined,
): RoleCapabilities {
  if (!role) {
    return NO_ACCESS_CAPABILITIES;
  }
  return ROLE_CAPABILITIES[role] ?? NO_ACCESS_CAPABILITIES;
}

export function hasPermission(
  role: BusinessRole | null | undefined,
  permission: PermissionKey,
): boolean {
  return getRoleCapabilities(role)[permission];
}

export const ROLE_DESCRIPTIONS: Record<
  BusinessRole,
  { label: string; description: string }
> = {
  owner: {
    label: "Owner",
    description: "Full access to all features, members, and business settings",
  },
  admin: {
    label: "Admin",
    description: "Can create, edit, delete records and manage team members",
  },
  staff: {
    label: "Staff",
    description:
      "Can view and create/edit records, but cannot delete or manage settings",
  },
  accountant: {
    label: "Accountant",
    description:
      "Can view and create/edit financial records, but cannot delete or manage settings",
  },
  viewer: {
    label: "Viewer",
    description: "Read-only access to all business data",
  },
};

export const PERMISSION_LABELS: Record<
  PermissionKey,
  { label: string; description: string }
> = {
  viewData: {
    label: "View Data",
    description: "Can view business information",
  },
  createEdit: {
    label: "Create & Edit",
    description: "Can create and modify records",
  },
  delete: { label: "Delete", description: "Can delete records permanently" },
  manageMembers: {
    label: "Manage Members",
    description: "Can invite and manage team members",
  },
  businessSettings: {
    label: "Business Settings",
    description: "Can modify business configuration",
  },
};
