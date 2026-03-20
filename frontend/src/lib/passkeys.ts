"use client";

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export const passkeyClient = {
  isSupported() {
    return typeof window !== "undefined" && browserSupportsWebAuthn();
  },

  async register(optionsJSON: PublicKeyCredentialCreationOptionsJSON): Promise<RegistrationResponseJSON> {
    return startRegistration({ optionsJSON });
  },

  async authenticate(
    optionsJSON: PublicKeyCredentialRequestOptionsJSON
  ): Promise<AuthenticationResponseJSON> {
    return startAuthentication({ optionsJSON });
  },
};
