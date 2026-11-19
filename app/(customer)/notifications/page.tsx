"use client";

import { NotificationCenter } from "@/components/layout/NotificationCenter";

export default function CustomerNotificationsPage() {
  return (
    <NotificationCenter
      emptyDescription="Belum ada pemberitahuan."
      variant="customer"
      requireSessionGate
      loginRedirectUrl="/auth/login?callbackUrl=/notifications"
    />
  );
}
