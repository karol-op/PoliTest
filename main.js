const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    // Utwórz nowe okno przeglądarki
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            // Wskazanie ścieżki do preload.js (opcjonalne)
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,  // Możesz ustawić na false dla lepszej bezpieczeństwa i korzystać z preload
            contextIsolation: false // Jeśli true, będziesz musiał wystawiać API do renderera przez preload
        }
    });

    // Załaduj plik index.html
    win.loadFile('index.html');

    // Opcjonalnie: otwórz narzędzia deweloperskie
    // win.webContents.openDevTools();
}

// Wywołanie funkcji, gdy Electron zakończy inicjalizację
app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        // Na macOS, aplikacja powinna ponownie utworzyć okno, jeśli wszystkie zostały zamknięte
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Zamknięcie aplikacji, gdy wszystkie okna są zamknięte
app.on('window-all-closed', function () {
    // Na macOS zwykle aplikacje działają dalej, dopóki użytkownik nie zamknie jej explicite
    if (process.platform !== 'darwin') app.quit();
});
