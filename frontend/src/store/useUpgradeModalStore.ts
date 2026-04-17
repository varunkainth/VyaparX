import { create } from "zustand";
import type { BillingCycle } from "@/types/subscription";

export type UpgradeTriggerSource = "manual" | "api";

export type UpgradeModalContext = {
  feature: string | null;
  message: string | null;
  billingCycle: BillingCycle;
  source: UpgradeTriggerSource;
};

interface UpgradeModalStore {
  isOpen: boolean;
  context: UpgradeModalContext | null;
  open: (context?: Partial<UpgradeModalContext>) => void;
  close: () => void;
}

const defaultContext: UpgradeModalContext = {
  feature: null,
  message: null,
  billingCycle: "monthly",
  source: "manual",
};

export const useUpgradeModalStore = create<UpgradeModalStore>((set) => ({
  isOpen: false,
  context: null,
  open: (context) =>
    set({
      isOpen: true,
      context: {
        ...defaultContext,
        ...context,
      },
    }),
  close: () =>
    set({
      isOpen: false,
      context: null,
    }),
}));
