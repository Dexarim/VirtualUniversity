import {
  applyStyles,
  buttonStyles,
  ensureDesignSystem,
  panelStyles,
  subtitleStyles,
  titleStyles,
} from "./designSystem.js";

export class Inspector {
  constructor({
    container = document.body,
    onBack = () => {},
    onEdit = null,
  } = {}) {
    ensureDesignSystem();

    this.onBack = onBack;
    this.onEdit = onEdit;

    this.el = document.createElement("div");
    applyStyles(this.el, {
      ...panelStyles({ maxWidth: "320px", padding: "18px 18px 16px" }),
      position: "absolute",
      left: "20px",
      bottom: "20px",
      zIndex: "1000",
      display: "none",
    });

    this.title = document.createElement("div");
    applyStyles(this.title, {
      ...titleStyles(),
      fontSize: "18px",
      marginBottom: "8px",
    });
    this.el.appendChild(this.title);

    this.desc = document.createElement("div");
    applyStyles(this.desc, {
      ...subtitleStyles(),
      fontSize: "13px",
      lineHeight: "1.55",
    });
    this.el.appendChild(this.desc);

    const btns = document.createElement("div");
    applyStyles(btns, {
      marginTop: "14px",
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    });

    this.backBtn = document.createElement("button");
    this.backBtn.innerText = "Назад";
    applyStyles(this.backBtn, buttonStyles("primary"));
    this.backBtn.onclick = () => this.onBack();
    btns.appendChild(this.backBtn);

    if (this.onEdit) {
      this.editBtn = document.createElement("button");
      this.editBtn.innerText = "Редактировать";
      applyStyles(this.editBtn, buttonStyles("secondary"));
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
