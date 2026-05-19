const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("splashApi", {
  getAppearance: () => ipcRenderer.invoke("get-splash-appearance"),
  onValidationProgress: (callback) => {
    const listener = (_, payload) => callback(payload || {});
    ipcRenderer.on("startup-validation-progress", listener);
    return () => ipcRenderer.removeListener("startup-validation-progress", listener);
  }
});
