import * as React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Skeleton } from "@/components/ui/skeleton";

type ScreenSkeletonProps = {
  metricCount?: number;
  rowCount?: number;
  showFilterCard?: boolean;
  showActionCard?: boolean;
};

export function CollectionScreenSkeleton({
  metricCount = 3,
  rowCount = 4,
  showFilterCard = true,
  showActionCard = false,
}: ScreenSkeletonProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <HeaderSkeleton />
          {metricCount > 0 ? (
            <View className="flex-row flex-wrap gap-4">
              {Array.from({ length: metricCount }).map((_, index) => (
                <Skeleton key={index} className="h-24 min-w-[145px] flex-1 rounded-[28px]" />
              ))}
            </View>
          ) : null}
          {showFilterCard ? <Skeleton className="h-48 w-full rounded-[28px]" /> : null}
          {showActionCard ? <Skeleton className="h-24 w-full rounded-[28px]" /> : null}
          <CardListSkeleton rowCount={rowCount} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function DetailScreenSkeleton({ rowCount = 4, showActionCard = true }: ScreenSkeletonProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <HeaderSkeleton />
          <Skeleton className="h-40 w-full rounded-[28px]" />
          {showActionCard ? <Skeleton className="h-24 w-full rounded-[28px]" /> : null}
          <CardListSkeleton rowCount={rowCount} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function FormScreenSkeleton({ rowCount = 5, showActionCard = false }: ScreenSkeletonProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pb-28 pt-4">
        <View className="gap-6">
          <HeaderSkeleton />
          <Skeleton className="h-72 w-full rounded-[28px]" />
          {showActionCard ? <Skeleton className="h-24 w-full rounded-[28px]" /> : null}
          <CardListSkeleton rowCount={rowCount} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ListScreenSkeleton({ rowCount = 4 }: { rowCount?: number }) {
  return <CardListSkeleton rowCount={rowCount} />;
}

function HeaderSkeleton() {
  return (
    <View className="gap-3">
      <Skeleton className="h-4 w-24 rounded-full" />
      <Skeleton className="h-10 w-48 rounded-full" />
      <Skeleton className="h-4 w-full rounded-full" />
      <Skeleton className="h-4 w-5/6 rounded-full" />
    </View>
  );
}

function CardListSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <View className="gap-3">
      <Skeleton className="h-6 w-36 rounded-full" />
      {Array.from({ length: rowCount }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-[24px]" />
      ))}
    </View>
  );
}
