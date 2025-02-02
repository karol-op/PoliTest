const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra')
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

ipcMain.handle('save-question', async (event, { testName, question, answers }) => {
    const sanitize = (text) => text
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .substring(0, 30)

    const basePath = path.join(app.getPath('documents'), 'TESTY', sanitize(testName))
    await fs.ensureDir(basePath)

    const correctMarker = 'X' + answers.map(a => a.isCorrect ? '1' : '0').join('')
    const filename = `${sanitize(question)}_${correctMarker}.txt`
    const filePath = path.join(basePath, filename)

    const content = [
        correctMarker,
        question,
        ...answers.map(a => a.text)
    ].join('\n')

    await fs.writeFile(filePath, content)
    return filePath
})