import {
  applyStyles,
  buttonStyles,
  designTokens,
  ensureDesignSystem,
  panelStyles,
  subtitleStyles,
  titleStyles,
} from "./designSystem.js";
import {
  getLanguage,
  LANGUAGE_OPTIONS,
  setLanguage,
  subscribeLanguageChange,
  t,
} from "./i18n.js";

export class AppHeader {
  constructor({
    container = document.body,
    onSearch = () => {},
    onToggleFilters = () => {},
    isFilterOpen = () => false,
  } = {}) {
    ensureDesignSystem();

    this.onSearch = onSearch;
    this.onToggleFilters = onToggleFilters;
    this.isFilterOpen = isFilterOpen;

    this.root = document.createElement("div");
    applyStyles(this.root, {
      ...panelStyles({
        width: "min(1120px, calc(100vw - 40px))",
        padding: "14px 16px",
        background: "rgba(255, 250, 242, 0.92)",
      }),
      position: "fixed",
      top: "16px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "10020",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
    });

    this.brandWrap = document.createElement("div");
    applyStyles(this.brandWrap, {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      minWidth: "220px",
    });

    this.title = document.createElement("div");
    applyStyles(this.title, {
      ...titleStyles(),
      fontSize: "20px",
    });
    this.brandWrap.appendChild(this.title);

    this.subtitle = document.createElement("div");
    applyStyles(this.subtitle, {
      ...subtitleStyles(),
      fontSize: "12px",
    });
    this.brandWrap.appendChild(this.subtitle);

    this.controls = document.createElement("div");
    applyStyles(this.controls, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
      marginLeft: "auto",
    });

    this.searchButton = document.createElement("button");
    applyStyles(this.searchButton, buttonStyles("primary"));
    this.searchButton.onclick = () => this.onSearch();
    this._wireButtonHover(this.searchButton, "primary");
    this.controls.appendChild(this.searchButton);

    this.filterButton = document.createElement("button");
    applyStyles(this.filterButton, buttonStyles("secondary"));
    this.filterButton.onclick = () => this.onToggleFilters();
    this._wireButtonHover(this.filterButton, "secondary");
    this.controls.appendChild(this.filterButton);

    this.languageLabel = document.createElement("label");
    applyStyles(this.languageLabel, {
      ...subtitleStyles(),
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: "700",
      color: designTokens.textSecondary,
      paddingLeft: "4px",
    });

    this.languageText = document.createElement("span");
    this.languageLabel.appendChild(this.languageText);

    this.languageSelect = document.createElement("select");
    applyStyles(this.languageSelect, {
      borderRadius: "12px",
      border: designTokens.inputBorder,
      background: designTokens.inputBackground,
      color: designTokens.textPrimary,
      padding: "10px 12px",
      boxShadow: designTokens.inputShadow,
      outline: "none",
      cursor: "pointer",
      minWidth: "84px",
    });
    LANGUAGE_OPTIONS.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      this.languageSelect.appendChild(item);
    });
    this.languageSelect.value = getLanguage();
    this.languageSelect.onchange = () => setLanguage(this.languageSelect.value);
    this.languageLabel.appendChild(this.languageSelect);
    this.controls.appendChild(this.languageLabel);

    this.root.appendChild(this.brandWrap);
    this.root.appendChild(this.controls);
    container.appendChild(this.root);

    this._unsubscribeLanguage = subscribeLanguageChange(() => {
      this.languageSelect.value = getLanguage();
      this.refresh();
    });

    this.refresh();
  }

  refresh() {
    this.title.textContent = t("app_title");
    this.subtitle.textContent = t("app_subtitle");
    this.searchButton.textContent = t("header_search");
    this.filterButton.textContent = t("header_filter");
    this.filterButton.title = this.isFilterOpen()
      ? t("header_filter_close")
      : t("header_filter_open");
    this.languageText.textContent = `${t("header_language")}:`;
    this.languageLabel.title = t("header_language");
  }

  _wireButtonHover(button, kind) {
    button.onmouseenter = () => {
      if (kind === "primary") {
        button.style.background = designTokens.accentHover;
      } else {
        button.style.background = "rgba(247, 239, 229, 0.98)";
        button.style.borderColor = "rgba(157, 107, 53, 0.28)";
      }
      button.style.transform = "translateY(-1px)";
    };

    button.onmouseleave = () => {
      applyStyles(button, buttonStyles(kind));
      button.style.transform = "translateY(0)";
    };
  }
}
