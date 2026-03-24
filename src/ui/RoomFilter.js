import {
  applyStyles,
  buttonStyles,
  designTokens,
  ensureDesignSystem,
  floatingPanelStyles,
  inputStyles,
  overlayStyles,
  panelStyles,
  subtitleStyles,
  tagStyles,
  titleStyles,
} from "./designSystem.js";
import {
  getRoomTypeLabel,
  subscribeLanguageChange,
  t,
} from "./i18n.js";

export class RoomFilter {
  constructor(options = {}) {
    ensureDesignSystem();

    this.container = options.container || document.body;
    this.onFilterChange = options.onFilterChange || (() => {});
    this.onRoomClicked = options.onRoomClicked || (() => {});

    this.roomTypes = {
      laboratory: { color: 0xff0000 },
      classroom: { color: 0x0000ff },
      lecture: { color: 0x00ff00 },
      office: { color: 0xffff00 },
      museum: { color: 0xff00ff },
      other: { color: 0xcccccc },
    };

    this.activeFilters = new Set(Object.keys(this.roomTypes));
    this.searchQuery = "";
    this.currentResults = [];
    this.filterCheckboxes = {};
    this.filterMetaLabels = {};

    this._createMainPanel();
    this._createModal();

    this._unsubscribeLanguage = subscribeLanguageChange(() => {
      this.applyLanguage();
      this.updateSearchResults(this.currentResults);
    });
    this.applyLanguage();
    this.hidePanel();
  }

  _createMainPanel() {
    this.panel = document.createElement("div");
    this.panel.id = "room-type-panel";
    applyStyles(
      this.panel,
      floatingPanelStyles({ width: "min(340px, calc(100vw - 40px))" })
    );
    this.panel.style.top = "92px";
    this.panel.style.right = "20px";
    this.panel.style.zIndex = "9997";

    this.panelTitle = document.createElement("div");
    applyStyles(this.panelTitle, {
      ...titleStyles(),
      fontSize: "18px",
      marginBottom: "8px",
    });
    this.panel.appendChild(this.panelTitle);

    this.panelSubtitle = document.createElement("div");
    applyStyles(this.panelSubtitle, {
      ...subtitleStyles(),
      marginBottom: "14px",
      maxWidth: "30ch",
    });
    this.panel.appendChild(this.panelSubtitle);

    this.statusTag = document.createElement("div");
    applyStyles(this.statusTag, {
      ...tagStyles(),
      marginBottom: "12px",
      width: "fit-content",
    });
    this.panel.appendChild(this.statusTag);

    const filterContainer = document.createElement("div");
    applyStyles(filterContainer, {
      display: "flex",
      flexDirection: "column",
      gap: "9px",
      marginBottom: "14px",
    });

    for (const [key, info] of Object.entries(this.roomTypes)) {
      filterContainer.appendChild(this._createCheckboxRow(key, info));
    }

    this.panel.appendChild(filterContainer);

    const actions = document.createElement("div");
    applyStyles(actions, {
      display: "flex",
      gap: "8px",
      marginBottom: "12px",
    });

    this.showAllBtn = document.createElement("button");
    applyStyles(this.showAllBtn, buttonStyles("primary"));
    this.showAllBtn.onclick = () => this.setAllFilters(true);
    this._wireButtonHover(this.showAllBtn, "primary");

    this.clearBtn = document.createElement("button");
    applyStyles(this.clearBtn, buttonStyles("secondary"));
    this.clearBtn.onclick = () => this.setAllFilters(false);
    this._wireButtonHover(this.clearBtn, "secondary");

    actions.appendChild(this.showAllBtn);
    actions.appendChild(this.clearBtn);
    this.panel.appendChild(actions);

    this.legend = document.createElement("div");
    applyStyles(this.legend, {
      ...subtitleStyles(),
      fontSize: "11px",
      color: designTokens.textMuted,
    });
    this.panel.appendChild(this.legend);

    this.container.appendChild(this.panel);
  }

  _createCheckboxRow(key, info) {
    const row = document.createElement("label");
    row.htmlFor = `filter-${key}`;
    applyStyles(row, {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      cursor: "pointer",
      padding: "10px 12px",
      borderRadius: "14px",
      background: "rgba(255, 251, 245, 0.72)",
      border: designTokens.inputBorder,
      transition: "background 0.18s ease, border-color 0.18s ease",
    });
    row.onmouseenter = () => {
      row.style.background = "rgba(255, 248, 239, 0.96)";
      row.style.borderColor = "rgba(157, 107, 53, 0.28)";
    };
    row.onmouseleave = () => {
      row.style.background = "rgba(255, 251, 245, 0.72)";
      row.style.borderColor = "rgba(129, 109, 87, 0.24)";
    };

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `filter-${key}`;
    checkbox.value = key;
    checkbox.checked = true;
    applyStyles(checkbox, {
      cursor: "pointer",
      margin: "0",
      accentColor: designTokens.accent,
    });
    checkbox.onchange = () => this._onFilterChange();
    this.filterCheckboxes[key] = checkbox;

    const colorBox = document.createElement("div");
    applyStyles(colorBox, {
      width: "14px",
      height: "14px",
      borderRadius: "4px",
      flexShrink: "0",
      border: "1px solid rgba(79, 64, 48, 0.14)",
      background: `rgb(${this._hexToRgb(info.color)})`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
    });

    const textWrap = document.createElement("div");
    applyStyles(textWrap, {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      minWidth: "0",
    });

    const text = document.createElement("div");
    applyStyles(text, {
      fontSize: "13px",
      fontWeight: "600",
      color: designTokens.textPrimary,
      lineHeight: "1.3",
    });

    const meta = document.createElement("div");
    applyStyles(meta, {
      fontSize: "11px",
      color: designTokens.textMuted,
    });

    this.filterMetaLabels[key] = { title: text, meta };

    textWrap.appendChild(text);
    textWrap.appendChild(meta);

    row.appendChild(checkbox);
    row.appendChild(colorBox);
    row.appendChild(textWrap);
    return row;
  }

  _createModal() {
    this.modal = document.createElement("div");
    this.modal.id = "room-search-modal";
    applyStyles(this.modal, {
      ...panelStyles({
        width: "min(460px, 92vw)",
        padding: "22px",
        background: designTokens.panelStrongBackground,
      }),
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      maxHeight: "82vh",
      overflowY: "auto",
      zIndex: "10000",
      display: "none",
    });

    const header = document.createElement("div");
    applyStyles(header, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "12px",
      marginBottom: "16px",
      borderBottom: "1px solid rgba(129, 109, 87, 0.14)",
      paddingBottom: "14px",
    });

    const headerText = document.createElement("div");

    this.modalTitle = document.createElement("h2");
    applyStyles(this.modalTitle, {
      ...titleStyles(),
      marginBottom: "6px",
    });

    this.modalDescription = document.createElement("div");
    applyStyles(this.modalDescription, subtitleStyles());

    headerText.appendChild(this.modalTitle);
    headerText.appendChild(this.modalDescription);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    applyStyles(closeBtn, buttonStyles("ghost"));
    closeBtn.style.fontSize = "20px";
    closeBtn.style.width = "36px";
    closeBtn.style.height = "36px";
    closeBtn.style.borderRadius = "999px";
    closeBtn.onmouseenter = () => {
      closeBtn.style.background = designTokens.accentSoft;
      closeBtn.style.color = designTokens.textPrimary;
    };
    closeBtn.onmouseleave = () => {
      closeBtn.style.background = "transparent";
      closeBtn.style.color = designTokens.textSecondary;
    };
    closeBtn.onclick = () => this.hide();

    header.appendChild(headerText);
    header.appendChild(closeBtn);
    this.modal.appendChild(header);

    const searchContainer = document.createElement("div");
    applyStyles(searchContainer, { marginBottom: "14px" });

    this.searchLabel = document.createElement("label");
    applyStyles(this.searchLabel, {
      ...subtitleStyles(),
      display: "block",
      marginBottom: "7px",
      fontWeight: "700",
      color: designTokens.textSecondary,
    });

    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    applyStyles(this.searchInput, inputStyles());
    this.searchInput.oninput = () => this._onSearchChange();

    searchContainer.appendChild(this.searchLabel);
    searchContainer.appendChild(this.searchInput);
    this.modal.appendChild(searchContainer);

    this.searchResults = document.createElement("div");
    this.searchResults.id = "search-results";
    applyStyles(this.searchResults, {
      border: designTokens.inputBorder,
      borderRadius: "16px",
      padding: "10px",
      background: "rgba(255, 252, 247, 0.88)",
      minHeight: "64px",
      maxHeight: "320px",
      overflowY: "auto",
      boxShadow: designTokens.inputShadow,
    });
    this.modal.appendChild(this.searchResults);

    const modalActions = document.createElement("div");
    applyStyles(modalActions, {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: "14px",
    });

    this.clearSearchBtn = document.createElement("button");
    applyStyles(this.clearSearchBtn, buttonStyles("secondary"));
    this._wireButtonHover(this.clearSearchBtn, "secondary");
    this.clearSearchBtn.onclick = () => this.clearSearch();

    modalActions.appendChild(this.clearSearchBtn);
    this.modal.appendChild(modalActions);

    this.overlay = document.createElement("div");
    this.overlay.id = "room-search-overlay";
    applyStyles(this.overlay, overlayStyles());
    this.overlay.style.zIndex = "9999";
    this.overlay.style.display = "none";
    this.overlay.onclick = () => this.hide();

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.modal);
  }

  applyLanguage() {
    this.panelTitle.textContent = t("room_filter_title");
    this.panelSubtitle.textContent = t("room_filter_subtitle");
    this.statusTag.textContent = t("room_filter_active");
    this.showAllBtn.textContent = t("common_all");
    this.clearBtn.textContent = t("common_clear_all");
    this.legend.textContent = t("room_filter_legend");

    Object.keys(this.filterMetaLabels).forEach((key) => {
      const label = this.filterMetaLabels[key];
      label.title.textContent = getRoomTypeLabel(key);
      label.meta.textContent = t("room_filter_visible");
    });

    this.modalTitle.textContent = t("room_filter_search_title");
    this.modalDescription.textContent = t("room_filter_search_description");
    this.searchLabel.textContent = t("common_search");
    this.searchInput.placeholder = t("room_filter_search_placeholder");
    this.clearSearchBtn.textContent = t("room_filter_clear_search");

    if (!this.searchQuery) {
      this.resetSearchResults();
    }
  }

  _wireButtonHover(button, kind) {
    button.onmouseenter = () => {
      if (kind === "primary") {
        button.style.background = designTokens.accentHover;
      } else {
        button.style.background = "rgba(247, 239, 229, 0.95)";
        button.style.borderColor = "rgba(157, 107, 53, 0.28)";
      }
      button.style.transform = "translateY(-1px)";
    };
    button.onmouseleave = () => {
      applyStyles(button, buttonStyles(kind));
      button.style.transform = "translateY(0)";
    };
  }

  _hexToRgb(hex) {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `${r}, ${g}, ${b}`;
  }

  _onFilterChange() {
    this.activeFilters.clear();
    for (const [key, checkbox] of Object.entries(this.filterCheckboxes)) {
      if (checkbox.checked) this.activeFilters.add(key);
    }

    this.onFilterChange({
      filters: Array.from(this.activeFilters),
      search: this.searchQuery,
    });
  }

  _onSearchChange() {
    this.searchQuery = this.searchInput.value.trim().toLowerCase();
    if (!this.searchQuery) this.resetSearchResults();

    this.onFilterChange({
      filters: Array.from(this.activeFilters),
      search: this.searchQuery,
    });
  }

  setAllFilters(checked) {
    for (const checkbox of Object.values(this.filterCheckboxes)) {
      checkbox.checked = checked;
    }
    this._onFilterChange();
  }

  show() {
    this.modal.style.display = "block";
    this.overlay.style.display = "block";
    window.setTimeout(() => this.searchInput?.focus(), 0);
  }

  hide() {
    this.modal.style.display = "none";
    this.overlay.style.display = "none";
  }

  showPanel() {
    this.panel.style.display = "block";
  }

  hidePanel() {
    this.panel.style.display = "none";
  }

  togglePanel() {
    if (this.panel.style.display === "none") {
      this.showPanel();
    } else {
      this.hidePanel();
    }
  }

  isPanelOpen() {
    return this.panel.style.display !== "none";
  }

  clearSearch() {
    this.searchInput.value = "";
    this.searchQuery = "";
    this.resetSearchResults();
    this.onFilterChange({
      filters: Array.from(this.activeFilters),
      search: "",
    });
    this.searchInput.focus();
  }

  getColorForType(type) {
    return this.roomTypes[type]?.color || this.roomTypes.other.color;
  }

  getActiveFilters() {
    return {
      filters: Array.from(this.activeFilters),
      search: this.searchQuery,
    };
  }

  resetSearchResults() {
    this.currentResults = [];
    this.searchResults.innerHTML = `
      <div style="color:${designTokens.textMuted}; font-size:12px; line-height:1.55; padding:6px 4px;">
        ${t("room_filter_search_empty")}
      </div>
    `;
  }

  updateSearchResults(results) {
    this.currentResults = results || [];

    if (!this.searchQuery) {
      this.resetSearchResults();
      return;
    }

    if (!results || results.length === 0) {
      this.searchResults.innerHTML = `
        <div style="color:${designTokens.textMuted}; font-size:12px; line-height:1.55; padding:6px 4px;">
          ${t("room_filter_search_no_results")}
        </div>
      `;
      return;
    }

    const html = results
      .map((result, idx) => {
        const color = this.getColorForType(result.type);
        return `<div
          data-index="${idx}"
          style="
            display:flex;
            gap:12px;
            align-items:flex-start;
            padding:12px;
            border-radius:14px;
            background:rgba(255, 253, 248, 0.96);
            border:${designTokens.inputBorder};
            cursor:pointer;
            transition:background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
            margin-bottom:8px;
            box-shadow:0 8px 18px rgba(81, 59, 35, 0.06);
          "
          onmouseover="this.style.background='rgba(250,244,236,1)'; this.style.borderColor='rgba(157,107,53,0.24)'; this.style.transform='translateY(-1px)';"
          onmouseout="this.style.background='rgba(255, 253, 248, 0.96)'; this.style.borderColor='rgba(129, 109, 87, 0.24)'; this.style.transform='translateY(0)';"
        >
          <div
            style="
              width:12px;
              height:12px;
              border-radius:4px;
              margin-top:4px;
              flex-shrink:0;
              border:1px solid rgba(79, 64, 48, 0.12);
              background:rgb(${this._hexToRgb(color)});
            "
          ></div>
          <div style="min-width:0;">
            <div style="font-size:13px; font-weight:700; color:${designTokens.textPrimary};">
              ${result.name}
            </div>
            <div style="font-size:12px; color:${designTokens.textSecondary}; margin-top:3px; line-height:1.45;">
              ${result.building} • ${result.floorName}
            </div>
          </div>
        </div>`;
      })
      .join("");

    this.searchResults.innerHTML = html;
    const resultItems = this.searchResults.querySelectorAll("div[data-index]");
    resultItems.forEach((item) => {
      item.onclick = (event) => {
        event.stopPropagation();
        const idx = parseInt(item.getAttribute("data-index"), 10);
        const result = this.currentResults[idx];
        if (result) this.onRoomClicked(result);
      };
    });
  }
}
