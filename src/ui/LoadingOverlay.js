import {
  applyStyles,
  designTokens,
  ensureDesignSystem,
  panelStyles,
  subtitleStyles,
  titleStyles,
} from "./designSystem.js";

export class LoadingOverlay {
  constructor({ container = document.body } = {}) {
    ensureDesignSystem();

    this.root = document.createElement("div");
    applyStyles(this.root, {
      position: "fixed",
      inset: "0",
      zIndex: "12000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background:
        "radial-gradient(circle at top left, rgba(255, 244, 225, 0.28), transparent 30%), linear-gradient(180deg, rgba(34, 24, 16, 0.84) 0%, rgba(24, 18, 13, 0.9) 100%)",
      backdropFilter: "blur(16px)",
      opacity: "0",
      visibility: "hidden",
      transition: "opacity 0.28s ease, visibility 0.28s ease",
      pointerEvents: "none",
    });

    this.panel = document.createElement("div");
    applyStyles(this.panel, {
      ...panelStyles({
        width: "min(460px, calc(100vw - 48px))",
        padding: "28px 28px 24px",
        background: "rgba(255, 249, 240, 0.94)",
      }),
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      borderRadius: "24px",
      boxShadow: "0 28px 70px rgba(0, 0, 0, 0.24)",
    });

    this.badge = document.createElement("div");
    this.badge.textContent = "TTTU Virtual Tour";
    applyStyles(this.badge, {
      display: "inline-flex",
      alignSelf: "flex-start",
      padding: "6px 10px",
      borderRadius: "999px",
      background: "rgba(157, 107, 53, 0.1)",
      color: designTokens.accent,
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    });

    this.title = document.createElement("div");
    this.title.textContent = "Загрузка сцены";
    applyStyles(this.title, {
      ...titleStyles(),
      fontSize: "28px",
    });

    this.status = document.createElement("div");
    this.status.textContent = "Подготавливаем приложение...";
    applyStyles(this.status, {
      ...subtitleStyles(),
      fontSize: "14px",
      lineHeight: "1.6",
      color: designTokens.textSecondary,
    });

    this.progressMeta = document.createElement("div");
    applyStyles(this.progressMeta, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "12px",
      fontWeight: "700",
      color: designTokens.textMuted,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
    });

    this.progressLabel = document.createElement("span");
    this.progressLabel.textContent = "Загрузка модели";

    this.progressValue = document.createElement("span");
    this.progressValue.textContent = "0%";

    this.progressMeta.appendChild(this.progressLabel);
    this.progressMeta.appendChild(this.progressValue);

    this.progressTrack = document.createElement("div");
    applyStyles(this.progressTrack, {
      position: "relative",
      width: "100%",
      height: "12px",
      borderRadius: "999px",
      overflow: "hidden",
      background: "rgba(157, 107, 53, 0.12)",
      boxShadow: "inset 0 1px 3px rgba(48, 35, 22, 0.08)",
    });

    this.progressFill = document.createElement("div");
    applyStyles(this.progressFill, {
      width: "0%",
      height: "100%",
      borderRadius: "inherit",
      background:
        "linear-gradient(90deg, rgba(157, 107, 53, 0.95) 0%, rgba(216, 160, 88, 0.95) 100%)",
      boxShadow: "0 6px 18px rgba(157, 107, 53, 0.26)",
      transition: "width 0.2s ease",
    });
    this.progressTrack.appendChild(this.progressFill);

    this.hint = document.createElement("div");
    this.hint.textContent = "Управление станет доступно сразу после завершения загрузки модели.";
    applyStyles(this.hint, {
      ...subtitleStyles(),
      fontSize: "12px",
      lineHeight: "1.6",
      color: designTokens.textMuted,
    });

    this.panel.appendChild(this.badge);
    this.panel.appendChild(this.title);
    this.panel.appendChild(this.status);
    this.panel.appendChild(this.progressMeta);
    this.panel.appendChild(this.progressTrack);
    this.panel.appendChild(this.hint);
    this.root.appendChild(this.panel);
    container.appendChild(this.root);
  }

  show({ title, status, progress = 0, label } = {}) {
    if (title) this.title.textContent = title;
    if (status) this.status.textContent = status;
    if (label) this.progressLabel.textContent = label;
    this.setProgress(progress);
    this.root.style.visibility = "visible";
    this.root.style.opacity = "1";
    this.root.style.pointerEvents = "auto";
  }

  setStatus(status) {
    if (status) this.status.textContent = status;
  }

  setProgress(progress, label) {
    const normalized = Number.isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;

    if (label) this.progressLabel.textContent = label;
    this.progressFill.style.width = `${Math.round(normalized * 100)}%`;
    this.progressValue.textContent = `${Math.round(normalized * 100)}%`;
  }

  fail(message) {
    this.show({
      title: "Ошибка загрузки",
      status: message || "Не удалось подготовить сцену.",
      progress: 1,
      label: "Ошибка",
    });
    this.progressFill.style.background =
      "linear-gradient(90deg, rgba(176, 63, 44, 0.95) 0%, rgba(226, 119, 92, 0.95) 100%)";
  }

  hide() {
    this.root.style.opacity = "0";
    this.root.style.visibility = "hidden";
    this.root.style.pointerEvents = "none";
  }
}
