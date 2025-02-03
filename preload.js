// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    saveFile: (data) => ipcRenderer.invoke('save-file', data),
    listFiles: (folder) => ipcRenderer.invoke('list-files', folder)
});

