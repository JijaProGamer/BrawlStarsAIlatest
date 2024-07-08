const { contextBridge, ipcRenderer } = require('electron');

/*contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
});*/

contextBridge.exposeInMainWorld('electron', {
    on_environment_detections: (func) => {
        ipcRenderer.on("environment-detections", (_, ...args) => func(...args));
    },
    on_settings: (func) => {
        ipcRenderer.on("settings", (_, ...args) => func(...args));
    }
});