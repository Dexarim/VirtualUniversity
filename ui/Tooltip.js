import {
  applyStyles,
  designTokens,
  ensureDesignSystem,
  panelStyles,
} from "./designSystem.js";
import { t } from "./i18n.js";

export class Tooltip {
  constructor() {
    ensureDesignSystem();

    this.tooltip = document.createElement("div");
    applyStyles(this.tooltip, {
      ...panelStyles({
        padding: "10px 12px",
        background: "rgba(255, 251, 245, 0.96)",
      }),
      position: "fixed",
      pointerEvents: "none",
      maxWidth: "320px",
      zIndex: "10000",
      display: "none",
      whiteSpace: "normal",
      wordWrap: "break-word",
      borderRadius: "14px",
      animation: "vtTooltipFade 0.18s ease-out",
    });

    if (!document.getElementById("vt-tooltip-styles")) {
      const style = document.createElement("style");
      style.id = "vt-tooltip-styles";
      style.textContent = `
        @keyframes vtTooltipFade {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.tooltip);
  }

  show(data = {}, x = 0, y = 0) {
    const title = data.title || data.name || t("common_object");
    const description = data.description || "";

    let content = `
      <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:${designTokens.textMuted}; margin-bottom:4px;">
        ${this._escapeHtml(t("tooltip_badge"))}
      </div>
      <strong style="display:block; font-size:14px; color:${designTokens.textPrimary};">${this._escapeHtml(
        title
      )}</strong>
    `;

    if (description) {
      content += `<span style="display:block; margin-top:4px; color:${designTokens.textSecondary}; font-size:12px; line-height:1.45;">${this._escapeHtml(
        description
      )}</span>`;
    }

    this.tooltip.innerHTML = content;
    this.tooltip.style.display = "block";
    this.updatePosition(x, y);
  }

  hide() {
    this.tooltip.style.display = "none";
  }

  updatePosition(x, y) {
    if (this.tooltip.style.display !== "block") return;
    this.tooltip.style.left = `${x + 14}px`;
    this.tooltip.style.top = `${y + 14}px`;
  }

  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
