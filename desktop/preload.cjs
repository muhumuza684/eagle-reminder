const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("dEagleDesktop", {
  platform: "windows",
  version: process.versions.electron,
});
