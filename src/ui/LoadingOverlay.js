import {
  applyStyles,
  buttonStyles,
  designTokens,
  ensureDesignSystem,
  panelStyles,
  subtitleStyles,
  titleStyles,
  tagStyles,
} from "./designSystem.js";
import { t } from "./i18n.js";

export class LoadingOverlay {
  constructor({ container = document.body, onProceed = null } = {}) {
    ensureDesignSystem();

    this.onProceed = onProceed;

    this.root = document.createElement("div");
    applyStyles(this.root, {
      position: "fixed",
      inset: "0",
      zIndex: "12000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background:
        "radial-gradient(circle at top left, rgba(255, 244, 225, 0.28), transparent 30%), linear-gradient(180deg, rgba(34, 24, 16, 0.84) 0%, rgba(24, 18, 13, 0.9) 100%)",
      backdropFilter: "blur(16px)",
      opacity: "0",
      visibility: "hidden",
      transition: "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.4s",
      pointerEvents: "none",
    });

    this.panel = document.createElement("div");
    applyStyles(this.panel, {
      ...panelStyles({
        width: "min(600px, calc(100vw - 48px))",
        padding: "32px",
        background: "rgba(255, 249, 240, 0.96)",
      }),
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      borderRadius: "32px",
      boxShadow: "0 40px 100px rgba(0, 0, 0, 0.3)",
      transform: "translateY(20px)",
      transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
    });

    this.header = document.createElement("div");
    applyStyles(this.header, {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    });

    this.badge = document.createElement("div");
    this.badge.textContent = "TTTU Virtual Tour";
    applyStyles(this.badge, {
      display: "inline-flex",
      alignSelf: "flex-start",
      padding: "6px 12px",
      borderRadius: "999px",
      background: "rgba(157, 107, 53, 0.1)",
      color: designTokens.accent,
      fontSize: "12px",
      fontWeight: "800",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    });

    this.title = document.createElement("div");
    this.title.textContent = t("app_title");
    applyStyles(this.title, {
      ...titleStyles(),
      fontSize: "32px",
    });

    this.status = document.createElement("div");
    this.status.textContent = t("app_subtitle");
    applyStyles(this.status, {
      ...subtitleStyles(),
      fontSize: "15px",
      lineHeight: "1.6",
      color: designTokens.textSecondary,
    });

    this.header.appendChild(this.badge);
    this.header.appendChild(this.title);
    this.header.appendChild(this.status);
    this.panel.appendChild(this.header);

    // --- Progress Section ---
    this.progressSection = document.createElement("div");
    applyStyles(this.progressSection, {
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    });

    this.progressMeta = document.createElement("div");
    applyStyles(this.progressMeta, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "11px",
      fontWeight: "800",
      color: designTokens.textMuted,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    });

    this.progressLabel = document.createElement("span");
    this.progressLabel.textContent = "Loading Assets";

    this.progressValue = document.createElement("span");
    this.progressValue.textContent = "0%";

    this.progressMeta.appendChild(this.progressLabel);
    this.progressMeta.appendChild(this.progressValue);

    this.progressTrack = document.createElement("div");
    applyStyles(this.progressTrack, {
      position: "relative",
      width: "100%",
      height: "10px",
      borderRadius: "999px",
      overflow: "hidden",
      background: "rgba(157, 107, 53, 0.08)",
      boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
    });

    this.progressFill = document.createElement("div");
    applyStyles(this.progressFill, {
      width: "0%",
      height: "100%",
      borderRadius: "inherit",
      background: `linear-gradient(90deg, ${designTokens.accent} 0%, ${designTokens.accentHover} 100%)`,
      boxShadow: "0 0 15px rgba(157, 107, 53, 0.3)",
      transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    });
    this.progressTrack.appendChild(this.progressFill);

    this.progressSection.appendChild(this.progressMeta);
    this.progressSection.appendChild(this.progressTrack);
    this.panel.appendChild(this.progressSection);

    // --- Proceed Button (Hidden by default) ---
    this.proceedBtn = document.createElement("button");
    applyStyles(this.proceedBtn, {
      ...buttonStyles("primary"),
      display: "none",
      width: "100%",
      padding: "16px",
      fontSize: "16px",
      marginTop: "8px",
      animation: "fadeScaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
    });
    this.proceedBtn.onclick = () => {
      this.onProceed?.();
      this.hide();
    };
    this.panel.appendChild(this.proceedBtn);

    // Ensure animation exists
    if (!document.getElementById("loading-animations")) {
      const style = document.createElement("style");
      style.id = "loading-animations";
      style.textContent = `
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    // --- Controls Section ---
    const controlsContainer = document.createElement("div");
    applyStyles(controlsContainer, {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      padding: "24px",
      background: "rgba(157, 107, 53, 0.04)",
      borderRadius: "24px",
      border: "1px solid rgba(157, 107, 53, 0.08)",
    });

    const controlsTitle = document.createElement("div");
    controlsTitle.textContent = t("loading_controls_title");
    applyStyles(controlsTitle, {
      fontSize: "11px",
      fontWeight: "800",
      color: designTokens.textMuted,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginBottom: "4px",
    });
    controlsContainer.appendChild(controlsTitle);

    const controlsList = document.createElement("div");
    applyStyles(controlsList, {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    });

    const createControlItem = (iconType, titleKey, descKey) => {
      const item = document.createElement("div");
      applyStyles(item, {
        display: "flex",
        alignItems: "center",
        gap: "24px",
      });

      const iconBox = document.createElement("div");
      applyStyles(iconBox, {
        width: "80px",
        height: "80px",
        flexShrink: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
        borderRadius: "20px",
        boxShadow: "0 8px 20px rgba(49, 40, 31, 0.08)",
        border: "1px solid rgba(112, 95, 74, 0.12)",
      });
      iconBox.innerHTML = this._getMouseIcon(iconType);

      const textSection = document.createElement("div");
      applyStyles(textSection, {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      });

      const title = document.createElement("div");
      title.textContent = t(titleKey);
      applyStyles(title, {
        fontSize: "16px",
        fontWeight: "800",
        color: designTokens.textPrimary,
      });

      const desc = document.createElement("div");
      desc.textContent = t(descKey);
      applyStyles(desc, {
        fontSize: "13px",
        lineHeight: "1.5",
        color: designTokens.textSecondary,
      });

      textSection.appendChild(title);
      textSection.appendChild(desc);
      item.appendChild(iconBox);
      item.appendChild(textSection);
      return item;
    };

    controlsList.appendChild(
      createControlItem("lmb", "loading_rotate", "loading_rotate_desc")
    );
    controlsList.appendChild(
      createControlItem("wheel", "loading_zoom", "loading_zoom_desc")
    );
    controlsList.appendChild(
      createControlItem("rmb", "loading_pan", "loading_pan_desc")
    );
    
    controlsContainer.appendChild(controlsList);
    this.panel.appendChild(controlsContainer);

    // --- Briefing Section ---
    const hintsList = document.createElement("div");
    applyStyles(hintsList, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "0 4px",
    });

    const hints = [
      { icon: "✨", key: "loading_hint_highlight" },
      { icon: "👆", key: "loading_hint_select" },
      { icon: "🔍", key: "loading_hint_search" },
      { icon: "🎭", key: "loading_hint_filter" },
    ];

    hints.forEach((hint) => {
      const row = document.createElement("div");
      applyStyles(row, {
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        fontSize: "13px",
        lineHeight: "1.5",
        color: designTokens.textSecondary,
      });

      const icon = document.createElement("span");
      icon.textContent = hint.icon;
      applyStyles(icon, {
        fontSize: "18px",
        flexShrink: "0",
        marginTop: "-2px",
      });

      const text = document.createElement("span");
      text.textContent = t(hint.key);

      row.appendChild(icon);
      row.appendChild(text);
      hintsList.appendChild(row);
    });

    this.panel.appendChild(hintsList);

    this.root.appendChild(this.panel);
    container.appendChild(this.root);
  }

  _getMouseIcon(type) {
    const isLmb = type === "lmb";
    const isRmb = type === "rmb";
    const isWheel = type === "wheel";

    const accent = designTokens.accent;
    const secondary = designTokens.textSecondary;
    const muted = "rgba(112, 95, 74, 0.15)";

    // Common mouse body parts
    const body = `
      <path d="M12 2C7.58 2 4 5.58 4 10V24C4 28.42 7.58 32 12 32C16.42 32 20 28.42 20 24V10C20 5.58 16.42 2 12 2Z" fill="#fff" stroke="${secondary}" stroke-width="1.5"/>
      <path d="M4 12H20" stroke="${secondary}" stroke-width="1.5"/>
      <path d="M12 2V12" stroke="${secondary}" stroke-width="1.5"/>
    `;

    let activePart = "";
    let arrowOverlay = "";

    if (isLmb) {
      activePart = `<path d="M4 10C4 5.58 7.58 2 12 2V12H4V10Z" fill="${accent}" fill-opacity="0.2" />`;
      // Curved rotate arrow
      arrowOverlay = `
        <path d="M22 6C23.5 8 24 10.5 24 13C24 19.6 18.6 25 12 25" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none" />
        <path d="M19 6H24V11" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      `;
    } else if (isRmb) {
      activePart = `<path d="M12 2C16.42 2 20 5.58 20 10V12H12V2Z" fill="${accent}" fill-opacity="0.2" />`;
      // Pan 4-way cross
      arrowOverlay = `
        <path d="M22 17H30M26 13V21" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none" />
        <path d="M22 17L24 15M22 17L24 19" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none" />
        <path d="M30 17L28 15M30 17L28 19" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none" />
        <path d="M26 13L24 15M26 13L28 15" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none" />
        <path d="M26 21L24 19M26 21L28 19" stroke="${accent}" stroke-width="2" stroke-linecap="round" fill="none" />
      `;
    }

    const wheel = `
      <rect x="10" y="6" width="4" height="8" rx="2" fill="${isWheel ? accent : muted}" stroke="${secondary}" stroke-width="1"/>
      ${
        isWheel
          ? `
          <path d="M15 1V7" stroke="${accent}" stroke-width="2" stroke-linecap="round" />
          <path d="M12 4L15 1L18 4" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M15 13V19" stroke="${accent}" stroke-width="2" stroke-linecap="round" />
          <path d="M12 16L15 19L18 16" stroke="${accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        `
          : ""
      }
    `;

    return `
      <svg width="48" height="60" viewBox="-4 -4 42 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${body}
        ${activePart}
        ${wheel}
        ${arrowOverlay}
      </svg>
    `;
  }

  showControlsMenu() {
    this.header.style.display = "none";
    this.progressSection.style.display = "none";
    this.proceedBtn.style.display = "block";
    this.proceedBtn.textContent = t("common_close");
    
    this.root.style.visibility = "visible";
    this.root.style.opacity = "1";
    this.root.style.pointerEvents = "auto";
    this.panel.style.transform = "translateY(0)";
  }

  show({ title, status, progress = 0, label } = {}) {
    this.header.style.display = "flex";
    this.progressSection.style.display = "flex";
    
    if (title) this.title.textContent = title;
    if (status) this.status.textContent = status;
    if (label) this.progressLabel.textContent = label;
    this.setProgress(progress);
    
    this.root.style.visibility = "visible";
    this.root.style.opacity = "1";
    this.root.style.pointerEvents = "auto";
    this.panel.style.transform = "translateY(0)";
  }

  setStatus(status) {
    if (status) this.status.textContent = status;
  }

  setProgress(progress, label) {
    const normalized = Number.isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;

    if (label) this.progressLabel.textContent = label;

    if (normalized >= 1) {
      // Show Proceed Button and hide progress bar
      if (this.progressSection.style.display !== "none" && this.header.style.display !== "none") {
        this.progressSection.style.display = "none";
        this.proceedBtn.style.display = "block";
        this.proceedBtn.textContent = t("loading_proceed_btn");
      }
    } else {
      // Show progress bar and hide Proceed Button
      if (this.progressSection.style.display === "none") {
        this.progressSection.style.display = "flex";
        this.proceedBtn.style.display = "none";
      }
      this.progressFill.style.width = `${Math.round(normalized * 100)}%`;
      this.progressValue.textContent = `${Math.round(normalized * 100)}%`;
    }
  }

  fail(message) {
    this.show({
      title: "Loading Error",
      status: message || "Could not prepare the scene.",
      progress: 1,
      label: "Error",
    });
    this.progressFill.style.background =
      "linear-gradient(90deg, #b03f2c 0%, #e2775c 100%)";
  }

  hide() {
    this.root.style.opacity = "0";
    this.root.style.visibility = "hidden";
    this.root.style.pointerEvents = "none";
    this.panel.style.transform = "translateY(20px)";
    
    // Restore default state for next time
    setTimeout(() => {
      this.header.style.display = "flex";
      this.progressSection.style.display = "flex";
      this.proceedBtn.style.display = "none";
    }, 400);
  }
}



