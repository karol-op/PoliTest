const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  listFiles: (folder) => ipcRenderer.invoke('list-files', folder),
  readFile: (data) => ipcRenderer.invoke('read-file', data),
  selectImage: () => ipcRenderer.invoke('select-image'),
  deleteFile: (data) => ipcRenderer.invoke('delete-file', data),
    copyFile: (source, destination) => ipcRenderer.invoke('copy-file', { source, destination }),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    exportPDF: (options) => ipcRenderer.invoke('export-pdf', options)

});
