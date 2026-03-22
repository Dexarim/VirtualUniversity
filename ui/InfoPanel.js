import {
  applyStyles,
  buttonStyles,
  designTokens,
  ensureDesignSystem,
  panelStyles,
  subtitleStyles,
  titleStyles,
} from "./designSystem.js";
import { subscribeLanguageChange, t } from "./i18n.js";

export class InfoPanel {
  constructor({
    container = document.body,
    onBack = null,
    showBackBtn = true,
  } = {}) {
    ensureDesignSystem();

    this.container = container;
    this.onBack = onBack;
    this.hideTimer = null;

    this.root = document.createElement("div");
    this.root.className = "info-panel";
    applyStyles(this.root, {
      ...panelStyles({ maxWidth: "360px", padding: "18px 18px 16px" }),
      position: "absolute",
      left: "20px",
      bottom: "20px",
      display: "none",
      opacity: "0",
      transform: "translateY(10px)",
      transition: "opacity 0.28s ease, transform 0.28s ease",
      zIndex: "1200",
    });

    this.eyebrow = document.createElement("div");
    applyStyles(this.eyebrow, {
      ...subtitleStyles(),
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontSize: "11px",
      marginBottom: "8px",
      color: designTokens.textMuted,
    });
    this.root.appendChild(this.eyebrow);

    this.title = document.createElement("h3");
    applyStyles(this.title, {
      ...titleStyles(),
      fontSize: "18px",
      marginBottom: "8px",
    });
    this.root.appendChild(this.title);

    this.desc = document.createElement("p");
    applyStyles(this.desc, {
      ...subtitleStyles(),
      margin: "0",
      fontSize: "13px",
      maxWidth: "32ch",
    });
    this.root.appendChild(this.desc);

    this.backBtn = document.createElement("button");
    applyStyles(this.backBtn, {
      ...buttonStyles("primary"),
      marginTop: "14px",
      display: showBackBtn ? "inline-flex" : "none",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "92px",
    });
    this.backBtn.onmouseenter = () => {
      this.backBtn.style.background = designTokens.accentHover;
      this.backBtn.style.transform = "translateY(-1px)";
    };
    this.backBtn.onmouseleave = () => {
      this.backBtn.style.background = designTokens.accent;
      this.backBtn.style.transform = "translateY(0)";
    };
    this.backBtn.onclick = () => {
      if (typeof this.onBack === "function") this.onBack();
    };

    this.root.appendChild(this.backBtn);
    this.container.appendChild(this.root);

    this._unsubscribeLanguage = subscribeLanguageChange(() =>
      this.applyLanguage()
    );
    this.applyLanguage();
  }

  applyLanguage() {
    this.eyebrow.textContent = t("info_navigation");
    this.backBtn.innerText = t("common_back");
  }

  show(meta) {
    if (!meta) return this.hide();

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.title.textContent = meta.name || meta.meshName || t("common_object");
    this.desc.textContent = meta.description || "";
    this.desc.style.display = meta.description ? "block" : "none";

    this.root.style.display = "block";
    requestAnimationFrame(() => {
      this.root.style.opacity = "1";
      this.root.style.transform = "translateY(0)";
    });
  }

  hide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.root.style.opacity = "0";
    this.root.style.transform = "translateY(10px)";
    this.hideTimer = setTimeout(() => {
      this.root.style.display = "none";
    }, 280);
  }

  getElement() {
    return this.root;
  }
}
