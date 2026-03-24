# VirtualTursNodeJS

Веб-приложение виртуального тура на `Three.js` + `Vite`.

Проект загружает 3D-модель кампуса, строит навигацию по корпусам, этажам и кабинетам, показывает панорамы помещений и поддерживает отладочные консольные команды.

## Возможности

- 3D-навигация по кампусу и корпусам
- переход по этажам и кабинетам
- панорамы помещений
- фильтрация и поиск кабинетов
- экран загрузки сцены
- debug-команды в консоли браузера
- поддержка `Draco`-сжатых `.glb`
- базовые проверки структуры `data/structure.json`

## Стек

- `vite`
- `three`
- `gsap`
- `lil-gui`
- `photo-sphere-viewer`

## Требования

- `Node.js` 18+  
  Рекомендуется `Node.js` 20+
- `npm`

## Установка

```bash
npm install
```

## Запуск проекта

Режим разработки:

```bash
npm run dev
```

По умолчанию Vite поднимает сервер на:

```text
http://localhost:5173
```

Сервер также доступен по локальной сети, потому что в [vite.config.js](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/vite.config.js) указан `host: '0.0.0.0'`.

## Сборка

Production build:

```bash
npm run build
```

Предпросмотр production-сборки:

```bash
npm run preview
```

## Тесты

Запуск unit/data тестов:

```bash
npm test
```

Полный прогон: сборка + тесты:

```bash
npm run test:all
```

Проверка только структуры JSON:

```bash
npm run test:data
```

Показ найденных тестов:

```bash
npm run test:list
```

Watch-режим раннера:

```bash
npm run test:watch
```

## Структура проекта

```text
core/      движковая логика
ui/        интерфейс и overlay-компоненты
data/      конфигурация зданий, этажей, комнат
models/    3D-модели .glb
panos/     панорамы помещений
public/    статические ассеты, включая Draco decoder
scripts/   служебные скрипты
Test/      тесты и reference-файлы
main.js    точка входа приложения
```

## Основные файлы

- [src/main.js](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/src/main.js)  
  Основной orchestration-файл: инициализация сцены, загрузка модели, навигация, фильтры, рендер-цикл.

- [data/structure.json](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/data/structure.json)  
  Главный конфиг корпусов, этажей, комнат и панорам.

- [src/core/DataManager.js](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/src/core/DataManager.js)  
  Нормализация и чтение структуры данных.

- [src/core/HitboxManager.js](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/src/core/HitboxManager.js)  
  Хитбоксы зданий, этажей и комнат.

- [src/core/DebugConsole.js](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/src/core/DebugConsole.js)  
  Консольные debug-команды.

- [src/ui/PanoramaOverlay.js](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/src/ui/PanoramaOverlay.js)  
  Просмотр панорам.

- [src/ui/LoadingOverlay.js](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/src/ui/LoadingOverlay.js)  
  Экран загрузки сцены.

## Формат данных

Проект ожидает основной JSON в формате:

```json
{
  "buildings": {
    "main": {
      "name": "Главный корпус",
      "meshName": "MainBuilding_Group",
      "floors": [
        {
          "meshName": "Hfloor1",
          "name": "Этаж 1",
          "rooms": [
            {
              "meshName": "kabinet1",
              "name": "Кабинет 101",
              "type": "office",
              "panoramas": [
                {
                  "id": "p1",
                  "url": "/panos/testcabinet.jpg"
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

Поддерживаемые уровни:

- `buildings`
- `floors`
- `rooms`
- `panoramas`
- `hotspots`

## Draco-сжатые модели

Проект поддерживает `.glb`, сжатые через `Draco`.

Для этого подключены:

- `DRACOLoader`
- декодеры в [public/draco/gltf](/c:/Document/GitHubProject/tttu.edu.kz/VirtualTursNodeJS/public/draco/gltf)

Если модель сжата через Draco, она должна загружаться без дополнительной настройки.

## Debug-команды

В консоли браузера доступны:

```js
Hitbox.enable()
Hitbox.disable()

FPS.enable()
FPS.disable()

Camera.setFactor({
  overviewFactor: 0.6,
  buildingFactor: 0.7,
  floorFactor: 0.5
})

Performance.status()
Performance.adaptiveOn()
Performance.adaptiveOff()
Performance.pixelRatio(0.8)

Debug.status()
```

## Важные замечания

- Главная модель может быть очень большой, поэтому старт проекта сильно зависит от веса `.glb`.
- Для веба лучше использовать:
  - Draco/Meshopt-сжатие
  - разбивку модели на несколько файлов
  - lazy loading по корпусам
  - оптимизированные текстуры

## Разработка

Если меняешь структуру JSON, желательно сразу прогонять:

```bash
npm run test:data
```

Если меняешь загрузку сцены, рендер или UI:

```bash
npm run test:all
```

## Лицензия

`ISC`

