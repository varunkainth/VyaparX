"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      isSpecialAction?: boolean;
      actionKey?: string;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  // Initialize open state based on current path
  const getInitialOpenState = (item: (typeof items)[0]) => {
    if (openItems[item.title] !== undefined) {
      return openItems[item.title];
    }
    return (
      item.items?.some(
        (subItem) => pathname.startsWith(subItem.url) && subItem.url !== "#",
      ) || pathname === item.url
    );
  };

  const handleToggle = (title: string, currentState: boolean) => {
    setOpenItems((prev) => ({
      ...prev,
      [title]: !currentState,
    }));
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isOpen = getInitialOpenState(item);

          return (
            <Collapsible
              key={item.title}
              asChild
              open={isOpen}
              onOpenChange={() => handleToggle(item.title, isOpen)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="cursor-pointer"
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        {subItem.isSpecialAction ? (
                          <SidebarMenuSubButton
                            asChild
                            className="cursor-pointer"
                          >
                            <a
                              href={subItem.url}
                              data-sidebar-action={subItem.actionKey}
                            >
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        ) : (
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === subItem.url}
                            className="cursor-pointer"
                          >
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        )}
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
