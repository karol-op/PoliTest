const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises
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

    // Handler wyboru folderu – otwiera natywny dialog do wyboru katalogu
    ipcMain.handle('select-folder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        })
        if (result.canceled || result.filePaths.length === 0) {
            return null
        }
        return result.filePaths[0]
    })
    Menu.setApplicationMenu(null);


    // Handler zapisu pliku – zapisuje plik w podanym folderze
    ipcMain.handle('save-file', async (event, { folder, fileName, fileContent }) => {
        try {
            const filePath = path.join(folder, fileName)
            await fs.writeFile(filePath, fileContent, 'utf8')
            return { success: true }
        } catch (error) {
            console.error('Error saving file:', error)
            return { success: false, error: error.message }
        }
    })

    // Ładuje aplikację Vue zamiast index.html
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
});

