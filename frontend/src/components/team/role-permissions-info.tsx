"use client";

import type { BusinessRole } from "@/types/business";
import {
  getRoleCapabilities,
  ROLE_DESCRIPTIONS,
  PERMISSION_LABELS,
} from "@/lib/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface RolePermissionsInfoProps {
  role: BusinessRole;
  compact?: boolean;
}

export function RolePermissionsInfo({
  role,
  compact = false,
}: RolePermissionsInfoProps) {
  const capabilities = getRoleCapabilities(role);
  const roleInfo = ROLE_DESCRIPTIONS[role];

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className="capitalize">{roleInfo.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{roleInfo.description}</p>
      </div>
    );
  }

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="capitalize">
            {roleInfo.label}
          </Badge>
        </div>
        <CardTitle className="text-lg">{roleInfo.label} Role</CardTitle>
        <CardDescription>{roleInfo.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Permissions:</p>
          <div className="grid gap-2">
            {Object.entries(PERMISSION_LABELS).map(
              ([key, { label, description }]) => {
                const hasPermission =
                  capabilities[key as keyof typeof capabilities];
                return (
                  <div
                    key={key}
                    className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 p-3"
                  >
                    {hasPermission ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
