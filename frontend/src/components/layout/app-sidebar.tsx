"use client"

import * as React from "react"
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
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import { BusinessSwitcher } from "@/components/business/business-switcher"
import { InvoiceTypeSelector } from "@/components/invoices/invoice-type-selector"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

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
        },
        {
          title: "Drafts",
          url: "/invoices/drafts",
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
          url: "/parties/create",
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
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [showInvoiceTypeSelector, setShowInvoiceTypeSelector] = React.useState(false);

  // Handle click events on the sidebar
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if the clicked element is the "Create" button in the Invoices menu
      if (target.closest('a[href="#"]') && 
          target.textContent?.trim() === "Create") {
        event.preventDefault();
        setShowInvoiceTypeSelector(true);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <BusinessSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={data.navMain} />
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
    </>
  )
}
