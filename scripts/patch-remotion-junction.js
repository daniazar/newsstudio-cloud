/**
 * scripts/patch-remotion-junction.js
 *
 * Automatically patches @remotion/bundler to use directory junctions on Windows
 * instead of recursively copying gigabytes of files from the public/ directory.
 */

const fs = require("fs");
const path = require("path");

const bundleJsPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@remotion",
  "bundler",
  "dist",
  "bundle.js"
);

// Only relevant on Windows; Linux and macOS already support native symlinks
if (process.platform !== "win32") {
  process.exit(0);
}

if (!fs.existsSync(bundleJsPath)) {
  process.exit(0);
}

try {
  let content = fs.readFileSync(bundleJsPath, "utf8");

  if (content.includes("'junction'")) {
    console.log("[Patch Remotion] Windows junction patch is already active.");
    process.exit(0);
  }

  const target = "if (actualArgs.symlinkPublicDir && process.platform !== 'win32') {";
  const replacement = `if (actualArgs.symlinkPublicDir) {
            try {
                if (process.platform === 'win32') {
                    await node_fs_1.default.promises.symlink(from, to, 'junction');
                } else {
                    await node_fs_1.default.promises.symlink(from, to);
                }
            } catch (_err) {
                await (0, copy_dir_1.copyDir)({
                    src: from,
                    dest: to,
                    onSymlinkDetected: showSymlinkWarning,
                    onProgress: (prog) => {
                        var _a;
                        return (_a = options.onPublicDirCopyProgress) === null || _a === void 0 ? void 0 : _a.call(options, prog);
                    },
                    copiedBytes: 0,
                    lastReportedProgress: 0,
                });
            }
        }
        else if (false) {`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(bundleJsPath, content, "utf8");
    console.log("[Patch Remotion] Successfully enabled Windows directory junctions for @remotion/bundler.");
  }
} catch (err) {
  console.warn("[Patch Remotion] Warning patching bundle.js:", err.message);
}
