const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const AdmZip = require("adm-zip");
const crypto = require("crypto");
const os = require("os");
const { execFileSync, spawn } = require("child_process");
const { pathToFileURL } = require("url");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const gameManager = require("./game-manager");


function getRootCandidates() {
  const appData = app.getPath("appData");
  const localAppData = process.env.LOCALAPPDATA || path.join(appData, "..", "Local");

  return [
    path.join(appData, "Minecraft Bedrock", "Users"),
    path.join(appData, "Minecraft Bedrock", "users"),
    path.join(localAppData, "Packages", "Microsoft.MinecraftUWP_8wekyb3d8bbwe", "LocalState", "games", "com.mojang")
  ];
}

function detectDefaultRoot() {
  const candidates = getRootCandidates();
  return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
}

function isLegacyComMojangRoot(root) {
  if (!root) return false;
  return path.basename(root).toLowerCase() === "com.mojang";
}

function resolveComMojangBase(profilePath) {
  return isLegacyComMojangRoot(profilePath)
    ? profilePath
    : path.join(profilePath, "games", "com.mojang");
}

function normalizedPathKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return path.resolve(raw).replaceAll("\\", "/").toLowerCase();
  } catch {
    return raw.replaceAll("\\", "/").toLowerCase();
  }
}

function stablePathId(prefix, value) {
  return `${String(prefix || "profile")}:${crypto.createHash("sha1").update(normalizedPathKey(value)).digest("hex").slice(0, 12)}`;
}

function getKnownGameContentRoots() {
  const appData = app.getPath("appData");
  const localAppData = process.env.LOCALAPPDATA || path.join(appData, "..", "Local");
  return [
    {
      id: "gdk-users",
      label: "GDK / Minecraft Bedrock Users",
      root: path.join(appData, "Minecraft Bedrock", "Users")
    },
    {
      id: "gdk-users-lower",
      label: "GDK / Minecraft Bedrock users",
      root: path.join(appData, "Minecraft Bedrock", "users")
    },
    {
      id: "uwp-release",
      label: "UWP / Legacy / Release",
      root: path.join(localAppData, "Packages", "Microsoft.MinecraftUWP_8wekyb3d8bbwe", "LocalState", "games", "com.mojang")
    },
    {
      id: "uwp-preview",
      label: "UWP / Preview",
      root: path.join(localAppData, "Packages", "Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe", "LocalState", "games", "com.mojang")
    }
  ];
}

function decorateProfile(profile, group = {}) {
  const profilePath = String(profile?.path || "").trim();
  const rawId = String(profile?.id || path.basename(profilePath) || "profile");
  const sourceLabel = String(group?.label || profile?.sourceLabel || "User").trim() || "User";
  const baseName = String(profile?.baseName || profile?.name || rawId || "User").trim() || "User";
  return {
    ...profile,
    id: stablePathId(group?.id || rawId, profilePath || rawId),
    rawId,
    baseName,
    sourceLabel,
    sourceRoot: String(group?.root || profile?.sourceRoot || ""),
    name: `${sourceLabel} • ${baseName}`
  };
}

function mergeProfilesByPath(profiles = []) {
  const chosen = new Map();
  for (const profile of profiles || []) {
    const key = normalizedPathKey(profile?.path || "");
    if (!key) continue;
    const existing = chosen.get(key);
    if (!existing) {
      chosen.set(key, profile);
      continue;
    }
    const labels = [...new Set([...(String(existing.sourceLabel || "").split(" + ").filter(Boolean)), String(profile.sourceLabel || "").trim()].filter(Boolean))];
    const sourceLabel = labels.join(" + ") || existing.sourceLabel || profile.sourceLabel || "User";
    const baseName = existing.baseName || profile.baseName || path.basename(String(existing.path || profile.path || "")) || "User";
    chosen.set(key, {
      ...existing,
      sourceLabel,
      baseName,
      name: `${sourceLabel} • ${baseName}`
    });
  }
  return [...chosen.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru"));
}

function getKnownGameContentProfiles() {
  const all = [];
  for (const root of getKnownGameContentRoots()) {
    if (!root.root || !fs.existsSync(root.root)) continue;
    for (const profile of getProfiles(root.root)) {
      all.push(decorateProfile(profile, root));
    }
  }
  return all;
}

function getConnectedProfiles(root = detectDefaultRoot()) {
  const manualRoot = String(root || detectDefaultRoot());
  const manual = fs.existsSync(manualRoot)
    ? getProfiles(manualRoot).map((profile) => decorateProfile(profile, { id: "selected-root", label: "Выбранный путь", root: manualRoot }))
    : [];
  return mergeProfilesByPath([...getKnownGameContentProfiles(), ...manual]);
}

function normalizeExplicitInstallProfiles(selectedProfiles = []) {
  const out = [];
  for (const profile of Array.isArray(selectedProfiles) ? selectedProfiles : []) {
    const profilePath = String(profile?.path || "").trim();
    if (!profilePath || !fs.existsSync(profilePath)) continue;
    const packRoots = getPackRoots(profilePath);
    const worldRoots = getWorldRoots(profilePath);
    out.push({
      id: String(profile?.id || stablePathId("explicit", profilePath)),
      name: String(profile?.name || profile?.baseName || path.basename(profilePath) || "User"),
      path: profilePath,
      resourcePacks: packRoots.resourcePacks,
      behaviorPacks: packRoots.behaviorPacks,
      worlds: worldRoots
    });
  }
  return mergeProfilesByPath(out.map((profile) => decorateProfile(profile, { id: profile.id || "explicit", label: String(profile.name || "User"), root: profile.path })));
}

let mainWindow;
let splashWindow;
let mainReady = false;

const CREATOR_TIKTOK_UNIQUE_ID = "minestrimer";
const CREATOR_TIKTOK_LIVE_URL = `https://www.tiktok.com/@${CREATOR_TIKTOK_UNIQUE_ID}/live`;
const CREATOR_XBOX_GAMERTAG = "GoshGame5697";
const CREATOR_XBOX_PROFILE_URL = `https://www.xbox.com/play/user/${CREATOR_XBOX_GAMERTAG}`;
const CREATOR_XBOX_APP_AUMID = "shell:AppsFolder\\Microsoft.GamingApp_8wekyb3d8bbwe!Microsoft.Xbox.App";
const CREATOR_XBOX_STORE_URL = "ms-windows-store://search/?query=Microsoft%20Xbox";
const CREATOR_LIVE_POLL_MS = 5 * 60 * 1000;
let creatorLivePollTimer = null;
let creatorLiveCheckRunning = false;
let creatorLiveLastKnown = false;
let creatorLivePendingNotice = null;
let creatorLiveMonitorStarted = false;
let splashShownAt = 0;
let startupTransitionStarted = false;
let startupValidationDone = false;
let backgroundVersionValidationRunning = false;
let latestStartupValidationProgress = {
  stage: "boot",
  percent: 0,
  completed: 0,
  total: 0,
  valid: 0,
  invalid: 0
};
const SPLASH_MIN_DURATION = 10000;
const ACCESS_KEYS_FILE = path.join(__dirname, "assets", "access-keys.json");
const ACCESS_KEYS_VAULT_FILE = path.join(__dirname, "assets", "access-keys.vault.json");

function getLicenseStateFile() {
  return path.join(app.getPath("userData"), "license-state.json");
}

function getLicenseBackupDir() {
  const localAppData = process.env.LOCALAPPDATA || path.join(app.getPath("appData"), "..", "Local");
  return path.join(localAppData, "Falon", "license");
}

function getLicenseBackupStateFile() {
  return path.join(getLicenseBackupDir(), "license-state.json");
}

function getLicenseHistoryFile() {
  return path.join(app.getPath("userData"), "license-history.json");
}

function getLicenseBackupHistoryFile() {
  return path.join(getLicenseBackupDir(), "license-history.json");
}

function normalizeAccessKey(value) {
  return String(value || "").trim().toUpperCase();
}

function accessKeyHash(value) {
  return crypto.createHash("sha256").update(normalizeAccessKey(value), "utf8").digest("hex");
}

function dpapiProtectText(plaintext) {
  if (process.platform !== "win32") return "";
  try {
    const ps = "Add-Type -AssemblyName System.Security; $inputText = [Console]::In.ReadToEnd(); $bytes = [Text.Encoding]::UTF8.GetBytes($inputText); $protected = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($protected))";
    return String(execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      ps
    ], {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      input: String(plaintext || "")
    }) || "").trim();
  } catch {
    return "";
  }
}

function dpapiUnprotectText(payload) {
  if (process.platform !== "win32") return "";
  try {
    const ps = "Add-Type -AssemblyName System.Security; $inputText = [Console]::In.ReadToEnd().Trim(); if (-not $inputText) { exit 1 }; $bytes = [Convert]::FromBase64String($inputText); $clear = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($clear))";
    return String(execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      ps
    ], {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      input: String(payload || "")
    }) || "").trim();
  } catch {
    return "";
  }
}

function readAccessKeyVault() {
  const vault = readJsonSafe(ACCESS_KEYS_VAULT_FILE);
  const protectedPayload = String(vault?.protected || vault?.payload || "").trim();
  if (!protectedPayload) return null;

  const decrypted = dpapiUnprotectText(protectedPayload);
  if (!decrypted) return null;

  try {
    const manifest = JSON.parse(decrypted);
    if (!manifest || typeof manifest !== "object") return null;
    return manifest;
  } catch {
    return null;
  }
}

function loadAccessKeyManifest() {
  const manifest = readAccessKeyVault() || readJsonSafe(ACCESS_KEYS_FILE);
  return Array.isArray(manifest?.keys) ? manifest.keys : [];
}

function isXboxAppInstalled() {
  try {
    const output = execFileSync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "$pkg = Get-AppxPackage -Name Microsoft.GamingApp -ErrorAction SilentlyContinue; if ($pkg) { '1' }"
    ], { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    return String(output || "").includes("1");
  } catch {
    return false;
  }
}

function safeExec(command, args = [], timeout = 2800) {
  try {
    return String(execFileSync(command, args, {
      encoding: "utf8",
      windowsHide: true,
      timeout,
      stdio: ["ignore", "pipe", "ignore"]
    }) || "").trim();
  } catch {
    return "";
  }
}

function parseRegistryMachineGuid(output) {
  const match = String(output || "").match(/MachineGuid\s+REG_[A-Z_]+\s+([^\r\n]+)/i);
  return String(match?.[1] || "").trim();
}

function normalizeDevicePiece(value) {
  return String(value || "")
    .trim()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

let cachedDeviceHash = "";
function getDeviceHash() {
  if (cachedDeviceHash) return cachedDeviceHash;

  const pieces = [];
  if (process.platform === "win32") {
    const machineGuidRaw = safeExec("reg.exe", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"]);
    const machineGuid = parseRegistryMachineGuid(machineGuidRaw);
    if (machineGuid) pieces.push(`MACHINEGUID:${normalizeDevicePiece(machineGuid)}`);

    if (!machineGuid) {
      const uuidRaw = safeExec("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "try { (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction Stop).UUID } catch { '' }"
      ], 4200);
      const uuid = normalizeDevicePiece(uuidRaw);
      if (uuid) pieces.push(`SYSTEMUUID:${uuid}`);
    }
  }

  if (!pieces.length) {
    pieces.push(`HOST:${normalizeDevicePiece(os.hostname())}`);
    pieces.push(`PLATFORM:${normalizeDevicePiece(process.platform)}`);
    pieces.push(`ARCH:${normalizeDevicePiece(process.arch)}`);
    pieces.push(`USER:${normalizeDevicePiece(process.env.USERDOMAIN || process.env.COMPUTERNAME || "")}`);
  }

  cachedDeviceHash = crypto.createHash("sha256").update(pieces.join("|"), "utf8").digest("hex");
  return cachedDeviceHash;
}

function chooseNewestState(states) {
  return states
    .filter(state => state && typeof state === "object" && state.keyHash)
    .sort((a, b) => Number(b.lastValidatedAt || b.activatedAt || 0) - Number(a.lastValidatedAt || a.activatedAt || 0))[0] || null;
}

function readLicenseState() {
  return chooseNewestState([
    readJsonSafe(getLicenseStateFile()),
    readJsonSafe(getLicenseBackupStateFile())
  ]);
}

function writeLicenseState(state) {
  writeJsonPretty(getLicenseStateFile(), state);
  writeJsonPretty(getLicenseBackupStateFile(), state);
}

function normalizeHistory(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const records = source.records && typeof source.records === "object" ? source.records : {};
  return { version: 1, updatedAt: Number(source.updatedAt || 0), records: { ...records } };
}

function mergeLicenseHistories(...histories) {
  const merged = { version: 1, updatedAt: 0, records: {} };
  for (const item of histories) {
    const history = normalizeHistory(item);
    merged.updatedAt = Math.max(merged.updatedAt, Number(history.updatedAt || 0));
    for (const [hash, record] of Object.entries(history.records || {})) {
      if (!record || typeof record !== "object") continue;
      const previous = merged.records[hash];
      const previousStamp = Number(previous?.lastValidatedAt || previous?.activatedAt || previous?.expiresAt || 0);
      const nextStamp = Number(record.lastValidatedAt || record.activatedAt || record.expiresAt || 0);
      if (!previous || nextStamp >= previousStamp) {
        merged.records[hash] = { ...record };
      }
    }
  }
  return merged;
}

function readLicenseHistory() {
  return mergeLicenseHistories(
    readJsonSafe(getLicenseHistoryFile()),
    readJsonSafe(getLicenseBackupHistoryFile())
  );
}

function writeLicenseHistory(history) {
  const normalized = normalizeHistory(history);
  normalized.updatedAt = Date.now();
  writeJsonPretty(getLicenseHistoryFile(), normalized);
  writeJsonPretty(getLicenseBackupHistoryFile(), normalized);
}

function persistLicenseRecord(state) {
  if (!state?.keyHash) return;
  const history = readLicenseHistory();
  history.records[state.keyHash] = {
    keyHash: state.keyHash,
    type: state.type,
    durationDays: state.type === "temporary" ? Number(state.durationDays || 0) : null,
    activatedAt: Number(state.activatedAt || Date.now()),
    expiresAt: state.type === "temporary" ? Number(state.expiresAt || 0) : null,
    lastValidatedAt: Number(state.lastValidatedAt || Date.now()),
    deviceHash: state.deviceHash || getDeviceHash(),
    deviceBoundAt: Number(state.deviceBoundAt || Date.now())
  };
  writeLicenseHistory(history);
}

function bindStateToCurrentDevice(state, now = Date.now()) {
  if (!state || typeof state !== "object") return state;
  if (state.deviceHash) return state;
  const next = {
    ...state,
    deviceHash: getDeviceHash(),
    deviceBoundAt: now,
    lastValidatedAt: Number(state.lastValidatedAt || now)
  };
  writeLicenseState(next);
  persistLicenseRecord(next);
  return next;
}

function serializeLicenseState(state, now = Date.now()) {
  if (!state || !state.type) {
    return { valid: false, reason: "missing" };
  }

  const currentDeviceHash = getDeviceHash();
  if (state.deviceHash && state.deviceHash !== currentDeviceHash) {
    return {
      valid: false,
      reason: "device_mismatch",
      deviceMismatch: true,
      type: state.type,
      durationDays: Number(state.durationDays || 0),
      activatedAt: Number(state.activatedAt || 0),
      expiresAt: state.expiresAt == null ? null : Number(state.expiresAt || 0),
      remainingMs: null
    };
  }

  if (state.type === "permanent") {
    return {
      valid: true,
      type: "permanent",
      durationDays: null,
      activatedAt: Number(state.activatedAt || now),
      expiresAt: null,
      remainingMs: null,
      deviceBound: true
    };
  }

  const expiresAt = Number(state.expiresAt || 0);
  const remainingMs = expiresAt - now;
  if (!expiresAt || remainingMs <= 0) {
    return {
      valid: false,
      expired: true,
      reason: "expired",
      type: "temporary",
      durationDays: Number(state.durationDays || 0),
      activatedAt: Number(state.activatedAt || 0),
      expiresAt,
      remainingMs: Math.max(0, remainingMs),
      deviceBound: true
    };
  }

  return {
    valid: true,
    type: "temporary",
    durationDays: Number(state.durationDays || 0),
    activatedAt: Number(state.activatedAt || now),
    expiresAt,
    remainingMs,
    deviceBound: true
  };
}

function refreshLicenseStateForStatus() {
  const now = Date.now();
  let state = readLicenseState();
  if (!state) return null;
  state = bindStateToCurrentDevice(state, now);
  const status = serializeLicenseState(state, now);
  const refreshed = {
    ...state,
    lastValidatedAt: now
  };
  writeLicenseState(refreshed);
  persistLicenseRecord(refreshed);
  return { state: refreshed, status };
}

function getCurrentLicenseStatus() {
  const refreshed = refreshLicenseStateForStatus();
  return refreshed?.status || { valid: false, reason: "missing" };
}

function buildLicenseState(keyHash, keyDef, now = Date.now()) {
  const durationDays = Number(keyDef.durationDays || 0);
  const type = keyDef.type === "permanent" || !durationDays ? "permanent" : "temporary";
  return {
    keyHash,
    type,
    durationDays: type === "temporary" ? durationDays : null,
    activatedAt: now,
    expiresAt: type === "temporary" ? now + durationDays * 24 * 60 * 60 * 1000 : null,
    lastValidatedAt: now,
    deviceHash: getDeviceHash(),
    deviceBoundAt: now
  };
}

function restoreStateFromHistory(record, now = Date.now()) {
  if (!record || typeof record !== "object") return null;
  const state = {
    keyHash: record.keyHash,
    type: record.type,
    durationDays: record.type === "temporary" ? Number(record.durationDays || 0) : null,
    activatedAt: Number(record.activatedAt || now),
    expiresAt: record.type === "temporary" ? Number(record.expiresAt || 0) : null,
    lastValidatedAt: now,
    deviceHash: record.deviceHash || getDeviceHash(),
    deviceBoundAt: Number(record.deviceBoundAt || record.activatedAt || now)
  };
  writeLicenseState(state);
  persistLicenseRecord(state);
  return state;
}

function activateAccessKey(rawKey) {
  const normalized = normalizeAccessKey(rawKey);
  if (!normalized) {
    return { valid: false, reason: "invalid" };
  }

  const hash = accessKeyHash(normalized);
  const keyDef = loadAccessKeyManifest().find(item => item && item.hash === hash);
  if (!keyDef) {
    return { valid: false, reason: "invalid" };
  }

  const now = Date.now();
  const currentDeviceHash = getDeviceHash();
  let existing = readLicenseState();

  if (existing?.keyHash === hash) {
    existing = bindStateToCurrentDevice(existing, now);
    const existingStatus = serializeLicenseState(existing, now);
    if (existingStatus.deviceMismatch || existingStatus.valid || existingStatus.expired) {
      return existingStatus;
    }
  }

  const history = readLicenseHistory();
  const record = history.records?.[hash];
  if (record) {
    if (record.deviceHash && record.deviceHash !== currentDeviceHash) {
      return {
        valid: false,
        reason: "device_mismatch",
        deviceMismatch: true,
        type: record.type || keyDef.type || "temporary",
        durationDays: Number(record.durationDays || keyDef.durationDays || 0),
        activatedAt: Number(record.activatedAt || 0),
        expiresAt: record.expiresAt == null ? null : Number(record.expiresAt || 0),
        remainingMs: null
      };
    }

    const restored = restoreStateFromHistory(record, now);
    const restoredStatus = serializeLicenseState(restored, now);
    if (restoredStatus.valid || restoredStatus.expired || restoredStatus.deviceMismatch) {
      return restoredStatus;
    }
  }

  const state = buildLicenseState(hash, keyDef, now);
  writeLicenseState(state);
  persistLicenseRecord(state);
  return serializeLicenseState(state, now);
}
function readWallpaperFromDir(dir) {
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir)
      .map(name => path.join(dir, name))
      .filter(file => {
        try {
          return fs.statSync(file).isFile();
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        try {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
        } catch {
          return 0;
        }
      });

    const preferred = files.find((file) => {
      const base = path.basename(file).toLowerCase();
      return base === "default-wallpaper.mp4" || base.includes("default") || base.includes("main") || base.includes("primary");
    });

    const current = preferred || files[0];
    if (!current) return null;
    const kind = getWallpaperKind(current);
    if (!kind) return null;
    return {
      path: current,
      url: pathToFileURL(current).href,
      kind,
      ts: Date.now()
    };
  } catch {
    return null;
  }
}

function getBundledWallpaperData() {
  return readWallpaperFromDir(path.join(__dirname, "..", "Wallapers"));
}

function getCurrentWallpaperData() {
  return readWallpaperFromDir(path.join(app.getPath("userData"), "wallpapers")) || getBundledWallpaperData();
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 968,
    height: 593,
    minWidth: 968,
    minHeight: 593,
    maxWidth: 968,
    maxHeight: 593,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    movable: false,
    show: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: path.join(__dirname, "assets", "falon-icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "splash-preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  splashWindow.setMenuBarVisibility(false);
  splashWindow.webContents.on("did-finish-load", () => {
    sendSplashValidationProgress(latestStartupValidationProgress);
  });
  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashShownAt = Date.now();
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 968,
    height: 593,
    minWidth: 968,
    minHeight: 593,
    transparent: true,
    backgroundColor: "#00000000",
    icon: path.join(__dirname, "assets", "falon-icon.ico"),
    title: "",
    frame: false,
    resizable: false,
    autoHideMenuBar: true,
    show: false,
    opacity: 0,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setResizable(false);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer.html"));
  mainWindow.webContents.on("did-finish-load", () => {
    mainReady = true;
    tryStartMainWindowTransition();
    if (creatorLivePendingNotice) {
      try {
        mainWindow.webContents.send("creator-live-started", creatorLivePendingNotice);
        creatorLivePendingNotice = null;
      } catch {}
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function sendSplashValidationProgress(payload = {}) {
  latestStartupValidationProgress = {
    ...latestStartupValidationProgress,
    ...payload
  };
  try {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("startup-validation-progress", latestStartupValidationProgress);
    }
  } catch {}
}

function sendGameCatalogValidationProgress(payload = {}) {
  const progress = { ...(payload || {}), background: true };
  sendSplashValidationProgress(progress);
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("game-catalog-validation-progress", progress);
    }
  } catch {}
}

function creatorLiveTimeout(ms = 16000) {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error("TikTok LIVE status timeout")), ms);
    timer.unref?.();
  });
}

let cachedTikTokLiveModulePromise = null;
async function loadTikTokLiveConnectorModule() {
  if (cachedTikTokLiveModulePromise) return cachedTikTokLiveModulePromise;
  cachedTikTokLiveModulePromise = (async () => {
    try {
      return require("tiktok-live-connector");
    } catch (error) {
      const code = String(error?.code || "").toUpperCase();
      // If the optional connector was not installed after applying the patch,
      // keep the launcher working and fall back to the public TikTok live page.
      if (code === "MODULE_NOT_FOUND") return null;
      // Newer builds of tiktok-live-connector may be ESM-only. Electron's main
      // process can still consume them through dynamic import().
      if (code !== "ERR_REQUIRE_ESM") throw error;
      try {
        return await import("tiktok-live-connector");
      } catch (importError) {
        const importCode = String(importError?.code || "").toUpperCase();
        if (importCode === "ERR_MODULE_NOT_FOUND" || importCode === "MODULE_NOT_FOUND") return null;
        throw importError;
      }
    }
  })();
  return cachedTikTokLiveModulePromise;
}

function normalizeCreatorLiveResult(value) {
  if (typeof value === "boolean") return value;
  if (value == null) return null;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "live", "online", "yes"].includes(normalized)) return true;
    if (["false", "0", "offline", "no"].includes(normalized)) return false;
    return null;
  }
  if (typeof value === "object") {
    const direct = [value.live, value.isLive, value.online, value.is_online];
    for (const item of direct) {
      if (typeof item === "boolean") return item;
    }
    if (value.roomId || value.room_id || value.liveRoom?.roomId || value.liveRoom?.id) return true;
    if (value.liveRoom === null || value.status === 4 || value.roomStatus === 4) return false;
  }
  return null;
}

function isCreatorDefinitelyOfflineError(error) {
  const text = `${String(error?.name || "")} ${String(error?.code || "")} ${String(error?.message || error || "")}`.toLowerCase();
  return /useroffline|user offline|not live|offline|livestream.*not.*found|room.*not.*found/.test(text);
}

async function detectCreatorLiveViaConnector() {
  let connection = null;
  try {
    const connectorModule = await loadTikTokLiveConnectorModule();
    if (!connectorModule) return null;
    const TikTokLiveConnection = connectorModule?.TikTokLiveConnection
      || connectorModule?.default?.TikTokLiveConnection
      || connectorModule?.default;
    if (typeof TikTokLiveConnection !== "function") return null;

    connection = new TikTokLiveConnection(CREATOR_TIKTOK_UNIQUE_ID, {
      processInitialData: false,
      fetchRoomInfoOnConnect: false,
      enableExtendedGiftInfo: false,
      webClientOptions: {
        timeout: { request: 12000 }
      }
    });

    // fetchIsLive() already runs the connector's HTML -> API -> provider fallback
    // chain. Passing no argument avoids incompatibilities between 1.x and 2.x.
    const rawLive = await Promise.race([
      connection.fetchIsLive(),
      creatorLiveTimeout(16000)
    ]);
    const normalized = normalizeCreatorLiveResult(rawLive);
    if (typeof normalized === "boolean") return normalized;

    // Some connector versions return a truthy room id instead of a strict boolean
    // when the broadcaster is online. Probe it explicitly before giving up.
    if (typeof connection.fetchRoomId === "function") {
      const roomId = await Promise.race([
        connection.fetchRoomId(),
        creatorLiveTimeout(16000)
      ]);
      if (String(roomId || "").trim()) return true;
    }
    return null;
  } catch (error) {
    if (isCreatorDefinitelyOfflineError(error)) return false;
    const errorText = String(error?.message || error || "");
    if (/cannot find module ['"]tiktok-live-connector['"]|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND/i.test(errorText)) {
      return null;
    }
    try {
      console.warn("[creator-live] connector probe failed:", errorText);
    } catch {}
    return null;
  } finally {
    try { await connection?.disconnect?.(); } catch {}
  }
}

async function detectCreatorLiveViaPublicPage() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    timer.unref?.();
    const response = await fetch(CREATOR_TIKTOK_LIVE_URL, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8"
      }
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const html = String(await response.text() || "");
    if (!html) return null;
    const hasStructuredLiveRoom = /"liveRoom"\s*:\s*\{/.test(html)
      || /"LiveRoom"\s*:\s*\{/.test(html)
      || /"roomId"\s*:\s*"\d{8,}"/.test(html);
    const explicitlyOffline = /"liveRoom"\s*:\s*null/.test(html)
      || /"status"\s*:\s*4/.test(html);
    if (hasStructuredLiveRoom && !explicitlyOffline) return true;
    if (explicitlyOffline) return false;
    return null;
  } catch {
    return null;
  }
}

async function detectCreatorTikTokLive() {
  const connectorResult = await detectCreatorLiveViaConnector();
  if (typeof connectorResult === "boolean") {
    return { known: true, live: connectorResult, source: "tiktok-live-connector" };
  }
  const pageResult = await detectCreatorLiveViaPublicPage();
  if (typeof pageResult === "boolean") {
    return { known: true, live: pageResult, source: "public-live-page" };
  }
  return { known: false, live: false, source: "unknown" };
}

function sendCreatorLiveNotice(payload = {}) {
  const notice = {
    uniqueId: CREATOR_TIKTOK_UNIQUE_ID,
    url: CREATOR_TIKTOK_LIVE_URL,
    detectedAt: Date.now(),
    ...payload
  };
  creatorLivePendingNotice = notice;
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("creator-live-started", notice);
      creatorLivePendingNotice = null;
    }
  } catch {}
}

async function checkCreatorLiveStatus() {
  if (creatorLiveCheckRunning) return;
  creatorLiveCheckRunning = true;
  try {
    const result = await detectCreatorTikTokLive();
    if (!result.known) {
      // TikTok often rate-limits or changes its public page markup. A single
      // unknown result should not suppress the notice for the next five minutes.
      const retry = setTimeout(() => {
        checkCreatorLiveStatus().catch(() => {});
      }, 45000);
      retry.unref?.();
      return;
    }
    const isLive = Boolean(result.live);
    if (isLive && !creatorLiveLastKnown) {
      sendCreatorLiveNotice({ source: result.source });
    }
    creatorLiveLastKnown = isLive;
  } finally {
    creatorLiveCheckRunning = false;
  }
}

function startCreatorLiveMonitor() {
  if (creatorLiveMonitorStarted) return;
  creatorLiveMonitorStarted = true;
  setTimeout(() => {
    checkCreatorLiveStatus().catch(() => {});
  }, 12000);
  creatorLivePollTimer = setInterval(() => {
    checkCreatorLiveStatus().catch(() => {});
  }, CREATOR_LIVE_POLL_MS);
  creatorLivePollTimer.unref?.();
}

async function runStartupVersionValidation() {
  // Do not block Falon startup on Legacy UWP probing. Show the app immediately and
  // keep the expensive HEAD/Range/WU checks in the background.
  startupValidationDone = true;
  sendSplashValidationProgress({
    stage: "background",
    percent: 0,
    completed: 0,
    total: 0,
    valid: 0,
    invalid: 0,
    background: true
  });
  tryStartMainWindowTransition();

  // Keep the app responsive on launch: catalog validation is now manual/on-demand.
  sendGameCatalogValidationProgress({ stage: "cached", percent: 100, cached: true });
}

function performWindowCrossfade() {
  if (!mainWindow) return;
  startupTransitionStarted = true;

  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.setOpacity(0);
  mainWindow.focus();

  const totalDuration = 420;
  const frame = 16;
  let elapsed = 0;

  const timer = setInterval(() => {
    elapsed += frame;
    const progress = Math.min(elapsed / totalDuration, 1);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setOpacity(progress);
    }

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.setOpacity(1 - progress);
    }

    if (progress >= 1) {
      clearInterval(timer);
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setOpacity(1);
        mainWindow.focus();
      }
    }
  }, frame);
}

function tryStartMainWindowTransition() {
  if (startupTransitionStarted || !mainReady || !startupValidationDone) return;
  const elapsed = Date.now() - splashShownAt;
  const remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed);
  setTimeout(() => {
    if (!startupTransitionStarted && mainReady) {
      performWindowCrossfade();
    }
  }, remaining);
}

app.setAppUserModelId("Falon.Manager");
app.whenReady().then(() => {
  createSplashWindow();
  createMainWindow();
  runStartupVersionValidation();
  startCreatorLiveMonitor();
});

app.on("window-all-closed", () => {
  if (creatorLivePollTimer) {
    clearInterval(creatorLivePollTimer);
    creatorLivePollTimer = null;
    creatorLiveMonitorStarted = false;
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainReady = false;
    startupTransitionStarted = false;
    startupValidationDone = false;
    latestStartupValidationProgress = {
      stage: "boot",
      percent: 0,
      completed: 0,
      total: 0,
      valid: 0,
      invalid: 0
    };
    createSplashWindow();
    createMainWindow();
    runStartupVersionValidation();
  }
});

function normName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zа-яё0-9]+/gi, "")
    .trim();
}

function safeName(value, fallback = "item") {
  return String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70) || fallback;
}

function uniqueFolder(parent, baseName) {
  const clean = safeName(baseName, "pack");
  let candidate = path.join(parent, clean);
  if (!fs.existsSync(candidate)) return candidate;

  let i = 2;
  while (true) {
    candidate = path.join(parent, `${clean}_${i}`);
    if (!fs.existsSync(candidate)) return candidate;
    i++;
  }
}

function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = String(fs.readFileSync(file, "utf8") || "")
      .replace(/^\uFEFF/, "")
      .trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJsonPretty(file, data) {
  fs.ensureDirSync(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readManifest(folder) {
  return readJsonSafe(path.join(folder, "manifest.json"));
}

function getPackInfo(folder) {
  const manifest = readManifest(folder);
  const header = manifest?.header || {};
  const modules = Array.isArray(manifest?.modules) ? manifest.modules : [];

  const moduleTypes = modules.map(m => String(m.type || "").toLowerCase());
  const type =
    moduleTypes.includes("resources") ? "resource" :
    moduleTypes.includes("data") ? "behavior" :
    moduleTypes.includes("script") ? "behavior" :
    "unknown";

  return {
    folder,
    name: header.name || path.basename(folder),
    uuid: header.uuid || "",
    version: Array.isArray(header.version) ? header.version.join(".") : "",
    type,
    modules: modules.map(m => ({ uuid: m.uuid || "", type: m.type || "", version: m.version || [] })),
    manifest
  };
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function findDirsByName(root, names, maxDepth = 7) {
  const result = [];
  const wanted = new Set(names.map(n => n.toLowerCase()));

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      if (wanted.has(e.name.toLowerCase())) result.push(full);
      walk(full, depth + 1);
    }
  }

  if (fs.existsSync(root)) walk(root, 0);
  return [...new Set(result)];
}

function getProfiles(root = detectDefaultRoot()) {
  if (!fs.existsSync(root)) return [];

  if (isLegacyComMojangRoot(root)) {
    const packRoots = getPackRoots(root);
    const worldRoots = getWorldRoots(root);
    return [{
      id: "legacy",
      name: "Minecraft",
      path: root,
      resourcePacks: packRoots.resourcePacks,
      behaviorPacks: packRoots.behaviorPacks,
      worlds: worldRoots
    }];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory());
  return entries.map(e => {
    const profilePath = path.join(root, e.name);
    const packRoots = getPackRoots(profilePath);
    const worldRoots = getWorldRoots(profilePath);

    return {
      id: e.name,
      name: e.name,
      path: profilePath,
      resourcePacks: packRoots.resourcePacks,
      behaviorPacks: packRoots.behaviorPacks,
      worlds: worldRoots
    };
  });
}

function getPackRoots(profilePath) {
  const resourcePacks = findDirsByName(profilePath, ["resource_packs", "development_resource_packs"], 8);
  const behaviorPacks = findDirsByName(profilePath, ["behavior_packs", "development_behavior_packs"], 8);

  const fallbackComMojang = resolveComMojangBase(profilePath);
  if (resourcePacks.length === 0) resourcePacks.push(path.join(fallbackComMojang, "resource_packs"));
  if (behaviorPacks.length === 0) behaviorPacks.push(path.join(fallbackComMojang, "behavior_packs"));

  resourcePacks.forEach(fs.ensureDirSync);
  behaviorPacks.forEach(fs.ensureDirSync);

  return { resourcePacks, behaviorPacks };
}

function getWorldRoots(profilePath) {
  const worlds = findDirsByName(profilePath, ["minecraftWorlds"], 8);
  const fallback = path.join(resolveComMojangBase(profilePath), "minecraftWorlds");
  if (worlds.length === 0) worlds.push(fallback);
  worlds.forEach(fs.ensureDirSync);
  return worlds;
}

function listFolders(parent) {
  if (!fs.existsSync(parent)) return [];
  return fs.readdirSync(parent, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => path.join(parent, e.name));
}

function listResourcesForProfile(profilePath) {
  const roots = getPackRoots(profilePath);
  const packs = [];

  for (const folder of roots.resourcePacks) {
    for (const packFolder of listFolders(folder)) {
      const info = getPackInfo(packFolder);
      packs.push({ ...info, type: info.type === "unknown" ? "resource" : info.type, root: folder });
    }
  }

  for (const folder of roots.behaviorPacks) {
    for (const packFolder of listFolders(folder)) {
      const info = getPackInfo(packFolder);
      packs.push({ ...info, type: info.type === "unknown" ? "behavior" : info.type, root: folder });
    }
  }

  return packs.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function getWorldName(folder) {
  const levelName = path.join(folder, "levelname.txt");
  if (fs.existsSync(levelName)) {
    try {
      const txt = fs.readFileSync(levelName, "utf8").trim();
      if (txt) return txt;
    } catch {}
  }
  return path.basename(folder);
}

function listWorldsForProfile(profilePath) {
  const roots = getWorldRoots(profilePath);
  const worlds = [];

  for (const root of roots) {
    for (const folder of listFolders(root)) {
      const hasLevel = fs.existsSync(path.join(folder, "level.dat")) || fs.existsSync(path.join(folder, "levelname.txt"));
      if (!hasLevel) continue;

      worlds.push({
        folder,
        root,
        name: getWorldName(folder),
        size: getDirSize(folder),
        modified: fs.statSync(folder).mtimeMs
      });
    }
  }

  return worlds.sort((a, b) => b.modified - a.modified);
}

function getDirSize(dir) {
  let total = 0;
  function walk(d) {
    let entries = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      try {
        if (e.isDirectory()) walk(full);
        else total += fs.statSync(full).size;
      } catch {}
    }
  }
  walk(dir);
  return total;
}

function extractArchive(file, dest) {
  fs.emptyDirSync(dest);
  const zip = new AdmZip(file);
  zip.extractAllTo(dest, true);
}

function isNestedBedrockArchive(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  return [".mcpack", ".mcaddon", ".mcaddonpack", ".zip"].includes(ext);
}

function expandNestedBedrockArchives(root, maxDepth = 3) {
  const extracted = [];
  const visited = new Set();

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile() || !isNestedBedrockArchive(entry.name)) continue;

      const key = path.resolve(full).toLowerCase();
      if (visited.has(key)) continue;
      visited.add(key);

      const nestedRoot = path.join(
        path.dirname(full),
        `__falon_nested_${safeName(path.basename(full, path.extname(full)), "archive")}_${crypto.randomUUID()}`
      );
      try {
        extractArchive(full, nestedRoot);
        extracted.push(nestedRoot);
        walk(nestedRoot, depth + 1);
      } catch {
        try { fs.removeSync(nestedRoot); } catch {}
      }
    }
  }

  walk(root, 0);
  return extracted;
}

function findManifestFolders(root) {
  const result = [];

  function walk(dir, depth) {
    if (depth > 5) return;
    if (fs.existsSync(path.join(dir, "manifest.json"))) {
      result.push(dir);
      return;
    }

    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const e of entries) {
      if (e.isDirectory()) walk(path.join(dir, e.name), depth + 1);
    }
  }

  walk(root, 0);
  return result;
}

function detectArchiveType(file, extractedRoot) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".mcworld") return "world";

  if (fs.existsSync(path.join(extractedRoot, "level.dat")) || fs.existsSync(path.join(extractedRoot, "levelname.txt"))) {
    return "world";
  }

  return "packs";
}

function removeOldSimilarPacks(profilePath, packInfo, originalFileBase) {
  const all = listResourcesForProfile(profilePath);
  const targets = [];

  const wantedUuid = normName(packInfo.uuid);
  const wantedName = normName(packInfo.name);
  const wantedFile = normName(originalFileBase);

  for (const existing of all) {
    const existingUuid = normName(existing.uuid);
    const existingName = normName(existing.name);
    const existingFolder = normName(path.basename(existing.folder));

    const sameUuid = wantedUuid && existingUuid && wantedUuid === existingUuid;
    const sameName = wantedName && existingName && wantedName === existingName;
    const sameFile = wantedFile && (existingFolder.includes(wantedFile) || wantedFile.includes(existingFolder));

    if (sameUuid || sameName || sameFile) targets.push(existing);
  }

  for (const target of targets) {
    try { fs.removeSync(target.folder); } catch {}
  }

  return targets;
}

function cleanWorldPackReferences(profilePath, removedOrInstalledPacks) {
  const worlds = listWorldsForProfile(profilePath);
  const packIds = new Set();
  const moduleIds = new Set();
  const packNames = new Set();

  for (const p of removedOrInstalledPacks) {
    if (p.uuid) packIds.add(String(p.uuid).toLowerCase());
    if (p.name) packNames.add(normName(p.name));
    for (const m of p.modules || []) {
      if (m.uuid) moduleIds.add(String(m.uuid).toLowerCase());
    }
  }

  let changed = 0;

  for (const world of worlds) {
    for (const fileName of ["world_resource_packs.json", "world_behavior_packs.json"]) {
      const file = path.join(world.folder, fileName);
      const data = readJsonSafe(file);
      if (!Array.isArray(data)) continue;

      const filtered = data.filter(entry => {
        const packId = String(entry.pack_id || "").toLowerCase();
        const moduleId = String(entry.module_id || "").toLowerCase();
        return !packIds.has(packId) && !moduleIds.has(moduleId);
      });

      if (filtered.length !== data.length) {
        writeJsonPretty(file, filtered);
        changed++;
      }
    }
  }

  const candidates = findFiles(profilePath, ["valid_known_packs.json", "known_packs.json"], 8);
  for (const file of candidates) {
    const data = readJsonSafe(file);
    if (!Array.isArray(data)) continue;

    const filtered = data.filter(entry => {
      const packId = String(entry.pack_id || entry.uuid || entry.id || "").toLowerCase();
      const name = normName(entry.name || entry.pack_name || "");
      return !packIds.has(packId) && !packNames.has(name);
    });

    if (filtered.length !== data.length) {
      writeJsonPretty(file, filtered);
      changed++;
    }
  }

  return changed;
}

function findFiles(root, fileNames, maxDepth = 8) {
  const result = [];
  const wanted = new Set(fileNames.map(n => n.toLowerCase()));

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile() && wanted.has(e.name.toLowerCase())) result.push(full);
      if (e.isDirectory()) walk(full, depth + 1);
    }
  }

  walk(root, 0);
  return result;
}

function installPackFolderToProfile(profilePath, packFolder, originalFileBase) {
  const packInfo = getPackInfo(packFolder);
  if (!packInfo.manifest) throw new Error(`Не найден manifest.json в ${packFolder}`);

  const roots = getPackRoots(profilePath);
  const targetRoot = packInfo.type === "behavior" ? roots.behaviorPacks[0] : roots.resourcePacks[0];

  const removed = removeOldSimilarPacks(profilePath, packInfo, originalFileBase);
  cleanWorldPackReferences(profilePath, [...removed, packInfo]);

  const target = uniqueFolder(targetRoot, packInfo.name || originalFileBase || "pack");
  fs.copySync(packFolder, target, { overwrite: true, errorOnExist: false });

  return {
    profile: path.basename(profilePath),
    installedTo: target,
    type: packInfo.type === "behavior" ? "behavior" : "resource",
    name: packInfo.name,
    uuid: packInfo.uuid,
    removed: removed.length
  };
}

function installWorldToProfile(profilePath, extractedRoot, originalFileBase) {
  const worldRoots = getWorldRoots(profilePath);
  const root = worldRoots[0];

  let source = extractedRoot;
  if (!fs.existsSync(path.join(source, "level.dat")) && !fs.existsSync(path.join(source, "levelname.txt"))) {
    const candidates = [];
    function walk(dir, depth) {
      if (depth > 3) return;
      if (fs.existsSync(path.join(dir, "level.dat")) || fs.existsSync(path.join(dir, "levelname.txt"))) {
        candidates.push(dir);
        return;
      }
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) if (e.isDirectory()) walk(path.join(dir, e.name), depth + 1);
    }
    walk(extractedRoot, 0);
    if (candidates[0]) source = candidates[0];
  }

  const worldName = getWorldName(source) || originalFileBase || "world";

  const oldWorlds = listWorldsForProfile(profilePath).filter(w => {
    const a = normName(w.name);
    const b = normName(worldName);
    const c = normName(originalFileBase);
    const f = normName(path.basename(w.folder));
    return (a && b && a === b) || (c && (f.includes(c) || c.includes(f)));
  });

  for (const w of oldWorlds) {
    try { fs.removeSync(w.folder); } catch {}
  }

  const target = uniqueFolder(root, worldName);
  fs.copySync(source, target, { overwrite: true, errorOnExist: false });

  return {
    profile: path.basename(profilePath),
    installedTo: target,
    name: worldName,
    removed: oldWorlds.length
  };
}

async function installArchiveToProfiles(root, file, selectedProfileIds = null, selectedProfiles = null) {
  if (!fs.existsSync(file)) throw new Error("Файл не найден");
  const explicitProfiles = normalizeExplicitInstallProfiles(selectedProfiles);
  const connectedProfiles = explicitProfiles.length ? [] : getConnectedProfiles(root);
  const profiles = explicitProfiles.length
    ? explicitProfiles
    : connectedProfiles.filter(p => !selectedProfileIds || selectedProfileIds.includes(p.id));
  if (profiles.length === 0) {
    if (!explicitProfiles.length && !fs.existsSync(root)) throw new Error("Корневая папка Users не найдена");
    throw new Error("Профили не найдены");
  }

  const tmp = path.join(app.getPath("temp"), "mc-bedrock-manager", crypto.randomUUID());
  fs.ensureDirSync(tmp);

  const originalFileBase = path.basename(file, path.extname(file));

  try {
    if (fs.statSync(file).isDirectory()) {
      fs.copySync(file, tmp);
    } else {
      extractArchive(file, tmp);
    }

    const archiveType = detectArchiveType(file, tmp);
    const results = [];

    if (archiveType === "world") {
      for (const p of profiles) {
        results.push({ kind: "world", ...installWorldToProfile(p.path, tmp, originalFileBase) });
      }
    } else {
      let manifestFolders = findManifestFolders(tmp);
      if (manifestFolders.length === 0) {
        expandNestedBedrockArchives(tmp, 4);
        manifestFolders = findManifestFolders(tmp);
      }
      if (manifestFolders.length === 0) throw new Error("В архиве не найден manifest.json. Это не похоже на RP/BP аддон.");

      const validManifestFolders = manifestFolders.filter(folder => Boolean(readManifest(folder)));
      if (validManifestFolders.length === 0) throw new Error("manifest.json найден, но не удалось прочитать его как JSON.");

      for (const p of profiles) {
        for (const folder of validManifestFolders) {
          results.push({ kind: "pack", ...installPackFolderToProfile(p.path, folder, originalFileBase) });
        }
      }
    }

    return results;
  } finally {
    fs.removeSync(tmp);
  }
}

function deleteResource(profilePath, folder) {
  if (!isInside(folder, profilePath)) throw new Error("Нельзя удалить папку вне выбранного профиля");
  const packInfo = getPackInfo(folder);
  fs.removeSync(folder);
  cleanWorldPackReferences(profilePath, [packInfo]);
  return true;
}

function deleteWorld(profilePath, folder) {
  if (!isInside(folder, profilePath)) throw new Error("Нельзя удалить папку вне выбранного профиля");
  fs.removeSync(folder);
  return true;
}

/* ---------------------------------------------------------
   CurseForge Bedrock network browser + one-click installer.
   CurseForge's documented REST API requires x-api-key. The app
   stores the developer/user supplied key in userData/curseforge.json.
   --------------------------------------------------------- */
const CURSEFORGE_OFFICIAL_BASE = "https://api.curseforge.com/v1";
const CURSEFORGE_PUBLIC_BASE = "https://www.curseforge.com";
const CURSEFORGE_USER_AGENT = "Falon-Bedrock-Manager/2.6";
let bedrockGameIdCache = null;
let bedrockClassesCache = null;

function getCurseForgeConfigPath() {
  return path.join(app.getPath("userData"), "curseforge.json");
}

function readCurseForgeConfig() {
  return readJsonSafe(getCurseForgeConfigPath()) || {};
}

function writeCurseForgeConfig(config) {
  writeJsonPretty(getCurseForgeConfigPath(), config || {});
}

function resetCurseForgeCaches() {
  bedrockGameIdCache = null;
  bedrockClassesCache = null;
}

function decodeBundledCurseForgeKey() {
  // Never ship API secrets inside the app bundle.
  // Use user-supplied env/config only so packaged builds don't leak credentials.
  return "";
}

function getCurseForgeApiKeySource() {
  const envKey = String(process.env.CURSEFORGE_API_KEY || "").trim();
  if (envKey) return { source: "env", key: envKey };
  const saved = String(readCurseForgeConfig().apiKey || "").trim();
  if (saved) return { source: "config", key: saved };
  const bundled = decodeBundledCurseForgeKey();
  if (bundled) return { source: "bundled", key: bundled };
  return { source: "", key: "" };
}

function getCurseForgeApiKey() {
  return getCurseForgeApiKeySource().key;
}

function getForcedBedrockGameId() {
  const envId = Number(process.env.CURSEFORGE_BEDROCK_GAME_ID || 0);
  if (Number.isInteger(envId) && envId > 0) return envId;

  const cfgId = Number(readCurseForgeConfig().bedrockGameId || 0);
  if (Number.isInteger(cfgId) && cfgId > 0) return cfgId;
  return 0;
}

function getCurseForgeSettingsStatus() {
  const cfg = readCurseForgeConfig();
  const api = getCurseForgeApiKeySource();
  const apiKey = api.key;
  const savedKey = String(cfg.apiKey || "").trim();
  const forcedGameId = getForcedBedrockGameId();
  return {
    hasApiKey: Boolean(apiKey),
    hasSavedApiKey: Boolean(savedKey),
    apiKeySource: api.source,
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` : "",
    bedrockGameId: Number.isInteger(forcedGameId) && forcedGameId > 0 ? forcedGameId : 0,
    configPath: getCurseForgeConfigPath()
  };
}

function saveCurseForgeSettings(payload = {}) {
  const current = readCurseForgeConfig();
  const next = { ...current };
  if (Object.prototype.hasOwnProperty.call(payload, "apiKey")) {
    const apiKey = String(payload.apiKey || "").trim();
    if (apiKey) next.apiKey = apiKey;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "bedrockGameId")) {
    const gameId = Number(payload.bedrockGameId || 0);
    if (Number.isInteger(gameId) && gameId > 0) next.bedrockGameId = gameId;
    else delete next.bedrockGameId;
  }
  writeCurseForgeConfig(next);
  resetCurseForgeCaches();
  return getCurseForgeSettingsStatus();
}

function buildCurseForgeUrl(base, endpoint, params = {}) {
  const url = new URL(`${base}${endpoint}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "User-Agent": CURSEFORGE_USER_AGENT,
      ...headers
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const type = String(response.headers.get("content-type") || "");
  if (!type.includes("application/json") && !type.includes("text/json")) {
    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`Неожиданный ответ (${type || "unknown"})`);
    }
  }

  return response.json();
}

async function curseForgeRequest(endpoint, params = {}) {
  const apiKey = getCurseForgeApiKey();
  if (!apiKey) {
    throw new Error("Нужен CurseForge API key. Вставь ключ в разделе «Сеть» и нажми «Сохранить».");
  }

  try {
    return await fetchJson(buildCurseForgeUrl(CURSEFORGE_OFFICIAL_BASE, endpoint, params), {
      "x-api-key": apiKey
    });
  } catch (error) {
    const suffix = /HTTP 401|HTTP 403/.test(String(error?.message || ""))
      ? " Проверь API key и доступ к CurseForge API."
      : "";
    throw new Error(`CurseForge API: ${error.message}.${suffix}`.replace("..", "."));
  }
}

function unwrapCurseForgeData(payload) {
  return payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
}

async function resolveBedrockGameId() {
  if (bedrockGameIdCache) return bedrockGameIdCache;

  if (!getCurseForgeApiKey()) {
    throw new Error("Нужен CurseForge API key. Вставь ключ в разделе «Сеть» и нажми «Сохранить».");
  }

  const forced = getForcedBedrockGameId();
  if (forced) {
    bedrockGameIdCache = forced;
    return bedrockGameIdCache;
  }

  const variants = [
    { index: 0, pageSize: 250 },
    { pageIndex: 0, pageSize: 250 }
  ];

  const errors = [];
  for (const params of variants) {
    try {
      const payload = await curseForgeRequest("/games", params);
      const games = Array.isArray(unwrapCurseForgeData(payload)) ? unwrapCurseForgeData(payload) : [];
      const bedrock = games.find(game => {
        const name = String(game?.name || "").toLowerCase();
        const slug = String(game?.slug || "").toLowerCase();
        return name.includes("minecraft bedrock") || slug.includes("minecraft-bedrock");
      });

      if (bedrock?.id) {
        bedrockGameIdCache = Number(bedrock.id);
        return bedrockGameIdCache;
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(`Не удалось определить игру Minecraft Bedrock в CurseForge. ${errors.join(" | ")}`);
}

async function loadBedrockClasses() {
  if (bedrockClassesCache) return bedrockClassesCache;

  try {
    const gameId = await resolveBedrockGameId();
    const payload = await curseForgeRequest("/categories", { gameId, classesOnly: true });
    const classes = Array.isArray(unwrapCurseForgeData(payload)) ? unwrapCurseForgeData(payload) : [];

    bedrockClassesCache = classes
      .filter(item => item && item.isClass !== false)
      .map(item => ({
        id: Number(item.id),
        name: String(item.name || item.slug || "Type"),
        slug: String(item.slug || "")
      }))
      .filter(item => Number.isInteger(item.id) && item.id > 0);

    return bedrockClassesCache;
  } catch {
    bedrockClassesCache = [];
    return bedrockClassesCache;
  }
}

function isBedrockInstallArchive(fileName) {
  return /\.(mcpack|mcaddon|mcworld|mctemplate|mcaddonpack|zip)$/i.test(String(fileName || ""));
}

function pickInstallableCurseForgeFile(mod) {
  const files = Array.isArray(mod?.latestFiles) ? mod.latestFiles : [];
  const mainFileId = Number(mod?.mainFileId || 0);

  const main = files.find(file => Number(file?.id) === mainFileId);
  const ordered = [main, ...files].filter(Boolean);
  const supported = ordered.find(file => isBedrockInstallArchive(file?.fileName));
  const chosen = supported || ordered[0] || null;

  if (!chosen) return null;

  return {
    id: Number(chosen.id || 0),
    fileName: String(chosen.fileName || chosen.displayName || `curseforge-${mod.id}.zip`),
    displayName: String(chosen.displayName || chosen.fileName || "Файл"),
    downloadUrl: String(chosen.downloadUrl || ""),
    fileLength: Number(chosen.fileLength || chosen.fileSizeOnDisk || 0),
    supported: isBedrockInstallArchive(chosen.fileName)
  };
}

function normalizeCurseForgeProject(mod) {
  const file = pickInstallableCurseForgeFile(mod);
  const categories = Array.isArray(mod?.categories) ? mod.categories : [];
  const authors = Array.isArray(mod?.authors) ? mod.authors : [];
  const screenshots = Array.isArray(mod?.screenshots)
    ? mod.screenshots
        .map(item => ({
          id: Number(item?.id || 0),
          title: String(item?.title || ""),
          thumbnailUrl: String(item?.thumbnailUrl || item?.url || ""),
          url: String(item?.url || item?.thumbnailUrl || "")
        }))
        .filter(item => item.thumbnailUrl || item.url)
        .slice(0, 4)
    : [];
  const classCategory = categories.find(item => item?.isClass) || categories[0] || null;

  return {
    id: Number(mod?.id || 0),
    name: String(mod?.name || "Без названия"),
    summary: String(mod?.summary || ""),
    slug: String(mod?.slug || ""),
    author: String(authors[0]?.name || "CurseForge"),
    downloads: Number(mod?.downloadCount || 0),
    category: String(classCategory?.name || "Bedrock"),
    classId: Number(mod?.classId || classCategory?.id || 0),
    logo: String(mod?.logo?.thumbnailUrl || mod?.logo?.url || ""),
    screenshots,
    websiteUrl: String(mod?.links?.websiteUrl || ""),
    dateModified: String(mod?.dateModified || ""),
    file,
    canInstall: Boolean(file && file.id > 0 && file.supported)
  };
}

function curseForgeSortParams(sort) {
  switch (String(sort || "downloads")) {
    case "updated":
      return { sortField: 3, sortOrder: "desc" };
    case "featured":
      return { sortField: 1, sortOrder: "desc" };
    case "name":
      return { sortField: 4, sortOrder: "asc" };
    case "downloads":
    default:
      return { sortField: 6, sortOrder: "desc" };
  }
}

async function searchCurseForgeBedrock(payload = {}) {
  const gameId = await resolveBedrockGameId();
  const pageSize = Math.max(1, Math.min(50, Number(payload.pageSize || 50)));
  const page = Math.max(0, Number(payload.page || 0));
  const params = {
    gameId,
    searchFilter: String(payload.query || "").trim(),
    classId: payload.classId ? Number(payload.classId) : "",
    index: page * pageSize,
    pageSize,
    ...curseForgeSortParams(payload.sort)
  };

  const response = await curseForgeRequest("/mods/search", params);
  const data = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination || {};

  return {
    items: data.map(normalizeCurseForgeProject).filter(item => item.id > 0),
    pagination: {
      index: Number(pagination.index || params.index || 0),
      pageSize: Number(pagination.pageSize || pageSize),
      resultCount: Number(pagination.resultCount || data.length),
      totalCount: Number(pagination.totalCount || data.length)
    }
  };
}

async function resolveCurseForgeDownloadUrl(modId, fileId, givenUrl = "") {
  const direct = String(givenUrl || "").trim();
  if (direct) return direct;

  try {
    const payload = await curseForgeRequest(`/mods/${Number(modId)}/files/${Number(fileId)}/download-url`);
    const url = String(unwrapCurseForgeData(payload) || "").trim();
    if (url) return url;
  } catch {}

  // Public web download fallback used by CurseForge's own download pages.
  return `${CURSEFORGE_PUBLIC_BASE}/mods/${Number(modId)}/files/${Number(fileId)}/download`;
}

async function downloadFileToPath(url, target) {
  const parsed = new URL(String(url || ""));
  if (parsed.protocol !== "https:") throw new Error("Небезопасная ссылка загрузки CurseForge");

  const response = await fetch(parsed.toString(), {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": CURSEFORGE_USER_AGENT,
      Accept: "application/octet-stream,application/zip;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) throw new Error(`CurseForge вернул HTTP ${response.status}`);
  if (!response.body) throw new Error("CurseForge не вернул содержимое файла");

  const contentLength = Number(response.headers.get("content-length") || 0);
  const maxBytes = 1024 * 1024 * 1024; // 1 GiB safety limit.
  if (contentLength && contentLength > maxBytes) {
    throw new Error("Файл CurseForge больше 1 ГБ");
  }

  fs.ensureDirSync(path.dirname(target));
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(target));

  const stat = fs.statSync(target);
  if (!stat.size) throw new Error("Скачанный файл пустой");
  if (stat.size > maxBytes) {
    fs.removeSync(target);
    throw new Error("Файл CurseForge больше 1 ГБ");
  }
}

async function installCurseForgeBedrock(payload = {}) {
  const root = String(payload.root || detectDefaultRoot());
  const modId = Number(payload.modId || 0);
  const fileId = Number(payload.fileId || 0);
  const profileIds = Array.isArray(payload.profileIds) ? payload.profileIds.map(String) : null;
  const selectedProfiles = Array.isArray(payload.profiles) ? payload.profiles : null;
  const fileName = path.basename(String(payload.fileName || `curseforge-${fileId}.zip`));

  if (!modId || !fileId) throw new Error("Не выбран файл CurseForge");
  if (!isBedrockInstallArchive(fileName)) {
    throw new Error("Этот файл CurseForge не похож на .mcpack, .mcaddon, .mcworld или .zip");
  }

  const downloadUrl = await resolveCurseForgeDownloadUrl(modId, fileId, payload.downloadUrl);
  const tempDir = path.join(app.getPath("temp"), "falon-curseforge", crypto.randomUUID());
  fs.ensureDirSync(tempDir);

  const target = path.join(tempDir, safeName(fileName, `curseforge-${fileId}.zip`));

  try {
    await downloadFileToPath(downloadUrl, target);
    return installArchiveToProfiles(root, target, profileIds && profileIds.length ? profileIds : null, selectedProfiles);
  } finally {
    fs.removeSync(tempDir);
  }
}


async function downloadCurseForgeBedrock(payload = {}) {
  const modId = Number(payload.modId || 0);
  const fileId = Number(payload.fileId || 0);
  const fileName = path.basename(String(payload.fileName || `curseforge-${fileId}.zip`));

  if (!modId || !fileId) throw new Error("Не выбран файл CurseForge");
  if (!isBedrockInstallArchive(fileName)) {
    throw new Error("Этот файл CurseForge не похож на .mcpack, .mcaddon, .mcworld или .zip");
  }

  const save = await dialog.showSaveDialog(mainWindow, {
    title: "Скачать файл CurseForge",
    defaultPath: path.join(app.getPath("downloads"), safeName(fileName, `curseforge-${fileId}.zip`)),
    filters: [
      { name: "Minecraft Bedrock", extensions: ["mcpack", "mcaddon", "mcworld", "mctemplate", "mcaddonpack", "zip"] },
      { name: "Все файлы", extensions: ["*"] }
    ]
  });

  if (save.canceled || !save.filePath) return { cancelled: true };
  const downloadUrl = await resolveCurseForgeDownloadUrl(modId, fileId, payload.downloadUrl);
  await downloadFileToPath(downloadUrl, save.filePath);
  return {
    cancelled: false,
    path: save.filePath,
    fileName: path.basename(save.filePath)
  };
}



function getLauncherIconKind(file) {
  const ext = path.extname(file).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico", ".svg", ".avif", ".jfif"].includes(ext)) return "image";
  return null;
}

ipcMain.handle("pick-launcher-icon", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "Выбери иконку лаунчера",
    properties: ["openFile"],
    filters: [
      { name: "Картинки", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "ico", "svg", "avif", "jfif"] },
      { name: "Все файлы", extensions: ["*"] }
    ]
  });

  if (res.canceled || !res.filePaths[0]) return null;

  const file = res.filePaths[0];
  const stat = fs.statSync(file);
  const max = 100 * 1024 * 1024;

  if (stat.size > max) throw new Error("Иконка больше 100 МБ");
  if (!getLauncherIconKind(file)) throw new Error("Выбери картинку");

  const dir = path.join(app.getPath("userData"), "launcher-icons");
  fs.ensureDirSync(dir);

  try {
    for (const item of fs.readdirSync(dir)) fs.removeSync(path.join(dir, item));
  } catch {}

  const ext = path.extname(file).toLowerCase();
  const target = path.join(dir, `launcher-icon-${Date.now()}-${crypto.randomUUID()}${ext}`);
  fs.copySync(file, target, { overwrite: true });

  return {
    path: target,
    url: pathToFileURL(target).href,
    kind: "image",
    size: stat.size,
    ts: Date.now()
  };
});

ipcMain.handle("license-activate", async (_, key) => {
  return activateAccessKey(key);
});

ipcMain.handle("license-status", async () => {
  return getCurrentLicenseStatus();
});

ipcMain.handle("get-splash-appearance", async () => {
  return {
    wallpaper: getCurrentWallpaperData(),
    duration: SPLASH_MIN_DURATION,
    validation: latestStartupValidationProgress
  };
});

ipcMain.handle("get-default-wallpaper", async () => {
  return getBundledWallpaperData();
});

ipcMain.handle("close-app", async () => {
  app.quit();
});

function getWallpaperKind(file) {
  const ext = path.extname(file).toLowerCase();

  const imageExts = [
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico", ".svg", ".avif", ".jfif", ".pjpeg", ".pjp"
  ];

  const videoExts = [
    ".mp4", ".webm", ".ogg", ".ogv", ".mov", ".m4v", ".avi", ".mkv", ".wmv"
  ];

  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  return null;
}

ipcMain.handle("pick-wallpaper", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "Выбери обои",
    properties: ["openFile"],
    filters: [
      { name: "Обои до 100 МБ", extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "ico", "svg", "avif", "jfif", "mp4", "webm", "ogg", "ogv", "mov", "m4v", "avi", "mkv", "wmv"] },
      { name: "Все файлы", extensions: ["*"] }
    ]
  });

  if (res.canceled || !res.filePaths[0]) return null;

  const file = res.filePaths[0];
  const stat = fs.statSync(file);
  const max = 100 * 1024 * 1024;

  if (stat.size > max) {
    throw new Error("Файл больше 100 МБ");
  }

  const kind = getWallpaperKind(file);
  if (!kind) {
    throw new Error("Это не похоже на картинку, GIF или видео");
  }

  const dir = path.join(app.getPath("userData"), "wallpapers");
  fs.ensureDirSync(dir);

  // Чистим старые обои, чтобы не копился мусор и не было проблем с кэшем.
  try {
    for (const item of fs.readdirSync(dir)) {
      fs.removeSync(path.join(dir, item));
    }
  } catch {}

  const ext = path.extname(file).toLowerCase();
  const target = path.join(dir, `wallpaper-${Date.now()}-${crypto.randomUUID()}${ext}`);
  fs.copySync(file, target, { overwrite: true });

  return {
    path: target,
    url: pathToFileURL(target).href,
    kind,
    size: stat.size,
    ts: Date.now()
  };
});



ipcMain.handle("open-checkout", async () => {
  const { shell } = require("electron");
  await shell.openExternal("https://dalink.to/temshikkz");
  return true;
});

ipcMain.handle("open-creator-stream", async () => {
  const { shell } = require("electron");
  await shell.openExternal(CREATOR_TIKTOK_LIVE_URL);
  return true;
});

ipcMain.handle("open-creator-xbox-profile", async () => {
  const { shell } = require("electron");
  await shell.openExternal("https://t.me/molygench");
  return { opened: "support", url: "https://t.me/molygench" };

  if (!isXboxAppInstalled()) {
    await shell.openExternal(CREATOR_XBOX_STORE_URL);
    return { opened: "store", installed: false, gamertag: CREATOR_XBOX_GAMERTAG };
  }

  try {
    execFileSync("explorer.exe", [CREATOR_XBOX_APP_AUMID], {
      windowsHide: true,
      stdio: "ignore"
    });
  } catch {}

  return { opened: "xbox-app", installed: true, gamertag: CREATOR_XBOX_GAMERTAG, profileUrl: CREATOR_XBOX_PROFILE_URL };
});

ipcMain.handle("pick-file", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "Выбери ресурс, аддон или мир",
    properties: ["openFile"],
    filters: [
      { name: "Minecraft Bedrock", extensions: ["mcpack", "mcaddon", "mcworld", "mctemplate", "mcaddonpack", "zip"] },
      { name: "Все файлы", extensions: ["*"] }
    ]
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle("get-default-root", async () => detectDefaultRoot());

ipcMain.handle("pick-root", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "Выбери папку Users или com.mojang",
    properties: ["openDirectory"]
  });
  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle("scan", async (_, root) => {
  const realRoot = root || detectDefaultRoot();
  return { root: realRoot, profiles: getConnectedProfiles(realRoot) };
});

ipcMain.handle("list-resources", async (_, profilePath) => {
  return listResourcesForProfile(profilePath);
});

ipcMain.handle("list-worlds", async (_, profilePath) => {
  return listWorldsForProfile(profilePath);
});

ipcMain.handle("install", async (_, { root, file, profileIds, profiles }) => {
  return installArchiveToProfiles(root || detectDefaultRoot(), file, profileIds && profileIds.length ? profileIds : null, Array.isArray(profiles) ? profiles : null);
});

ipcMain.handle("delete-resource", async (_, { profilePath, folder }) => {
  return deleteResource(profilePath, folder);
});

ipcMain.handle("delete-world", async (_, { profilePath, folder }) => {
  return deleteWorld(profilePath, folder);
});

ipcMain.handle("curseforge-settings", async () => {
  return getCurseForgeSettingsStatus();
});

ipcMain.handle("curseforge-save-settings", async (_, payload) => {
  return saveCurseForgeSettings(payload || {});
});

ipcMain.handle("curseforge-classes", async () => {
  return loadBedrockClasses();
});

ipcMain.handle("curseforge-search", async (_, payload) => {
  return searchCurseForgeBedrock(payload || {});
});

ipcMain.handle("curseforge-install", async (_, payload) => {
  return installCurseForgeBedrock(payload || {});
});

ipcMain.handle("curseforge-download", async (_, payload) => {
  return downloadCurseForgeBedrock(payload || {});
});

ipcMain.handle("open-curseforge-page", async (_, url) => {
  const { shell } = require("electron");
  const parsed = new URL(String(url || ""));
  if (parsed.protocol !== "https:" || !/(^|\.)curseforge\.com$/i.test(parsed.hostname)) {
    throw new Error("Разрешены только ссылки CurseForge");
  }
  await shell.openExternal(parsed.toString());
  return true;
});

ipcMain.handle("game-catalog", async (_, payload) => {
  return gameManager.fetchVersionCatalog(payload || {});
});

ipcMain.handle("game-catalog-refresh", async () => {
  const result = await gameManager.validateCatalogDownloads({ force: true }, (progress) => {
    sendGameCatalogValidationProgress(progress || {});
  });
  return {
    catalog: result.rawCatalog || result.catalog || {},
    cache: result.cache || null
  };
});

ipcMain.handle("game-installed", async () => {
  return gameManager.listInstalledVersions();
});

ipcMain.handle("game-install", async (_, payload) => {
  return gameManager.downloadAndInstallVersion(payload || {}, mainWindow);
});

ipcMain.handle("game-launch", async (_, name) => {
  const licenseStatus = getCurrentLicenseStatus();
  return gameManager.launchInstalledVersion(String(name || ""), mainWindow, licenseStatus);
});

ipcMain.handle("game-delete", async (_, name) => {
  return gameManager.deleteInstalledVersion(String(name || ""));
});

ipcMain.handle("game-open-versions-folder", async () => {
  return gameManager.openVersionsFolder();
});

ipcMain.handle("game-open-installers-folder", async () => {
  return gameManager.openInstallersFolder();
});

ipcMain.handle("open-folder", async (_, folder) => {
  const target = String(folder || "").trim();
  if (!target) throw new Error("Путь не указан");
  if (!fs.existsSync(target)) throw new Error(`Папка не найдена: ${target}`);
  const error = await shell.openPath(target);
  if (error) throw new Error(error);
  return { ok: true, path: target };
});
