interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  hint?:     string;
  error?:    string;
  mono?:     boolean;
}

export function Input({ label, hint, error, mono, style, ...props }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label className="label-caps">{label}</label>
      )}
      <input
        style={{
          width:        "100%",
          padding:      "9px 12px",
          background:   "var(--surface-container-low)",
          border:       `1px solid ${error ? "#ffb4ab" : "var(--outline-variant)"}`,
          borderRadius: "4px",
          color:        "var(--on-surface)",
          fontSize:     "13px",
          fontFamily:   mono ? "'JetBrains Mono', monospace" : "inherit",
          outline:      "none",
          transition:   "border-color 0.15s",
          ...style,
        }}
        onFocus={e => e.target.style.borderColor = error ? "#ffb4ab" : "var(--primary)"}
        onBlur={e  => e.target.style.borderColor = error ? "#ffb4ab" : "var(--outline-variant)"}
        {...props}
      />
      {hint  && !error && <span style={{ fontSize: "11px", color: "var(--on-surface-variant)" }}>{hint}</span>}
      {error && <span style={{ fontSize: "11px", color: "#ffb4ab" }}>{error}</span>}
    </div>
  );
}
