const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("mcApi", {
  closeApp: () => ipcRenderer.invoke("close-app"),
  openCheckout: () => ipcRenderer.invoke("open-checkout"),
  openCreatorStream: () => ipcRenderer.invoke("open-creator-stream"),
  openCreatorXboxProfile: () => ipcRenderer.invoke("open-creator-xbox-profile"),
  activateLicense: (key) => ipcRenderer.invoke("license-activate", key),
  licenseStatus: () => ipcRenderer.invoke("license-status"),
  freeTrialStatus: () => ipcRenderer.invoke("free-trial-status"),
  generateFreeTrialKey: () => ipcRenderer.invoke("free-trial-generate"),
  pickFile: () => ipcRenderer.invoke("pick-file"),
  pickWallpaper: () => ipcRenderer.invoke("pick-wallpaper"),
  getDefaultWallpaper: () => ipcRenderer.invoke("get-default-wallpaper"),
  pickLauncherIcon: () => ipcRenderer.invoke("pick-launcher-icon"),
  getDefaultRoot: () => ipcRenderer.invoke("get-default-root"),
  pickRoot: () => ipcRenderer.invoke("pick-root"),
  scan: (root) => ipcRenderer.invoke("scan", root),
  listResources: (profilePath) => ipcRenderer.invoke("list-resources", profilePath),
  listWorlds: (profilePath) => ipcRenderer.invoke("list-worlds", profilePath),
  install: (payload) => ipcRenderer.invoke("install", payload),
  deleteResource: (payload) => ipcRenderer.invoke("delete-resource", payload),
  deleteWorld: (payload) => ipcRenderer.invoke("delete-world", payload),
  openFolder: (folder) => ipcRenderer.invoke("open-folder", folder),
  curseforgeSettings: () => ipcRenderer.invoke("curseforge-settings"),
  curseforgeSaveSettings: (payload) => ipcRenderer.invoke("curseforge-save-settings", payload),
  curseforgeClasses: () => ipcRenderer.invoke("curseforge-classes"),
  curseforgeSearch: (payload) => ipcRenderer.invoke("curseforge-search", payload),
  curseforgeInstall: (payload) => ipcRenderer.invoke("curseforge-install", payload),
  curseforgeDownload: (payload) => ipcRenderer.invoke("curseforge-download", payload),
  openCurseForgePage: (url) => ipcRenderer.invoke("open-curseforge-page", url),
  gameCatalog: (payload) => ipcRenderer.invoke("game-catalog", payload),
  gameCatalogRefresh: () => ipcRenderer.invoke("game-catalog-refresh"),
  gameInstalled: () => ipcRenderer.invoke("game-installed"),
  gameInstall: (payload) => ipcRenderer.invoke("game-install", payload),
  gameLaunch: (name) => ipcRenderer.invoke("game-launch", name),
  gameDelete: (name) => ipcRenderer.invoke("game-delete", name),
  gameOpenVersionsFolder: () => ipcRenderer.invoke("game-open-versions-folder"),
  gameOpenInstallersFolder: () => ipcRenderer.invoke("game-open-installers-folder"),
  onCreatorLiveStarted: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("creator-live-started", listener);
    return () => ipcRenderer.removeListener("creator-live-started", listener);
  },
  onGameDownloadProgress: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("game-download-progress", listener);
    return () => ipcRenderer.removeListener("game-download-progress", listener);
  },
  onGameInstallStatus: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("game-install-status", listener);
    return () => ipcRenderer.removeListener("game-install-status", listener);
  },
  onGameLaunchStatus: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("game-launch-status", listener);
    return () => ipcRenderer.removeListener("game-launch-status", listener);
  },
  onGameCatalogValidationProgress: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("game-catalog-validation-progress", listener);
    return () => ipcRenderer.removeListener("game-catalog-validation-progress", listener);
  },
  getDroppedFilePath: (file) => webUtils.getPathForFile(file)
});
