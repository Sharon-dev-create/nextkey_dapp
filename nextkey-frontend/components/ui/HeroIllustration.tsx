export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 800 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", maxWidth: "800px", height: "auto" }}
    >
      <defs>
        {/* Glows */}
        <radialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#4edea3" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0"    />
        </radialGradient>

        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#4edea3" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0"   />
        </radialGradient>

        <radialGradient id="bgGlow" cx="50%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#0d2a1e" stopOpacity="1" />
          <stop offset="100%" stopColor="#101415" stopOpacity="1" />
        </radialGradient>

        {/* Line gradient — source to vault */}
        <linearGradient id="lineLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#4edea3" stopOpacity="0"   />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0.6" />
        </linearGradient>

        {/* Line gradient — vault to beneficiary */}
        <linearGradient id="lineRight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#4edea3" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0"   />
        </linearGradient>

        {/* Diagonal line gradients */}
        <linearGradient id="lineTopLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#4edea3" stopOpacity="0"   />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="lineBottomLeft" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#4edea3" stopOpacity="0"   />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="lineTopRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#4edea3" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0"   />
        </linearGradient>
        <linearGradient id="lineBottomRight" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#4edea3" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4edea3" stopOpacity="0"   />
        </linearGradient>

        {/* Vault face gradient */}
        <linearGradient id="vaultFace" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#1d2f28" />
          <stop offset="100%" stopColor="#0f1e19" />
        </linearGradient>

        {/* Pulse animation filter */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="softGlow">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="800" height="480" fill="url(#bgGlow)" rx="12" />

      {/* Subtle grid lines */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={i * 73} y1="0" x2={i * 73} y2="480"
          stroke="#4edea3" strokeOpacity="0.04" strokeWidth="1"
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1="0" y1={i * 69} x2="800" y2={i * 69}
          stroke="#4edea3" strokeOpacity="0.04" strokeWidth="1"
        />
      ))}

      {/* ── Owner node (left) ──────────────────────────────────── */}
      {/* Glow halo */}
      <circle cx="148" cy="240" r="60" fill="url(#nodeGlow)" />

      {/* Connecting line — owner to vault */}
      <line
        x1="192" y1="240" x2="308" y2="240"
        stroke="url(#lineLeft)" strokeWidth="1.5"
        strokeDasharray="4 4"
      />

      {/* Animated dot on line */}
      <circle cx="250" cy="240" r="3" fill="#4edea3" opacity="0.9" filter="url(#glow)">
        <animate attributeName="cx" from="192" to="308" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0" to="1" dur="0.3s" repeatCount="indefinite" />
      </circle>

      {/* Owner circle */}
      <circle cx="148" cy="240" r="44" fill="#1a2e26" stroke="#4edea3" strokeWidth="1.5" strokeOpacity="0.6" />
      <circle cx="148" cy="240" r="36" fill="#162920" stroke="#4edea3" strokeWidth="0.5" strokeOpacity="0.3" />

      {/* Person icon */}
      <circle cx="148" cy="228" r="10" fill="#4edea3" fillOpacity="0.9" />
      <path d="M124 262 Q148 248 172 262" stroke="#4edea3" strokeWidth="2" fill="none" strokeOpacity="0.9" />

      {/* Owner label */}
      <text x="148" y="300" textAnchor="middle" fill="#4edea3" fontSize="10" fontFamily="JetBrains Mono, monospace" opacity="0.8">
        OWNER
      </text>
      <text x="148" y="314" textAnchor="middle" fill="#86948a" fontSize="9" fontFamily="JetBrains Mono, monospace">
        0x742d…4f2a
      </text>

      {/* Check-in pulse ring */}
      <circle cx="148" cy="240" r="50" stroke="#4edea3" strokeWidth="1" fill="none" strokeOpacity="0.15">
        <animate attributeName="r" from="44" to="62" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* ── VAULT (center) ─────────────────────────────────────── */}
      {/* Large glow behind vault */}
      <ellipse cx="400" cy="240" rx="90" ry="90" fill="url(#vaultGlow)" />

      {/* Vault body */}
      <rect x="330" y="175" width="140" height="130" rx="8"
        fill="url(#vaultFace)"
        stroke="#4edea3" strokeWidth="1.5" strokeOpacity="0.7"
        filter="url(#softGlow)"
      />

      {/* Vault door detail — outer ring */}
      <circle cx="400" cy="237" r="38" fill="#0f1e19" stroke="#4edea3" strokeWidth="1" strokeOpacity="0.5" />

      {/* Vault door — inner ring */}
      <circle cx="400" cy="237" r="28" fill="#0d1a15" stroke="#4edea3" strokeWidth="0.75" strokeOpacity="0.4" />

      {/* Vault spokes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={400 + Math.cos(rad) * 20}
            y1={237 + Math.sin(rad) * 20}
            x2={400 + Math.cos(rad) * 28}
            y2={237 + Math.sin(rad) * 28}
            stroke="#4edea3" strokeWidth="2" strokeOpacity="0.6"
          />
        );
      })}

      {/* Vault keyhole */}
      <circle cx="400" cy="233" r="6" fill="#4edea3" fillOpacity="0.9" filter="url(#glow)" />
      <rect x="397" y="237" width="6" height="10" rx="1" fill="#4edea3" fillOpacity="0.9" />

      {/* Vault handle */}
      <circle cx="430" cy="237" r="5" fill="none" stroke="#4edea3" strokeWidth="1.5" strokeOpacity="0.5" />

      {/* Vault top label */}
      <text x="400" y="198" textAnchor="middle" fill="#4edea3" fontSize="8"
        fontFamily="JetBrains Mono, monospace" letterSpacing="2" opacity="0.7">
        NEXTKEY VAULT
      </text>

      {/* Bottom status */}
      <rect x="352" y="284" width="96" height="14" rx="2" fill="#4edea3" fillOpacity="0.08" />
      <text x="400" y="294" textAnchor="middle" fill="#4edea3" fontSize="8"
        fontFamily="JetBrains Mono, monospace" opacity="0.8">
        ● PROTOCOL ACTIVE
      </text>

      {/* ── Beneficiary nodes (right) ──────────────────────────── */}

      {/* Top beneficiary */}
      {/* Connecting line */}
      <line
        x1="492" y1="220" x2="596" y2="160"
        stroke="url(#lineTopRight)" strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle cx="544" cy="190" r="3" fill="#4edea3" opacity="0.9" filter="url(#glow)">
        <animate attributeName="cx" from="492" to="596" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="cy" from="220" to="160" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0" to="1" dur="0.4s" repeatCount="indefinite" />
      </circle>

      <circle cx="624" cy="148" r="36" fill="#1a2e26" stroke="#4edea3" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="624" cy="148" r="28" fill="#162920" stroke="#4edea3" strokeWidth="0.5" strokeOpacity="0.25" />
      <circle cx="624" cy="140" r="8" fill="#4edea3" fillOpacity="0.8" />
      <path d="M606 164 Q624 154 642 164" stroke="#4edea3" strokeWidth="1.5" fill="none" strokeOpacity="0.8" />

      <text x="624" y="196" textAnchor="middle" fill="#bec6e0" fontSize="9" fontFamily="JetBrains Mono, monospace" opacity="0.8">
        60%
      </text>
      <text x="624" y="208" textAnchor="middle" fill="#86948a" fontSize="8" fontFamily="JetBrains Mono, monospace">
        0xaF3c…1b9d
      </text>

      {/* Middle beneficiary */}
      <line
        x1="492" y1="240" x2="596" y2="240"
        stroke="url(#lineRight)" strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle cx="544" cy="240" r="3" fill="#4edea3" opacity="0.9" filter="url(#glow)">
        <animate attributeName="cx" from="492" to="596" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0" to="1" dur="0.4s" repeatCount="indefinite" />
      </circle>

      <circle cx="624" cy="240" r="36" fill="#1a2e26" stroke="#4edea3" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="624" cy="240" r="28" fill="#162920" stroke="#4edea3" strokeWidth="0.5" strokeOpacity="0.25" />
      <circle cx="624" cy="232" r="8" fill="#4edea3" fillOpacity="0.8" />
      <path d="M606 256 Q624 246 642 256" stroke="#4edea3" strokeWidth="1.5" fill="none" strokeOpacity="0.8" />

      <text x="624" y="288" textAnchor="middle" fill="#bec6e0" fontSize="9" fontFamily="JetBrains Mono, monospace" opacity="0.8">
        25%
      </text>
      <text x="624" y="300" textAnchor="middle" fill="#86948a" fontSize="8" fontFamily="JetBrains Mono, monospace">
        0xbC91…e44f
      </text>

      {/* Bottom beneficiary */}
      <line
        x1="492" y1="258" x2="596" y2="322"
        stroke="url(#lineBottomRight)" strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle cx="544" cy="290" r="3" fill="#4edea3" opacity="0.9" filter="url(#glow)">
        <animate attributeName="cx" from="492" to="596" dur="2s" repeatCount="indefinite" />
        <animate attributeName="cy" from="258" to="322" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0" to="1" dur="0.4s" repeatCount="indefinite" />
      </circle>

      <circle cx="624" cy="334" r="36" fill="#1a2e26" stroke="#4edea3" strokeWidth="1" strokeOpacity="0.5" />
      <circle cx="624" cy="334" r="28" fill="#162920" stroke="#4edea3" strokeWidth="0.5" strokeOpacity="0.25" />
      <circle cx="624" cy="326" r="8" fill="#4edea3" fillOpacity="0.8" />
      <path d="M606 350 Q624 340 642 350" stroke="#4edea3" strokeWidth="1.5" fill="none" strokeOpacity="0.8" />

      <text x="624" y="382" textAnchor="middle" fill="#bec6e0" fontSize="9" fontFamily="JetBrains Mono, monospace" opacity="0.8">
        15%
      </text>
      <text x="624" y="394" textAnchor="middle" fill="#86948a" fontSize="8" fontFamily="JetBrains Mono, monospace">
        0xd4E7…99c2
      </text>

      {/* BENEFICIARIES label */}
      <text x="690" y="240" textAnchor="middle" fill="#4edea3" fontSize="10"
        fontFamily="JetBrains Mono, monospace" opacity="0.6"
        transform="rotate(90, 690, 240)">
        BENEFICIARIES
      </text>

      {/* ── Dead man's switch indicator (bottom center) ────────── */}
      <rect x="300" y="390" width="200" height="46" rx="4"
        fill="#1a2e26" stroke="#4edea3" strokeWidth="0.75" strokeOpacity="0.3"
      />
      <text x="400" y="408" textAnchor="middle" fill="#86948a" fontSize="9"
        fontFamily="JetBrains Mono, monospace" letterSpacing="1">
        DEAD MAN&apos;S SWITCH
      </text>
      <text x="400" y="424" textAnchor="middle" fill="#4edea3" fontSize="10"
        fontFamily="JetBrains Mono, monospace" fontWeight="bold">
        127 days until inactive
      </text>

      {/* Progress bar inside indicator */}
      <rect x="316" y="428" width="168" height="3" rx="1.5" fill="#0f1e19" />
      <rect x="316" y="428" width="118" height="3" rx="1.5" fill="#4edea3" opacity="0.7" />

      {/* ── Floating asset chips ───────────────────────────────── */}
      {/* USDC chip */}
      <rect x="310" y="130" width="56" height="22" rx="3"
        fill="#1a2e26" stroke="#4edea3" strokeWidth="0.75" strokeOpacity="0.4"
      />
      <text x="338" y="145" textAnchor="middle" fill="#4edea3" fontSize="9"
        fontFamily="JetBrains Mono, monospace">
        USDC ✓
      </text>

      {/* WETH chip */}
      <rect x="434" y="130" width="56" height="22" rx="3"
        fill="#1a2e26" stroke="#4edea3" strokeWidth="0.75" strokeOpacity="0.4"
      />
      <text x="462" y="145" textAnchor="middle" fill="#4edea3" fontSize="9"
        fontFamily="JetBrains Mono, monospace">
        WETH ✓
      </text>

      {/* Corner decorations */}
      <rect x="20"  y="20"  width="16" height="2" rx="1" fill="#4edea3" opacity="0.3" />
      <rect x="20"  y="20"  width="2"  height="16" rx="1" fill="#4edea3" opacity="0.3" />
      <rect x="764" y="20"  width="16" height="2" rx="1" fill="#4edea3" opacity="0.3" />
      <rect x="778" y="20"  width="2"  height="16" rx="1" fill="#4edea3" opacity="0.3" />
      <rect x="20"  y="458" width="16" height="2" rx="1" fill="#4edea3" opacity="0.3" />
      <rect x="20"  y="444" width="2"  height="16" rx="1" fill="#4edea3" opacity="0.3" />
      <rect x="764" y="458" width="16" height="2" rx="1" fill="#4edea3" opacity="0.3" />
      <rect x="778" y="444" width="2"  height="16" rx="1" fill="#4edea3" opacity="0.3" />
    </svg>
  );
}