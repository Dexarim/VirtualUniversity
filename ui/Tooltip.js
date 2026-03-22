export class Tooltip {
  constructor() {
    this.tooltip = document.createElement("div");
    Object.assign(this.tooltip.style, {
      position: "fixed",
      pointerEvents: "none",
      background: "rgba(0, 0, 0, 0.9)",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "6px",
      fontSize: "13px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      maxWidth: "300px",
      zIndex: "10000",
      display: "none",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.6)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(6px)",
      whiteSpace: "normal",
      wordWrap: "break-word",
      animation: "tooltipFadeIn 0.2s ease-out",
    });

    // Добавляем стили анимации
    if (!document.getElementById("tooltipStyles")) {
      const style = document.createElement("style");
      style.id = "tooltipStyles";
      style.textContent = `
        @keyframes tooltipFadeIn {
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

  /**
   * Показать тултип
   * @param {Object} data - { title, description } или просто { name, description }
   * @param {number} x - позиция X мыши
   * @param {number} y - позиция Y мыши
   */
  show(data = {}, x = 0, y = 0) {
    const title = data.title || data.name || "Объект";
    const description = data.description || "";

    let content = `<strong>${this._escapeHtml(title)}</strong>`;
    if (description) {
      content += `<br><span style="opacity: 0.85; font-size: 12px;">${this._escapeHtml(description)}</span>`;
    }

    this.tooltip.innerHTML = content;
    this.tooltip.style.display = "block";

    // Позиционируем тултип рядом с курсором (с отступом)
    const offsetX = 12;
    const offsetY = 12;
    this.tooltip.style.left = `${x + offsetX}px`;
    this.tooltip.style.top = `${y + offsetY}px`;
  }

  /**
   * Скрыть тултип
   */
  hide() {
    this.tooltip.style.display = "none";
  }

  /**
   * Обновить позицию тултипа (при движении мыши)
   */
  updatePosition(x, y) {
    if (this.tooltip.style.display === "block") {
      const offsetX = 12;
      const offsetY = 12;
      this.tooltip.style.left = `${x + offsetX}px`;
      this.tooltip.style.top = `${y + offsetY}px`;
    }
  }

  /**
   * Экранировать HTML символы
   */
  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
