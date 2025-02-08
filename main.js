const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
let mainWindow;
app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development';

  ipcMain.handle('list-files', async (event, folderPath) => {
    try {
      const files = await fs.readdir(folderPath);
      return { success: true, files };
    } catch (error) {
      console.error('Błąd przy odczycie plików:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle('save-file', async (event, { folder, fileName, fileContent }) => {
    try {
      const filePath = path.join(folder, fileName);
      await fs.writeFile(filePath, fileContent, 'utf8');
      return { success: true };
    } catch (error) {
      console.error('Error saving file:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-file', async (event, { folder, fileName }) => {
    try {
      const filePath = path.join(folder, fileName);
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, content };
    } catch (error) {
      console.error('Błąd odczytu pliku:', error);
      return { success: false, message: 'Błąd odczytu pliku' };
    }
  });
  ipcMain.handle('delete-file', async (_, { folder, fileName }) => {
    const filePath = path.join(folder, fileName);
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('Błąd usuwania pliku:', error);
      return { success: false };
    }
  });
  //obsługa wyboru obrazu
  ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  //obsługa kopiowania pliku
  ipcMain.handle('copy-file', async (event, { source, destination }) => {
    try {
      await fs.copyFile(source, destination);
      return { success: true };
    } catch (error) {
      console.error('Error copying file:', error);
      return { success: false, error: error.message };
    }
  });

  if (isDev) {
      mainWindow.webContents.toggleDevTools();

    mainWindow.loadURL('http://localhost:5173'); 
  } else {
      mainWindow.webContents.toggleDevTools();

    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  Menu.setApplicationMenu(null);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});
