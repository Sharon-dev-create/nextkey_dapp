type Status = "active" | "inactive" | "claiming" | "claimed" | "success" | "warning" | "error" | "pending";

const CONFIG: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  active:   { label: "Active",    color: "#4edea3", bg: "rgba(78,222,163,0.1)",  dot: "#4edea3" },
  inactive: { label: "Inactive",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)", dot: "#f59e0b" },
  claiming: { label: "Claiming",  color: "#ffb4ab", bg: "rgba(255,180,171,0.1)",dot: "#ffb4ab" },
  claimed:  { label: "Claimed",   color: "#86948a", bg: "rgba(134,148,138,0.1)",dot: "#86948a" },
  success:  { label: "Success",   color: "#4edea3", bg: "rgba(78,222,163,0.1)",  dot: "#4edea3" },
  warning:  { label: "Warning",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)", dot: "#f59e0b" },
  error:    { label: "Error",     color: "#ffb4ab", bg: "rgba(255,180,171,0.1)",dot: "#ffb4ab" },
  pending:  { label: "Pending",   color: "#bec6e0", bg: "rgba(190,198,224,0.1)",dot: "#bec6e0" },
};

export function StatusBadge({
  status,
  label: customLabel,
  pulse = false,
}: {
  status: Status;
  label?: string;
  pulse?: boolean;
}) {
  const c = CONFIG[status];
  return (
    <span style={{
      display:      "inline-flex",
      alignItems:   "center",
      gap:          "6px",
      padding:      "3px 8px",
      borderRadius: "2px",
      fontSize:     "11px",
      fontWeight:   600,
      letterSpacing:"0.05em",
      textTransform:"uppercase",
      color:        c.color,
      background:   c.bg,
      border:       `1px solid ${c.color}22`,
    }}>
      <span style={{
        width:        6,
        height:       6,
        borderRadius: "50%",
        background:   c.dot,
        display:      "inline-block",
        animation:    pulse ? "pulse 2s infinite" : "none",
      }} />
      {customLabel ?? c.label}
    </span>
  );
}
