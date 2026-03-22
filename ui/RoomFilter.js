export class RoomFilter {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onFilterChange = options.onFilterChange || (() => {});
    this.onRoomClicked = options.onRoomClicked || (() => {});

    this.roomTypes = {
      laboratory: { label: "Лаборатория", color: 0xff0000 },
      classroom: { label: "Учебный кабинет", color: 0x0000ff },
      lecture: { label: "Лекционная аудитория", color: 0x00ff00 },
      office: { label: "Офис / кабинет", color: 0xffff00 },
      museum: { label: "Музей", color: 0xff00ff },
      other: { label: "Другое", color: 0xcccccc },
    };

    this.activeFilters = new Set(Object.keys(this.roomTypes));
    this.searchQuery = "";
    this.currentResults = [];
    this.filterCheckboxes = {};

    this._createMainPanel();
    this._createModal();
  }

  _createMainPanel() {
    this.panel = document.createElement("div");
    this.panel.id = "room-type-panel";
    this.panel.style.cssText = `
      position: fixed;
      top: 132px;
      right: 20px;
      width: min(280px, calc(100vw - 40px));
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      z-index: 9997;
      font-family: Arial, sans-serif;
      backdrop-filter: blur(8px);
    `;

    const title = document.createElement("div");
    title.textContent = "Подсветка кабинетов";
    title.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      color: #222;
      margin-bottom: 8px;
    `;
    this.panel.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.textContent =
      "Выберите типы помещений, которые должны подсвечиваться на главной сцене.";
    subtitle.style.cssText = `
      font-size: 12px;
      color: #666;
      margin-bottom: 12px;
      line-height: 1.45;
    `;
    this.panel.appendChild(subtitle);

    const filterContainer = document.createElement("div");
    filterContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    `;

    for (const [key, info] of Object.entries(this.roomTypes)) {
      filterContainer.appendChild(this._createCheckboxRow(key, info));
    }

    this.panel.appendChild(filterContainer);

    const actions = document.createElement("div");
    actions.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    `;

    const showAllBtn = document.createElement("button");
    showAllBtn.textContent = "Все";
    showAllBtn.style.cssText = this._smallButtonCss();
    showAllBtn.onclick = () => this.setAllFilters(true);

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Снять все";
    clearBtn.style.cssText = this._smallButtonCss();
    clearBtn.onclick = () => this.setAllFilters(false);

    actions.appendChild(showAllBtn);
    actions.appendChild(clearBtn);
    this.panel.appendChild(actions);

    const legend = document.createElement("div");
    legend.textContent = "Цвет кабинета соответствует выбранному типу помещения.";
    legend.style.cssText = `
      font-size: 11px;
      color: #7a7a7a;
      line-height: 1.4;
    `;
    this.panel.appendChild(legend);

    this.container.appendChild(this.panel);
  }

  _createCheckboxRow(key, info) {
    const row = document.createElement("label");
    row.htmlFor = `filter-${key}`;
    row.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    `;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `filter-${key}`;
    checkbox.value = key;
    checkbox.checked = true;
    checkbox.style.cssText = `cursor: pointer; margin: 0;`;
    checkbox.onchange = () => this._onFilterChange();
    this.filterCheckboxes[key] = checkbox;

    const colorBox = document.createElement("div");
    colorBox.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 3px;
      flex-shrink: 0;
      border: 1px solid rgba(0, 0, 0, 0.14);
      background: rgb(${this._hexToRgb(info.color)});
    `;

    const text = document.createElement("div");
    text.textContent = info.label;
    text.style.cssText = `
      font-size: 13px;
      color: #333;
      line-height: 1.35;
    `;

    row.appendChild(checkbox);
    row.appendChild(colorBox);
    row.appendChild(text);
    return row;
  }

  _createModal() {
    this.modal = document.createElement("div");
    this.modal.id = "room-search-modal";
    this.modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
      padding: 20px;
      max-width: 420px;
      width: 92%;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10000;
      font-family: Arial, sans-serif;
      display: none;
    `;

    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
      border-bottom: 1px solid #e7e7e7;
      padding-bottom: 12px;
    `;

    const headerText = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = "Поиск кабинетов";
    title.style.cssText = `margin: 0 0 6px 0; font-size: 20px; color: #222;`;

    const description = document.createElement("div");
    description.textContent =
      "Введите номер или название кабинета, чтобы быстро перейти к нему.";
    description.style.cssText = `
      font-size: 12px;
      color: #666;
      line-height: 1.45;
    `;

    headerText.appendChild(title);
    headerText.appendChild(description);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "X";
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: #666;
      padding: 4px;
      width: 28px;
      height: 28px;
      border-radius: 4px;
    `;
    closeBtn.onclick = () => this.hide();

    header.appendChild(headerText);
    header.appendChild(closeBtn);
    this.modal.appendChild(header);

    const searchContainer = document.createElement("div");
    searchContainer.style.cssText = `margin-bottom: 14px;`;

    const searchLabel = document.createElement("label");
    searchLabel.textContent = "Поиск";
    searchLabel.style.cssText = `
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 6px;
      font-weight: bold;
    `;

    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.placeholder = "Например: 214, музей, Кабинет 101";
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
      outline: none;
    `;
    this.searchInput.oninput = () => this._onSearchChange();

    searchContainer.appendChild(searchLabel);
    searchContainer.appendChild(this.searchInput);
    this.modal.appendChild(searchContainer);

    this.searchResults = document.createElement("div");
    this.searchResults.id = "search-results";
    this.searchResults.style.cssText = `
      border: 1px solid #eee;
      border-radius: 6px;
      padding: 8px;
      background: #f8f9fb;
      min-height: 56px;
      max-height: 320px;
      overflow-y: auto;
    `;
    this.modal.appendChild(this.searchResults);
    this.resetSearchResults();

    const modalActions = document.createElement("div");
    modalActions.style.cssText = `
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
    `;

    const clearSearchBtn = document.createElement("button");
    clearSearchBtn.textContent = "Очистить поиск";
    clearSearchBtn.style.cssText = this._smallButtonCss();
    clearSearchBtn.onclick = () => this.clearSearch();

    modalActions.appendChild(clearSearchBtn);
    this.modal.appendChild(modalActions);

    this.overlay = document.createElement("div");
    this.overlay.id = "room-search-overlay";
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 9999;
      display: none;
    `;
    this.overlay.onclick = () => this.hide();

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.modal);
  }

  _smallButtonCss() {
    return `
      padding: 7px 12px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      color: #333;
    `;
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
      if (checkbox.checked) {
        this.activeFilters.add(key);
      }
    }

    this.onFilterChange({
      filters: Array.from(this.activeFilters),
      search: this.searchQuery,
    });
  }

  _onSearchChange() {
    this.searchQuery = this.searchInput.value.trim().toLowerCase();

    if (!this.searchQuery) {
      this.resetSearchResults();
    }

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

  setRoomTypes(roomTypesData) {
    void roomTypesData;
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
      <div style="color: #7a7a7a; font-size: 12px; line-height: 1.45;">
        Начните вводить номер или название кабинета.
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
        <div style="color: #7a7a7a; font-size: 12px; line-height: 1.45;">
          По вашему запросу ничего не найдено.
        </div>
      `;
      return;
    }

    const html = results
      .map((r, idx) => {
        const color = this.getColorForType(r.type);
        return `<div
          data-index="${idx}"
          style="
            display: flex;
            gap: 10px;
            align-items: flex-start;
            padding: 10px;
            border-radius: 6px;
            background: #fff;
            border: 1px solid #ececec;
            cursor: pointer;
            transition: background 0.2s ease, border-color 0.2s ease;
            margin-bottom: 8px;
          "
          onmouseover="this.style.background='#f3f6fb'; this.style.borderColor='#d8e2f0';"
          onmouseout="this.style.background='#fff'; this.style.borderColor='#ececec';"
        >
          <div
            style="
              width: 12px;
              height: 12px;
              border-radius: 3px;
              margin-top: 3px;
              flex-shrink: 0;
              border: 1px solid rgba(0, 0, 0, 0.12);
              background: rgb(${this._hexToRgb(color)});
            "
          ></div>
          <div style="min-width: 0;">
            <div style="font-size: 13px; font-weight: bold; color: #222;">
              ${r.name}
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">
              ${r.building} • ${r.floorName}
            </div>
          </div>
        </div>`;
      })
      .join("");

    this.searchResults.innerHTML = html;

    const resultItems = this.searchResults.querySelectorAll("div[data-index]");
    resultItems.forEach((item) => {
      item.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(item.getAttribute("data-index"), 10);
        const result = this.currentResults[idx];
        if (result) {
          this.onRoomClicked(result);
        }
      };
    });
  }
}
