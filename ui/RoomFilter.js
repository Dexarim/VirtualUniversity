export class RoomFilter {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onFilterChange = options.onFilterChange || (() => {});
    this.onRoomClicked = options.onRoomClicked || (() => {}); // callback при клике на результат

    // Типы кабинетов с цветами
    this.roomTypes = {
      laboratory: { label: "Лаборатория", color: 0xff0000 }, // красный
      classroom: { label: "Учебный кабинет", color: 0x0000ff }, // синий
      lecture: { label: "Лекционная аудитория", color: 0x00ff00 }, // зелёный
      office: { label: "Офис/кабинет", color: 0xffff00 }, // жёлтый
      museum: { label: "Музей", color: 0xff00ff }, // фиолетовый
      other: { label: "Другое", color: 0xcccccc }, // серый
    };

    this.highlightedRooms = new Set(); // Set of room mesh names
    this.activeFilters = new Set(); // активные фильтры (типы)
    this.searchQuery = "";
    this.currentResults = []; // { name, building, buildingKey, floorName, meshName, mesh }

    this._createModal();
  }

  _createModal() {
    // Контейнер модали
    this.modal = document.createElement("div");
    this.modal.id = "room-filter-modal";
    this.modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      padding: 20px;
      max-width: 400px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10000;
      font-family: Arial, sans-serif;
      display: none;
    `;

    // Заголовок
    const header = document.createElement("div");
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #ddd;
      padding-bottom: 10px;
    `;

    const title = document.createElement("h2");
    title.textContent = "Фильтр кабинетов";
    title.style.cssText = `margin: 0; font-size: 20px; color: #333;`;
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
    `;
    closeBtn.onclick = () => this.hide();
    header.appendChild(closeBtn);

    this.modal.appendChild(header);

    // Поле поиска
    const searchContainer = document.createElement("div");
    searchContainer.style.cssText = `margin-bottom: 15px;`;

    const searchLabel = document.createElement("label");
    searchLabel.textContent = "Поиск по имени:";
    searchLabel.style.cssText = `display: block; font-size: 12px; color: #666; margin-bottom: 5px; font-weight: bold;`;
    searchContainer.appendChild(searchLabel);

    this.searchInput = document.createElement("input");
    this.searchInput.type = "text";
    this.searchInput.placeholder = "Введите номер или имя кабинета...";
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    `;
    this.searchInput.oninput = () => this._onSearchChange();
    searchContainer.appendChild(this.searchInput);

    this.modal.appendChild(searchContainer);

    // Результаты поиска
    this.searchResults = document.createElement("div");
    this.searchResults.id = "search-results";
    this.searchResults.style.cssText = `
      margin-bottom: 15px;
      max-height: 150px;
      overflow-y: auto;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 8px;
      background: #f9f9f9;
      min-height: 20px;
    `;
    this.searchResults.textContent = "Введите для поиска...";
    this.modal.appendChild(this.searchResults);

    // Фильтры по типам
    const filterLabel = document.createElement("label");
    filterLabel.textContent = "Фильтр по типам:";
    filterLabel.style.cssText = `display: block; font-size: 12px; color: #666; margin-bottom: 8px; font-weight: bold;`;
    this.modal.appendChild(filterLabel);

    this.filterCheckboxes = {};
    const filterContainer = document.createElement("div");
    filterContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 15px;
    `;

    for (const [key, info] of Object.entries(this.roomTypes)) {
      const checkboxDiv = document.createElement("div");
      checkboxDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `filter-${key}`;
      checkbox.value = key;
      checkbox.style.cssText = `cursor: pointer;`;
      checkbox.onchange = () => this._onFilterChange();
      this.filterCheckboxes[key] = checkbox;

      const colorBox = document.createElement("div");
      colorBox.style.cssText = `
        width: 16px;
        height: 16px;
        background-color: rgb(${this._hexToRgb(info.color)});
        border-radius: 2px;
      `;

      const label = document.createElement("label");
      label.htmlFor = `filter-${key}`;
      label.textContent = info.label;
      label.style.cssText = `
        cursor: pointer;
        margin: 0;
        flex: 1;
      `;

      checkboxDiv.appendChild(checkbox);
      checkboxDiv.appendChild(colorBox);
      checkboxDiv.appendChild(label);
      filterContainer.appendChild(checkboxDiv);
    }

    this.modal.appendChild(filterContainer);

    // Кнопки действий
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    `;

    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Очистить";
    clearBtn.style.cssText = `
      padding: 8px 16px;
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    clearBtn.onclick = () => this.clearFilters();
    buttonContainer.appendChild(clearBtn);

    const highlightBtn = document.createElement("button");
    highlightBtn.textContent = "Применить";
    highlightBtn.style.cssText = `
      padding: 8px 16px;
      background: rgb(58, 134, 255);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    highlightBtn.onclick = () => {
      this._applyHighlight();
    };
    buttonContainer.appendChild(highlightBtn);

    this.modal.appendChild(buttonContainer);

    // Оверлей (затемнение)
    this.overlay = document.createElement("div");
    this.overlay.id = "room-filter-overlay";
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: none;
    `;
    this.overlay.onclick = () => this.hide();

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.modal);
  }

  _hexToRgb(hex) {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `${r}, ${g}, ${b}`;
  }

  _onSearchChange() {
    this.searchQuery = this.searchInput.value.trim().toLowerCase();
    this._updateSearchResults();
  }

  _updateSearchResults() {
    if (!this.searchQuery) {
      this.searchResults.textContent = "Введите для поиска...";
      return;
    }

    // Здесь будут результаты поиска (обновляется из main.js)
    // Временный placeholder
    this.searchResults.innerHTML = `<div style="color: #999; font-size: 12px;">Поиск: "${this.searchQuery}"</div>`;
  }

  _onFilterChange() {
    this.activeFilters.clear();
    for (const [key, checkbox] of Object.entries(this.filterCheckboxes)) {
      if (checkbox.checked) {
        this.activeFilters.add(key);
      }
    }
  }

  _applyHighlight() {
    this.onFilterChange({
      filters: Array.from(this.activeFilters),
      search: this.searchQuery,
    });
  }

  clearFilters() {
    this.searchInput.value = "";
    this.searchQuery = "";
    for (const checkbox of Object.values(this.filterCheckboxes)) {
      checkbox.checked = false;
    }
    this.activeFilters.clear();
    this.highlightedRooms.clear();
    this.searchResults.textContent = "Введите для поиска...";
    this.onFilterChange({ filters: [], search: "" });
  }

  show() {
    this.modal.style.display = "block";
    this.overlay.style.display = "block";
  }

  hide() {
    this.modal.style.display = "none";
    this.overlay.style.display = "none";
  }

  // Установить доступные типы из data
  setRoomTypes(roomTypesData) {
    // roomTypesData: { 'laboratory': {...}, 'classroom': {...}, ... }
    // по желанию обновляем, но пока оставляем defaults
  }

  // Получить конфиг цветов
  getColorForType(type) {
    return this.roomTypes[type]?.color || this.roomTypes.other.color;
  }

  // Получить текущие фильтры и поиск
  getActiveFilters() {
    return {
      filters: Array.from(this.activeFilters),
      search: this.searchQuery,
    };
  }

  // Обновить результаты поиска из main.js
  updateSearchResults(results) {
    this.currentResults = results || [];

    if (!results || results.length === 0) {
      this.searchResults.innerHTML = `<div style="color: #999; font-size: 12px;">Результатов не найдено</div>`;
      return;
    }

    const html = results
      .map((r, idx) => {
        return `<div 
          data-index="${idx}"
          style="
            font-size: 12px;
            padding: 6px;
            border-bottom: 1px solid #ddd;
            cursor: pointer;
            background: #fff;
            border-radius: 2px;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#f0f0f0'"
          onmouseout="this.style.background='#fff'"
        >
          <strong>${r.name}</strong> (${r.building})
        </div>`;
      })
      .join("");

    this.searchResults.innerHTML = html;

    // Добавляем click handlers ко всем результатам
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
