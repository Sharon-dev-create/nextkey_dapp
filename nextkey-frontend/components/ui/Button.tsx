import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  "primary" | "secondary" | "ghost" | "danger";
  size?:     "sm" | "md" | "lg";
  loading?:  boolean;
  icon?:     React.ReactNode;
}

const VARIANTS = {
  primary:   { background: "var(--primary)",   color: "var(--on-primary)", border: "1px solid transparent" },
  secondary: { background: "transparent",       color: "var(--on-surface)", border: "1px solid var(--outline-variant)" },
  ghost:     { background: "transparent",       color: "var(--on-surface-variant)", border: "1px solid transparent" },
  danger:    { background: "rgba(255,180,171,0.1)", color: "#ffb4ab", border: "1px solid rgba(255,180,171,0.2)" },
};

const SIZES = {
  sm: { padding: "6px 12px",  fontSize: "12px", gap: "6px"  },
  md: { padding: "9px 16px",  fontSize: "13px", gap: "7px"  },
  lg: { padding: "12px 24px", fontSize: "14px", gap: "8px"  },
};

export function Button({
  children,
  variant = "primary",
  size    = "md",
  loading = false,
  icon,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <button
      disabled={disabled || loading}
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        justifyContent:"center",
        gap:          s.gap,
        padding:      s.padding,
        borderRadius: "4px",
        fontSize:     s.fontSize,
        fontWeight:   600,
        cursor:       disabled || loading ? "not-allowed" : "pointer",
        opacity:      disabled || loading ? 0.5 : 1,
        transition:   "all 0.15s ease",
        fontFamily:   "inherit",
        ...v,
        ...style,
      }}
      {...props}
    >
      {loading
        ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        : icon}
      {children}
    </button>
  );
}
