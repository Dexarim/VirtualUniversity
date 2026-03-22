// ui/Inspector.js
// Создаёт небольшой overlay-инспектор (имя, описание, кнопки назад/редактировать)

export class Inspector {
  constructor({
    container = document.body,
    onBack = () => {},
    onEdit = null,
  } = {}) {
    this.onBack = onBack;
    this.onEdit = onEdit;

    this.el = document.createElement("div");
    this.el.style.position = "absolute";
    this.el.style.left = "20px";
    this.el.style.bottom = "20px";
    this.el.style.minWidth = "220px";
    this.el.style.background = "rgba(0,0,0,0.6)";
    this.el.style.color = "#fff";
    this.el.style.padding = "12px";
    this.el.style.borderRadius = "8px";
    this.el.style.fontFamily = "sans-serif";
    this.el.style.zIndex = 1000;
    this.el.style.display = "none";

    this.title = document.createElement("div");
    this.title.style.fontSize = "16px";
    this.title.style.fontWeight = "600";
    this.el.appendChild(this.title);

    this.desc = document.createElement("div");
    this.desc.style.marginTop = "6px";
    this.desc.style.fontSize = "13px";
    this.el.appendChild(this.desc);

    const btns = document.createElement("div");
    btns.style.marginTop = "10px";
    btns.style.display = "flex";
    btns.style.gap = "8px";

    this.backBtn = document.createElement("button");
    this.backBtn.innerText = "↩ Назад";
    this.backBtn.onclick = () => this.onBack();
    btns.appendChild(this.backBtn);

    if (this.onEdit) {
      this.editBtn = document.createElement("button");
      this.editBtn.innerText = "✎ Ред.";
      this.editBtn.onclick = () => this.onEdit();
      btns.appendChild(this.editBtn);
    }

    this.el.appendChild(btns);
    container.appendChild(this.el);
  }

  show(meta) {
    if (!meta) {
      this.hide();
      return;
    }
    this.title.innerText = meta.name || meta.meshName || "Без имени";
    this.desc.innerText = meta.description || "";
    this.desc.style.display = meta.description ? "block" : "none";
    this.el.style.display = "block";
  }

  hide() {
    this.el.style.display = "none";
  }
}
