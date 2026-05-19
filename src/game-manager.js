const { app, shell } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const AdmZip = require("adm-zip");
const crypto = require("crypto");
const { spawn, execFile } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const CATALOG_SOURCES = [
  "https://raw.githubusercontent.com/LiteLDev/minecraft-windows-gdk-version-db/refs/heads/main/historical_versions.json",
  "https://raw.gitcode.com/dreamguxiang/minecraft-windows-gdk-version-db/raw/main/historical_versions.json",
  "https://raw.githubusercontent.com/LukasPAH/minecraft-windows-gdk-version-db/main/historical_versions.json",
  "https://raw.githubusercontent.com/MinecraftBedrockArchiver/GdkLinks/refs/heads/master/urls.json",
  "https://raw.githubusercontent.com/MinecraftBedrockArchiver/GdkLinks/refs/heads/master/urls.min.json",
  "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/versions.json",
  "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/versions.min.json",
  "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/release/versions.json",
  "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/release/versions.min.json",
  "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/preview/versions.json",
  "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/preview/versions.min.json",
  "https://raw.githubusercontent.com/ddf8196/mc-w10-versiondb-auto-update/refs/heads/master/versions.json.min",
  "https://raw.githubusercontent.com/Kuro7s/mc-w10-versiondb-auto-update/refs/heads/master/versions.json.min",
  "https://raw.githubusercontent.com/MCMrARM/mc-w10-versiondb/refs/heads/master/versions.txt",
  "https://raw.githubusercontent.com/MCMrARM/mc-w10-versiondb/refs/heads/master/versions.json.min",
  "https://github.bibk.top/MinecraftBedrockArchiver/GdkLinks/raw/refs/heads/master/urls.json",
  "https://github.bibk.top/LiteLDev/minecraft-windows-gdk-version-db/raw/refs/heads/main/historical_versions.json",
  "https://github.bibk.top/reversedcodes/minecraft-bedrock-meta-database/raw/refs/heads/main/bedrock/client/versions.json",
  "https://github.bibk.top/reversedcodes/minecraft-bedrock-meta-database/raw/refs/heads/main/bedrock/client/versions.min.json"
];

const USER_AGENT = "Falon-Version-Manager/3.0";
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB safety cap
const VERSION_PROBE_TIMEOUT_MS = 9000;
const WU_VERSION_PROBE_TIMEOUT_MS = 45000;
const VERSION_PROBE_CONCURRENCY = 100;
const VERSION_VALIDATION_POLICY = "falon-uwp-resolve-on-demand-v8";
const NOC_NATIVE_DIR = __dirname.includes("app.asar")
  ? path.join(__dirname.replace("app.asar", "app.asar.unpacked"), "native")
  : path.join(__dirname, "native");
// NocVersion/LeviLauncher is kept only as a hidden MSIXVC extractor for GDK packages.
// Legacy UWP catalog/link recovery/download MUST use the dedicated CLI helper below.
const NOC_NATIVE_HELPER = path.join(NOC_NATIVE_DIR, "LeviLauncher.exe");
const LEGACY_UWP_HELPER = path.join(NOC_NATIVE_DIR, "FalonLegacyUwpHelper.exe");
const NOC_VCRUNTIME_DLL = path.join(NOC_NATIVE_DIR, "vcruntime140_1.dll");
const STRICT_PACKAGE_MIN_BYTES = 20 * 1024 * 1024;
const DOWNLOAD_RETRY_LIMIT = 3;
const DOWNLOAD_THROTTLE_MS = 180;
const GDK_LAYOUT_REVISION = 2;
const LAUNCH_WINDOW_WAIT_MS = 18000;
const LAUNCH_ACTIVATION_WAIT_MS = 45000;
const LAUNCH_TOTAL_TIMEOUT_MS = 120000;
const LAUNCH_APPX_OP_TIMEOUT_MS = 90000;
const LAUNCH_WINDOW_POLL_MS = 450;
const LOOSE_UWP_RUNTIME_FILES = Object.freeze([
  // Visual C++ UWP framework DLLs that loose/extracted Minecraft.Windows.exe
  // resolves through Microsoft.VCLibs when launched as a registered Store app.
  // When Falon starts an extracted EXE directly, these files must sit next to it.
  "CONCRT140_APP.dll",
  "MSVCP140_APP.dll",
  "VCRUNTIME140_APP.dll",
  "VCRUNTIME140_1_APP.dll",
  "vccorlib140_app.dll"
]);
// The loose/extracted Legacy UWP exe does not get framework DLL resolution the same
// way a Store-activated package does. Falon repairs this locally before direct launch.
const LOOSE_UWP_RUNTIME_ARCHIVE_URLS = Object.freeze([
  "https://aka.ms/Microsoft.VCLibs.x64.14.00.appx"
]);
const TEMPORARY_LICENSE_MAX_VISIBLE_GAME_WINDOWS = 4;

let catalogCache = null;
let activeLaunchTask = null;
let catalogCacheAt = 0;
let legacyBrokenVersionSet = null;

function auditVersionVariants(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const out = new Set([raw.toLowerCase()]);
  const stripped = raw.replace(/^(legacy(?:\s+preview|\s+beta)?|release|preview)\s+/i, "").trim();
  if (stripped) out.add(stripped.toLowerCase());
  return [...out];
}

function loadLegacyBrokenVersionSet() {
  if (legacyBrokenVersionSet) return legacyBrokenVersionSet;
  const set = new Set();
  try {
    const auditPath = path.join(app.getAppPath(), "LEGACY_UWP_AUDIT.jsonl");
    if (fs.existsSync(auditPath)) {
      const lines = fs.readFileSync(auditPath, "utf8").split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const row = JSON.parse(line);
          if (row?.ok === false || row?.hardInvalid === true) {
            for (const key of auditVersionVariants(row.short || row.version || "")) set.add(key);
          }
        } catch {}
      }
    }
  } catch {}
  legacyBrokenVersionSet = set;
  return legacyBrokenVersionSet;
}

function isKnownBrokenLegacyVersion(item) {
  if (!item) return false;
  const set = loadLegacyBrokenVersionSet();
  if (!set.size) return false;
  if (String(item.bucket || "").toLowerCase() !== "legacy") return false;
  const candidates = [item.version, item.short, item.name];
  return candidates.some((value) => auditVersionVariants(value).some((key) => set.has(key)));
}

function getGameBaseDir() {
  return path.join(app.getPath("userData"), "bedrock-manager");
}

function getVersionsDir() {
  return path.join(getGameBaseDir(), "versions");
}

function getInstallersDir() {
  return path.join(getGameBaseDir(), "installers");
}

function getRuntimeCacheDir() {
  return path.join(getGameBaseDir(), "runtime-cache");
}

function getLaunchStatePath() {
  return path.join(getGameBaseDir(), "launch-state.json");
}

function readLaunchState() {
  return readJsonSafe(getLaunchStatePath()) || {};
}

function writeLaunchState(state) {
  writeJsonPretty(getLaunchStatePath(), state && typeof state === "object" ? state : {});
}

function legacyLaunchSlot(isPreview = false) {
  return isPreview ? "preview" : "release";
}

function getLegacyRegistrationSnapshot(meta, isPreview = false) {
  const state = readLaunchState();
  const record = state?.legacyRegistration?.[legacyLaunchSlot(isPreview)] || null;
  if (!record || !meta) return null;
  const folder = path.resolve(String(meta.folder || "").trim() || ".");
  const recordedFolder = path.resolve(String(record.folder || "").trim() || ".");
  if (!folder || !recordedFolder || folder !== recordedFolder) return null;
  const manifest = findExtractedLegacyManifest(folder);
  if (!manifest || !fs.existsSync(manifest)) return null;
  try {
    const stat = fs.statSync(manifest);
    const recordedMtime = Number(record.manifestMtimeMs || 0);
    if (recordedMtime && Math.abs(Number(stat.mtimeMs || 0) - recordedMtime) > 1) return null;
  } catch {
    return null;
  }
  return record;
}

function rememberLegacyRegistration(meta, isPreview = false) {
  const folder = path.resolve(String(meta?.folder || "").trim() || ".");
  const manifest = findExtractedLegacyManifest(folder);
  if (!folder || !manifest || !fs.existsSync(manifest)) return;
  let manifestMtimeMs = 0;
  try { manifestMtimeMs = Number(fs.statSync(manifest).mtimeMs || 0); } catch {}
  const state = readLaunchState();
  const legacyRegistration = state.legacyRegistration && typeof state.legacyRegistration === "object"
    ? { ...state.legacyRegistration }
    : {};
  legacyRegistration[legacyLaunchSlot(isPreview)] = {
    folder,
    manifest,
    manifestMtimeMs,
    version: String(meta?.version || meta?.short || ""),
    registeredAt: new Date().toISOString()
  };
  writeLaunchState({ ...state, legacyRegistration });
}

function clearRememberedLegacyRegistration(folder = "") {
  const state = readLaunchState();
  const current = state.legacyRegistration && typeof state.legacyRegistration === "object"
    ? { ...state.legacyRegistration }
    : {};
  const target = String(folder || "").trim() ? path.resolve(String(folder || "").trim()) : "";
  let changed = false;
  for (const [slot, record] of Object.entries(current)) {
    const recordFolder = String(record?.folder || "").trim() ? path.resolve(String(record.folder || "").trim()) : "";
    if (!target || (recordFolder && recordFolder === target)) {
      delete current[slot];
      changed = true;
    }
  }
  if (changed) writeLaunchState({ ...state, legacyRegistration: current });
}

function getValidationCachePath() {
  return path.join(getGameBaseDir(), "version-download-validation.json");
}

function getVersionArchivePath() {
  return path.join(getGameBaseDir(), "version-download-archive.json");
}

function defaultVersionArchive() {
  return {
    policy: VERSION_VALIDATION_POLICY,
    updatedAt: new Date().toISOString(),
    total: 0,
    items: {}
  };
}

function readVersionArchive() {
  const archive = readJsonSafe(getVersionArchivePath());
  if (!archive || typeof archive !== "object") return defaultVersionArchive();
  return {
    policy: String(archive.policy || VERSION_VALIDATION_POLICY),
    updatedAt: String(archive.updatedAt || new Date().toISOString()),
    total: Number(archive.total || 0),
    items: archive.items && typeof archive.items === "object" ? archive.items : {}
  };
}

function normalizeVersionArchive(archive) {
  const output = archive && typeof archive === "object" ? archive : defaultVersionArchive();
  output.policy = VERSION_VALIDATION_POLICY;
  output.items = output.items && typeof output.items === "object" ? output.items : {};
  output.updatedAt = new Date().toISOString();
  output.total = Object.keys(output.items).length;
  return output;
}

function writeVersionArchive(archive) {
  writeJsonPretty(getVersionArchivePath(), normalizeVersionArchive(archive));
}

function archivedVersionSnapshot(item, bucket, reason = "unavailable") {
  const version = item || {};
  return {
    version: String(version.version || version.short || ""),
    short: String(version.short || version.version || ""),
    bucket: String(bucket || ""),
    package: String(version.package || ""),
    type: String(version.type || ""),
    releaseType: String(version.releaseType || ""),
    fileName: String(version.fileName || ""),
    source: String(version.source || ""),
    metadataUrl: String(version.metadataUrl || ""),
    urls: Array.isArray(version.urls) ? [...new Set(version.urls.map(url => String(url || "").trim()).filter(Boolean))] : [],
    reason: String(reason || "unavailable"),
    archivedAt: new Date().toISOString()
  };
}

function archiveVersionUnavailable(item, bucket, reason = "unavailable") {
  const archive = readVersionArchive();
  const key = versionValidationKey(bucket, item);
  archive.items[key] = archivedVersionSnapshot(item, bucket, reason);
  writeVersionArchive(archive);
  return key;
}

function restoreArchivedVersionByKey(key) {
  const cleanKey = String(key || "").trim();
  if (!cleanKey) return false;
  const archive = readVersionArchive();
  if (!archive.items?.[cleanKey]) return false;
  delete archive.items[cleanKey];
  writeVersionArchive(archive);
  return true;
}

function readVersionValidationCache() {
  try {
    if (!app || typeof app.getPath !== "function") return null;
    return readJsonSafe(getValidationCachePath()) || null;
  } catch {
    return null;
  }
}

function writeVersionValidationCache(data) {
  writeJsonPretty(getValidationCachePath(), data);
}

function hasCompletedVersionValidation() {
  const cache = readVersionValidationCache();
  return !!(
    cache &&
    cache.policy === VERSION_VALIDATION_POLICY &&
    cache.completed === true &&
    cache.items &&
    typeof cache.items === "object"
  );
}

function versionValidationKey(bucket, item) {
  const version = String(item?.version || item?.short || "").trim().toLowerCase();
  const firstUrl = String(Array.isArray(item?.urls) ? item.urls[0] || "" : "").trim().toLowerCase();
  return `${bucket}|${version}|${firstUrl}`;
}

function flatCatalogItems(catalog) {
  const groups = [
    ["releaseVersions", "release"],
    ["previewVersions", "preview"],
    ["legacyUwpVersions", "legacy"]
  ];
  return groups.flatMap(([key, bucket]) => (Array.isArray(catalog?.[key]) ? catalog[key] : []).map(item => ({ key, bucket, item })));
}

function applyVersionValidationCache(catalog, cache = readVersionValidationCache(), archive = readVersionArchive()) {
  if (!catalog) return catalog;
  const cacheItems = cache && cache.policy === VERSION_VALIDATION_POLICY && cache.items && typeof cache.items === "object"
    ? cache.items
    : {};
  const archivedItems = archive && archive.items && typeof archive.items === "object"
    ? archive.items
    : {};
  const filterGroup = (key, bucket) => (Array.isArray(catalog[key]) ? catalog[key] : [])
    .filter((item) => {
      const validationKey = versionValidationKey(bucket, item);
      if (archivedItems[validationKey]) return false;
      const record = cacheItems[validationKey];
      return record?.hardInvalid !== true;
    })
    .map((item) => {
      const record = cacheItems[versionValidationKey(bucket, item)];
      const usableUrls = Array.isArray(record?.usableUrls)
        ? [...new Set(record.usableUrls.map(url => String(url || "").trim()).filter(Boolean))]
        : [];
      if (!usableUrls.length || record?.valid !== true) return item;
      return {
        ...item,
        urls: usableUrls,
        downloadable: true,
        validatedDownloadLinks: true,
        validationReason: String(record.reason || "validated")
      };
    });
  return {
    ...catalog,
    releaseVersions: filterGroup("releaseVersions", "release"),
    previewVersions: filterGroup("previewVersions", "preview"),
    legacyUwpVersions: filterGroup("legacyUwpVersions", "legacy")
  };
}

function isTransientLinkcheckReason(reason) {
  const lower = String(reason || "").toLowerCase();
  return !lower || lower.includes("timeout") || lower.includes("deadline") || lower.includes("econn") || lower.includes("socket") || lower.includes("tls") || lower.includes("certificate") || lower.includes("proxy") || lower.includes("network") || lower.includes("temporary") || lower.includes("try again") || lower.includes("context canceled");
}

function nativeLinkCheckPassed(row) {
  return row?.ok === true || row?.valid === true;
}

function nativeLinkCheckStatusCode(row) {
  const direct = Number(row?.statusCode || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const text = String(row?.status || "").trim();
  const match = text.match(/\b(\d{3})\b/);
  return match ? Number(match[1]) : 0;
}

function nativeLiveCandidateUrls(results, originalUrls = []) {
  if (!Array.isArray(results) || !results.length) return [];
  const seen = new Set();
  const output = [];
  results.forEach((row, index) => {
    if (!nativeLinkCheckPassed(row)) return;
    const raw = String(row?.input || originalUrls[index] || "").trim();
    if (!raw || seen.has(raw)) return;
    seen.add(raw);
    output.push(raw);
  });
  return output;
}

function nativeLinkcheckHardInvalid(results) {
  if (!Array.isArray(results) || !results.length) return false;
  return results.every((r) => {
    if (nativeLinkCheckPassed(r)) return false;
    const input = String(r?.input || "").trim().toLowerCase();
    const status = nativeLinkCheckStatusCode(r);
    const reason = String(r?.error || r?.reason || "");

    // WU-ссылки живут через резолв Microsoft Update. Ошибка резолва означает
    // «не удалось подтвердить сейчас», а не «версии больше не существует».
    // Из-за этого старый код ошибочно архивировал весь Legacy UWP каталог.
    if (input.startsWith("wu://")) return false;
    if (/err_wu|windows update|wu-resolve|package_url/i.test(reason)) return false;

    if ([404, 410].includes(status)) return true;
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) return true;
    return /not a downloadable package|not.*package|html|xml|json|too small|blockmap|signature|link.*not.*found|working links? are not found/i.test(reason) && !isTransientLinkcheckReason(reason);
  });
}

function nativeLinkcheckShouldArchive(results) {
  if (!Array.isArray(results) || !results.length) return false;
  if (results.some(nativeLinkCheckPassed)) return false;

  // Legacy UWP чаще всего приходит через wu://. Его нельзя вычищать из списка
  // только потому, что фоновая проверка WU в этот момент не смогла получить URL.
  // Архивируем лишь прямые HTTP(S)-кандидаты, которые точно умерли.
  if (results.some((row) => String(row?.input || "").trim().toLowerCase().startsWith("wu://"))) return false;
  if (results.some((row) => /err_wu|windows update|wu-resolve|package_url/i.test(String(row?.error || row?.reason || "")))) return false;

  if (nativeLinkcheckHardInvalid(results)) return true;
  return results.every((row) => {
    const status = nativeLinkCheckStatusCode(row);
    const reason = String(row?.error || row?.reason || "");
    if (isTransientLinkcheckReason(reason)) return false;
    if (status >= 500 || status === 408 || status === 429) return false;
    return /not.*found|not.*package|no.*package|empty input|response is not a downloadable package/i.test(reason);
  });
}

function markVersionDownloadBroken(version, bucket, reason = "download-failed") {
  const item = version || {};
  const isUwp = String(item?.package || "").trim().toLowerCase() === "uwp" || String(bucket || "").trim().toLowerCase() === "legacy";
  const cache = readVersionValidationCache() || {
    policy: VERSION_VALIDATION_POLICY,
    completed: false,
    checkedAt: new Date().toISOString(),
    total: 0,
    valid: 0,
    invalid: 0,
    items: {}
  };
  if (!cache.items || typeof cache.items !== "object") cache.items = {};
  cache.policy = VERSION_VALIDATION_POLICY;
  cache.checkedAt = new Date().toISOString();
  const key = versionValidationKey(bucket, item);
  cache.items[key] = {
    valid: false,
    // UWP APPX links are resolved on demand through Store/WU. A failed attempt
    // is not proof that the version disappeared, so it must never purge the catalog.
    hardInvalid: !isUwp,
    reason: String(reason || "download-failed"),
    checkedAt: new Date().toISOString(),
    version: String(item?.version || item?.short || ""),
    bucket,
    repaired: false
  };
  cache.invalid = Object.values(cache.items).filter(r => r?.hardInvalid === true).length;
  cache.valid = Object.values(cache.items).filter(r => r?.valid === true).length;
  writeVersionValidationCache(cache);
  if (!isUwp) archiveVersionUnavailable(item, bucket, reason);
  return key;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function getMetaPath(folder) {
  return path.join(folder, "falon-version.json");
}

function safeName(value, fallback = "version") {
  return String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || fallback;
}

function xmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function writeJsonPretty(file, data) {
  fs.ensureDirSync(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}


function legacyUwpHelperAvailable() {
  try { return fs.existsSync(LEGACY_UWP_HELPER); } catch { return false; }
}

function nativeHelperAvailable() {
  // Kept for existing call sites that mean "Legacy UWP network helper".
  // This deliberately DOES NOT point to LeviLauncher/NocVersion, because launching
  // that GUI application was the bug.
  return legacyUwpHelperAvailable();
}

function compactLegacyHelperError(value) {
  const text = String(value?.message || value || "").trim();
  if (!text) return "unknown legacy helper error";
  return text.length > 520 ? `${text.slice(0, 517)}...` : text;
}

function parseLegacyHelperLine(raw, onEvent) {
  const text = String(raw || "").trim();
  if (!text) return null;
  try {
    const payload = JSON.parse(text);
    onEvent?.(payload);
    return payload;
  } catch {
    return null;
  }
}

async function runFalonNativeHelper(command, request = {}, timeoutMs = 180000, win = null) {
  if (process.platform !== "win32") throw new Error("Legacy UWP helper доступен только на Windows");
  if (!legacyUwpHelperAvailable()) throw new Error(`Legacy UWP helper не найден: ${LEGACY_UWP_HELPER}`);

  return new Promise((resolve, reject) => {
    const child = spawn(LEGACY_UWP_HELPER, [String(command || "").trim()], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let settled = false;
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let finalResult = null;
    let killedByTimeout = false;

    const timer = timeoutMs > 0 ? setTimeout(() => {
      killedByTimeout = true;
      try { child.kill(); } catch {}
    }, timeoutMs) : null;

    const finish = (error, data) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve(data);
    };

    const forwardEvent = (event) => {
      if (!event || typeof event !== "object") return;
      if (event.event === "result") {
        finalResult = event;
        return;
      }
      if (event.event === "status") {
        emit(win, "game-install-status", {
          stage: String(event.stage || "legacy-helper"),
          message: String(event.message || "Legacy UWP helper"),
          helper: "legacy-uwp",
          ...event
        });
      } else if (event.event === "progress") {
        emit(win, "game-download-progress", {
          version: String(event.label || "Legacy UWP"),
          label: String(event.label || "Legacy UWP"),
          downloaded: Number(event.downloaded || 0),
          total: Number(event.total || 0),
          dest: String(event.dest || ""),
          helper: "legacy-uwp"
        });
      }
    };

    const flushStdoutLines = (isEnd = false) => {
      const chunks = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = isEnd ? "" : chunks.pop() || "";
      const lines = isEnd ? chunks.concat(stdoutBuffer ? [stdoutBuffer] : []) : chunks;
      for (const line of lines) parseLegacyHelperLine(line, forwardEvent);
    };

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdoutBuffer += String(chunk || "");
      flushStdoutLines(false);
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderrBuffer += String(chunk || "");
      if (stderrBuffer.length > 24000) stderrBuffer = stderrBuffer.slice(-24000);
    });

    child.on("error", (error) => finish(error));
    child.on("close", (code) => {
      flushStdoutLines(true);
      if (killedByTimeout) {
        finish(new Error("Legacy UWP helper timeout"));
        return;
      }
      if (code !== 0) {
        finish(new Error(compactLegacyHelperError(stderrBuffer || `Legacy UWP helper завершился с кодом ${code}`)));
        return;
      }
      if (!finalResult) {
        finish(new Error(compactLegacyHelperError(stderrBuffer || "Legacy UWP helper не вернул result")));
        return;
      }
      // The Go helper historically encoded `ok:false` with `omitempty`, which
      // meant failed result envelopes could arrive as `{ event: "result", error: "..." }`.
      // Treat any result envelope that contains `error` without an explicit `ok:true`
      // as a failure instead of passing it down as a pseudo-success object.
      if (finalResult.ok === false || (finalResult.error && finalResult.ok !== true)) {
        finish(new Error(compactLegacyHelperError(finalResult.error || stderrBuffer || "Legacy UWP helper error")));
        return;
      }
      finish(null, finalResult.data ?? finalResult);
    });

    try {
      child.stdin.end(JSON.stringify(request || {}));
    } catch (error) {
      try { child.kill(); } catch {}
      finish(error);
    }
  });
}

async function fetchNativeCatalog() {
  return runFalonNativeHelper("catalog", {}, 3 * 60 * 1000);
}

async function resolveLegacyUWPDownloadInfoNative(short, releaseType = "release", metadataUrl = "") {
  return runFalonNativeHelper("resolve", {
    short: String(short || "").trim(),
    releaseType: String(releaseType || "release").trim() || "release",
    metadataUrl: String(metadataUrl || "").trim()
  }, 3 * 60 * 1000);
}

async function resolveWindowsUpdateURLNative(rawUrl) {
  const target = String(rawUrl || "").trim();
  if (!target) return "";
  const results = await runFalonNativeHelper("check", { urls: [target] }, 3 * 60 * 1000);
  const row = Array.isArray(results) ? results[0] : null;
  return String(row?.resolved || row?.finalUrl || "").trim();
}

async function checkDownloadLinksNative(urls = []) {
  const list = [...new Set((urls || []).map(v => String(v || "").trim()).filter(Boolean))];
  if (!list.length) return [];
  return runFalonNativeHelper("check", { urls: list }, 3 * 60 * 1000);
}

function findDownloadedNativeInstallerFallback(targetFile, startedAt = 0) {
  const directTarget = String(targetFile || "").trim();
  const minTime = Number.isFinite(Number(startedAt)) ? Number(startedAt) - 15_000 : 0;
  const packageExtensions = new Set([".appx", ".appxbundle", ".msix", ".msixbundle"]);

  const isUsablePackage = (candidate, requireFresh = false) => {
    try {
      const file = String(candidate || "").trim();
      if (!file || !fs.existsSync(file)) return false;
      const stat = fs.statSync(file);
      if (!stat.isFile() || stat.size < STRICT_PACKAGE_MIN_BYTES) return false;
      const ext = path.extname(file).toLowerCase();
      if (!packageExtensions.has(ext)) return false;
      if (requireFresh && minTime > 0 && Number(stat.mtimeMs || 0) < minTime) return false;
      return true;
    } catch {
      return false;
    }
  };

  if (isUsablePackage(directTarget, false)) return directTarget;

  const folder = path.dirname(directTarget);
  try {
    if (!folder || !fs.existsSync(folder)) return "";
    const candidates = fs.readdirSync(folder)
      .map((name) => path.join(folder, name))
      .filter((file) => isUsablePackage(file, true))
      .map((file) => ({ file, mtimeMs: Number(fs.statSync(file).mtimeMs || 0) }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0]?.file || "";
  } catch {
    return "";
  }
}

async function downloadToFileNative(urls, dest, win, label, expectedMd5 = "") {
  const candidates = [...new Set((Array.isArray(urls) ? urls : [urls])
    .map((url) => String(url || "").trim())
    .filter(Boolean))];
  const targetFile = String(dest || "").trim();
  if (!candidates.length || !targetFile) throw new Error("Legacy UWP: не указаны ссылки или путь установщика");

  emit(win, "game-install-status", {
    stage: "download",
    message: `Legacy UWP: подбираю рабочий APPX и скачиваю ${label}`,
    version: label,
    installerPath: targetFile,
    candidates: candidates.length
  });

  const helperStartedAt = Date.now();
  const result = await runFalonNativeHelper("download", {
    urls: candidates,
    destDir: path.dirname(targetFile),
    fileName: path.basename(targetFile),
    md5: String(expectedMd5 || "").trim(),
    label: String(label || "Legacy UWP")
  }, 4 * 60 * 60 * 1000, win);

  const helperReportedPath = String(
    result?.installerPath
    || result?.packagePath
    || result?.filePath
    || result?.path
    || result?.dest
    || ""
  ).trim();
  const helperPath = helperReportedPath || findDownloadedNativeInstallerFallback(targetFile, helperStartedAt);
  if (!helperPath) {
    const helperError = String(result?.error || "").trim();
    if (helperError) throw new Error(compactLegacyHelperError(helperError));
    const resultKeys = result && typeof result === "object" ? Object.keys(result).slice(0, 8).join(", ") : "нет данных";
    throw new Error(`Legacy UWP helper скачал пакет, но Falon не получил путь к APPX. Поля ответа: ${resultKeys || "пусто"}`);
  }
  return {
    installerPath: helperPath,
    resolvedUrl: String(result?.resolvedUrl || result?.url || "").trim(),
    chosenUrl: String(result?.chosenUrl || result?.sourceUrl || candidates[0] || "").trim(),
    fileName: String(result?.fileName || path.basename(helperPath) || "").trim()
  };
}

async function extractLegacyUwpPackageNative(packagePath, outDir, win, label) {
  const source = String(packagePath || "").trim();
  const folder = String(outDir || "").trim();
  if (!source || !folder) throw new Error("Legacy UWP: не указан пакет или папка распаковки");

  emit(win, "game-install-status", {
    stage: "extract",
    message: `Распаковываю Legacy UWP: ${label}`,
    version: label,
    installerPath: source,
    folder
  });

  const result = await runFalonNativeHelper("extract", {
    packagePath: source,
    outDir: folder,
    label: String(label || "Legacy UWP")
  }, 90 * 60 * 1000, win);

  const extractedFolder = String(result?.outDir || folder).trim();
  if (!extractedFolder || !fs.existsSync(extractedFolder)) {
    throw new Error("Legacy UWP helper не вернул папку распакованной версии");
  }
  return {
    folder: extractedFolder,
    manifestPath: String(result?.manifestPath || "").trim(),
    exePath: String(result?.exePath || "").trim(),
    method: String(result?.method || "go-appx-extract").trim() || "go-appx-extract"
  };
}

function normalizeVersionLabel(value) {
  return String(value || "").trim();
}

function compareVersionDesc(a, b) {
  const pa = normalizeVersionLabel(a).replace(/^(Release|Preview|Legacy(?:\s+Preview|\s+Beta)?)\s+/i, "").split(".");
  const pb = normalizeVersionLabel(b).replace(/^(Release|Preview|Legacy(?:\s+Preview|\s+Beta)?)\s+/i, "").split(".");
  const max = Math.max(pa.length, pb.length);
  for (let i = 0; i < max; i += 1) {
    const va = Number.parseInt(pa[i] || "0", 10) || 0;
    const vb = Number.parseInt(pb[i] || "0", 10) || 0;
    if (va !== vb) return vb - va;
  }
  return normalizeVersionLabel(a).localeCompare(normalizeVersionLabel(b));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: ac.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json,text/plain,*/*",
        "Cache-Control": "no-cache",
        ...(options.headers || {})
      }
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextViaWindowsTransport(url, timeoutMs = 12000) {
  if (process.platform !== "win32") throw new Error("system-transport-not-available");
  const seconds = Math.max(5, Math.ceil(timeoutMs / 1000));
  const errors = [];

  try {
    const hasCurlExe = await commandExists("curl.exe");
    const hasCurl = hasCurlExe || await commandExists("curl");
    if (hasCurl) {
      const curlCmd = hasCurlExe ? "curl.exe" : "curl";
      const result = await promisifyExecFile(curlCmd, [
        "--silent",
        "--show-error",
        "--fail-with-body",
        "--location",
        "--max-time",
        String(seconds),
        "-H", `User-Agent: ${USER_AGENT}`,
        "-H", "Accept: application/json,text/plain,*/*",
        url
      ], { timeout: timeoutMs + 15000, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
      const text = String(result.stdout || "");
      if (text.trim()) return text;
      errors.push("curl: empty-response");
    } else {
      errors.push("curl: not-found");
    }
  } catch (error) {
    errors.push(`curl: ${compactErrorDetails(error)}`);
  }

  try {
    const ps = [
      "$ErrorActionPreference = 'Stop'",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
      `$uri = '${powershellSingleQuoted(url)}'`,
      `$headers = @{ 'User-Agent'='${powershellSingleQuoted(USER_AGENT)}'; 'Accept'='application/json,text/plain,*/*' }`,
      `$response = Invoke-WebRequest -UseBasicParsing -Method GET -Uri $uri -Headers $headers -TimeoutSec ${seconds}`,
      "[Console]::Write($response.Content)"
    ].join("; ");
    const result = await promisifyExecFile("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps
    ], { timeout: timeoutMs + 15000, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
    const text = String(result.stdout || "");
    if (text.trim()) return text;
    errors.push("powershell: empty-response");
  } catch (error) {
    errors.push(`powershell: ${compactErrorDetails(error)}`);
  }

  throw new Error(errors.join(" | ") || "windows-system-get-failed");
}

async function fetchText(url, timeoutMs = 12000) {
  try {
    const response = await fetchWithTimeout(url, {}, timeoutMs);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (!isRecoverableWUTransportError(error)) throw error;
    try {
      return await fetchTextViaWindowsTransport(url, timeoutMs);
    } catch (fallbackError) {
      throw new Error(`GET ${url} failed: ${compactErrorDetails(error)} | system fallback: ${compactErrorDetails(fallbackError)}`);
    }
  }
}

function normalizeURLList(value) {
  const out = [];
  const seen = new Set();

  const add = (item) => {
    if (!item) return;
    if (typeof item === "string") {
      const url = item.trim().replace(/^["'`]+|["'`]+$/g, "");
      if (/^(https?:\/\/|wu:\/\/)/i.test(url) && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(add);
      return;
    }
    if (typeof item === "object") {
      ["url", "urls", "downloadUrl", "downloadUrls", "x64", "msixvc"].forEach((key) => add(item[key]));
    }
  };

  add(value);
  return out;
}

function createMergedCatalog() {
  return {
    file_version: 3,
    releaseVersions: [],
    previewVersions: [],
    legacyUwpVersions: [],
    _sources: []
  };
}

function appendVersion(merged, key, version, urls, extras = {}) {
  const label = normalizeVersionLabel(version);
  const cleanUrls = normalizeURLList(urls);
  if (!label || cleanUrls.length === 0) return;

  const bucket = merged[key] || [];
  const existing = bucket.find((item) => normalizeVersionLabel(item.version || item.short).toLowerCase() === label.toLowerCase());
  if (existing) {
    const mergedUrls = [...new Set([...(existing.urls || []), ...cleanUrls])];
    existing.urls = mergedUrls;
    Object.assign(existing, Object.fromEntries(Object.entries(extras).filter(([, value]) => value !== undefined && value !== null && value !== "")));
    return;
  }

  bucket.push({
    version: label,
    urls: cleanUrls,
    ...extras
  });
  merged[key] = bucket;
}

function mergeHistoricalList(merged, key, src, source) {
  if (!Array.isArray(src)) return;
  src.forEach((row) => {
    if (!row || typeof row !== "object") return;
    const version = String(row.version || row.short || "").trim();
    const urls = normalizeURLList(row.urls || row.url);
    const isLegacyKey = key === "legacyUwpVersions";
    const fallbackPackage = isLegacyKey ? "uwp" : "gdk";
    const normalizedPackage = String(row.package || fallbackPackage).trim().toLowerCase() || fallbackPackage;
    appendVersion(merged, key, version, urls, {
      md5: String(row.md5 || "").trim(),
      timestamp: row.timestamp ?? "",
      source,
      package: isLegacyKey ? "uwp" : normalizedPackage,
      type: isLegacyKey ? (row.type || "Legacy") : row.type,
      releaseType: isLegacyKey ? (row.releaseType || "release") : (key === "previewVersions" ? "preview" : "release"),
      fileName: String(row.fileName || "").trim(),
      short: String(row.short || "").trim(),
      metadataUrl: String(row.metadataUrl || "").trim(),
      updateId: String(row.updateId || "").trim(),
      revision: String(row.revision || "").trim(),
      downloadable: row.downloadable ?? undefined
    });
  });
}

function mergeGdkLinksGroup(merged, key, src, prefix, source) {
  if (!src || typeof src !== "object" || Array.isArray(src)) return;
  Object.entries(src).forEach(([name, rawUrls]) => {
    const short = String(name || "").trim();
    if (!short) return;
    const label = short.toLowerCase().startsWith(prefix.toLowerCase() + " ") ? short : `${prefix} ${short}`;
    appendVersion(merged, key, label, rawUrls, {
      source,
      package: "gdk",
      releaseType: key === "previewVersions" ? "preview" : "release"
    });
  });
}

function legacyPackageVersionToDisplay(raw) {
  const parts = String(raw || "").trim().split(".");
  if (parts.length !== 4) return String(raw || "").trim();
  const major = String(Number.parseInt(parts[0] || "0", 10) || 0);
  const minor = String(Number.parseInt(parts[1] || "0", 10) || 0);
  const thirdRaw = String(Number.parseInt(parts[2] || "0", 10) || 0);
  const buildRaw = String(Number.parseInt(parts[3] || "0", 10) || 0);

  if (thirdRaw.length >= 4) {
    const patch = String(Number.parseInt(thirdRaw.slice(0, -2) || "0", 10) || 0);
    const build = String(Number.parseInt(thirdRaw.slice(-2) || "0", 10) || 0);
    return `${major}.${minor}.${patch}.${build}`;
  }
  if (thirdRaw.length === 3) {
    const patch = String(Number.parseInt(thirdRaw.slice(0, -1) || "0", 10) || 0);
    const build = String(Number.parseInt(thirdRaw.slice(-1) || "0", 10) || 0);
    return `${major}.${minor}.${patch}.${build}`;
  }
  return `${major}.${minor}.${thirdRaw}.${buildRaw}`;
}

function extractUWPShortVersion(filename) {
  const base = String(filename || "").trim();
  const first = base.indexOf("_");
  if (first < 0) return "";
  const rest = base.slice(first + 1);
  const second = rest.indexOf("_");
  if (second < 0) return "";
  return legacyPackageVersionToDisplay(rest.slice(0, second));
}

function scanLegacyUWPRefs(text) {
  const content = String(text || "");
  const out = [];
  const seen = new Set();
  const packageExtRe = /\.(?:appx|eappx|appxbundle|msixbundle)$/i;

  const add = (updateId, revision, fileName) => {
    let id = String(updateId || "").trim().replace(/^["']+|["']+$/g, "");
    let rev = String(revision || "").trim().replace(/^["']+|["']+$/g, "");
    let file = String(fileName || "").trim().replace(/^["']+|["']+$/g, "");
    if (!id || !file) return;
    const lower = file.toLowerCase();
    if (
      !(lower.includes("minecraftuwp_") || lower.includes("minecraftwindowsbeta_") || lower.includes("minecraftwindows_")) ||
      !lower.includes("_x64__")
    ) return;
    if (!packageExtRe.test(file)) file += ".Appx";
    if (!rev || rev.includes(".")) rev = "1";
    const key = `${id}|${rev}|${file}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ updateId: id, revision: rev, fileName: file });
  };

  const uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
  const file = "Microsoft\\.Minecraft(?:UWP|WindowsBeta|Windows)_[^\\\"'<>\\s]+(?:\\.(?:Appx|EAppx|AppxBundle|MsixBundle))?";
  const linePatterns = [
    new RegExp(`^\\s*(${uuid})\\s+(${file})(?:\\s+(\\d{1,12}))?\\s*$`, "i"),
    new RegExp(`^\\s*(${uuid})\\s+(\\d{1,12})\\s+(${file})\\s*$`, "i"),
    new RegExp(`^\\s*(${file})\\s+(${uuid})(?:\\s+(\\d{1,12}))?\\s*$`, "i"),
    new RegExp(`^\\s*(${file})\\s+(\\d{1,12})\\s+(${uuid})\\s*$`, "i")
  ];

  // Text DBs use one record per line. Parsing each line first avoids false
  // cross-line UUID/file pairings that generate impossible wu:// links.
  for (const rawLine of content.split(/\r?\n/)) {
    const line = String(rawLine || "").trim();
    if (!line) continue;
    let match = line.match(linePatterns[0]);
    if (match) { add(match[1], match[3] || "1", match[2]); continue; }
    match = line.match(linePatterns[1]);
    if (match) { add(match[1], match[2], match[3]); continue; }
    match = line.match(linePatterns[2]);
    if (match) { add(match[2], match[3] || "1", match[1]); continue; }
    match = line.match(linePatterns[3]);
    if (match) { add(match[3], match[2], match[1]); }
  }

  // JSON/minified metadata can keep fields on one physical line. The fallback
  // stays line-local instead of scanning across hundreds of characters/newlines;
  // this prevents a file from one record being paired with the next record UUID.
  const sameLineUuidFirst = new RegExp(`(${uuid})[^\\r\\n]{0,320}?(${file})(?:[^\\r\\n]{0,80}?(\\d{1,12}))?`, "gi");
  const sameLineFileFirst = new RegExp(`(${file})[^\\r\\n]{0,320}?(${uuid})(?:[^\\r\\n]{0,80}?(\\d{1,12}))?`, "gi");
  for (const match of content.matchAll(sameLineUuidFirst)) add(match[1], match[3] || "1", match[2]);
  for (const match of content.matchAll(sameLineFileFirst)) add(match[2], match[3] || "1", match[1]);

  return out;
}

function appendLegacyUWP(merged, shortVersion, updateId, revision, fileName, source) {
  const short = String(shortVersion || "").trim();
  const id = String(updateId || "").trim();
  const file = String(fileName || "").trim();
  if (!short || !id || !file) return;
  const rev = String(revision || "1").trim() || "1";
  const url = `wu://${id}/${rev}?filename=${encodeURIComponent(file)}`;
  appendVersion(merged, "legacyUwpVersions", `Legacy ${short}`, [url], {
    short,
    updateId: id,
    revision: rev,
    fileName: file,
    downloadable: true,
    package: "uwp",
    type: "Legacy",
    releaseType: "release",
    source,
    metadataUrl: `https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/release/uwp/${encodeURIComponent(short)}.json`
  });
}

function mergeUwpMetadata(merged, src, source) {
  if (!Array.isArray(src)) return;
  src.forEach((row) => {
    if (!Array.isArray(row) || row.length < 2) return;
    const rawName = String(row[0] || "").trim();
    const updateId = String(row[1] || "").trim();
    const revision = row.length >= 3 && !String(row[2] || "").includes(".") ? String(row[2] || "1").trim() : "1";
    const lower = rawName.toLowerCase();
    if (!(lower.includes("minecraftuwp_") || lower.includes("minecraftwindowsbeta_") || lower.includes("minecraftwindows_"))) return;
    const short = extractUWPShortVersion(rawName) || rawName;
    appendLegacyUWP(merged, short, updateId, revision, rawName, source);
  });
}

function mergeUwpText(merged, text, source) {
  scanLegacyUWPRefs(text).forEach((ref) => {
    const short = extractUWPShortVersion(ref.fileName);
    if (!short) return;
    appendLegacyUWP(merged, short, ref.updateId, ref.revision, ref.fileName, source);
  });
}

function normalizeCatalog(merged) {
  ["releaseVersions", "previewVersions", "legacyUwpVersions"].forEach((key) => {
    merged[key] = (merged[key] || [])
      .filter((item) => Array.isArray(item.urls) && item.urls.length > 0)
      .filter((item) => key !== "legacyUwpVersions" || !isKnownBrokenLegacyVersion({ ...item, bucket: "legacy" }))
      .sort((a, b) => compareVersionDesc(a.version, b.version));
  });
  return merged;
}

async function fetchVersionCatalog({ force = false, includeInvalid = false } = {}) {
  const now = Date.now();
  if (!force && !includeInvalid && catalogCache && now - catalogCacheAt < 10 * 60 * 1000) {
    return catalogCache;
  }

  const merged = createMergedCatalog();
  const failures = [];

  // Keep the stable split:
  //   • GDK Release / Preview catalog -> original Falon JS sources (GdkLinks + version DBs)
  //   • Legacy UWP catalog -> native helper, because WU/Store recovery is much more reliable in Go.
  // Do NOT let the native helper replace the whole catalog, otherwise working GDK mirrors get lost.
  try {
    const nativeCatalog = await fetchNativeCatalog();
    if (nativeCatalog && typeof nativeCatalog === "object") {
      mergeHistoricalList(merged, "legacyUwpVersions", nativeCatalog.legacyUwpVersions, "native-helper");
      merged._sources.push("native-helper:legacy-uwp");
      if (Array.isArray(nativeCatalog._errors || nativeCatalog.errors)) {
        failures.push(...(nativeCatalog._errors || nativeCatalog.errors).map(error => `native-helper legacy: ${String(error)}`));
      }
    }
  } catch (error) {
    failures.push(`native-helper legacy: ${error.message}`);
  }

  for (const source of CATALOG_SOURCES) {
    try {
      const body = await fetchText(source, 10000);
      try {
        const data = JSON.parse(body);
        if (data && typeof data === "object" && !Array.isArray(data)) {
          // GDK catalog stays in JS sources. UWP/APPX catalog is owned only by the
          // dedicated helper, so one parser cannot pollute or wipe the other.
          mergeHistoricalList(merged, "previewVersions", data.previewVersions, source);
          mergeHistoricalList(merged, "releaseVersions", data.releaseVersions, source);
          mergeGdkLinksGroup(merged, "releaseVersions", data.release, "Release", source);
          mergeGdkLinksGroup(merged, "previewVersions", data.preview, "Preview", source);
        }
      } catch {
        // Plain-text UWP databases are intentionally ignored here. The helper has
        // a stricter parser and is the single source of truth for APPX/WU records.
      }
      merged._sources.push(source);
    } catch (error) {
      failures.push(`${source}: ${error.message}`);
    }
  }

  normalizeCatalog(merged);
  const total = merged.releaseVersions.length + merged.previewVersions.length + merged.legacyUwpVersions.length;
  if (!total) {
    throw new Error(`Не удалось загрузить каталог версий. ${failures.slice(0, 2).join(" | ")}`.trim());
  }
  merged._errors = failures;
  const output = includeInvalid ? merged : applyVersionValidationCache(merged, readVersionValidationCache(), readVersionArchive());
  catalogCache = output;
  catalogCacheAt = now;
  return output;
}

function hasPackageExt(name) {
  return /\.(?:appx|eappx|appxbundle|msixbundle|msixvc|msix)$/i.test(String(name || ""));
}

function packageBaseName(rawUrl, fallback = "minecraft-package.msixvc") {
  try {
    const parsed = new URL(rawUrl);
    const fromPath = path.basename(decodeURIComponent(parsed.pathname || ""));
    if (fromPath && hasPackageExt(fromPath)) return safeName(fromPath, fallback);
    const fromQuery = parsed.searchParams.get("filename");
    if (fromQuery && hasPackageExt(fromQuery)) return safeName(path.basename(fromQuery), fallback);
  } catch {}
  return safeName(fallback, "minecraft-package.msixvc");
}

function buildWUDownloadRequest(updateId, revision) {
  const now = new Date().toISOString();
  const exp = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  return `<s:Envelope xmlns:a="http://www.w3.org/2005/08/addressing" xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Header>
    <a:Action s:mustUnderstand="1">http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService/GetExtendedUpdateInfo2</a:Action>
    <a:MessageID>urn:uuid:5754a03d-d8d5-489f-b24d-efc31b3fd32d</a:MessageID>
    <a:To s:mustUnderstand="1">https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx/secured</a:To>
    <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
        <u:Created>${now}</u:Created><u:Expires>${exp}</u:Expires>
      </u:Timestamp>
      <wuws:WindowsUpdateTicketsToken wsu:id="ClientMSA" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:wuws="http://schemas.microsoft.com/msus/2014/10/WindowsUpdateAuthorization">
        <TicketType Name="AAD" Version="1.0" Policy="MBI_SSL"></TicketType>
      </wuws:WindowsUpdateTicketsToken>
    </o:Security>
  </s:Header>
  <s:Body>
    <GetExtendedUpdateInfo2 xmlns="http://www.microsoft.com/SoftwareDistribution/Server/ClientWebService">
      <updateIDs><UpdateIdentity><UpdateID>${xmlEscape(updateId)}</UpdateID><RevisionNumber>${xmlEscape(revision)}</RevisionNumber></UpdateIdentity></updateIDs>
      <infoTypes><XmlUpdateFragmentType>FileUrl</XmlUpdateFragmentType></infoTypes>
      <deviceAttributes>E:BranchReadinessLevel=CBB&amp;DchuNvidiaGrfxExists=1&amp;ProcessorIdentifier=Intel64%20Family%206%20Model%2063%20Stepping%202&amp;CurrentBranch=rs4_release&amp;DataVer_RS5=1942&amp;FlightRing=Retail&amp;AttrDataVer=57&amp;InstallLanguage=en-US&amp;DchuAmdGrfxExists=1&amp;OSUILocale=en-US&amp;InstallationType=Client&amp;FlightingBranchName=&amp;Version_RS5=10&amp;UpgEx_RS5=Green&amp;GStatus_RS5=2&amp;OSSkuId=48&amp;App=WU&amp;InstallDate=1529700913&amp;ProcessorManufacturer=GenuineIntel&amp;AppVer=10.0.17134.471&amp;OSArchitecture=AMD64&amp;UpdateManagementGroup=2&amp;IsDeviceRetailDemo=0&amp;HidOverGattReg=C%3A%5CWINDOWS%5CSystem32%5CDriverStore%5CFileRepository%5Chidbthle.inf_amd64_467f181075371c89%5CMicrosoft.Bluetooth.Profiles.HidOverGatt.dll&amp;IsFlightingEnabled=0&amp;DchuIntelGrfxExists=1&amp;TelemetryLevel=1&amp;DefaultUserRegion=244&amp;DeferFeatureUpdatePeriodInDays=365&amp;Bios=Unknown&amp;WuClientVer=10.0.17134.471&amp;PausedFeatureStatus=1&amp;Steam=URL%3Asteam%20protocol&amp;Free=8to16&amp;OSVersion=10.0.17134.472&amp;DeviceFamily=Windows.Desktop</deviceAttributes>
    </GetExtendedUpdateInfo2>
  </s:Body>
</s:Envelope>`;
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractWUFileUrl(body, wantedFile = "") {
  const content = String(body || "");
  const urls = [];
  const seen = new Set();
  const add = (value) => {
    const url = decodeXmlEntities(value).trim();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  const nodeRe = /<(?:[a-z0-9]+:)?(?:FileUrl|Url)\b[^>]*>\s*([^<]+?)\s*<\/(?:[a-z0-9]+:)?(?:FileUrl|Url)>/gis;
  for (const match of content.matchAll(nodeRe)) add(match[1]);
  if (!urls.length) {
    const direct = /https?:\/\/(?:tlu\.)?dl\.delivery\.mp\.microsoft\.com\/filestreamingservice\/files\/[^<>'"\s]+/gi;
    for (const match of content.matchAll(direct)) add(match[0]);
  }

  const wanted = String(wantedFile || "").trim().replaceAll("\\", "/").toLowerCase();
  const wantedBase = path.basename(wanted);
  const wantedLooksLikePackage = hasPackageExtInName(wantedBase);
  const isDelivery = (lower) => lower.includes("delivery.mp.microsoft.com/filestreamingservice/files/");
  const isPackageUrl = (url) => {
    const lower = String(url || "").toLowerCase();
    if (["blockmap", "signature", ".p7x", ".xml", ".json", ".eappxblockmap", ".appxblockmap", ".msixblockmap"].some(bad => lower.includes(bad))) return false;
    if (hasPackageExtInName(lower)) return true;
    return wantedLooksLikePackage && isDelivery(lower);
  };
  const score = (url) => {
    const lower = String(url || "").toLowerCase();
    if (!isPackageUrl(lower)) return -100000;
    let value = 0;
    if (/^https?:\/\/tlu\.dl\.delivery\.mp\.microsoft\.com\//i.test(lower)) value += 1000;
    if (isDelivery(lower)) value += 650;
    if (wantedBase && lower.includes(wantedBase)) value += 900;
    if (wanted && lower.includes(wanted)) value += 700;
    if (lower.includes("microsoft.minecraftuwp") || lower.includes("microsoft.minecraftwindowsbeta") || lower.includes("microsoft.minecraftwindows")) value += 350;
    if (lower.includes("_x64") || lower.includes("-x64") || lower.includes("x64__")) value += 240;
    if (lower.includes("_neutral_") || lower.includes("language") || lower.includes("resources") || lower.includes("scale-")) value -= 500;
    if (lower.includes(".eappx") || lower.includes(".appx") || lower.includes(".appxbundle")) value += 80;
    if (lower.includes(".msixvc") || lower.includes(".msixbundle")) value += 70;
    return value;
  };

  const sorted = urls.slice().sort((a, b) => score(b) - score(a));
  const best = sorted[0] || "";
  if (best && score(best) >= 0) return best;
  return extractAnyWUFileURL(content);
}

function hasPackageExtInName(name) {
  const lower = String(name || "").trim().toLowerCase();
  return [".appx", ".eappx", ".appxbundle", ".msixbundle", ".msixvc"].some(ext => lower.includes(ext));
}

function normalizeWUFileName(raw) {
  return path.basename(String(raw || "").trim().replaceAll("\\", "/")).toLowerCase();
}

function legacyUwpReleaseTypeFromFileName(fileName) {
  const lower = String(fileName || "").trim().toLowerCase();
  if (lower.includes("minecraftwindowsbeta_") || lower.includes("minecraftpreview")) return "preview";
  return "release";
}

function legacyUWPFileCandidatesFromDisplay(short, releaseType = "release") {
  const parts = String(short || "").trim().split(".");
  if (parts.length < 4) return [];
  const [major, minor, patch, build] = parts;
  const seen = new Set();
  const out = [];
  const packageName = String(releaseType || "release").trim().toLowerCase() === "preview"
    ? "Microsoft.MinecraftWindowsBeta"
    : "Microsoft.MinecraftUWP";
  const add = (third) => {
    const clean = String(third || "").replace(/^0+/, "") || "0";
    const name = `${packageName}_${major}.${minor}.${clean}.0_x64__8wekyb3d8bbwe.Appx`;
    const key = normalizeWUFileName(name);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  };
  const b = String(build || "").replace(/^0+/, "") || "0";
  if (b.length === 1) add(`${patch}0${b}`);
  add(`${patch}${b}`);
  add(`${patch}${build}`);
  add(patch);
  return out;
}

function legacyWUSourceURLs() {
  return [
    "https://raw.githubusercontent.com/ddf8196/mc-w10-versiondb-auto-update/refs/heads/master/versions.json.min",
    "https://mrarm.io/r/w10-vdb",
    "https://raw.githubusercontent.com/Kuro7s/mc-w10-versiondb-auto-update/refs/heads/master/versions.json.min",
    "https://raw.githubusercontent.com/MCMrARM/mc-w10-versiondb/refs/heads/master/versions.txt",
    "https://raw.githubusercontent.com/MCMrARM/mc-w10-versiondb/refs/heads/master/versions.json.min",
    "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/versions.json",
    "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/versions.min.json",
    "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/release/versions.json",
    "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/release/versions.min.json",
    "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/preview/versions.json",
    "https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/preview/versions.min.json"
  ];
}

function extractAnyWUFileURL(body) {
  const content = String(body || "");
  const found = [];
  const seen = new Set();
  const add = (raw) => {
    const url = decodeXmlEntities(raw).trim();
    const lower = url.toLowerCase();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) return;
    if (lower.includes("getextendedupdateinfo2response") || lower.includes("/clientwebservice/") || lower.includes("schemas.xmlsoap.org")) return;
    if (!(lower.includes("filestreamingservice/files/") || hasPackageExtInName(lower) || lower.includes("filename="))) return;
    seen.add(url);
    found.push(url);
  };
  const nodeRe = /<(?:[a-z0-9]+:)?(?:FileUrl|Url)\b[^>]*>\s*([^<]+?)\s*<\/(?:[a-z0-9]+:)?(?:FileUrl|Url)>/gis;
  for (const match of content.matchAll(nodeRe)) add(match[1]);
  const directRe = /https?:\/\/(?:tlu\.)?dl\.delivery\.mp\.microsoft\.com\/filestreamingservice\/files\/[^<>'"\s]+/gi;
  for (const match of content.matchAll(directRe)) add(match[0]);
  return found[0] || "";
}

function compactErrorDetails(error) {
  const err = error || {};
  const cause = err.cause || {};
  const bits = [
    String(err.code || "").trim(),
    String(cause.code || "").trim(),
    String(err.message || err || "").trim(),
    String(cause.message || "").trim()
  ].filter(Boolean);
  return [...new Set(bits)].join(": ") || "unknown-error";
}

function isRecoverableWUTransportError(error) {
  const text = compactErrorDetails(error).toLowerCase();
  return [
    "fetch failed",
    "unable_to_get_issuer_cert_locally",
    "unable to get local issuer certificate",
    "certificate",
    "cert_",
    "tls",
    "socket",
    "econnreset",
    "etimedout",
    "und_err",
    "network"
  ].some(marker => text.includes(marker));
}

function powershellSingleQuoted(value) {
  return String(value || "").replaceAll("'", "''");
}

async function requestTextViaWindowsTransport(url, method, headers, body, timeoutMs = 45000) {
  if (process.platform !== "win32") {
    throw new Error("system-transport-not-available");
  }

  const tempDir = path.join(app.getPath("temp"), "falon-wu");
  fs.ensureDirSync(tempDir);
  const bodyFile = path.join(tempDir, `wu-${crypto.randomUUID()}.xml`);
  fs.writeFileSync(bodyFile, String(body || ""), "utf8");

  const seconds = Math.max(5, Math.ceil(timeoutMs / 1000));
  const requestHeaders = Object.entries(headers || {}).flatMap(([key, value]) => ["-H", `${key}: ${value}`]);
  const systemErrors = [];

  try {
    const hasCurlExe = await commandExists("curl.exe");
    const hasCurl = hasCurlExe || await commandExists("curl");
    if (hasCurl) {
      const curlCmd = hasCurlExe ? "curl.exe" : "curl";
      try {
        const curlArgs = [
          "--silent",
          "--show-error",
          "--fail-with-body",
          "--location",
          "--max-time",
          String(seconds),
          "-X",
          String(method || "POST").toUpperCase(),
          ...requestHeaders
        ];
        if (String(body || "").length > 0) curlArgs.push("--data-binary", `@${bodyFile}`);
        curlArgs.push(url);
        const result = await promisifyExecFile(curlCmd, curlArgs, {
          timeout: timeoutMs + 15000,
          maxBuffer: 24 * 1024 * 1024,
          windowsHide: true
        });
        const text = String(result.stdout || "");
        if (text.trim()) return text;
        systemErrors.push("curl: empty-response");
      } catch (error) {
        systemErrors.push(`curl: ${compactErrorDetails(error)}`);
      }
    } else {
      systemErrors.push("curl: not-found");
    }

    const headersLiteral = Object.entries(headers || {})
      .map(([key, value]) => `'$${""}${powershellSingleQuoted(key)}'='${powershellSingleQuoted(value)}'`)
      .join("; ")
      .replaceAll("'$", "'");
    const ps = [
      "$ErrorActionPreference = 'Stop'",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
      `$uri = '${powershellSingleQuoted(url)}'`,
      `$bodyPath = '${powershellSingleQuoted(bodyFile)}'`,
      "$payload = [System.IO.File]::ReadAllText($bodyPath, [System.Text.Encoding]::UTF8)",
      `$headers = @{ ${headersLiteral} }`,
      `$response = Invoke-WebRequest -UseBasicParsing -Method '${powershellSingleQuoted(String(method || "POST").toUpperCase())}' -Uri $uri -Headers $headers -Body $payload -TimeoutSec ${seconds}`,
      "[Console]::Write($response.Content)"
    ].join("; ");
    try {
      const result = await promisifyExecFile("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy", "Bypass",
        "-Command", ps
      ], {
        timeout: timeoutMs + 15000,
        maxBuffer: 24 * 1024 * 1024,
        windowsHide: true
      });
      const text = String(result.stdout || "");
      if (text.trim()) return text;
      systemErrors.push("powershell: empty-response");
    } catch (error) {
      systemErrors.push(`powershell: ${compactErrorDetails(error)}`);
    }

    throw new Error(systemErrors.join(" | ") || "windows-system-transport-failed");
  } finally {
    try { fs.removeSync(bodyFile); } catch {}
  }
}

async function requestWUInfo(updateId, revision, timeoutMs = 45000) {
  const soap = buildWUDownloadRequest(updateId, revision);
  const url = "https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx/secured";
  const headers = {
    "Content-Type": "application/soap+xml; charset=utf-8",
    "User-Agent": "Microsoft-Delivery-Optimization/10.0"
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: soap
    }, timeoutMs);
    const body = await response.text();
    if (!response.ok) throw new Error(`Windows Update HTTP ${response.status}: ${body.slice(0, 240).replace(/\s+/g, " ").trim()}`);
    return body;
  } catch (primaryError) {
    if (!isRecoverableWUTransportError(primaryError)) {
      throw new Error(`Windows Update запрос не выполнен: ${compactErrorDetails(primaryError)}`);
    }
    try {
      return await requestTextViaWindowsTransport(url, "POST", headers, soap, timeoutMs);
    } catch (fallbackError) {
      throw new Error(`Windows Update запрос не выполнен: ${compactErrorDetails(primaryError)} | system fallback: ${compactErrorDetails(fallbackError)}`);
    }
  }
}

async function resolveWUFromLegacyDB(wantedFile, badUpdateId = "", timeoutMs = 45000) {
  const wantedNorm = normalizeWUFileName(wantedFile);
  const wantedShort = extractUWPShortVersion(wantedFile);
  const wantedReleaseType = legacyUwpReleaseTypeFromFileName(wantedFile);
  if (!wantedNorm) return "";
  const candidateSet = new Set(legacyUWPFileCandidatesFromDisplay(wantedShort, wantedReleaseType).map(normalizeWUFileName));
  const seenIds = new Set([String(badUpdateId || "").trim().toLowerCase()].filter(Boolean));

  for (const source of legacyWUSourceURLs()) {
    let body = "";
    try {
      body = await fetchText(source, 18000);
    } catch {
      continue;
    }
    for (const ref of scanLegacyUWPRefs(body)) {
      const refNorm = normalizeWUFileName(ref.fileName);
      const refShort = extractUWPShortVersion(ref.fileName);
      if (legacyUwpReleaseTypeFromFileName(ref.fileName) !== wantedReleaseType) continue;
      if (refNorm !== wantedNorm && !candidateSet.has(refNorm) && (!wantedShort || String(refShort || "").trim().toLowerCase() !== String(wantedShort).trim().toLowerCase())) continue;
      const id = String(ref.updateId || "").trim();
      const key = id.toLowerCase();
      if (!id || seenIds.has(key)) continue;
      seenIds.add(key);
      const revision = String(ref.revision || "1").trim() || "1";
      try {
        const responseBody = await requestWUInfo(id, revision, timeoutMs);
        const resolved = extractWUFileUrl(responseBody, wantedFile) || extractWUFileUrl(responseBody, ref.fileName) || extractAnyWUFileURL(responseBody);
        if (resolved) return resolved;
      } catch {}
    }
  }
  return "";
}

function extractLegacyDownloadURLsFromMetadata(root) {
  const urls = [];
  const seen = new Set();
  const walk = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        const k = key.toLowerCase();
        if (["url", "downloadurl", "download_url", "fileurl", "file_url"].includes(k) && typeof nested === "string") {
          const candidate = nested.trim();
          if (/^https?:\/\//i.test(candidate) && !seen.has(candidate)) {
            seen.add(candidate);
            urls.push(candidate);
          }
        }
        walk(nested);
      }
    }
  };
  walk(root);
  return urls;
}

function extractPreferredUWPFileFromMetadata(root) {
  const arch = root?.binaries?.arch || {};
  for (const platform of ["x64", "x86", "arm"]) {
    for (const kind of ["appx", "eappx", "appxbundle", "msixbundle"]) {
      const row = arch?.[platform]?.[kind];
      const fileName = String(row?.file_name || "").trim();
      if (!fileName) continue;
      return {
        fileName,
        md5: String(row?.md5 || row?.file_md5 || "").trim()
      };
    }
  }
  return { fileName: "", md5: "" };
}

async function resolveLegacyUWPDownloadInfo(short, releaseType = "release", metadataUrl = "") {
  try {
    const native = await resolveLegacyUWPDownloadInfoNative(short, releaseType, metadataUrl);
    if (native && String(native.md5 || "").trim().toLowerCase() === "<nil>") native.md5 = "";
    if (native && (Array.isArray(native.urls) || native.fileName || native.md5)) return native;
  } catch {}

  const cleanShort = String(short || "").trim();
  const type = String(releaseType || "release").trim().toLowerCase() || "release";
  const metadata = String(metadataUrl || "").trim() || (cleanShort ? `https://raw.githubusercontent.com/reversedcodes/minecraft-bedrock-meta-database/main/bedrock/client/${type}/uwp/${encodeURIComponent(cleanShort)}.json` : "");
  const result = { urls: [], fileName: "", md5: "" };

  if (metadata) {
    try {
      const body = await fetchText(metadata, 12000);
      const parsed = JSON.parse(body);
      const preferred = extractPreferredUWPFileFromMetadata(parsed);
      result.fileName = preferred.fileName;
      result.md5 = preferred.md5;
      result.urls = extractLegacyDownloadURLsFromMetadata(parsed);
    } catch {}
  }

  const candidates = legacyUWPFileCandidatesFromDisplay(cleanShort, type);
  if (!result.fileName && candidates.length) result.fileName = candidates[0];
  const wantedSet = new Set([result.fileName, ...candidates].map(normalizeWUFileName).filter(Boolean));
  const urls = [];
  const seen = new Set();
  for (const source of legacyWUSourceURLs()) {
    let body = "";
    try { body = await fetchText(source, 18000); } catch { continue; }
    for (const ref of scanLegacyUWPRefs(body)) {
      const refName = normalizeWUFileName(ref.fileName);
      const refShort = extractUWPShortVersion(ref.fileName);
      if (legacyUwpReleaseTypeFromFileName(ref.fileName) !== type) continue;
      if (!wantedSet.has(refName) && String(refShort || "").trim().toLowerCase() !== cleanShort.toLowerCase()) continue;
      if (!result.fileName) result.fileName = ref.fileName;
      const url = `wu://${ref.updateId}/${ref.revision || "1"}?filename=${encodeURIComponent(ref.fileName)}`;
      if (!seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  }
  result.urls = [...new Set([...(result.urls || []), ...urls])];
  return result;
}


async function resolveWindowsUpdateURL(rawUrl, timeoutMs = 45000) {
  try {
    const native = await resolveWindowsUpdateURLNative(rawUrl);
    if (native) return native;
  } catch {}

  const parsed = new URL(rawUrl);
  if (parsed.protocol.toLowerCase() !== "wu:") return rawUrl;
  const updateId = parsed.hostname || "";
  const revision = String(parsed.pathname || "").replace(/^\/+|\/+$/g, "") || parsed.searchParams.get("revision") || "1";
  const fileName = parsed.searchParams.get("filename") || "";
  if (!updateId) throw new Error("Windows Update: не найден UpdateID");

  const body = await requestWUInfo(updateId, revision, timeoutMs);
  let url = extractWUFileUrl(body, fileName);
  if (url) return url;

  if (fileName) {
    for (const tryRevision of ["2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
      if (tryRevision === revision) continue;
      try {
        const retryBody = await requestWUInfo(updateId, tryRevision, timeoutMs);
        url = extractWUFileUrl(retryBody, fileName);
        if (url) return url;
      } catch {}
    }

    url = await resolveWUFromLegacyDB(fileName, updateId, timeoutMs);
    if (url) return url;
  }

  throw new Error(`Windows Update не вернул ссылку пакета: updateId=${updateId}, revision=${revision}, file=${fileName || "<unknown>"}`);
}

function looksLikeTextErrorPayload(body, contentType = "") {
  const ct = String(contentType || "").toLowerCase();
  const sample = Buffer.isBuffer(body) ? body.toString("utf8", 0, Math.min(body.length, 1024)) : String(body || "");
  const preview = sample.trim().toLowerCase();
  if (!preview) return false;
  if (ct.includes("text/") || ct.includes("html") || ct.includes("xml") || ct.includes("json")) return true;
  if (preview.startsWith("<html") || preview.startsWith("<!doctype html") || preview.startsWith("<?xml")) return true;
  if (preview.startsWith("{") || preview.startsWith("[")) return true;
  if (preview.includes("<error") || preview.includes("access denied") || preview.includes("not found")) return true;
  return false;
}

function looksLikePackageProbe(rawUrl, finalUrl, contentType = "", contentLength = 0, body = Buffer.alloc(0)) {
  const joined = `${rawUrl || ""} ${finalUrl || ""}`.toLowerCase();
  const ct = String(contentType || "").toLowerCase();
  if (looksLikeTextErrorPayload(body, ct)) return false;
  if (hasPackageExtInName(joined) || joined.includes("filestreamingservice/files/")) return true;
  if (ct.includes("application/octet-stream") || ct.includes("binary") || ct.includes("appx") || ct.includes("msix")) return true;
  if (contentLength >= STRICT_PACKAGE_MIN_BYTES) return true;
  if (Buffer.isBuffer(body) && body.length >= 4) {
    // APPX/MSIX/MSIXVC are ZIP containers; most good probes start with PK.
    if (body[0] === 0x50 && body[1] === 0x4b) return true;
  }
  return false;
}

async function readProbeBytes(response, maxBytes = 1024) {
  if (!response?.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const chunk = Buffer.from(value);
      chunks.push(chunk);
      total += chunk.length;
      if (total >= maxBytes) break;
    }
  } finally {
    try { await reader.cancel(); } catch {}
  }
  return Buffer.concat(chunks).subarray(0, maxBytes);
}

async function checkDownloadLink(rawUrl, timeoutMs = VERSION_PROBE_TIMEOUT_MS) {
  const input = String(rawUrl || "").trim();
  if (!input) return { valid: false, hardInvalid: false, reason: "empty-url" };

  const isWu = input.toLowerCase().startsWith("wu://");
  let resolvedUrl = input;
  try {
    if (isWu) resolvedUrl = await resolveWindowsUpdateURL(input, timeoutMs);
  } catch (error) {
    return { valid: false, hardInvalid: false, reason: `wu-resolve-failed: ${String(error?.message || error)}` };
  }

  let headStatus = 0;
  let headReason = "";
  try {
    const head = await fetchWithTimeout(resolvedUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 Falon-LinkCheck",
        "Accept": "application/octet-stream,*/*;q=0.8",
        "Cache-Control": "no-cache"
      }
    }, timeoutMs);
    headStatus = head.status;
    const contentType = String(head.headers.get("content-type") || "");
    const contentLength = Number(head.headers.get("content-length") || 0);
    const finalUrl = head.url || resolvedUrl;
    if (head.status >= 400 && head.status !== 405 && head.status !== 501) {
      return { valid: false, hardInvalid: !isWu && [404, 410].includes(head.status), reason: `head-http-${head.status}`, resolvedUrl: finalUrl };
    }
    if ((head.ok || head.status < 400) && looksLikePackageProbe(input, finalUrl, contentType, contentLength)) {
      return { valid: true, hardInvalid: false, reason: "head-package-ok", resolvedUrl: finalUrl, statusCode: head.status };
    }
    headReason = `head-inconclusive-${head.status}`;
  } catch (error) {
    headReason = `head-error: ${String(error?.message || error)}`;
  }

  try {
    const get = await fetchWithTimeout(resolvedUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 Falon-LinkCheck",
        "Accept": "application/octet-stream,*/*;q=0.8",
        "Range": "bytes=0-1023",
        "Cache-Control": "no-cache"
      }
    }, timeoutMs);
    const body = await readProbeBytes(get, 1024);
    const contentType = String(get.headers.get("content-type") || "");
    const contentLength = Number(get.headers.get("content-length") || 0);
    const finalUrl = get.url || resolvedUrl;
    if (!(get.ok || get.status === 206)) {
      return { valid: false, hardInvalid: !isWu && [404, 410].includes(get.status), reason: `get-http-${get.status}`, resolvedUrl: finalUrl };
    }
    if (looksLikePackageProbe(input, finalUrl, contentType, contentLength, body)) {
      return { valid: true, hardInvalid: false, reason: "range-package-ok", resolvedUrl: finalUrl, statusCode: get.status };
    }
    return { valid: false, hardInvalid: !isWu && looksLikeTextErrorPayload(body, contentType), reason: "range-not-package", resolvedUrl: finalUrl };
  } catch (error) {
    if (headStatus && headStatus < 400) {
      return { valid: false, hardInvalid: false, reason: `${headReason}; range-error: ${String(error?.message || error)}`, resolvedUrl };
    }
    return { valid: false, hardInvalid: false, reason: String(error?.message || error || "probe-failed"), resolvedUrl };
  }
}

async function validateVersionItemWithRepair(item, bucket) {
  const urls = Array.isArray(item?.urls) ? [...new Set(item.urls.filter(Boolean))].slice(0, 6) : [];
  let result = { valid: false, hardInvalid: false, reason: "no-download-url", usableUrls: [] };

  const isLegacy = bucket === "legacy" || bucket === "legacyUwpVersions" || String(item?.package || "").toLowerCase() === "uwp" || String(item?.type || "").toLowerCase() === "legacy";

  if (isLegacy) {
    if (urls.length) {
      try {
        const nativeResults = await checkDownloadLinksNative(urls);
        const usableUrls = nativeLiveCandidateUrls(nativeResults, urls);
        if (usableUrls.length) {
          item.urls = usableUrls;
          item.downloadable = true;
          return {
            result: {
              valid: true,
              hardInvalid: false,
              reason: "native-linkcheck-ok",
              statusCode: nativeLinkCheckStatusCode(nativeResults.find(nativeLinkCheckPassed)),
              usableUrls
            },
            repaired: false
          };
        }
        const first = Array.isArray(nativeResults) ? nativeResults[0] : null;
        if (first) {
          result = {
            valid: false,
            hardInvalid: nativeLinkcheckShouldArchive(nativeResults),
            reason: String(first.error || first.reason || "native-linkcheck-failed"),
            usableUrls: []
          };
        }
      } catch (error) {
        result = { valid: false, hardInvalid: false, reason: `native-linkcheck-error: ${String(error?.message || error)}`, usableUrls: [] };
      }
    }

    // Для Legacy сначала быстро проверяем уже известные ссылки. Только если они все
    // не ожили — один раз пытаемся восстановить список из каталогов/метаданных.
    try {
      const repaired = await resolveLegacyUWPDownloadInfo(item?.short || item?.version || "", item?.releaseType || "release", item?.metadataUrl || "");
      const repairedUrls = Array.isArray(repaired?.urls) ? [...new Set(repaired.urls.filter(Boolean))].slice(0, 12) : [];
      if (repairedUrls.length) {
        const nativeResults = await checkDownloadLinksNative(repairedUrls);
        const usableUrls = nativeLiveCandidateUrls(nativeResults, repairedUrls);
        if (usableUrls.length) {
          item.urls = usableUrls;
          if (repaired.fileName) item.fileName = repaired.fileName;
          if (repaired.md5) item.md5 = repaired.md5;
          item.downloadable = true;
          return {
            result: {
              valid: true,
              hardInvalid: false,
              reason: "legacy-repaired-native-linkcheck-ok",
              statusCode: nativeLinkCheckStatusCode(nativeResults.find(nativeLinkCheckPassed)),
              usableUrls
            },
            repaired: true
          };
        }
        const first = Array.isArray(nativeResults) ? nativeResults[0] : null;
        if (first) {
          result = {
            valid: false,
            hardInvalid: nativeLinkcheckShouldArchive(nativeResults),
            reason: String(first.error || first.reason || "legacy-repaired-native-linkcheck-failed"),
            usableUrls: []
          };
        }
      } else if (!urls.length) {
        // Нет подтверждённой ссылки прямо сейчас — это ещё не доказательство,
        // что Legacy-версия исчезла. Оставляем её в каталоге и позволяем
        // установке выполнить обычный резолв при клике пользователя.
        result = { valid: false, hardInvalid: false, reason: "legacy-repair-no-live-urls-unconfirmed", usableUrls: [] };
      }
      if (repairedUrls.length && !urls.length) item.urls = repairedUrls;
    } catch (error) {
      // Ошибка самого поиска метаданных чаще означает временную сеть, поэтому не архивируем.
      result = { valid: false, hardInvalid: false, reason: `legacy-repair-failed: ${String(error?.message || error)}`, usableUrls: [] };
    }
    return { result, repaired: false };
  }

  const checks = [];
  const usableUrls = [];
  for (const url of urls) {
    const check = await checkDownloadLink(url, String(url).toLowerCase().startsWith("wu://") ? WU_VERSION_PROBE_TIMEOUT_MS : VERSION_PROBE_TIMEOUT_MS);
    checks.push(check);
    if (check.valid) usableUrls.push(url);
  }

  if (usableUrls.length) {
    item.urls = usableUrls;
    item.downloadable = true;
    const firstOk = checks.find(check => check?.valid === true) || { reason: "range-package-ok" };
    return { result: { ...firstOk, valid: true, hardInvalid: false, usableUrls }, repaired: false };
  }

  if (!urls.length) return { result, repaired: false };
  const last = checks[checks.length - 1] || result;
  const hardInvalid = checks.length > 0 && checks.every(check => check?.hardInvalid === true || (!check?.valid && !isTransientLinkcheckReason(check?.reason || "")));
  return { result: { ...last, valid: false, hardInvalid, usableUrls: [] }, repaired: false };
}

async function validateCatalogDownloads({ force = false } = {}, onProgress = () => {}) {
  if (!force && hasCompletedVersionValidation()) {
    const cache = readVersionValidationCache();
    const catalog = await fetchVersionCatalog({ force: false, includeInvalid: false });
    onProgress({
      stage: "cached",
      completed: Number(cache?.total || 0),
      total: Number(cache?.total || 0),
      valid: Number(cache?.valid || 0),
      invalid: Number(cache?.invalid || 0),
      percent: 100,
      cached: true
    });
    return { catalog, rawCatalog: catalog, cache, skipped: true };
  }

  const rawCatalog = await fetchVersionCatalog({ force, includeInvalid: true });
  const tasks = flatCatalogItems(rawCatalog);
  const total = tasks.length;
  const items = {};
  const archive = readVersionArchive();
  let archiveChanged = false;
  let completed = 0;
  let valid = 0;
  let invalid = 0;

  const isLegacyTask = (task) => task?.bucket === "legacy" || task?.bucket === "legacyUwpVersions" || String(task?.item?.package || "").toLowerCase() === "uwp" || String(task?.item?.type || "").toLowerCase() === "legacy";
  const legacyTasks = tasks.filter(isLegacyTask);
  const normalTasks = tasks.filter(task => !isLegacyTask(task));

  onProgress({ stage: "catalog-ready", completed, total, valid, invalid, percent: total ? 4 : 100 });

  const recordResult = (task, result, repaired = false) => {
    const { bucket, item } = task;
    const key = versionValidationKey(bucket, item);
    const usableUrls = Array.isArray(result?.usableUrls)
      ? [...new Set(result.usableUrls.map(url => String(url || "").trim()).filter(Boolean))]
      : [];
    items[key] = {
      valid: !!result.valid,
      hardInvalid: !!result.hardInvalid,
      reason: String(result.reason || ""),
      checkedAt: new Date().toISOString(),
      version: String(item?.version || item?.short || ""),
      bucket,
      repaired: !!repaired,
      usableUrls
    };
    completed += 1;
    if (result.valid) {
      valid += 1;
      if (archive.items?.[key]) {
        delete archive.items[key];
        archiveChanged = true;
      }
    } else if (result.hardInvalid) {
      invalid += 1;
      archive.items = archive.items && typeof archive.items === "object" ? archive.items : {};
      archive.items[key] = archivedVersionSnapshot(item, bucket, result.reason || "unavailable");
      archiveChanged = true;
    }
    onProgress({
      stage: "probing",
      completed,
      total,
      valid,
      invalid,
      current: String(item?.version || item?.short || "Bedrock"),
      currentKey: key,
      currentBucket: bucket,
      currentUrl: String(usableUrls[0] || (Array.isArray(item?.urls) ? item.urls[0] || "" : "")),
      remove: !!result.hardInvalid,
      archived: !!result.hardInvalid,
      reason: String(result.reason || ""),
      usableUrls,
      percent: total ? Math.max(4, Math.min(98, Math.round((completed / total) * 94) + 4)) : 100
    });
  };
  // UWP/APPX architecture: the catalog is trusted as metadata only. CDN URLs from
  // Windows Update are short-lived and Store resolution can temporarily fail, so
  // background validation must never decide whether a Legacy UWP version exists.
  // Real link resolution and strict package verification happen only when the user
  // starts an installation.
  for (const task of legacyTasks) {
    task.item.downloadable = true;
    recordResult(task, {
      valid: true,
      hardInvalid: false,
      reason: "uwp-resolve-on-install",
      usableUrls: []
    }, false);
  }

  const repairQueue = [];
  let repairCursor = 0;
  const repairWorker = async () => {
    while (repairCursor < repairQueue.length) {
      const task = repairQueue[repairCursor++];
      const { result, repaired } = await validateVersionItemWithRepair(task.item, task.bucket);
      recordResult(task, result, repaired);
    }
  };
  await Promise.all(Array.from({ length: Math.min(25, Math.max(repairQueue.length, 1)) }, () => repairWorker()));

  let cursor = 0;
  const worker = async () => {
    while (cursor < normalTasks.length) {
      const task = normalTasks[cursor++];
      const { result, repaired } = await validateVersionItemWithRepair(task.item, task.bucket);
      recordResult(task, result, repaired);
    }
  };

  await Promise.all(Array.from({ length: Math.min(VERSION_PROBE_CONCURRENCY, Math.max(normalTasks.length, 1)) }, () => worker()));

  if (archiveChanged) writeVersionArchive(archive);

  const cache = {
    policy: VERSION_VALIDATION_POLICY,
    completed: true,
    checkedAt: new Date().toISOString(),
    total,
    valid,
    invalid,
    items
  };
  writeVersionValidationCache(cache);
  const filteredCatalog = applyVersionValidationCache(rawCatalog, cache);
  catalogCache = filteredCatalog;
  catalogCacheAt = Date.now();

  onProgress({ stage: "done", completed, total, valid, invalid, percent: 100 });
  return { catalog: filteredCatalog, rawCatalog, cache };
}

function emit(win, channel, payload) {
  try {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  } catch {}
}

function isStrictPackageDownload(dest) {
  return /\.(?:msixvc|appx|eappx|appxbundle|msixbundle|msix)$/i.test(String(dest || ""));
}

function minMinecraftPackageBytes(dest) {
  return STRICT_PACKAGE_MIN_BYTES;
}

async function validateStrictPackageFile(file, dest) {
  if (!isStrictPackageDownload(dest)) return;
  const stat = fs.statSync(file);
  if (stat.size < minMinecraftPackageBytes(dest)) throw new Error("ERR_PACKAGE_TOO_SMALL");
  const fd = fs.openSync(file, "r");
  try {
    const buffer = Buffer.alloc(4096);
    const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, bytes).toString("utf8").trim().toLowerCase();
    if (head.startsWith("<") || head.startsWith("{") || head.includes("<html") || head.includes("<?xml")) {
      throw new Error("ERR_NOT_MINECRAFT_PACKAGE");
    }
  } finally {
    fs.closeSync(fd);
  }
}

function parseContentRangeTotal(header, current, fallback) {
  const raw = String(header || "");
  const match = raw.match(/\/([0-9]+|\*)$/);
  if (match && match[1] !== "*") return Number(match[1]) || fallback;
  return current > 0 ? current + fallback : fallback;
}

async function md5File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(file);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function downloadAttempt(url, dest, win, label) {
  fs.ensureDirSync(path.dirname(dest));
  const temp = `${dest}.download`;
  let current = fs.existsSync(temp) ? fs.statSync(temp).size : 0;
  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": "*/*",
    "Cache-Control": "no-cache"
  };
  if (current > 0) headers.Range = `bytes=${current}-`;

  const response = await fetchWithTimeout(url, { headers }, 90000);
  if (!(response.ok || response.status === 206)) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error("Сервер не вернул файл");

  if (current > 0 && response.status === 200) {
    fs.removeSync(temp);
    current = 0;
  }

  const contentType = String(response.headers.get("content-type") || "").trim().toLowerCase();
  const responseLength = Number(response.headers.get("content-length") || 0);
  const total = parseContentRangeTotal(response.headers.get("content-range"), current, responseLength);
  if (total && total > MAX_DOWNLOAD_BYTES) throw new Error("Пакет слишком большой");
  if (isStrictPackageDownload(dest)) {
    if (contentType.includes("text/") || contentType.includes("html") || contentType.includes("xml") || contentType.includes("json")) {
      throw new Error("ERR_NOT_MINECRAFT_PACKAGE");
    }
    if (total > 0 && total < minMinecraftPackageBytes(dest)) {
      throw new Error("ERR_PACKAGE_TOO_SMALL");
    }
  }

  const writer = fs.createWriteStream(temp, { flags: current > 0 ? "a" : "w" });
  let downloaded = current;
  let lastEmit = 0;
  const stream = Readable.fromWeb(response.body);
  stream.on("data", (chunk) => {
    downloaded += chunk.length;
    if (downloaded > MAX_DOWNLOAD_BYTES) {
      stream.destroy(new Error("Пакет слишком большой"));
      return;
    }
    const now = Date.now();
    if (now - lastEmit > DOWNLOAD_THROTTLE_MS) {
      lastEmit = now;
      emit(win, "game-download-progress", { label, downloaded, total, dest });
    }
  });

  await pipeline(stream, writer);
  emit(win, "game-download-progress", { label, downloaded, total: total || downloaded, dest });
  await validateStrictPackageFile(temp, dest);
  return { temp, downloaded, total: total || downloaded };
}

async function downloadToFile(url, dest, win, label, expectedMd5 = "") {
  let lastError = null;
  for (let attempt = 1; attempt <= DOWNLOAD_RETRY_LIMIT; attempt += 1) {
    try {
      const result = await downloadAttempt(url, dest, win, label);
      if (expectedMd5) {
        emit(win, "game-install-status", { stage: "verify", message: `Проверяю MD5: ${label}`, version: label });
        const actual = await md5File(result.temp);
        const expected = String(expectedMd5).trim().toLowerCase();
        if (expected && actual.toLowerCase() !== expected) {
          fs.removeSync(result.temp);
          throw new Error(`MD5 не совпал (${attempt}/${DOWNLOAD_RETRY_LIMIT})`);
        }
      }
      fs.moveSync(result.temp, dest, { overwrite: true });
      return dest;
    } catch (error) {
      lastError = error;
      if (attempt >= DOWNLOAD_RETRY_LIMIT) break;
      emit(win, "game-install-status", { stage: "retry", message: `Повтор загрузки ${attempt + 1}/${DOWNLOAD_RETRY_LIMIT}: ${label}`, version: label });
      await sleep(1000);
    }
  }
  throw lastError || new Error("Не удалось скачать пакет");
}

function promisifyExecFile(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: 10 * 60 * 1000, ...options }, (error, stdout, stderr) => {
      if (error) {
        const details = String(stderr || stdout || error.message || "").trim();
        reject(new Error(details || error.message));
        return;
      }
      resolve({ stdout: String(stdout || ""), stderr: String(stderr || "") });
    });
  });
}

async function commandExists(command) {
  if (process.platform !== "win32") return false;
  try {
    await promisifyExecFile("where.exe", [command], { timeout: 7000 });
    return true;
  } catch {
    return false;
  }
}

function appxDependencyLooksMissing(message) {
  const lower = String(message || "").toLowerCase();
  return [
    "windows.xbox",
    "gaming services",
    "xbox identity provider",
    "dependency",
    "dependencies",
    "0x80073cf3",
    "package failed updates, dependency or conflict validation",
    "failed updates, dependency or conflict validation",
    "microsoft.vclibs.140.00",
    "vclibs.140.00",
    "visual c++",
    "зависим",
    "не удалось разрешить зависимости"
  ].some(marker => lower.includes(marker));
}

async function isAppxPackageInstalled(name) {
  if (process.platform !== "win32") return false;
  const escaped = String(name || "").replaceAll("'", "''");
  const command = `if (Get-AppxPackage -Name '${escaped}' -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }`;
  try {
    await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

async function installMsStoreDependency(storeId) {
  const hasWingetExe = await commandExists("winget.exe");
  const hasWinget = hasWingetExe || await commandExists("winget");
  if (!hasWinget) return false;
  const command = hasWingetExe ? "winget.exe" : "winget";
  await promisifyExecFile(command, [
    "install", "--source", "msstore", "--id", storeId, "--exact", "--silent",
    "--accept-package-agreements", "--accept-source-agreements", "--disable-interactivity"
  ], { timeout: 20 * 60 * 1000 });
  return true;
}

function appxUwpVCLibsLooksMissing(message) {
  const lower = String(message || "").toLowerCase();
  return lower.includes("microsoft.vclibs.140.00") || lower.includes("vclibs.140.00") || lower.includes("visual c++");
}

async function tryInstallUwpVCLibsFramework(win, label) {
  if (process.platform !== "win32") return false;
  let lastError = null;
  for (const url of LOOSE_UWP_RUNTIME_ARCHIVE_URLS) {
    const escapedUrl = String(url || "").replaceAll("'", "''");
    const command = powershellUtf8(`Add-AppxPackage -ForceApplicationShutdown -Path '${escapedUrl}'`);
    try {
      emit(win, "game-install-status", { stage: "dependency", message: `Докачиваю зависимость: Microsoft Visual C++ UWP Runtime`, version: label, url });
      await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { timeout: 20 * 60 * 1000 });
      emit(win, "game-install-status", { stage: "dependency", message: `Зависимость готова: Microsoft Visual C++ UWP Runtime`, version: label });
      return true;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    emit(win, "game-install-status", { stage: "dependency-error", message: `Не удалось автоматически поставить Microsoft Visual C++ UWP Runtime: ${compactErrorDetails(lastError)}`, version: label });
  }
  return false;
}

async function tryAutoInstallAppxDependencies(reason, win, label) {
  if (!appxDependencyLooksMissing(reason)) return false;
  let changed = false;
  if (appxUwpVCLibsLooksMissing(reason)) {
    changed = true;
    await tryInstallUwpVCLibsFramework(win, label);
  }
  const deps = [
    { name: "Microsoft.GamingServices", id: "9MWPM2CQNLHN", label: "Gaming Services" },
    { name: "Microsoft.XboxIdentityProvider", id: "9WZDNCRD1HKW", label: "Xbox Identity Provider" }
  ];
  for (const dep of deps) {
    if (await isAppxPackageInstalled(dep.name)) continue;
    changed = true;
    emit(win, "game-install-status", { stage: "dependency", message: `Устанавливаю зависимость: ${dep.label}`, version: label });
    try {
      await installMsStoreDependency(dep.id);
      emit(win, "game-install-status", { stage: "dependency", message: `Зависимость готова: ${dep.label}`, version: label });
    } catch (error) {
      emit(win, "game-install-status", { stage: "dependency-error", message: `Не удалось установить ${dep.label}: ${compactErrorDetails(error)}`, version: label });
    }
  }
  return changed;
}

async function installAppxPackage(packagePath, win, label) {
  const escaped = String(packagePath).replaceAll("'", "''");
  const command = `Add-AppxPackage -ForceApplicationShutdown -Path '${escaped}'`;
  try {
    await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { timeout: LAUNCH_APPX_OP_TIMEOUT_MS });
    return;
  } catch (error) {
    const reason = String(error?.message || error || "");
    if (await tryAutoInstallAppxDependencies(reason, win, label)) {
      await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { timeout: 20 * 60 * 1000 });
      return;
    }
    throw error;
  }
}

function ensureVCRuntimeForVersion(folder) {
  if (!folder || !fs.existsSync(NOC_VCRUNTIME_DLL)) return false;
  const target = path.join(folder, "vcruntime140_1.dll");
  try {
    if (!fs.existsSync(target) || fs.statSync(target).size !== fs.statSync(NOC_VCRUNTIME_DLL).size) {
      fs.copySync(NOC_VCRUNTIME_DLL, target, { overwrite: true });
    }
    return true;
  } catch {
    return false;
  }
}

function runtimeFilePath(folder, fileName) {
  return path.join(String(folder || ""), String(fileName || ""));
}

function listMissingLooseUwpRuntimeFiles(folder) {
  return LOOSE_UWP_RUNTIME_FILES.filter((fileName) => !fs.existsSync(runtimeFilePath(folder, fileName)));
}

function powershellArrayLiteral(values = []) {
  return `@(${(values || []).map((value) => `'${powershellLiteral(value)}'`).join(",")})`;
}

async function copyLooseUwpRuntimeFromInstalledFramework(folder, files = []) {
  const missing = [...new Set((files || []).map((file) => String(file || "").trim()).filter(Boolean))];
  if (process.platform !== "win32" || !folder || !missing.length) return { copied: [], missing };

  const escapedFolder = powershellLiteral(folder);
  const command = powershellUtf8(`
    $ErrorActionPreference = 'SilentlyContinue';
    $target = '${escapedFolder}';
    New-Item -ItemType Directory -Path $target -Force | Out-Null;
    $files = ${powershellArrayLiteral(missing)};
    $copied = @();
    $roots = @();
    $packages = @(Get-AppxPackage -Name 'Microsoft.VCLibs.140.00' -ErrorAction SilentlyContinue | Sort-Object Version -Descending);
    foreach ($pkg in $packages) {
      if ($pkg -and $pkg.InstallLocation) { $roots += [string]$pkg.InstallLocation; }
    }
    try {
      $windowsApps = Join-Path $env:ProgramFiles 'WindowsApps';
      if (Test-Path -LiteralPath $windowsApps) {
        $roots += @(Get-ChildItem -LiteralPath $windowsApps -Directory -Filter 'Microsoft.VCLibs.140.00_*_x64__8wekyb3d8bbwe' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -ExpandProperty FullName);
      }
    } catch {}
    $roots = @($roots | Where-Object { $_ } | Select-Object -Unique);
    foreach ($file in $files) {
      $dest = Join-Path $target $file;
      if (Test-Path -LiteralPath $dest) { continue; }
      foreach ($root in $roots) {
        if (-not (Test-Path -LiteralPath $root)) { continue; }
        $src = Get-ChildItem -LiteralPath $root -File -Recurse -Filter $file -ErrorAction SilentlyContinue | Select-Object -First 1;
        if ($src -and (Test-Path -LiteralPath $src.FullName)) {
          Copy-Item -LiteralPath $src.FullName -Destination $dest -Force;
          if (Test-Path -LiteralPath $dest) { $copied += $file; break; }
        }
      }
    }
    $remaining = @($files | Where-Object { -not (Test-Path -LiteralPath (Join-Path $target $_)) });
    [pscustomobject]@{ copied = @($copied); missing = @($remaining); roots = [int]$roots.Count } | ConvertTo-Json -Depth 4 -Compress
  `);

  try {
    const result = await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
      timeout: 90000,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024
    });
    const payload = parsePowerShellJson(result.stdout)[0] || {};
    return {
      copied: Array.isArray(payload.copied) ? payload.copied.map(String) : (payload.copied ? [String(payload.copied)] : []),
      missing: Array.isArray(payload.missing) ? payload.missing.map(String) : (payload.missing ? [String(payload.missing)] : listMissingLooseUwpRuntimeFiles(folder)),
      roots: Number(payload.roots || 0)
    };
  } catch {
    return { copied: [], missing: listMissingLooseUwpRuntimeFiles(folder), roots: 0 };
  }
}

function extractLooseRuntimeFilesFromArchive(archivePath, folder, files = []) {
  const needed = [...new Set((files || []).map((file) => String(file || "").trim()).filter(Boolean))];
  if (!archivePath || !folder || !needed.length || !fs.existsSync(archivePath)) return [];
  const wanted = new Map(needed.map((fileName) => [fileName.toLowerCase(), fileName]));
  const copied = [];
  const zip = new AdmZip(archivePath);
  for (const entry of zip.getEntries()) {
    if (!entry || entry.isDirectory) continue;
    const base = path.basename(String(entry.entryName || "").replaceAll("\\", "/"));
    const targetName = wanted.get(base.toLowerCase());
    if (!targetName) continue;
    const target = runtimeFilePath(folder, targetName);
    fs.ensureDirSync(path.dirname(target));
    fs.writeFileSync(target, entry.getData());
    if (fs.existsSync(target)) copied.push(targetName);
  }
  return [...new Set(copied)];
}

async function downloadLooseUwpRuntimeArchive(win, label = "Legacy UWP") {
  fs.ensureDirSync(getRuntimeCacheDir());
  const archive = path.join(getRuntimeCacheDir(), "Microsoft.VCLibs.x64.14.00.uwp.appx.cache");
  try {
    if (fs.existsSync(archive) && fs.statSync(archive).size > 128 * 1024) return archive;
  } catch {}
  let lastError = null;
  for (const url of LOOSE_UWP_RUNTIME_ARCHIVE_URLS) {
    try {
      launchEmit(win, "runtime-download", "Проверяю зависимости…", `Докачиваю Visual C++ UWP Runtime для ${label}.`, {
        version: label,
        url
      });
      await downloadToFile(url, archive, win, `Visual C++ UWP Runtime • ${label}`);
      return archive;
    } catch (error) {
      lastError = error;
      try { fs.removeSync(archive); } catch {}
      try { fs.removeSync(`${archive}.download`); } catch {}
    }
  }
  throw lastError || new Error("Не удалось скачать Visual C++ UWP Runtime");
}

async function ensureLooseUwpRuntimeForVersion(folder, meta, win) {
  const targetFolder = String(folder || "").trim();
  if (!targetFolder || !fs.existsSync(targetFolder)) throw new Error("Папка распакованной версии не найдена");

  const label = String(meta?.version || meta?.short || meta?.name || "Legacy UWP").trim() || "Legacy UWP";
  let missing = listMissingLooseUwpRuntimeFiles(targetFolder);
  if (!missing.length) return { prepared: true, copied: [], downloaded: false, missing: [] };

  launchEmit(win, "runtime-check", "Проверяю зависимости…", `Для ${label} докладываю runtime DLL перед запуском.`, {
    version: label,
    missing
  });

  const copiedFromSystem = await copyLooseUwpRuntimeFromInstalledFramework(targetFolder, missing);
  missing = listMissingLooseUwpRuntimeFiles(targetFolder);
  if (copiedFromSystem.copied.length) {
    launchEmit(win, "runtime-copy", "Проверяю зависимости…", `Подтянул из Windows: ${copiedFromSystem.copied.join(", ")}.`, {
      version: label,
      copied: copiedFromSystem.copied,
      missing
    });
  }

  let downloaded = false;
  let downloadError = "";
  if (missing.length) {
    try {
      launchEmit(win, "runtime-download", "Проверяю зависимости…", "Часть DLL не найдена в Windows — пробую скачать runtime-пакет.", {
        version: label,
        missing
      });
      const archive = await downloadLooseUwpRuntimeArchive(win, label);
      const copiedFromArchive = extractLooseRuntimeFilesFromArchive(archive, targetFolder, missing);
      downloaded = copiedFromArchive.length > 0;
      missing = listMissingLooseUwpRuntimeFiles(targetFolder);
      if (copiedFromArchive.length) {
        launchEmit(win, "runtime-extract", "Проверяю зависимости…", `Докинул из runtime-пакета: ${copiedFromArchive.join(", ")}.`, {
          version: label,
          copied: copiedFromArchive,
          missing
        });
      }
    } catch (error) {
      downloadError = compactErrorDetails(error);
      missing = listMissingLooseUwpRuntimeFiles(targetFolder);
    }
  }

  if (missing.length) {
    const suffix = downloadError ? ` Автоподгрузка runtime не завершилась: ${downloadError}.` : "";
    throw new Error(`Не удалось подготовить runtime DLL для прямого запуска: ${missing.join(", ")}.${suffix}`);
  }

  launchEmit(win, "runtime-ready", "Зависимости готовы", `Все runtime DLL для ${label} на месте — открываю Minecraft.Windows.exe.`, {
    version: label,
    downloaded
  });
  return { prepared: true, copied: copiedFromSystem.copied, downloaded, missing: [] };
}

async function prepareDirectExeLaunchDependencies(exePath, meta, win) {
  if (meta?.systemInstalled) return { prepared: true, skipped: true };
  const folder = String(meta?.folder || path.dirname(String(exePath || "")) || "").trim();
  if (!folder || !fs.existsSync(folder)) return { prepared: true, skipped: true };

  if (isManagedLegacyUwpVersion(meta) || !!findLegacyManifestForMeta(meta, folder)) {
    const runtimeFolder = legacyRuntimeFolder(meta, exePath) || folder;
    return ensureLooseUwpRuntimeForVersion(runtimeFolder, meta, win);
  }

  if (isManagedGdkVersion(meta)) {
    ensureVCRuntimeForVersion(folder);
  }
  return { prepared: true, skipped: true };
}

async function extractWithNocHelper(packagePath, outDir) {
  if (!fs.existsSync(NOC_NATIVE_HELPER)) {
    throw new Error("Не найден встроенный extractor NocVersion/LeviLauncher");
  }
  fs.ensureDirSync(outDir);
  await promisifyExecFile(NOC_NATIVE_HELPER, ["--nocversion-extract", packagePath, outDir], { timeout: 60 * 60 * 1000 });
  return outDir;
}

function safeExtractZipEntry(entry, root) {
  const raw = String(entry.entryName || "").replaceAll("\\", "/");
  const normalized = path.normalize(raw).replace(/^(?:\.\.[/\\])+/, "");
  const target = path.join(root, normalized);
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return;
  if (entry.isDirectory) {
    fs.ensureDirSync(target);
    return;
  }
  fs.ensureDirSync(path.dirname(target));
  fs.writeFileSync(target, entry.getData());
}

function extractUwpArchive(packagePath, outDir) {
  const lower = String(packagePath || "").toLowerCase();
  const zip = new AdmZip(packagePath);
  if (lower.endsWith(".appxbundle") || lower.endsWith(".msixbundle")) {
    const entries = zip.getEntries();
    const scoreChild = (entry) => {
      const name = String(entry?.entryName || "").replaceAll("\\", "/").toLowerCase();
      if (!name || entry?.isDirectory) return -1000000;
      if (name.includes("blockmap") || name.includes("signature") || name.endsWith(".p7x")) return -1000000;
      if (!/\.(?:appx|eappx|msix)$/i.test(name)) return -1000000;
      let score = 0;
      if (name.includes("microsoft.minecraft")) score += 1200;
      if (name.includes("_x64") || name.includes("-x64")) score += 700;
      if (name.includes("_neutral_") || name.includes("resources") || name.includes("language") || name.includes("scale-")) score -= 1600;
      if (/\.(?:appx|eappx)$/i.test(name)) score += 100;
      return score;
    };
    const child = entries.slice().sort((a, b) => scoreChild(b) - scoreChild(a))[0];
    if (!child || scoreChild(child) <= -100000) throw new Error("В bundle не найден подходящий основной APPX");
    const temp = path.join(outDir, `bundle-${Date.now()}.appx`);
    fs.ensureDirSync(outDir);
    fs.writeFileSync(temp, child.getData());
    try {
      extractUwpArchive(temp, outDir);
    } finally {
      try { fs.removeSync(temp); } catch {}
    }
    return;
  }
  for (const entry of zip.getEntries()) {
    if (/AppxSignature\.p7x$/i.test(entry.entryName)) continue;
    safeExtractZipEntry(entry, outDir);
  }
}

function ensureCanonicalMinecraftExe(outDir) {
  const direct = path.join(outDir, "Minecraft.Windows.exe");
  if (fs.existsSync(direct)) return direct;
  const found = findExeRecursively(outDir, 7);
  if (found && found !== direct) {
    try {
      fs.copySync(found, direct, { overwrite: true });
      return direct;
    } catch {}
  }
  return found || "";
}

function createStagingDirForFolder(folder, label = "stage") {
  const parent = path.dirname(folder);
  const base = safeName(path.basename(folder), "bedrock-version");
  return path.join(parent, `.${base}.${label}.${Date.now()}-${crypto.randomUUID()}`);
}

function replaceDirectoryAtomically(sourceDir, targetDir) {
  const source = String(sourceDir || "").trim();
  const target = String(targetDir || "").trim();
  if (!source || !target || !fs.existsSync(source)) {
    throw new Error("Не удалось заменить папку версии: staging не найден");
  }

  const backup = `${target}.backup-${Date.now()}-${crypto.randomUUID()}`;
  let movedOld = false;
  try {
    if (fs.existsSync(target)) {
      fs.moveSync(target, backup, { overwrite: true });
      movedOld = true;
    }
    fs.moveSync(source, target, { overwrite: true });
    if (movedOld) {
      try { fs.removeSync(backup); } catch {}
    }
  } catch (error) {
    try {
      if (!fs.existsSync(target) && movedOld && fs.existsSync(backup)) {
        fs.moveSync(backup, target, { overwrite: true });
      }
    } catch {}
    throw error;
  } finally {
    try { if (fs.existsSync(source)) fs.removeSync(source); } catch {}
  }
}

function hasGdkGameConfig(folder) {
  const direct = path.join(String(folder || ""), "MicrosoftGame.Config");
  const lower = path.join(String(folder || ""), "MicrosoftGame.config");
  return fs.existsSync(direct) || fs.existsSync(lower);
}

function isManagedGdkVersion(meta) {
  if (!meta || meta.systemInstalled) return false;
  return String(meta.package || "").toLowerCase() === "gdk";
}

function managedGdkFolderLooksIncomplete(meta) {
  const folder = String(meta?.folder || "").trim();
  if (!folder || !fs.existsSync(folder)) return true;
  const exe = String(meta?.exePath || "").trim() || path.join(folder, "Minecraft.Windows.exe");
  if (!fs.existsSync(exe)) return true;
  if (!hasGdkGameConfig(folder)) {
    // Старые сборки иногда имеют конфиг глубже по дереву, поэтому не считаем это
    // безусловной поломкой. Но при ревизии ниже актуальной папку всё равно починим.
    return Number(meta?.layoutRevision || 0) < GDK_LAYOUT_REVISION;
  }
  return Number(meta?.layoutRevision || 0) < GDK_LAYOUT_REVISION;
}

async function repairManagedGdkVersionIfNeeded(meta) {
  if (!isManagedGdkVersion(meta) || !managedGdkFolderLooksIncomplete(meta)) return meta;

  const folder = String(meta.folder || "").trim();
  const installerPath = String(meta.installerPath || "").trim();
  if (!folder || !installerPath || !fs.existsSync(installerPath)) {
    return meta;
  }

  const stage = createStagingDirForFolder(folder, "gdk-repair");
  try {
    fs.removeSync(stage);
    fs.ensureDirSync(stage);
    const method = await installMsixvcPackage(installerPath, stage);
    if (method !== "noc-extractor") {
      try { fs.removeSync(stage); } catch {}
      return meta;
    }

    ensureVCRuntimeForVersion(stage);
    const exe = ensureCanonicalMinecraftExe(stage);
    if (!exe || !fs.existsSync(exe)) {
      throw new Error("GDK repair: Minecraft.Windows.exe не найден после чистой распаковки");
    }

    replaceDirectoryAtomically(stage, folder);
    const repaired = {
      ...meta,
      folder,
      exePath: path.join(folder, "Minecraft.Windows.exe"),
      hasExe: true,
      installMethod: method,
      layoutRevision: GDK_LAYOUT_REVISION,
      repairedAt: new Date().toISOString()
    };
    writeJsonPretty(getMetaPath(folder), repaired);
    return repaired;
  } catch {
    try { fs.removeSync(stage); } catch {}
    return meta;
  }
}

async function findWdappExecutable() {
  if (process.platform !== "win32") return "";
  const candidates = [
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Microsoft GDK", "bin", "wdapp.exe"),
    path.join(process.env.ProgramFiles || "C:\\Program Files", "Microsoft GDK", "bin", "wdapp.exe"),
    "wdapp.exe"
  ];

  for (const candidate of candidates) {
    try {
      if (candidate.toLowerCase() === "wdapp.exe") {
        if (await commandExists("wdapp.exe")) return candidate;
      } else if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {}
  }
  return "";
}

async function launchViaWdappExecutable(exePath, meta, win) {
  const wdapp = await findWdappExecutable();
  if (!wdapp) throw new Error("wdapp.exe не найден");

  const previousPids = await snapshotMinecraftPids();
  launchEmit(win, "wdapp", "Запускаем игру…", "Пробую запуск через Microsoft GDK wdapp.", { version: meta?.version || meta?.name || "" });

  let childError = null;
  let childExitCode = null;
  const child = spawn(wdapp, ["launch", exePath], {
    cwd: path.dirname(exePath),
    detached: false,
    stdio: "ignore",
    windowsHide: true
  });

  child.once("error", (error) => { childError = error; });
  child.once("exit", (code) => { childExitCode = code; });

  const visible = await waitForVisibleMinecraftWindow(meta, win, {
    previousPids,
    timeoutMs: LAUNCH_ACTIVATION_WAIT_MS,
    attempt: "wdapp"
  });
  if (visible) return { ...visible, mode: "wdapp-window", version: meta?.version || meta?.name || "" };

  if (childError) throw childError;
  if (childExitCode !== null && childExitCode !== 0) {
    throw new Error(`wdapp launch завершился с кодом ${childExitCode}`);
  }
  await cleanupInvisibleLaunchCandidates(meta, [], previousPids, win);
  throw new Error("wdapp запустил процесс, но окно Minecraft не появилось");
}
async function tryRegisterExtractedAppx(outDir) {
  if (process.platform !== "win32") return false;
  const manifest = path.join(outDir, "AppxManifest.xml");
  if (!fs.existsSync(manifest)) return false;
  const escaped = manifest.replaceAll("'", "''");
  const command = `Add-AppxPackage -ForceApplicationShutdown -Register '${escaped}'`;
  try {
    await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { timeout: 20 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

async function installMsixvcPackage(packagePath, outDir) {
  try {
    await extractWithNocHelper(packagePath, outDir);
    return "noc-extractor";
  } catch (helperError) {
    if (!(await commandExists("wdapp.exe"))) throw helperError;
    await promisifyExecFile("wdapp.exe", ["install", packagePath], { timeout: 30 * 60 * 1000 });
    return "wdapp-msixvc";
  }
}

function inferPackageKind(version, installerPath) {
  const lowerPath = String(installerPath || "").toLowerCase();
  const packageHint = String(version?.package || "").toLowerCase();
  if (lowerPath.endsWith(".msixvc") || packageHint === "gdk") return "gdk";
  if (/\.(?:appx|eappx|appxbundle|msixbundle|msix)$/i.test(lowerPath) || packageHint === "uwp") return "uwp";
  return packageHint || "unknown";
}

function inferVersionType(version) {
  const label = String(version?.version || "").toLowerCase();
  if (label.includes("preview") || String(version?.releaseType || "").toLowerCase() === "preview") return "preview";
  if (label.includes("legacy") || String(version?.type || "").toLowerCase() === "legacy") return "legacy";
  return "release";
}

function versionFolderName(version) {
  const type = inferVersionType(version);
  const label = safeName(version?.version || version?.short || "Bedrock");
  return safeName(`${type}-${label}`, "bedrock-version");
}

function writeVersionMeta(folder, version, installerPath, installMethod, extra = {}) {
  const meta = {
    name: path.basename(folder),
    version: String(version?.version || version?.short || "").trim(),
    short: String(version?.short || "").trim(),
    type: inferVersionType(version),
    package: inferPackageKind(version, installerPath),
    installerPath,
    installMethod,
    installedAt: new Date().toISOString(),
    urls: Array.isArray(version?.urls) ? version.urls : [],
    source: String(version?.source || "").trim(),
    ...extra
  };
  fs.ensureDirSync(folder);
  writeJsonPretty(getMetaPath(folder), meta);
  return meta;
}

function listManagedInstalledVersions() {
  const dir = getVersionsDir();
  fs.ensureDirSync(dir);
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const folder = path.join(dir, name);
    let stat;
    try { stat = fs.statSync(folder); } catch { continue; }
    if (!stat.isDirectory()) continue;
    const meta = readJsonSafe(getMetaPath(folder));
    if (!meta) continue;

    const legacyLayout = isManagedLegacyUwpVersion(meta) ? inspectExtractedLegacyLayout(folder, meta) : null;
    const storedExe = existingPathOrEmpty(meta?.exePath);
    const rootExe = existingPathOrEmpty(path.join(folder, "Minecraft.Windows.exe"));
    const exePath = legacyLayout?.exePath || storedExe || rootExe || findExeRecursively(folder, 8);
    const manifestPath = legacyLayout?.manifestPath || existingPathOrEmpty(meta?.manifestPath);
    const packageRoot = legacyLayout?.packageRoot || existingPathOrEmpty(meta?.packageRoot) || "";

    // Не показываем как "установленную" старую Legacy-папку без Minecraft.Windows.exe:
    // она не запускается и должна переустановиться чисто из каталога.
    if (isManagedLegacyUwpVersion(meta) && !exePath) continue;

    out.push({
      ...meta,
      folder,
      exePath,
      manifestPath,
      packageRoot,
      hasExe: !!exePath
    });
  }
  return out.sort((a, b) => compareVersionDesc(a.version, b.version));
}

function findManagedInstalledVersionByName(name) {
  const requested = String(name || "").trim();
  if (!requested) return null;
  const lower = requested.toLowerCase();
  return listManagedInstalledVersions().find((item) => {
    return String(item?.name || "").trim().toLowerCase() === lower || String(item?.version || "").trim().toLowerCase() === lower;
  }) || null;
}

async function findInstalledVersionForLaunch(name) {
  const managed = findManagedInstalledVersionByName(name);
  if (managed) return managed;
  const requested = String(name || "").trim();
  if (!requested) return null;
  const lower = requested.toLowerCase();
  const system = await detectSystemInstalledVersions();
  return system.find((item) => {
    return String(item?.name || "").trim().toLowerCase() === lower || String(item?.version || "").trim().toLowerCase() === lower;
  }) || null;
}

function parsePowerShellJson(stdout) {
  const raw = String(stdout || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function normalizeDetectedVersion(value, fallback = "") {
  const raw = String(value || fallback || "").trim();
  return raw || "unknown";
}

async function queryMinecraftAppxPackages() {
  if (process.platform !== "win32") return [];
  const command = `
    $items = @(
      Get-AppxPackage |
      Where-Object { $_.Name -like '*Minecraft*' -and $_.Name -notlike '*Launcher*' } |
      Select-Object Name, PackageFullName, PackageFamilyName, @{Name='Version';Expression={$_.Version.ToString()}}, InstallLocation
    );
    $items | ConvertTo-Json -Depth 4 -Compress
  `;
  try {
    const result = await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { timeout: 45000 });
    return parsePowerShellJson(result.stdout);
  } catch {
    return [];
  }
}

function findExeRecursively(root, maxDepth = 4) {
  if (!root || !fs.existsSync(root)) return "";
  const target = "minecraft.windows.exe";
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length) {
    const current = queue.shift();
    let entries = [];
    try { entries = fs.readdirSync(current.dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current.dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === target) return full;
      if (entry.isDirectory() && current.depth < maxDepth) queue.push({ dir: full, depth: current.depth + 1 });
    }
  }
  return "";
}

async function getExeProductVersion(exePath) {
  if (!exePath || process.platform !== "win32") return "";
  const escaped = String(exePath).replaceAll("'", "''");
  const command = `try { (Get-Item -LiteralPath '${escaped}').VersionInfo.ProductVersion } catch { '' }`;
  try {
    const result = await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { timeout: 20000 });
    return String(result.stdout || "").trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean)[0] || "";
  } catch {
    return "";
  }
}

function defaultGdkInstallRoots() {
  const drive = process.env.SystemDrive || "C:";
  return [
    { type: "release", root: path.join(drive, "XboxGames", "Minecraft for Windows", "Content"), label: "Minecraft for Windows" },
    { type: "preview", root: path.join(drive, "XboxGames", "Minecraft Preview", "Content"), label: "Minecraft Preview" }
  ];
}

async function detectSystemInstalledVersions() {
  if (process.platform !== "win32") return [];
  const [releaseAppId, previewAppId, appxPackages] = await Promise.all([
    findMinecraftAppId("release").catch(() => ""),
    findMinecraftAppId("preview").catch(() => ""),
    queryMinecraftAppxPackages()
  ]);

  const detected = [];
  for (const pkg of appxPackages) {
    const fullName = `${pkg?.Name || ""} ${pkg?.PackageFamilyName || ""}`.toLowerCase();
    if (!fullName.includes("minecraft")) continue;
    const type = /preview|beta|windowsbeta/.test(fullName) ? "preview" : "release";
    const appId = type === "preview" ? previewAppId : releaseAppId;
    const installLocation = String(pkg?.InstallLocation || "").trim();
    const exe = installLocation ? findExeRecursively(installLocation, 2) : "";
    const launchable = !!appId || !!exe;
    if (!launchable) continue;
    const version = normalizeDetectedVersion(pkg?.Version, type === "preview" ? "Preview" : "Release");
    detected.push({
      name: `system-appx-${safeName(pkg?.PackageFullName || `${type}-${version}`)}`,
      version,
      type,
      package: "system",
      installMethod: "Windows package",
      folder: installLocation,
      hasExe: !!exe,
      exePath: exe,
      appId,
      launchable,
      systemInstalled: true,
      source: "Get-AppxPackage"
    });
  }

  for (const candidate of defaultGdkInstallRoots()) {
    if (!fs.existsSync(candidate.root)) continue;
    const exe = findExeRecursively(candidate.root, 4);
    const appId = candidate.type === "preview" ? previewAppId : releaseAppId;
    const launchable = !!appId || !!exe;
    if (!launchable) continue;
    const productVersion = await getExeProductVersion(exe);
    detected.push({
      name: `system-gdk-${candidate.type}-${safeName(productVersion || candidate.label)}`,
      version: normalizeDetectedVersion(productVersion, candidate.label),
      type: candidate.type,
      package: "gdk-system",
      installMethod: "XboxGames / system",
      folder: candidate.root,
      hasExe: !!exe,
      exePath: exe,
      appId,
      launchable,
      systemInstalled: true,
      source: candidate.root
    });
  }

  const chosen = new Map();
  for (const item of detected) {
    const key = `${String(item.type || "release").toLowerCase()}|${String(item.version || "unknown").toLowerCase()}`;
    const existing = chosen.get(key);
    if (!existing || (!existing.appId && item.appId) || (!existing.hasExe && item.hasExe)) chosen.set(key, item);
  }
  return [...chosen.values()];
}

async function listInstalledVersions() {
  const managed = listManagedInstalledVersions();
  const system = await detectSystemInstalledVersions();
  const combined = [...system, ...managed];
  const chosen = new Map();
  for (const item of combined) {
    const key = `${String(item.type || "release").toLowerCase()}|${String(item.version || item.name || "unknown").toLowerCase()}`;
    const existing = chosen.get(key);
    if (!existing || item.systemInstalled || (!existing.hasExe && item.hasExe)) chosen.set(key, item);
  }
  return [...chosen.values()].sort((a, b) => compareVersionDesc(a.version, b.version));
}


function shortUrlForError(url) {
  const raw = String(url || "").trim();
  if (!raw) return "<empty-url>";
  if (raw.toLowerCase().startsWith("wu://")) {
    try {
      const parsed = new URL(raw);
      const file = parsed.searchParams.get("filename") || "legacy-package";
      return `wu://${parsed.hostname || "unknown"}/${String(parsed.pathname || "").replace(/^\/+|\/+$/g, "") || "1"}?filename=${file}`;
    } catch {
      return raw.slice(0, 180);
    }
  }
  return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
}

function cleanupFailedInstallerCandidate(installerPath) {
  try { fs.removeSync(`${installerPath}.download`); } catch {}
  try {
    if (fs.existsSync(installerPath) && fs.statSync(installerPath).size < STRICT_PACKAGE_MIN_BYTES) {
      fs.removeSync(installerPath);
    }
  } catch {}
}

async function downloadPackageFromCandidates(version, urls, win, label) {
  const attempts = [];
  const uniqueUrls = [...new Set((urls || []).map(item => String(item || "").trim()).filter(Boolean))];
  if (!uniqueUrls.length) throw new Error("Для этой версии нет ссылки скачивания");

  const isUwp = String(version?.package || "").trim().toLowerCase() === "uwp";
  if (isUwp && nativeHelperAvailable()) {
    const preferredName = String(version.fileName || "").trim();
    const fileName = preferredName && hasPackageExt(preferredName)
      ? safeName(path.basename(preferredName), "minecraft-package")
      : safeName(packageBaseName(uniqueUrls[0], "minecraft-legacy.appx"), "minecraft-legacy.appx");
    const installerPath = path.join(getInstallersDir(), fileName);
    emit(win, "game-install-status", {
      stage: "resolve-link",
      message: `Пробую быстрый UWP-загрузчик: ${label}`,
      version: label,
      candidates: uniqueUrls.length
    });
    try {
      const nativeDownload = await downloadToFileNative(uniqueUrls, installerPath, win, label, version.md5 || "");
      return {
        installerPath: nativeDownload.installerPath || installerPath,
        resolvedUrl: nativeDownload.resolvedUrl || "",
        chosenUrl: nativeDownload.chosenUrl || uniqueUrls[0],
        fileName: nativeDownload.fileName || fileName
      };
    } catch (nativeError) {
      // Native helper is an optimisation, not the only download path. Some Store/WU
      // responses work through the legacy JS resolver/downloader even when the helper
      // cannot complete the full handshake or reports an incomplete result envelope.
      attempts.push(`native-helper → ${compactErrorDetails(nativeError)}`);
      cleanupFailedInstallerCandidate(installerPath);
      emit(win, "game-install-status", {
        stage: "resolve-link-fallback",
        message: `Быстрый UWP-загрузчик не сработал — пробую резервную схему загрузки: ${label}`,
        version: label,
        reason: compactErrorDetails(nativeError),
        candidates: uniqueUrls.length
      });
    }
  }

  for (let index = 0; index < uniqueUrls.length; index += 1) {
    const candidate = uniqueUrls[index];
    let resolvedUrl = "";
    let fileName = "";
    let installerPath = "";
    const mirror = `${index + 1}/${uniqueUrls.length}`;

    try {
      emit(win, "game-install-status", {
        stage: "resolve-link",
        message: uniqueUrls.length === 1
          ? `Проверенная ссылка готова: ${label}`
          : `Проверяю ссылку ${mirror}: ${label}`,
        version: label,
        candidate: shortUrlForError(candidate)
      });
      if (String(candidate).toLowerCase().startsWith("wu://")) {
        resolvedUrl = await resolveWindowsUpdateURL(candidate);
      } else {
        resolvedUrl = candidate;
      }
      if (!resolvedUrl) throw new Error("resolver-returned-empty-url");
    } catch (error) {
      attempts.push(`ссылка ${mirror} ${shortUrlForError(candidate)} → resolve: ${compactErrorDetails(error)}`);
      continue;
    }

    const preferredName = String(version.fileName || "").trim();
    fileName = preferredName && hasPackageExt(preferredName)
      ? safeName(path.basename(preferredName), "minecraft-package")
      : packageBaseName(candidate, packageBaseName(resolvedUrl, "minecraft-package.msixvc"));
    installerPath = path.join(getInstallersDir(), fileName);

    try {
      emit(win, "game-install-status", {
        stage: "download",
        message: `Скачиваю ${label} • зеркало ${mirror}`,
        version: label,
        installerPath,
        candidate: shortUrlForError(candidate)
      });
      await downloadToFile(resolvedUrl, installerPath, win, label, version.md5 || "");
      return { installerPath, resolvedUrl, chosenUrl: candidate, fileName };
    } catch (error) {
      attempts.push(`ссылка ${mirror} ${shortUrlForError(candidate)} → download: ${compactErrorDetails(error)}`);
      cleanupFailedInstallerCandidate(installerPath);
    }
  }

  const details = attempts.slice(-8).join(" | ");
  throw new Error(`Не удалось скачать ${label}. Проверено ссылок: ${uniqueUrls.length}. ${details || "рабочая ссылка не найдена"}`);
}

async function downloadAndInstallVersion(payload = {}, win) {
  let version = payload.version && typeof payload.version === "object" ? { ...payload.version } : { ...payload };
  let urls = Array.isArray(version.urls) ? version.urls.filter(Boolean) : [];

  if (String(version.package || "").toLowerCase() === "uwp" && version.validatedDownloadLinks !== true) {
    const resolved = await resolveLegacyUWPDownloadInfo(version.short || version.version || "", version.releaseType || "release", version.metadataUrl || "");
    if (resolved.urls?.length) urls = [...new Set([...resolved.urls, ...urls])];
    if (resolved.fileName && !version.fileName) version.fileName = resolved.fileName;
    if (resolved.md5 && !version.md5) version.md5 = resolved.md5;
    version.urls = urls;
  }

  if (!urls.length) throw new Error("Для этой версии нет ссылки скачивания");

  fs.ensureDirSync(getInstallersDir());
  fs.ensureDirSync(getVersionsDir());

  const label = String(version.version || version.short || "Bedrock");
  let downloaded;
  try {
    downloaded = await downloadPackageFromCandidates(version, urls, win, label);
  } catch (error) {
    if (String(version.package || "").toLowerCase() === "uwp") {
      const key = markVersionDownloadBroken(version, "legacy", compactErrorDetails(error));
      emit(win, "game-catalog-validation-progress", {
        stage: "download-unconfirmed",
        remove: false,
        archived: false,
        currentKey: key,
        current: label,
        reason: compactErrorDetails(error),
        background: true
      });
    }
    throw error;
  }
  const installerPath = downloaded.installerPath;

  const folder = path.join(getVersionsDir(), versionFolderName(version));
  const kind = inferPackageKind(version, installerPath);
  let installMethod = "";
  let installExtra = {};

  emit(win, "game-install-status", { stage: "install", message: `Устанавливаю ${label}`, version: label, installerPath });

  if (kind === "uwp") {
    // Legacy UWP распаковываем в чистый staging. Если extractor вернул не главный
    // child APPX или пакет неполный, старая рабочая папка версии не портится.
    const stage = createStagingDirForFolder(folder, "legacy-install");
    let extractError = null;
    let layout = null;
    try {
      fs.removeSync(stage);
      fs.ensureDirSync(stage);
      try {
        const extracted = await extractLegacyUwpPackageNative(installerPath, stage, win, label);
        installMethod = extracted.method || "go-appx-extract";
        layout = inspectExtractedLegacyLayout(stage, extracted);
      } catch (helperError) {
        extractError = helperError;
        try {
          // Фолбэк для редких пакетов, которые штатный APPX extractor не разобрал.
          await extractWithNocHelper(installerPath, stage);
          installMethod = "native-legacy-extract";
          layout = inspectExtractedLegacyLayout(stage);
        } catch (nativeError) {
          throw new Error(`Legacy UWP скачан, но распаковка не завершена: ${compactErrorDetails(extractError)} | native fallback: ${compactErrorDetails(nativeError)}`);
        }
      }

      if (!layout?.hasExe) {
        throw new Error("Legacy UWP распакован, но Minecraft.Windows.exe не найден. Пакет не будет помечен как установленный.");
      }
      if (!layout?.hasManifest) {
        throw new Error("Legacy UWP распакован без AppxManifest.xml. Пакет не будет помечен как установленный, чтобы не хранить битую версию.");
      }

      // Loose Legacy UWP builds should be runnable immediately after install,
      // including when the user opens Minecraft.Windows.exe from the version folder.
      // Prepare the full UWP VC runtime set before the staging folder becomes active.
      ensureVCRuntimeForVersion(layout.packageRoot || stage);
      await ensureLooseUwpRuntimeForVersion(layout.packageRoot || stage, version, win);
      replaceDirectoryAtomically(stage, folder);
      const finalLayout = inspectExtractedLegacyLayout(folder);
      if (!finalLayout.hasExe || !finalLayout.hasManifest) {
        throw new Error("Legacy UWP был распакован, но финальная папка не прошла проверку EXE/manifest");
      }
      installExtra = {
        exePath: finalLayout.exePath,
        manifestPath: finalLayout.manifestPath,
        packageRoot: finalLayout.packageRoot,
        layoutRevision: 2
      };
      // Регистрацию loose-пакета делаем только при нажатии «Запустить».
      // Так скачивание не ломается из-за уже установленного Minecraft в Windows.
    } catch (error) {
      try { fs.removeSync(stage); } catch {}
      throw error;
    }
  } else if (kind === "gdk") {
    // GDK распаковываем сначала в чистый staging, а затем атомарно заменяем папку версии.
    // Это защищает от смешивания старых DLL с новым Minecraft.Windows.exe:
    // именно такой микс даёт ошибки вида "MoveTrackedGlobalReference ... cohtml.WindowsDesktop.dll".
    const stage = createStagingDirForFolder(folder, "gdk-install");
    try {
      fs.removeSync(stage);
      fs.ensureDirSync(stage);
      installMethod = await installMsixvcPackage(installerPath, stage);
      if (installMethod === "noc-extractor") {
        ensureVCRuntimeForVersion(stage);
        const exe = ensureCanonicalMinecraftExe(stage);
        if (!exe || !fs.existsSync(exe)) {
          throw new Error("GDK версия распакована, но Minecraft.Windows.exe не найден");
        }
        await tryRegisterExtractedAppx(stage);
        replaceDirectoryAtomically(stage, folder);
      } else {
        // Если extractor недоступен и wdapp установил пакет системно,
        // оставляем маленькую meta-папку, как и раньше.
        try { fs.removeSync(stage); } catch {}
        fs.ensureDirSync(folder);
      }
    } catch (error) {
      try { fs.removeSync(stage); } catch {}
      throw error;
    }
  } else {
    throw new Error("Не удалось определить тип пакета версии");
  }

  const meta = writeVersionMeta(folder, version, installerPath, installMethod, kind === "gdk" && installMethod === "noc-extractor"
    ? { layoutRevision: GDK_LAYOUT_REVISION, ...installExtra }
    : installExtra);
  emit(win, "game-install-status", { stage: "done", message: `Установлено: ${label}`, version: label, meta });
  return meta;
}

async function openVersionsFolder() {
  fs.ensureDirSync(getVersionsDir());
  await shell.openPath(getVersionsDir());
  return getVersionsDir();
}

async function openInstallersFolder() {
  fs.ensureDirSync(getInstallersDir());
  await shell.openPath(getInstallersDir());
  return getInstallersDir();
}

function powershellUtf8(command) {
  return `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [Console]::OutputEncoding; ${String(command || "")}`;
}

function legacyUwpRegistrationConflict(message) {
  const lower = String(message || "").toLowerCase();
  return lower.includes("0x80073cfb") || lower.includes("already installed") || lower.includes("already been installed") || lower.includes("resourceexists") || lower.includes("уже установлен") || lower.includes("уже установлена");
}

function isManagedLegacyUwpVersion(meta) {
  if (!meta || meta.systemInstalled) return false;
  const packageType = String(meta.package || "").toLowerCase();
  const versionType = String(meta.type || "").toLowerCase();
  const method = String(meta.installMethod || "").toLowerCase();
  return packageType === "uwp" || versionType === "legacy" || method.includes("legacy");
}

function findFileByNamesRecursively(root, names = [], maxDepth = 5) {
  const base = String(root || "").trim();
  if (!base || !fs.existsSync(base)) return "";
  const wanted = new Set((names || []).map((name) => String(name || "").toLowerCase()).filter(Boolean));
  if (!wanted.size) return "";

  const queue = [{ dir: base, depth: 0 }];
  while (queue.length) {
    const current = queue.shift();
    let entries = [];
    try { entries = fs.readdirSync(current.dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current.dir, entry.name);
      if (entry.isFile() && wanted.has(String(entry.name || "").toLowerCase())) return full;
      if (entry.isDirectory() && current.depth < maxDepth) queue.push({ dir: full, depth: current.depth + 1 });
    }
  }
  return "";
}

function findExtractedLegacyManifest(folder) {
  const root = String(folder || "").trim();
  const direct = path.join(root, "AppxManifest.xml");
  if (fs.existsSync(direct)) return direct;
  const alt = path.join(root, "AppXManifest.xml");
  if (fs.existsSync(alt)) return alt;
  return findFileByNamesRecursively(root, ["AppxManifest.xml", "AppXManifest.xml"], 6);
}

function existingPathOrEmpty(value) {
  const target = String(value || "").trim();
  return target && fs.existsSync(target) ? target : "";
}

function inspectExtractedLegacyLayout(folder, hints = {}) {
  const root = String(folder || "").trim();
  if (!root || !fs.existsSync(root)) {
    return { root, packageRoot: "", manifestPath: "", exePath: "", hasManifest: false, hasExe: false };
  }

  let manifestPath = existingPathOrEmpty(hints?.manifestPath);
  if (!manifestPath) manifestPath = findExtractedLegacyManifest(root);

  let exePath = existingPathOrEmpty(hints?.exePath);
  if (!exePath && manifestPath) exePath = findExeRecursively(path.dirname(manifestPath), 6);
  if (!exePath) exePath = findExeRecursively(root, 10);

  const packageRoot = manifestPath
    ? path.dirname(manifestPath)
    : (exePath ? path.dirname(exePath) : root);

  return {
    root,
    packageRoot,
    manifestPath,
    exePath,
    hasManifest: !!manifestPath,
    hasExe: !!exePath
  };
}

function legacyRuntimeFolder(meta, exePath = "") {
  const hintedRoot = existingPathOrEmpty(meta?.packageRoot);
  if (hintedRoot) return hintedRoot;
  const manifest = existingPathOrEmpty(meta?.manifestPath);
  if (manifest) return path.dirname(manifest);
  const exe = existingPathOrEmpty(exePath || meta?.exePath);
  if (exe) return path.dirname(exe);
  return String(meta?.folder || "").trim();
}

function findLegacyManifestForMeta(meta, folder = "") {
  const hinted = existingPathOrEmpty(meta?.manifestPath);
  if (hinted) return hinted;
  const root = existingPathOrEmpty(meta?.packageRoot) || String(folder || meta?.folder || "").trim();
  return root ? findExtractedLegacyManifest(root) : "";
}

function legacyMetaLabel(meta) {
  return String(meta?.version || meta?.short || meta?.name || "Legacy UWP").trim() || "Legacy UWP";
}

async function repairMissingLegacyManifest(meta, win) {
  const folder = String(meta?.folder || "").trim();
  if (!folder || !fs.existsSync(folder)) return "";
  const current = findLegacyManifestForMeta(meta, folder);
  if (current) return current;

  const installerPath = String(meta?.installerPath || "").trim();
  if (!installerPath || !fs.existsSync(installerPath)) return "";

  const label = legacyMetaLabel(meta);
  const stage = createStagingDirForFolder(folder, "legacy-manifest-repair");
  launchEmit(win, "legacy-manifest-repair", "Чиню запуск Legacy…", `Не вижу AppxManifest.xml у ${label} — пересобираю распаковку из уже скачанного пакета.`, {
    version: label
  });

  try {
    fs.removeSync(stage);
    fs.ensureDirSync(stage);
    let extracted = null;
    try {
      extracted = await extractLegacyUwpPackageNative(installerPath, stage, win, label);
    } catch (helperError) {
      await extractWithNocHelper(installerPath, stage);
    }

    const stageLayout = inspectExtractedLegacyLayout(stage, extracted || {});
    if (!stageLayout.hasManifest || !stageLayout.hasExe) return "";

    ensureVCRuntimeForVersion(stageLayout.packageRoot || stage);
    replaceDirectoryAtomically(stage, folder);
    const finalLayout = inspectExtractedLegacyLayout(folder);
    if (!finalLayout.hasManifest || !finalLayout.hasExe) return "";
    writeJsonPretty(getMetaPath(folder), {
      ...(meta && typeof meta === "object" ? meta : {}),
      name: String(meta?.name || path.basename(folder)),
      folder: undefined,
      exePath: finalLayout.exePath,
      manifestPath: finalLayout.manifestPath,
      packageRoot: finalLayout.packageRoot,
      layoutRevision: Math.max(Number(meta?.layoutRevision || 0), 2),
      legacyManifestRepairedAt: new Date().toISOString()
    });

    const repaired = finalLayout.manifestPath;
    if (repaired) {
      clearRememberedLegacyRegistration(folder);
      launchEmit(win, "legacy-manifest-ready", "Legacy распаковка восстановлена", `AppxManifest.xml для ${label} найден. Продолжаю запуск.`, {
        version: label,
        manifest: repaired
      });
    }
    return repaired;
  } catch (error) {
    launchEmit(win, "legacy-manifest-repair-failed", "Запуск Legacy продолжается", `Автовосстановление AppxManifest.xml не завершилось: ${compactErrorDetails(error)}. Пробую прямой запуск EXE.`, {
      version: label
    });
    return "";
  } finally {
    try { fs.removeSync(stage); } catch {}
  }
}

async function unregisterConflictingMinecraftUwp(isPreview = false) {
  if (process.platform !== "win32") return false;
  const packageName = isPreview ? "Microsoft.MinecraftWindowsBeta" : "Microsoft.MinecraftUWP";
  const escaped = packageName.replaceAll("'", "''");
  const command = powershellUtf8(`
    $items = @(Get-AppxPackage -Name '${escaped}' -ErrorAction SilentlyContinue);
    foreach ($item in $items) {
      if ($item -and $item.PackageFullName) {
        Remove-AppxPackage -Package $item.PackageFullName -PreserveRoamableApplicationData -ErrorAction Stop;
      }
    }
  `);
  try {
    await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { timeout: 20 * 60 * 1000 });
    return true;
  } catch (error) {
    const message = compactErrorDetails(error);
    // Если пакета просто не было или Windows ничего не удалила — это не блокирующая ошибка.
    if (/cannot find|не найден|no package|does not exist/i.test(message)) return false;
    throw new Error(`Не удалось снять старую регистрацию Minecraft UWP: ${message}`);
  }
}

async function registerExtractedLegacyUwp(folder, meta) {
  if (process.platform !== "win32") throw new Error("Запуск Legacy UWP доступен только на Windows");
  const manifest = findLegacyManifestForMeta(meta, folder);
  if (!manifest) throw new Error("В распакованной Legacy UWP версии не найден AppxManifest.xml");

  const label = String(meta?.version || meta?.short || "Legacy UWP");
  const escaped = manifest.replaceAll("'", "''");
  const registerCommand = powershellUtf8(`Add-AppxPackage -ForceApplicationShutdown -Register '${escaped}'`);
  const execRegister = () => promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", registerCommand], { timeout: LAUNCH_APPX_OP_TIMEOUT_MS });

  try {
    await execRegister();
    return true;
  } catch (firstError) {
    const firstReason = compactErrorDetails(firstError);
    if (legacyUwpRegistrationConflict(firstReason)) {
      await unregisterConflictingMinecraftUwp(String(meta?.type || "").toLowerCase() === "preview");
      await execRegister();
      return true;
    }
    if (await tryAutoInstallAppxDependencies(firstReason, null, label)) {
      await execRegister();
      return true;
    }
    throw new Error(`Не удалось зарегистрировать Legacy UWP перед запуском: ${firstReason}`);
  }
}

async function prepareExtractedLegacyUwpForLaunch(meta, force = false, win = null) {
  const folder = String(meta?.folder || "").trim();
  if (!folder || !fs.existsSync(folder)) throw new Error("Папка Legacy UWP версии не найдена");
  const isPreview = String(meta?.type || "").toLowerCase() === "preview";
  if (!force && getLegacyRegistrationSnapshot(meta, isPreview)) {
    return { prepared: true, reusedRegistration: true };
  }

  let manifest = findLegacyManifestForMeta(meta, folder);
  if (!manifest) manifest = await repairMissingLegacyManifest(meta, win);
  if (!manifest) {
    launchEmit(win, "legacy-manifest-missing", "Запускаем игру…", "AppxManifest.xml в распакованной Legacy UWP версии не найден. Регистрацию пропускаю и пробую прямой запуск Minecraft.Windows.exe.", {
      version: legacyMetaLabel(meta)
    });
    return { prepared: false, registrationSkipped: true, reusedRegistration: false };
  }

  await unregisterConflictingMinecraftUwp(isPreview);
  await registerExtractedLegacyUwp(folder, meta);
  rememberLegacyRegistration(meta, isPreview);
  return { prepared: true, reusedRegistration: false };
}

async function findMinecraftAppId(type = "release") {
  if (process.platform !== "win32") throw new Error("Запуск доступен только на Windows");
  const needles = type === "preview"
    ? ["*Minecraft*Preview*", "*MinecraftWindowsBeta*", "*Minecraft*Beta*"]
    : ["*Minecraft for Windows*", "*Minecraft*", "*MinecraftUWP*"];
  const search = needles
    .map((needle) => `Get-StartApps | Where-Object { $_.Name -like '${needle.replaceAll("'", "''")}' } | Select-Object -First 1 -ExpandProperty AppID`)
    .join("; ");
  const result = await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", search], { timeout: 30000 });
  const lines = String(result.stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines[0] || "";
}

function launchSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
}

function launchEmit(win, stage, title, message, extra = {}) {
  emit(win, "game-launch-status", {
    stage: String(stage || ""),
    title: String(title || ""),
    message: String(message || ""),
    ...extra
  });
}

function normalizeLaunchPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return path.resolve(raw).replaceAll("\\", "/").toLowerCase();
  } catch {
    return raw.replaceAll("\\", "/").toLowerCase();
  }
}

function processPathMatchesMeta(proc, meta) {
  if (!proc || !meta) return false;
  const procPath = normalizeLaunchPath(proc.path || proc.Path || "");
  const folder = normalizeLaunchPath(meta.folder || "");
  const exe = normalizeLaunchPath(meta.exePath || (folder ? path.join(meta.folder || "", "Minecraft.Windows.exe") : ""));
  if (procPath && exe && procPath === exe) return true;
  if (procPath && folder && (procPath === folder || procPath.startsWith(`${folder}/`))) return true;
  return false;
}

function processRecordPid(item) {
  return Number(item?.pid || item?.Pid || item?.id || item?.Id || 0);
}

function processRecordVisible(item) {
  return !!(item?.visible ?? item?.Visible);
}

function processRecordHwnd(item) {
  return Number(item?.hwnd || item?.Hwnd || 0);
}

function minecraftWindowLimitForLicense(licenseStatus = null) {
  const type = String(licenseStatus?.type || "").trim().toLowerCase();
  const valid = licenseStatus?.valid !== false;
  if (valid && type === "permanent") return Number.POSITIVE_INFINITY;
  return TEMPORARY_LICENSE_MAX_VISIBLE_GAME_WINDOWS;
}

async function enforceMinecraftWindowLimit(meta, win, licenseStatus = null) {
  const limit = minecraftWindowLimitForLicense(licenseStatus);
  if (!Number.isFinite(limit)) {
    return { unlimited: true, limit: null, activeVisibleWindows: null };
  }

  const states = await queryMinecraftWindows();
  const visibleWindows = states.filter((item) => item.visible);
  if (visibleWindows.length < limit) {
    return { unlimited: false, limit, activeVisibleWindows: visibleWindows.length };
  }

  const firstVisible = visibleWindows.find((item) => item.hwnd);
  if (firstVisible?.hwnd) await focusWindowHandle(firstVisible.hwnd);

  const plural = limit === 1 ? "окно" : limit >= 2 && limit <= 4 ? "окна" : "окон";
  throw new Error(`Для временного ключа доступно максимум ${limit} ${plural} Minecraft одновременно. Закрой одно окно игры или активируй безлимитный ключ.`);
}

async function queryMinecraftWindows() {
  if (process.platform !== "win32") return [];
  const command = powershellUtf8(`
    $ErrorActionPreference = 'SilentlyContinue';
    Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class FalonWindowTools {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr extra);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  public static long[] GetVisibleWindowsForPid(int pid) {
    var result = new List<long>();
    EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
      uint owner = 0;
      GetWindowThreadProcessId(hWnd, out owner);
      if (owner == (uint)pid && IsWindowVisible(hWnd)) result.Add(hWnd.ToInt64());
      return true;
    }, IntPtr.Zero);
    return result.ToArray();
  }
  public static string GetTitle(long hwnd) {
    var text = new StringBuilder(512);
    GetWindowText(new IntPtr(hwnd), text, text.Capacity);
    return text.ToString();
  }
}
"@ -ErrorAction SilentlyContinue | Out-Null;
    $items = @();
    $processes = @(Get-Process | Where-Object { $_.ProcessName -eq 'Minecraft.Windows' });
    foreach ($p in $processes) {
      $procPath = '';
      try { $procPath = [string]$p.Path } catch {}
      $wins = @([FalonWindowTools]::GetVisibleWindowsForPid([int]$p.Id));
      $hwnd = 0;
      $title = '';
      if ($wins.Count -gt 0) {
        $hwnd = [Int64]$wins[0];
        try { $title = [FalonWindowTools]::GetTitle($hwnd) } catch {}
      }
      $items += [pscustomobject]@{
        pid = [int]$p.Id;
        path = $procPath;
        visible = [bool]($wins.Count -gt 0);
        hwnd = [Int64]$hwnd;
        title = $title
      };
    }
    $items | ConvertTo-Json -Depth 5 -Compress
  `);
  try {
    const result = await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024
    });
    return parsePowerShellJson(result.stdout).map((item) => ({
      pid: processRecordPid(item),
      path: String(item?.path || item?.Path || ""),
      visible: processRecordVisible(item),
      hwnd: processRecordHwnd(item),
      title: String(item?.title || item?.Title || "")
    })).filter((item) => item.pid > 0);
  } catch {
    return [];
  }
}

async function snapshotMinecraftPids() {
  return new Set((await queryMinecraftWindows()).map((item) => Number(item.pid || 0)).filter(Boolean));
}

function selectLaunchCandidates(states, meta, preferredPids = [], previousPids = new Set()) {
  const preferred = new Set((preferredPids || []).map(Number).filter(Boolean));
  const previous = previousPids instanceof Set ? previousPids : new Set((previousPids || []).map(Number).filter(Boolean));
  return (states || []).filter((item) => {
    const pid = Number(item?.pid || 0);
    if (!pid) return false;
    if (preferred.has(pid)) return true;
    if (processPathMatchesMeta(item, meta)) return true;
    if (!previous.has(pid)) return true;
    // Windows can reparent UWP/Appx launches into WindowsApps, so the process
    // path may no longer match Falon's extracted folder. If a Minecraft window
    // is visibly open, count launch as successful instead of spinning forever.
    if (item.visible && /minecraft/i.test(String(item.title || ""))) return true;
    return false;
  });
}

async function focusWindowHandle(hwnd) {
  const handle = Number(hwnd || 0);
  if (process.platform !== "win32" || !handle) return false;
  const command = powershellUtf8(`
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class FalonForegroundTools {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@ -ErrorAction SilentlyContinue | Out-Null;
    $h = [IntPtr]::new([Int64]${handle});
    [FalonForegroundTools]::ShowWindowAsync($h, 9) | Out-Null;
    [FalonForegroundTools]::SetForegroundWindow($h) | Out-Null;
    [Console]::Write('focused')
  `);
  try {
    const result = await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
      timeout: 20000,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    });
    return String(result.stdout || "").includes("focused");
  } catch {
    return false;
  }
}

async function killMinecraftPids(pids = []) {
  const list = [...new Set((pids || []).map(Number).filter((pid) => pid > 0))];
  if (!list.length) return false;
  const command = powershellUtf8(`
    $falonPids = @(${list.join(",")});
    foreach ($targetPid in $falonPids) {
      try { Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue } catch {}
    }
    [Console]::Write('stopped')
  `);
  try {
    await promisifyExecFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], {
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    });
    return true;
  } catch {
    return false;
  }
}

async function cleanupInvisibleLaunchCandidates(meta, preferredPids = [], previousPids = new Set(), win) {
  if (meta?.systemInstalled) return false;
  const states = await queryMinecraftWindows();
  const candidates = selectLaunchCandidates(states, meta, preferredPids, previousPids);
  const stale = candidates.filter((item) => !item.visible && (processPathMatchesMeta(item, meta) || preferredPids.includes(item.pid)));
  const hasVisibleMinecraft = states.some((item) => item.visible);
  // Если в системе вообще нет видимого Minecraft-окна, но уже висят фоновые Minecraft.Windows,
  // это почти всегда "зависшие" попытки старта. Убираем их перед повторным запуском, чтобы
  // пользователь не плодил десятки невидимых процессов.
  const orphaned = !stale.length && !hasVisibleMinecraft
    ? states.filter((item) => !item.visible)
    : [];
  const toStop = stale.length ? stale : orphaned;
  if (!toStop.length) return false;
  await killMinecraftPids(toStop.map((item) => item.pid));
  launchEmit(win, "cleanup", "Запускаем игру…", "Убрал зависший фоновый процесс без окна и продолжаю запуск.", {
    version: meta?.version || meta?.name || "",
    pids: toStop.map((item) => item.pid)
  });
  return true;
}

async function focusAlreadyVisibleMinecraft(meta, win) {
  const states = await queryMinecraftWindows();
  const candidates = selectLaunchCandidates(states, meta, [], new Set());
  const visible = candidates.find((item) => item.visible && item.hwnd);
  if (!visible) return null;
  await focusWindowHandle(visible.hwnd);
  const message = "Игра уже была запущена — вернул окно Minecraft на экран.";
  launchEmit(win, "focused-existing", "Игра уже открыта", message, {
    version: meta?.version || meta?.name || "",
    pid: visible.pid,
    hwnd: visible.hwnd
  });
  return { mode: "focused-existing", version: meta?.version || meta?.name || "", pid: visible.pid, hwnd: visible.hwnd, message };
}

async function waitForVisibleMinecraftWindow(meta, win, options = {}) {
  const timeoutMs = Math.max(3000, Number(options.timeoutMs || LAUNCH_WINDOW_WAIT_MS));
  const previousPids = options.previousPids instanceof Set ? options.previousPids : new Set(options.previousPids || []);
  const preferredPids = Array.isArray(options.preferredPids) ? options.preferredPids.map(Number).filter(Boolean) : [];
  const attempt = String(options.attempt || "launch");
  const startedAt = Date.now();
  let announcedWait = false;

  while (Date.now() - startedAt < timeoutMs) {
    const states = await queryMinecraftWindows();
    const candidates = selectLaunchCandidates(states, meta, preferredPids, previousPids);
    const visible = candidates.find((item) => item.visible && item.hwnd);
    if (visible) {
      await focusWindowHandle(visible.hwnd);
      const message = "Игра запущена корректно. Окно Minecraft выведено на экран.";
      launchEmit(win, "launched", "Игра запущена корректно", message, {
        version: meta?.version || meta?.name || "",
        pid: visible.pid,
        hwnd: visible.hwnd,
        mode: attempt
      });
      return { mode: attempt, version: meta?.version || meta?.name || "", pid: visible.pid, hwnd: visible.hwnd, message };
    }

    if (!announcedWait && candidates.length && Date.now() - startedAt > 1800) {
      announcedWait = true;
      launchEmit(win, "waiting-window", "Запускаем игру…", "Процесс Minecraft уже стартовал — жду появления окна.", {
        version: meta?.version || meta?.name || "",
        pids: candidates.map((item) => item.pid)
      });
    }

    await launchSleep(LAUNCH_WINDOW_POLL_MS);
  }
  return null;
}

async function launchViaAppsFolder(appId, versionOrMeta, win) {
  const meta = versionOrMeta && typeof versionOrMeta === "object" ? versionOrMeta : { version: String(versionOrMeta || "") };
  const previousPids = await snapshotMinecraftPids();
  launchEmit(win, "activate", "Запускаем игру…", "Активирую зарегистрированный пакет Minecraft.", { version: meta?.version || meta?.name || "" });

  const activatePackage = () => {
    const child = spawn("explorer.exe", [`shell:AppsFolder\\${appId}`], { detached: true, stdio: "ignore", windowsHide: true });
    try { child.unref(); } catch {}
  };

  activatePackage();

  const firstVisible = await waitForVisibleMinecraftWindow(meta, win, {
    previousPids,
    timeoutMs: LAUNCH_ACTIVATION_WAIT_MS,
    attempt: "appsfolder"
  });
  if (firstVisible) return { ...firstVisible, mode: "appsfolder", version: meta?.version || meta?.name || "" };

  // UWP-пакет может принять активацию, но создавать видимое окно заметно позже.
  // Раньше Falon после таймаута убивал такой процесс и сам провоцировал ложную ошибку
  // «пакет активировался, но окно не появилось». Больше не трогаем живой процесс.
  let states = await queryMinecraftWindows();
  let candidates = selectLaunchCandidates(states, meta, [], previousPids);
  if (candidates.length) {
    launchEmit(win, "launch-pending", "Игра запускается…", "Пакет Minecraft активирован. Окно ещё загружается — Falon больше не прерывает этот запуск.", {
      version: meta?.version || meta?.name || "",
      pids: candidates.map((item) => item.pid)
    });
    return {
      mode: "appsfolder-pending",
      version: meta?.version || meta?.name || "",
      pids: candidates.map((item) => item.pid),
      message: "Пакет Minecraft активирован. Окно игры ещё загружается."
    };
  }

  // Если Windows не показала ни нового процесса, ни окна, один раз повторяем активацию.
  // Это закрывает редкий кейс, когда shell:AppsFolder съедает первый запуск без реакции.
  launchEmit(win, "retry-activate", "Повторяю запуск…", "Windows не показала окно сразу — повторно активирую пакет Minecraft.", {
    version: meta?.version || meta?.name || ""
  });
  activatePackage();

  const retryVisible = await waitForVisibleMinecraftWindow(meta, win, {
    previousPids,
    timeoutMs: Math.max(18000, Math.floor(LAUNCH_ACTIVATION_WAIT_MS * 0.6)),
    attempt: "appsfolder-retry"
  });
  if (retryVisible) return { ...retryVisible, mode: "appsfolder-retry", version: meta?.version || meta?.name || "" };

  states = await queryMinecraftWindows();
  candidates = selectLaunchCandidates(states, meta, [], previousPids);
  launchEmit(win, "launch-pending", "Игра запускается…", "Команда запуска передана Windows. Falon не будет выдавать ложную ошибку и не станет останавливать активацию пакета.", {
    version: meta?.version || meta?.name || "",
    pids: candidates.map((item) => item.pid)
  });
  return {
    mode: "appsfolder-pending",
    version: meta?.version || meta?.name || "",
    pids: candidates.map((item) => item.pid),
    message: "Команда запуска Minecraft передана Windows."
  };
}

async function launchDirectExeWithFallback(exePath, meta, win) {
  await prepareDirectExeLaunchDependencies(exePath, meta, win);
  const previousPids = await snapshotMinecraftPids();
  launchEmit(win, "spawn", "Запускаем игру…", "Открываю Minecraft.Windows.exe и жду окно игры.", { version: meta?.version || meta?.name || "" });

  let spawnError = null;
  const child = spawn(exePath, [], {
    cwd: path.dirname(exePath),
    detached: false,
    stdio: "ignore",
    windowsHide: false
  });
  child.once("error", (error) => { spawnError = error; });

  const visible = await waitForVisibleMinecraftWindow(meta, win, {
    previousPids,
    preferredPids: child?.pid ? [child.pid] : [],
    timeoutMs: LAUNCH_WINDOW_WAIT_MS,
    attempt: "exe"
  });
  if (visible) {
    try { child.unref(); } catch {}
    return { ...visible, mode: "exe", version: meta?.version || meta?.name || "" };
  }

  await cleanupInvisibleLaunchCandidates(meta, child?.pid ? [child.pid] : [], previousPids, win);
  if (spawnError) throw spawnError;
  throw new Error("Minecraft.Windows.exe запустился, но видимое окно игры не появилось");
}

async function launchInstalledVersionCore(name, win, licenseStatus = null) {
  // Быстрый путь: managed-версии Falon ищем локально без тяжёлых PowerShell-сканов
  // системных Minecraft-пакетов. Системный детект нужен только если пользователь
  // действительно запускает системную Windows/Xbox-версию.
  let meta = await findInstalledVersionForLaunch(name);
  if (!meta) throw new Error("Версия не найдена");

  // Временные ключи могут держать до 4 видимых окон Minecraft одновременно.
  // Постоянный ключ не ограничивает мультиокна. Уже открытая игра больше не
  // перехватывает кнопку запуска — каждый новый клик пытается открыть ещё одно окно.
  await enforceMinecraftWindowLimit(meta, win, licenseStatus);

  launchEmit(win, "prepare", "Запускаем игру…", `Подготавливаю ${String(meta.version || meta.name || "Minecraft")}.`, {
    version: meta.version || meta.name || ""
  });

  // Если в Falon остался зависший фоновой процесс этой же версии без окна — убираем его до нового запуска.
  await cleanupInvisibleLaunchCandidates(meta, [], new Set(), win);

  if (isManagedLegacyUwpVersion(meta)) {
    // Для распакованных Legacy UWP версий регистрацию loose-пакета делаем именно перед запуском.
    await prepareExtractedLegacyUwpForLaunch(meta, false, win);
  }

  if (isManagedGdkVersion(meta)) {
    // Старые извлечения GDK могли быть получены поверх существующей папки.
    // На первом запуске после этого фикса мы тихо пересобираем папку из уже скачанного MSIXVC.
    meta = await repairManagedGdkVersionIfNeeded(meta);
    const gdkExe = String(meta.exePath || "").trim() || path.join(meta.folder || "", "Minecraft.Windows.exe");
    if (gdkExe && fs.existsSync(gdkExe)) {
      try {
        return await launchDirectExeWithFallback(gdkExe, meta, win);
      } catch (directError) {
        // На некоторых GDK-сборках прямой exe остаётся процессом без окна.
        // В таком случае пробуем wdapp, но только после очистки фонового процесса.
        if (hasGdkGameConfig(meta.folder || path.dirname(gdkExe))) {
          launchEmit(win, "fallback", "Запускаем игру…", "Прямой запуск не показал окно — пробую GDK-активацию.", {
            version: meta.version || meta.name || "",
            reason: compactErrorDetails(directError)
          });
          try {
            return await launchViaWdappExecutable(gdkExe, meta, win);
          } catch (wdappError) {
            throw new Error(`${compactErrorDetails(directError)} | wdapp: ${compactErrorDetails(wdappError)}`);
          }
        }
        throw directError;
      }
    }
  }

  // Для системных установок и остальных managed-версий остаётся обычный путь запуска.
  const directExe = String(meta.exePath || "").trim() || path.join(meta.folder || "", "Minecraft.Windows.exe");
  if (directExe && fs.existsSync(directExe)) {
    try {
      return await launchDirectExeWithFallback(directExe, meta, win);
    } catch (directError) {
      const fallbackId = String(meta.appId || "").trim() || await findMinecraftAppId(meta.type === "preview" ? "preview" : "release");
      if (!fallbackId) throw directError;
      launchEmit(win, "fallback", "Запускаем игру…", "Прямой запуск не показал окно — пробую пакетную активацию.", {
        version: meta.version || meta.name || "",
        reason: compactErrorDetails(directError)
      });
      return launchViaAppsFolder(fallbackId, meta, win);
    }
  }

  const storedAppId = String(meta.appId || "").trim();
  if (storedAppId) {
    return launchViaAppsFolder(storedAppId, meta, win);
  }

  const appId = await findMinecraftAppId(meta.type === "preview" ? "preview" : "release");
  if (!appId) throw new Error("Пакет Minecraft установлен, но точка запуска не найдена");
  return launchViaAppsFolder(appId, meta, win);
}

async function launchInstalledVersion(name, win, licenseStatus = null) {
  const key = String(name || "").trim() || "minecraft";
  if (activeLaunchTask) {
    if (activeLaunchTask.key === key) return activeLaunchTask.promise;
    throw new Error("Уже запускается другая версия Minecraft. Дождись появления окна игры.");
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Запуск Minecraft занял больше 2 минут. Falon сбросил ожидание; если окно игры открылось — можно играть, если нет — попробуй ещё раз.")), LAUNCH_TOTAL_TIMEOUT_MS);
  });
  const promise = Promise.race([launchInstalledVersionCore(key, win, licenseStatus), timeoutPromise])
    .catch((error) => {
      const message = compactErrorDetails(error);
      launchEmit(win, "error", "Запуск не завершён", message, { version: key });
      throw error;
    })
    .finally(() => {
      if (activeLaunchTask && activeLaunchTask.key === key) activeLaunchTask = null;
    });

  activeLaunchTask = { key, promise };
  return promise;
}

function powershellLiteral(value) {
  return String(value || "").replaceAll("'", "''");
}

async function unregisterManagedPackageAtFolder(folder) {
  if (process.platform !== "win32") return false;
  const target = String(folder || "").trim();
  if (!target) return false;
  const escaped = powershellLiteral(target);
  const command = [
    "$ErrorActionPreference = 'Stop'",
    `$target = [System.IO.Path]::GetFullPath('${escaped}').TrimEnd('\\')`,
    "$pkg = Get-AppxPackage | Where-Object { $_.InstallLocation -and ([System.IO.Path]::GetFullPath($_.InstallLocation).TrimEnd('\\') -ieq $target) } | Select-Object -First 1",
    "if ($pkg) { Remove-AppxPackage -Package $pkg.PackageFullName -PreserveRoamableApplicationData -ErrorAction Stop; [Console]::Write('removed') }"
  ].join("; ");
  const result = await promisifyExecFile("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command
  ], { timeout: 5 * 60 * 1000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  return String(result.stdout || "").includes("removed");
}

async function deleteInstalledVersion(name) {
  const requested = String(name || "").trim();
  if (!requested) throw new Error("Версия для удаления не указана");
  const meta = findManagedInstalledVersionByName(requested) || await findInstalledVersionForLaunch(requested);
  if (!meta) throw new Error("Установленная версия не найдена");
  if (meta.systemInstalled) {
    throw new Error("Системную версию Windows/Xbox Falon не удаляет");
  }

  const folder = path.resolve(String(meta.folder || "").trim());
  const versionsDir = path.resolve(getVersionsDir());
  const rel = path.relative(versionsDir, folder);
  if (!folder || !fs.existsSync(folder) || rel.startsWith("..") || path.isAbsolute(rel) || !rel) {
    throw new Error("Папка версии находится вне хранилища Falon или уже удалена");
  }

  try {
    await unregisterManagedPackageAtFolder(folder);
  } catch (error) {
    throw new Error(`Не удалось снять регистрацию версии перед удалением: ${compactErrorDetails(error)}`);
  }

  await fs.remove(folder);
  clearRememberedLegacyRegistration(folder);
  return {
    ok: true,
    name: String(meta.name || requested),
    version: String(meta.version || requested),
    folder
  };
}

module.exports = {
  fetchVersionCatalog,
  hasCompletedVersionValidation,
  validateCatalogDownloads,
  listInstalledVersions,
  downloadAndInstallVersion,
  launchInstalledVersion,
  deleteInstalledVersion,
  openVersionsFolder,
  openInstallersFolder,
  getVersionsDir,
  getInstallersDir
};
