export class EditorUI {
  constructor({ container = document.body, dataManager }) {
    this.dataManager = dataManager;
    this.el = document.createElement("div");
    this.el.style.position = "absolute";
    this.el.style.right = "20px";
    this.el.style.bottom = "20px";
    this.el.style.minWidth = "260px";
    this.el.style.background = "rgba(255,255,255,0.95)";
    this.el.style.color = "#111";
    this.el.style.padding = "12px";
    this.el.style.borderRadius = "8px";
    this.el.style.fontFamily = "sans-serif";
    this.el.style.zIndex = 1000;
    this.el.style.display = "none";

    this.title = document.createElement("div");
    this.title.innerText = "Редактор метаданных";
    this.title.style.fontWeight = "700";
    this.el.appendChild(this.title);

    this.metaName = document.createElement("input");
    this.metaName.placeholder = "Имя";
    this.metaName.style.width = "100%";
    this.metaName.style.marginTop = "8px";
    this.el.appendChild(this.metaName);

    this.metaDesc = document.createElement("textarea");
    this.metaDesc.placeholder = "Описание (опционально)";
    this.metaDesc.style.width = "100%";
    this.metaDesc.style.marginTop = "6px";
    this.metaDesc.style.height = "80px";
    this.el.appendChild(this.metaDesc);

    const actions = document.createElement("div");
    actions.style.marginTop = "8px";
    actions.style.display = "flex";
    actions.style.gap = "8px";

    this.saveBtn = document.createElement("button");
    this.saveBtn.innerText = "Сохранить (в памяти)";
    this.saveBtn.onclick = () => this.save();
    actions.appendChild(this.saveBtn);

    this.exportBtn = document.createElement("button");
    this.exportBtn.innerText = "Экспорт JSON";
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
      "Сохранено в память (для постоянного сохранения — экспортируйте JSON)."
    );
  }
}
