const { app, BrowserWindow } = require('electron');
const path = require('path');
let mainWindow;
app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // Ładuje aplikację Vue zamiast index.html
    mainWindow.loadURL('http://localhost:5173');

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
});

