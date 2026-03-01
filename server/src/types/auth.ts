export interface SignupInput {
    name: string;
    email: string;
    phone: string;
    password: string;
}

export interface LoginInput {
    identifier: string;
    password: string;
    business_id?: string;
}

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

export interface SwitchBusinessInput {
    business_id: string;
}
