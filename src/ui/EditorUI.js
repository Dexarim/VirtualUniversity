import {
  applyStyles,
  buttonStyles,
  ensureDesignSystem,
  inputStyles,
  panelStyles,
  subtitleStyles,
  titleStyles,
} from "./designSystem.js";

export class EditorUI {
  constructor({ container = document.body, dataManager }) {
    ensureDesignSystem();

    this.dataManager = dataManager;
    this.el = document.createElement("div");
    applyStyles(this.el, {
      ...panelStyles({ width: "320px", padding: "18px" }),
      position: "absolute",
      right: "20px",
      bottom: "20px",
      zIndex: "1000",
      display: "none",
    });

    this.title = document.createElement("div");
    this.title.innerText = "Редактор метаданных";
    applyStyles(this.title, {
      ...titleStyles(),
      fontSize: "18px",
      marginBottom: "6px",
    });
    this.el.appendChild(this.title);

    this.subtitle = document.createElement("div");
    this.subtitle.innerText = "Меняйте подписи и описания прямо в текущей сцене.";
    applyStyles(this.subtitle, {
      ...subtitleStyles(),
      marginBottom: "12px",
    });
    this.el.appendChild(this.subtitle);

    this.metaName = document.createElement("input");
    this.metaName.placeholder = "Имя";
    applyStyles(this.metaName, {
      ...inputStyles(),
      marginTop: "0",
      marginBottom: "8px",
    });
    this.el.appendChild(this.metaName);

    this.metaDesc = document.createElement("textarea");
    this.metaDesc.placeholder = "Описание (опционально)";
    applyStyles(this.metaDesc, {
      ...inputStyles(),
      minHeight: "96px",
      resize: "vertical",
      marginBottom: "10px",
    });
    this.el.appendChild(this.metaDesc);

    const actions = document.createElement("div");
    applyStyles(actions, {
      marginTop: "4px",
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    });

    this.saveBtn = document.createElement("button");
    this.saveBtn.innerText = "Сохранить";
    applyStyles(this.saveBtn, buttonStyles("primary"));
    this.saveBtn.onclick = () => this.save();
    actions.appendChild(this.saveBtn);

    this.exportBtn = document.createElement("button");
    this.exportBtn.innerText = "Экспорт JSON";
    applyStyles(this.exportBtn, buttonStyles("secondary"));
    this.exportBtn.onclick = () => this.dataManager.exportJSON();
    actions.appendChild(this.exportBtn);

    this.el.appendChild(actions);
    container.appendChild(this.el);

    this.currentMeshName = null;
  }

  openFor(meshName, meta = {}) {
    this.currentMeshName = meshName;
    this.metaName.value = meta.name || meshName;
    this.metaDesc.value = meta.description || "";
    this.el.style.display = "block";
  }

  close() {
    this.el.style.display = "none";
    this.currentMeshName = null;
  }

  save() {
    if (!this.currentMeshName) return;

    const meta = {
      name: this.metaName.value.trim(),
      description: this.metaDesc.value.trim() || undefined,
      meshName: this.currentMeshName,
    };

    this.dataManager.setMeta(this.currentMeshName, meta);
    alert(
      "Изменения сохранены в памяти. Для постоянного сохранения экспортируйте JSON."
    );
  }
}
