"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Wallet,
  TrendingUp,
  Settings,
  Receipt,
  BookOpen,
  CreditCard,
} from "lucide-react";

import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
import { BusinessSwitcher } from "@/components/business/business-switcher";
import { InvoiceTypeSelector } from "@/components/invoices/invoice-type-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useBusinessStore } from "@/store/useBusinessStore";
import { getRoleCapabilities } from "@/lib/permissions";

// Navigation data for VyaparX
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
        {
          title: "Analytics",
          url: "/dashboard/analytics",
        },
        {
          title: "Analytics Overview",
          url: "/dashboard/analytics-overview",
        },
        {
          title: "Recent Activity",
          url: "/dashboard/activity",
        },
      ],
    },
    {
      title: "Invoices",
      url: "/invoices",
      icon: FileText,
      items: [
        {
          title: "All Invoices",
          url: "/invoices",
        },
        {
          title: "Create",
          url: "#",
          isSpecialAction: true,
          actionKey: "invoice-create",
        },
      ],
    },
    {
      title: "Parties",
      url: "/parties",
      icon: Users,
      items: [
        {
          title: "All Parties",
          url: "/parties",
        },
        {
          title: "Add Party",
          url: "#",
          isSpecialAction: true,
          actionKey: "party-add",
        },
        {
          title: "Customers",
          url: "/parties/customers",
        },
        {
          title: "Suppliers",
          url: "/parties/suppliers",
        },
      ],
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: Package,
      items: [
        {
          title: "All Items",
          url: "/inventory",
        },
        {
          title: "Add Item",
          url: "/inventory/create",
        },
        {
          title: "Stock Movement",
          url: "/inventory/movements",
        },
        {
          title: "Low Stock",
          url: "/inventory/low-stock",
        },
      ],
    },
    {
      title: "Payments",
      url: "/payments",
      icon: Wallet,
      items: [
        {
          title: "All Payments",
          url: "/payments",
        },
        {
          title: "Record Payment",
          url: "/payments/record",
        },
        {
          title: "Payment In",
          url: "/payments/in",
        },
        {
          title: "Payment Out",
          url: "/payments/out",
        },
      ],
    },
    {
      title: "Ledger",
      url: "/ledger",
      icon: BookOpen,
      items: [
        {
          title: "Ledger Statement",
          url: "/ledger",
        },
        {
          title: "Party Ledger",
          url: "/ledger/party",
        },
      ],
    },
    {
      title: "Reports",
      url: "/reports",
      icon: TrendingUp,
      items: [
        {
          title: "Sales Report",
          url: "/reports/sales",
        },
        {
          title: "Purchase Report",
          url: "/reports/purchase",
        },
        {
          title: "Profit & Loss",
          url: "/reports/profit-loss",
        },
        {
          title: "GST Report",
          url: "/reports/gst",
        },
        {
          title: "Outstanding",
          url: "/reports/outstanding",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        {
          title: "Business Profile",
          url: "/settings/business",
        },
        {
          title: "Invoice Settings",
          url: "/settings/invoice",
        },
        {
          title: "Team Members",
          url: "/settings/team",
        },
        {
          title: "Preferences",
          url: "/settings/preferences",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const currentBusiness = useBusinessStore((state) => state.currentBusiness);
  const capabilities = getRoleCapabilities(currentBusiness?.role);
  const [showInvoiceTypeSelector, setShowInvoiceTypeSelector] =
    React.useState(false);
  const [showPartyTypeSelector, setShowPartyTypeSelector] =
    React.useState(false);

  const navItems = React.useMemo(() => {
    return data.navMain
      .map((section) => {
        if (section.title === "Settings" && !capabilities.businessSettings) {
          return null;
        }

        const filteredSubItems = section.items?.filter((subItem) => {
          if (
            subItem.actionKey === "invoice-create" ||
            subItem.actionKey === "party-add"
          ) {
            return capabilities.createEdit;
          }

          if (
            subItem.url === "/inventory/create" ||
            subItem.url === "/payments/record"
          ) {
            return capabilities.createEdit;
          }

          if (subItem.url.startsWith("/settings/")) {
            return capabilities.businessSettings;
          }

          return true;
        });

        if (
          section.items &&
          (!filteredSubItems || filteredSubItems.length === 0)
        ) {
          return null;
        }

        return {
          ...section,
          items: filteredSubItems,
        };
      })
      .filter((section): section is NonNullable<typeof section> =>
        Boolean(section),
      );
  }, [capabilities.businessSettings, capabilities.createEdit]);

  const handlePartyTypeSelect = (type: "customer" | "supplier" | "both") => {
    setShowPartyTypeSelector(false);
    router.push(`/parties/create?type=${type}`);
  };

  // Handle click events on the sidebar
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const actionElement = target.closest<HTMLElement>(
        "[data-sidebar-action]",
      );

      if (actionElement?.dataset.sidebarAction === "invoice-create") {
        event.preventDefault();
        setShowInvoiceTypeSelector(true);
        return;
      }

      if (actionElement?.dataset.sidebarAction === "party-add") {
        event.preventDefault();
        setShowPartyTypeSelector(true);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <BusinessSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navItems} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <InvoiceTypeSelector
        open={showInvoiceTypeSelector}
        onOpenChange={setShowInvoiceTypeSelector}
      />
      <Dialog
        open={showPartyTypeSelector}
        onOpenChange={setShowPartyTypeSelector}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Party Type</DialogTitle>
            <DialogDescription>
              Choose which type of party you want to create.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              type="button"
              className="cursor-pointer"
              onClick={() => handlePartyTypeSelect("customer")}
            >
              Customer
            </Button>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => handlePartyTypeSelect("supplier")}
            >
              Supplier
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handlePartyTypeSelect("both")}
            >
              Both
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
