// FIRST-PARTY PROPOSAL. Default scope cwd only; explicit rootDir is unsupported.
// This material compatibility contract requires review before adoption.
const fs = require("node:fs");
const path = require("node:path");
function getRootDirs(context) {
  if (context.settings?.next?.rootDir !== undefined) {
    throw new TypeError(
      "The scoped Next reference accepts only default cwd roots; omit settings.next.rootDir and run checks from the scope directory.",
    );
  }
  if (typeof context.cwd !== "string" || !path.isAbsolute(context.cwd)) {
    throw new TypeError(
      "The scoped Next reference requires an absolute cwd directory.",
    );
  }
  if (!fs.statSync(context.cwd).isDirectory()) {
    throw new TypeError(
      "The scoped Next reference requires cwd to be a directory.",
    );
  }
  return [context.cwd];
}
module.exports = { getRootDirs };
