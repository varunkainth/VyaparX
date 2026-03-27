import * as React from "react";
import { View } from "react-native";
import { CheckCircle2, CircleAlert } from "lucide-react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export function ToastBanner({
  message,
  variant = "success",
}: {
  message: string | null;
  variant?: "success" | "error";
}) {
  if (!message) {
    return null;
  }

  const icon = variant === "success" ? CheckCircle2 : CircleAlert;
  const palette =
    variant === "success"
      ? {
          bg: "bg-emerald-600",
          icon: "text-white",
          text: "text-white",
        }
      : {
          bg: "bg-destructive",
          icon: "text-white",
          text: "text-white",
        };

  return (
    <View className="absolute bottom-6 left-6 right-6 z-50">
      <View
        className={`flex-row items-center gap-3 rounded-[22px] px-4 py-4 shadow-lg shadow-black/15 ${palette.bg}`}>
        <Icon as={icon} className={palette.icon} size={18} />
        <Text className={`flex-1 text-sm font-medium ${palette.text}`}>{message}</Text>
      </View>
    </View>
  );
}

export function useTimedToast(durationMs = 2400) {
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!message) {
      return;
    }

    const timer = setTimeout(() => {
      setMessage(null);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, message]);

  return { message, showToast: setMessage };
}
