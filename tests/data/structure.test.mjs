import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const STRUCTURE_PATH = resolve(process.cwd(), "data", "structure.json");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validatePanorama(panorama, contextLabel) {
  assert.equal(
    typeof panorama,
    "object",
    `${contextLabel}: panorama entry must be an object`
  );
  assert.ok(
    isNonEmptyString(panorama.id),
    `${contextLabel}: panorama.id is required`
  );
  assert.ok(
    isNonEmptyString(panorama.url),
    `${contextLabel}: panorama.url is required`
  );

  if (panorama.hotspots !== undefined) {
    assert.ok(
      Array.isArray(panorama.hotspots),
      `${contextLabel}: panorama.hotspots must be an array`
    );

    panorama.hotspots.forEach((hotspot, hotspotIndex) => {
      const hotspotLabel = `${contextLabel}: hotspot #${hotspotIndex + 1}`;
      assert.equal(
        typeof hotspot,
        "object",
        `${hotspotLabel} must be an object`
      );
      assert.ok(
        isNonEmptyString(hotspot.to),
        `${hotspotLabel}: hotspot.to is required`
      );
      assert.equal(
        typeof hotspot.u,
        "number",
        `${hotspotLabel}: hotspot.u must be a number`
      );
      assert.equal(
        typeof hotspot.v,
        "number",
        `${hotspotLabel}: hotspot.v must be a number`
      );
    });
  }
}

export async function run() {
  const raw = await readFile(STRUCTURE_PATH, "utf8");
  const data = JSON.parse(raw);

  assert.equal(typeof data, "object", "structure.json root must be an object");
  assert.ok(data, "structure.json root must be defined");
  assert.ok(data.buildings, "structure.json must contain a buildings object");
  assert.equal(
    typeof data.buildings,
    "object",
    "structure.json buildings must be an object map"
  );

  const buildingEntries = Object.entries(data.buildings);
  assert.ok(buildingEntries.length > 0, "structure.json must contain at least one building");

  for (const [buildingKey, building] of buildingEntries) {
    const buildingLabel = `building "${buildingKey}"`;

    assert.equal(typeof building, "object", `${buildingLabel} must be an object`);
    assert.ok(isNonEmptyString(building.name), `${buildingLabel} must have a name`);
    assert.ok(
      isNonEmptyString(building.meshName),
      `${buildingLabel} must have a meshName`
    );
    assert.ok(
      Array.isArray(building.floors),
      `${buildingLabel} must contain floors array`
    );

    if (building.supportiveMeshes !== undefined) {
      assert.ok(
        Array.isArray(building.supportiveMeshes),
        `${buildingLabel}: supportiveMeshes must be an array`
      );
    }

    building.floors.forEach((floor, floorIndex) => {
      const floorLabel = `${buildingLabel}, floor #${floorIndex + 1}`;
      assert.equal(typeof floor, "object", `${floorLabel} must be an object`);
      assert.ok(
        isNonEmptyString(floor.meshName),
        `${floorLabel} must have a meshName`
      );
      assert.ok(isNonEmptyString(floor.name), `${floorLabel} must have a name`);
      assert.ok(Array.isArray(floor.rooms), `${floorLabel} rooms must be an array`);

      if (floor.displayMeshes !== undefined) {
        assert.ok(
          Array.isArray(floor.displayMeshes),
          `${floorLabel}: displayMeshes must be an array`
        );
      }

      floor.rooms.forEach((room, roomIndex) => {
        const roomLabel = `${floorLabel}, room #${roomIndex + 1}`;
        assert.equal(typeof room, "object", `${roomLabel} must be an object`);
        assert.ok(
          isNonEmptyString(room.meshName),
          `${roomLabel} must have a meshName`
        );
        assert.ok(isNonEmptyString(room.name), `${roomLabel} must have a name`);

        if (room.panoramas !== undefined) {
          assert.ok(
            Array.isArray(room.panoramas),
            `${roomLabel}: panoramas must be an array`
          );
          room.panoramas.forEach((panorama, panoramaIndex) => {
            validatePanorama(
              panorama,
              `${roomLabel}, panorama #${panoramaIndex + 1}`
            );
          });
        }
      });
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await run();
}
