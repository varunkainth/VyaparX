import type {
    AuthenticatorTransportFuture,
    AuthenticationResponseJSON,
    CredentialDeviceType,
    RegistrationResponseJSON,
} from "@simplewebauthn/server";

export type WebAuthnChallengeType = "registration" | "authentication";

export interface WebAuthnCredentialRecord {
    id: string;
    user_id: string;
    credential_id: string;
    public_key: string;
    counter: number;
    transports: AuthenticatorTransportFuture[];
    credential_device_type: CredentialDeviceType;
    credential_backed_up: boolean;
    label: string;
    last_used_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface WebAuthnChallengeRecord {
    id: string;
    user_id: string;
    challenge: string;
    challenge_type: WebAuthnChallengeType;
    expires_at: Date;
    created_at: Date;
}

export interface BeginPasskeyAuthenticationInput {
    identifier: string;
}

export interface VerifyPasskeyAuthenticationInput {
    identifier: string;
    response: AuthenticationResponseJSON;
    business_id?: string;
}

export interface VerifyPasskeyRegistrationInput {
    response: RegistrationResponseJSON;
    label?: string;
}
