import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: string;
}

export function Card({ children, style, padding = "24px" }: CardProps) {
  return (
    <div style={{
      background:   "var(--surface-container)",
      border:       "1px solid var(--outline-variant)",
      borderRadius: "8px",
      padding,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function CardHeader({
  label,
  title,
  action,
}: {
  label?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "flex-start",
      marginBottom:   "20px",
    }}>
      <div>
        {label && <div className="label-caps" style={{ marginBottom: "4px" }}>{label}</div>}
        <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--on-surface)" }}>{title}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
