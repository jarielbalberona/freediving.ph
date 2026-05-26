const EventEmitter = require("node:events");
const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const originalEmit = EventEmitter.prototype.emit;

EventEmitter.prototype.emit = function emit(eventName, payload, ...args) {
  if (
    eventName === "change" &&
    payload &&
    Array.isArray(payload.eventsQueue) &&
    !payload.changes
  ) {
    const changes = {
      addedFiles: new Map(),
      modifiedFiles: new Map(),
      removedFiles: new Map(),
    };

    for (const event of payload.eventsQueue) {
      if (!event?.filePath) continue;

      const canonicalPath = path.isAbsolute(event.filePath)
        ? event.filePath.slice(path.parse(event.filePath).root.length)
        : event.filePath;
      const metadata = event.metadata ?? {};

      if (event.type === "add") {
        changes.addedFiles.set(canonicalPath, metadata);
      } else if (event.type === "delete" || event.type === "remove") {
        changes.removedFiles.set(canonicalPath, metadata);
      } else {
        changes.modifiedFiles.set(canonicalPath, metadata);
      }
    }

    return originalEmit.call(
      this,
      eventName,
      {
        ...payload,
        changes,
        rootDir: path.parse(process.cwd()).root,
      },
      ...args,
    );
  }

  return originalEmit.call(this, eventName, payload, ...args);
};

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./src/global.css",
});
