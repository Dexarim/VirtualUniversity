const FONT_STACK =
  '"Segoe UI", "Trebuchet MS", "Helvetica Neue", Arial, sans-serif';

export const designTokens = {
  fontFamily: FONT_STACK,
  panelBackground: "rgba(248, 244, 236, 0.92)",
  panelStrongBackground: "rgba(255, 251, 245, 0.96)",
  panelBorder: "1px solid rgba(112, 95, 74, 0.16)",
  panelShadow: "0 18px 44px rgba(49, 40, 31, 0.18)",
  panelRadius: "18px",
  textPrimary: "#2f261d",
  textSecondary: "#6a5a49",
  textMuted: "#8a7c6b",
  accent: "#9d6b35",
  accentHover: "#b77d3d",
  accentSoft: "#efe3d2",
  canvasBackdrop: "rgb(157, 107, 53)",
  overlay: "rgba(38, 27, 17, 0.34)",
  inputBackground: "rgba(255, 252, 247, 0.98)",
  inputBorder: "1px solid rgba(129, 109, 87, 0.24)",
  inputShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.72)",
  backdropBlur: "blur(18px)",
};

export function ensureDesignSystem() {
  if (document.getElementById("vt-design-system")) return;

  const style = document.createElement("style");
  style.id = "vt-design-system";
  style.textContent = `
    :root {
      --vt-font: ${FONT_STACK};
      --vt-bg: ${designTokens.canvasBackdrop};
      --vt-panel: ${designTokens.panelBackground};
      --vt-panel-strong: ${designTokens.panelStrongBackground};
      --vt-border: ${designTokens.panelBorder.replace("1px solid ", "")};
      --vt-shadow: ${designTokens.panelShadow};
      --vt-radius: ${designTokens.panelRadius};
      --vt-text: ${designTokens.textPrimary};
      --vt-text-soft: ${designTokens.textSecondary};
      --vt-text-muted: ${designTokens.textMuted};
      --vt-accent: ${designTokens.accent};
      --vt-accent-hover: ${designTokens.accentHover};
      --vt-accent-soft: ${designTokens.accentSoft};
      --vt-overlay: ${designTokens.overlay};
    }

    body {
      font-family: var(--vt-font);
      background:
        radial-gradient(circle at top left, rgba(255, 248, 236, 0.86), transparent 34%),
        radial-gradient(circle at bottom right, rgba(201, 178, 145, 0.22), transparent 28%),
        linear-gradient(180deg, #e9dfd1 0%, #d9ccba 100%);
      color: var(--vt-text);
    }

    button,
    input,
    textarea {
      font-family: var(--vt-font);
    }

    ::selection {
      background: rgba(157, 107, 53, 0.18);
    }
  `;

  document.head.appendChild(style);
}

export function applyStyles(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

export function panelStyles({
  width = null,
  maxWidth = null,
  padding = "18px",
  background = designTokens.panelBackground,
} = {}) {
  const styles = {
    background,
    border: designTokens.panelBorder,
    borderRadius: designTokens.panelRadius,
    boxShadow: designTokens.panelShadow,
    backdropFilter: designTokens.backdropBlur,
    color: designTokens.textPrimary,
    fontFamily: designTokens.fontFamily,
    padding,
  };

  if (width) styles.width = width;
  if (maxWidth) styles.maxWidth = maxWidth;
  return styles;
}

export function floatingPanelStyles({ width = null, maxWidth = null } = {}) {
  return {
    ...panelStyles({ width, maxWidth }),
    position: "fixed",
  };
}

export function titleStyles() {
  return {
    margin: "0",
    fontSize: "20px",
    lineHeight: "1.1",
    fontWeight: "700",
    letterSpacing: "-0.02em",
    color: designTokens.textPrimary,
  };
}

export function subtitleStyles() {
  return {
    fontSize: "12px",
    lineHeight: "1.5",
    color: designTokens.textSecondary,
  };
}

export function buttonStyles(kind = "primary") {
  const base = {
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "600",
    transition:
      "background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
  };

  if (kind === "secondary") {
    return {
      ...base,
      background: "rgba(255, 252, 247, 0.86)",
      color: designTokens.textPrimary,
      border: designTokens.inputBorder,
      boxShadow: "0 8px 20px rgba(79, 64, 48, 0.08)",
    };
  }

  if (kind === "ghost") {
    return {
      ...base,
      background: "transparent",
      color: designTokens.textSecondary,
      border: "none",
      padding: "8px",
    };
  }

  return {
    ...base,
    background: designTokens.accent,
    color: "#fffdf7",
    boxShadow: "0 10px 22px rgba(125, 79, 28, 0.24)",
  };
}

export function inputStyles() {
  return {
    width: "100%",
    padding: "11px 13px",
    border: designTokens.inputBorder,
    borderRadius: "12px",
    fontSize: "14px",
    color: designTokens.textPrimary,
    background: designTokens.inputBackground,
    boxSizing: "border-box",
    outline: "none",
    boxShadow: designTokens.inputShadow,
  };
}

export function overlayStyles() {
  return {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    background: designTokens.overlay,
    backdropFilter: "blur(10px)",
  };
}

export function tagStyles() {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "999px",
    background: "rgba(255, 250, 242, 0.82)",
    border: designTokens.inputBorder,
    color: designTokens.textSecondary,
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: "600",
  };
}
