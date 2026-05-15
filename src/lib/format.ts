export const formatNgn = (amount: number | null | undefined) => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
};

export const formatDate = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
