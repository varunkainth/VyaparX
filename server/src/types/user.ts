export const USER_ROLES = ["owner", "admin", "staff", "viewer", "accountant"] as const;
export type UserRole = typeof USER_ROLES[number];

export interface DatabaseUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    password_hash: string;
    is_verified: boolean;
    token_version: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export type PublicUser = Omit<DatabaseUser, "password_hash">;

export type CreateUserInput = Pick<
    DatabaseUser,
    "name" | "email" | "phone" | "password_hash"
>;

export type UpdateUserInput = Partial<
    Pick<DatabaseUser, "name" | "email" | "phone" | "is_verified">
>;

export interface BusinessMember {
    id: string;
    business_id: string;
    user_id: string;
    role: UserRole;
    invited_by: string | null;
    joined_at: Date;
    is_active: boolean;
}

export type UserWithBusinessRole = PublicUser & {
    business_id: string;
    role: UserRole;
};
