// ui/InfoPanel.js
// Панель информации об объекте: здание / этаж / кабинет

export class InfoPanel {
  constructor({ container = document.body, onBack = null, showBackBtn = true } = {}) {
    this.container = container;
    this.onBack = onBack;

    this.root = document.createElement("div");
    this.root.className = "info-panel";
    this.root.style.position = "absolute";
    this.root.style.bottom = "20px";
    this.root.style.left = "20px";
    this.root.style.padding = "16px";
    this.root.style.background = "rgba(0, 0, 0, 0.7)";
    this.root.style.color = "#fff";
    this.root.style.fontFamily = "Arial, sans-serif";
    this.root.style.borderRadius = "8px";
    this.root.style.maxWidth = "300px";
    this.root.style.display = "none";
    this.root.style.backdropFilter = "blur(6px)";
    this.root.style.transition = "opacity 0.3s";

    // Название
    this.title = document.createElement("h3");
    this.title.style.margin = "0 0 8px 0";
    this.title.style.fontSize = "18px";
    this.root.appendChild(this.title);

    // Описание
    this.desc = document.createElement("p");
    this.desc.style.margin = "0";
    this.desc.style.fontSize = "14px";
    this.desc.style.lineHeight = "1.4";
    this.root.appendChild(this.desc);

    // Кнопка "Назад" (опционально, скрыта по умолчанию в панораме)
    this.backBtn = document.createElement("button");
    this.backBtn.innerText = "← Назад";
    this.backBtn.style.marginTop = "10px";
    this.backBtn.style.padding = "6px 12px";
    this.backBtn.style.border = "none";
    this.backBtn.style.borderRadius = "6px";
    this.backBtn.style.cursor = "pointer";
    this.backBtn.style.background = "#3a86ff";
    this.backBtn.style.color = "#fff";
    this.backBtn.style.fontWeight = "bold";
    this.backBtn.style.transition = "background 0.2s";
    this.backBtn.style.display = showBackBtn ? "block" : "none";
    this.backBtn.onmouseenter = () =>
      (this.backBtn.style.background = "#4cc9f0");
    this.backBtn.onmouseleave = () =>
      (this.backBtn.style.background = "#3a86ff");
    this.backBtn.onclick = () => {
      if (typeof this.onBack === "function") this.onBack();
    };

    this.root.appendChild(this.backBtn);
    this.container.appendChild(this.root);
  }

  /** Показать объект */
  show(meta) {
    if (!meta) return this.hide();

    this.title.textContent = meta.name || meta.meshName || "Без названия";
    this.desc.textContent = meta.description || "";

    // Если описания нет — скрыть текст, но оставить название
    this.desc.style.display = meta.description ? "block" : "none";

    this.root.style.display = "block";
    this.root.style.opacity = "1";
  }

  /** Скрыть панель */
  hide() {
    this.root.style.opacity = "0";
    setTimeout(() => {
      this.root.style.display = "none";
    }, 300);
  }

  /** Получить DOM элемент панели */
  getElement() {
    return this.root;
  }
}
