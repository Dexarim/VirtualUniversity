const STORAGE_KEY = "vt-language";

export const LANGUAGE_OPTIONS = [
  { value: "ru", label: "Рус" },
  { value: "kz", label: "Қаз" },
  { value: "en", label: "Eng" },
];

const dictionaries = {
  ru: {
    app_title: "TTTU Virtual Tour",
    app_subtitle: "Навигация по корпусам, этажам и кабинетам",
    header_search: "Поиск",
    header_filter: "Фильтр",
    header_filter_open: "Показать фильтр",
    header_filter_close: "Скрыть фильтр",
    header_language: "Язык",
    info_navigation: "Навигация",
    common_back: "Назад",
    common_close: "Закрыть",
    common_object: "Объект",
    common_hint: "Подсказка",
    common_search: "Поиск",
    common_filter: "Фильтр",
    common_all: "Все",
    common_clear_all: "Снять все",
    common_next: "Далее",
    common_previous: "Назад",
    common_to_start: "К началу",
    room_filter_title: "Подсветка кабинетов",
    room_filter_subtitle:
      "Выберите типы помещений, которые должны подсвечиваться на сцене.",
    room_filter_active: "Активные слои",
    room_filter_legend:
      "Цвет кабинета соответствует выбранному типу помещения.",
    room_filter_visible: "Отображается на сцене",
    room_filter_search_title: "Поиск кабинетов",
    room_filter_search_description:
      "Введите номер или название кабинета, чтобы быстро перейти к нему.",
    room_filter_search_placeholder: "Например: 214, музей, Кабинет 101",
    room_filter_clear_search: "Очистить поиск",
    room_filter_search_empty:
      "Начните вводить номер или название кабинета.",
    room_filter_search_no_results: "По вашему запросу ничего не найдено.",
    room_type_laboratory: "Лаборатория",
    room_type_classroom: "Учебный кабинет",
    room_type_lecture: "Лекционная аудитория",
    room_type_office: "Офис / кабинет",
    room_type_museum: "Музей",
    room_type_other: "Другое",
    tooltip_badge: "Подсказка",
    panorama_badge_default: "Панорама",
    panorama_badge_sphere: "Сферический обзор",
    panorama_badge_cylinder: "Панорамный обзор",
    hover_hint: "Наведи курсор на объект!",
  },
  kz: {
    app_title: "TTTU Virtual Tour",
    app_subtitle: "Ғимараттар, қабаттар және кабинеттер бойынша навигация",
    header_search: "Іздеу",
    header_filter: "Сүзгі",
    header_filter_open: "Сүзгіні ашу",
    header_filter_close: "Сүзгіні жабу",
    header_language: "Тіл",
    info_navigation: "Навигация",
    common_back: "Артқа",
    common_close: "Жабу",
    common_object: "Нысан",
    common_hint: "Кеңес",
    common_search: "Іздеу",
    common_filter: "Сүзгі",
    common_all: "Барлығы",
    common_clear_all: "Барлығын өшіру",
    common_next: "Келесі",
    common_previous: "Артқа",
    common_to_start: "Басына",
    room_filter_title: "Кабинеттерді белгілеу",
    room_filter_subtitle:
      "Сахнада ерекшеленуі керек бөлме түрлерін таңдаңыз.",
    room_filter_active: "Белсенді қабаттар",
    room_filter_legend:
      "Кабинет түсі таңдалған бөлме түріне сәйкес келеді.",
    room_filter_visible: "Сахнада көрсетіледі",
    room_filter_search_title: "Кабинеттерді іздеу",
    room_filter_search_description:
      "Кабинетке тез өту үшін оның нөмірін немесе атауын енгізіңіз.",
    room_filter_search_placeholder: "Мысалы: 214, музей, 101 кабинет",
    room_filter_clear_search: "Іздеуді тазалау",
    room_filter_search_empty: "Кабинет нөмірін немесе атауын жаза бастаңыз.",
    room_filter_search_no_results: "Сұрауыңыз бойынша ештеңе табылмады.",
    room_type_laboratory: "Зертхана",
    room_type_classroom: "Оқу кабинеті",
    room_type_lecture: "Дәріс аудиториясы",
    room_type_office: "Офис / кабинет",
    room_type_museum: "Музей",
    room_type_other: "Басқа",
    tooltip_badge: "Кеңес",
    panorama_badge_default: "Панорама",
    panorama_badge_sphere: "Сфералық көрініс",
    panorama_badge_cylinder: "Панорамалық көрініс",
    hover_hint: "Нысанның үстіне курсорды апарыңыз!",
  },
  en: {
    app_title: "TTTU Virtual Tour",
    app_subtitle: "Navigation across buildings, floors, and rooms",
    header_search: "Search",
    header_filter: "Filter",
    header_filter_open: "Show filters",
    header_filter_close: "Hide filters",
    header_language: "Language",
    info_navigation: "Navigation",
    common_back: "Back",
    common_close: "Close",
    common_object: "Object",
    common_hint: "Hint",
    common_search: "Search",
    common_filter: "Filter",
    common_all: "All",
    common_clear_all: "Clear all",
    common_next: "Next",
    common_previous: "Back",
    common_to_start: "To start",
    room_filter_title: "Room highlighting",
    room_filter_subtitle:
      "Choose which room types should stay highlighted on the scene.",
    room_filter_active: "Active layers",
    room_filter_legend: "Room color matches the selected room type.",
    room_filter_visible: "Visible on the scene",
    room_filter_search_title: "Room search",
    room_filter_search_description:
      "Type a room number or name to jump to it quickly.",
    room_filter_search_placeholder: "For example: 214, museum, Room 101",
    room_filter_clear_search: "Clear search",
    room_filter_search_empty: "Start typing a room number or name.",
    room_filter_search_no_results: "No rooms matched your query.",
    room_type_laboratory: "Laboratory",
    room_type_classroom: "Classroom",
    room_type_lecture: "Lecture room",
    room_type_office: "Office / room",
    room_type_museum: "Museum",
    room_type_other: "Other",
    tooltip_badge: "Hint",
    panorama_badge_default: "Panorama",
    panorama_badge_sphere: "Spherical view",
    panorama_badge_cylinder: "Panoramic view",
    hover_hint: "Hover over an object!",
  },
};

const roomTypeKeyById = {
  laboratory: "room_type_laboratory",
  classroom: "room_type_classroom",
  lecture: "room_type_lecture",
  office: "room_type_office",
  museum: "room_type_museum",
  other: "room_type_other",
};

const listeners = new Set();

let currentLanguage = "ru";
try {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && dictionaries[saved]) currentLanguage = saved;
} catch (error) {
  void error;
}

const exactValueTranslations = {
  "Главный корпус TTTU": {
    kz: "TTTU Бас ғимараты",
    en: "TTTU Main Building",
  },
  "Новый корпус TTTU": {
    kz: "TTTU Жаңа ғимараты",
    en: "TTTU New Building",
  },
  "Общежитие TTTU": {
    kz: "TTTU Жатақханасы",
    en: "TTTU Dormitory",
  },
  "Главный корпус унивреситета, 4 этажа": {
    kz: "Университеттің бас ғимараты, 4 қабат",
    en: "Main university building, 4 floors",
  },
  "Новый корпус университета и колледжа, 4 этажа": {
    kz: "Университет пен колледждің жаңа ғимараты, 4 қабат",
    en: "New university and college building, 4 floors",
  },
  "Здание общежития, 4 этажа": {
    kz: "Жатақхана ғимараты, 4 қабат",
    en: "Dormitory building, 4 floors",
  },
  "Холл и кабинеты": {
    kz: "Холл мен кабинеттер",
    en: "Hall and rooms",
  },
  "Кафедра М": {
    kz: "М кафедрасы",
    en: "Department M",
  },
  "Кафедра": {
    kz: "Кафедра",
    en: "Department",
  },
  "Лаборатория": {
    kz: "Зертхана",
    en: "Laboratory",
  },
  "Музей университета": {
    kz: "Университет музейі",
    en: "University Museum",
  },
  "Кабинет Инклюзивного образования": {
    kz: "Инклюзивті білім беру кабинеті",
    en: "Inclusive Education Room",
  },
  "Вход в музей университета": {
    kz: "Университет музейіне кіреберіс",
    en: "University Museum Entrance",
  },
  "Холл 2 этажа": {
    kz: "2-қабат холлы",
    en: "2nd Floor Hall",
  },
  "Основная панорама": {
    kz: "Негізгі панорама",
    en: "Main panorama",
  },
  "Вторая панорама": {
    kz: "Екінші панорама",
    en: "Second panorama",
  },
  "Далее": {
    kz: "Келесі",
    en: "Next",
  },
  "Назад": {
    kz: "Артқа",
    en: "Back",
  },
  "К началу": {
    kz: "Басына",
    en: "To start",
  },
};

export function getLanguage() {
  return currentLanguage;
}

export function t(key) {
  return (
    dictionaries[currentLanguage]?.[key] ||
    dictionaries.ru[key] ||
    key
  );
}

export function setLanguage(nextLanguage) {
  if (!dictionaries[nextLanguage] || nextLanguage === currentLanguage) return;

  currentLanguage = nextLanguage;

  try {
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
  } catch (error) {
    void error;
  }

  listeners.forEach((listener) => listener(currentLanguage));
}

export function subscribeLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRoomTypeLabel(type) {
  return t(roomTypeKeyById[type] || roomTypeKeyById.other);
}

export function getLocalizedField(entity, field, fallback = "") {
  if (!entity || typeof entity !== "object") {
    return localizeDataValue(fallback || "");
  }

  const lang = getLanguage();

  if (entity.i18n?.[lang]?.[field]) return entity.i18n[lang][field];
  if (entity[`${field}_${lang}`]) return entity[`${field}_${lang}`];

  const baseValue = entity[field] ?? fallback ?? "";
  return localizeDataValue(baseValue, lang);
}

export function localizeDataValue(value, language = getLanguage()) {
  if (!value || language === "ru") return value || "";

  const exactMatch = exactValueTranslations[value];
  if (exactMatch?.[language]) return exactMatch[language];

  const floorMatch = /^Этаж\s+(\d+)$/i.exec(value);
  if (floorMatch) {
    return language === "kz"
      ? `${floorMatch[1]}-қабат`
      : `Floor ${floorMatch[1]}`;
  }

  const roomMatch = /^Кабинет\s+(.+)$/i.exec(value);
  if (roomMatch) {
    return language === "kz"
      ? `${roomMatch[1]} кабинет`
      : `Room ${roomMatch[1]}`;
  }

  const hallMatch = /^Холл\s+(\d+)\s+этажа$/i.exec(value);
  if (hallMatch) {
    return language === "kz"
      ? `${hallMatch[1]}-қабат холлы`
      : `Floor ${hallMatch[1]} Hall`;
  }

  return value;
}
