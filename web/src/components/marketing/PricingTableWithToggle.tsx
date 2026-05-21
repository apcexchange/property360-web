"use client";

import { useState } from "react";
import { BillingInterval } from "@/lib/billing-api";
import { PricingTable } from "./PricingTable";
import { IntervalToggle } from "./IntervalToggle";

export function PricingTableWithToggle({
  initialInterval = "monthly",
  variant = "light",
}: {
  initialInterval?: BillingInterval;
  variant?: "light" | "dark";
}) {
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  return (
    <div>
      <div className="mb-8 flex justify-center">
        <IntervalToggle value={interval} onChange={setInterval} variant={variant} />
      </div>
      <PricingTable interval={interval} />
    </div>
  );
}
