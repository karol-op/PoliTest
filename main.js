const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
// Używamy wersji promisowej fs dla operacji asynchronicznych
const fs = require('fs').promises;
// Dla operacji synchronicznych (np. copyFileSync) – osobny moduł
const fssync = require('fs');
const { autoUpdater } = require("electron-updater");

let mainWindow;
if (!app.isPackaged) {
    const devUpdateConfigPath = path.join(__dirname, "dev-app-update.yml");
    process.env.AUTO_UPDATER_DEV = "true";
    autoUpdater.updateConfigPath = devUpdateConfigPath;
}
function createWindow() {
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

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else { 
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    Menu.setApplicationMenu(null);
    checkForUpdates();
}

app.whenReady().then(() => {
    createWindow();

    // --- IPC Handlery ---

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

    ipcMain.handle('save-file', async (event, { folder, fileName, fileContent, isBinary = false }) => {
        try {
            const filePath = path.join(folder, fileName);
            await fs.writeFile(filePath, fileContent, isBinary ? null : 'utf8');
            return { success: true };
        } catch (error) {
            console.error('Błąd zapisu pliku:', error);
            return { success: false, message: 'Błąd zapisu pliku' };
        }
    });

    ipcMain.handle('read-file', async (event, { folder, fileName, isBinary = false }) => {
        try {
            const filePath = path.join(folder, fileName);
            const content = await fs.readFile(filePath, isBinary ? null : 'utf8');
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

    // Obsługa wyboru obrazu
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

    ipcMain.handle('show-save-dialog', async (event, options) => {
        const result = await dialog.showSaveDialog(options);
        return result;
    });

    ipcMain.handle('export-pdf', async (event, options) => {
        console.log('Eksportowanie PDF z opcjami:', options);

        const PDFDocument = require('pdfkit');
        const fsSync = require('fs'); // Używamy wersji synchronicznej dla zapisu PDF
        const sizeOf = require('image-size'); // Upewnij się, że pakiet jest zainstalowany

        try {
            const { pdfContent, savePath } = options;
            const doc = new PDFDocument();
            const writeStream = fsSync.createWriteStream(savePath);
            doc.pipe(writeStream);

            const removeDiacritics = (str) => {
                if (!str) return '';
                return str
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/ł/g, 'l')
                    .replace(/Ł/g, 'L');
            };

            // Nagłówek
            doc.fontSize(20)
                .text(removeDiacritics(pdfContent.testName), { align: 'center' })
                .moveDown(2);

            const margin = 50;
            const pageWidth = doc.page.width - 2 * margin;
            let verticalPosition = doc.y;

            pdfContent.questions.forEach((q, index) => {
                const questionNumber = `${index + 1}. `;
                const questionText = removeDiacritics(q.question);
                const questionHeight = doc.heightOfString(questionNumber + questionText, { width: pageWidth });

                if (verticalPosition + questionHeight > doc.page.height - margin) {
                    doc.addPage();
                    verticalPosition = margin;
                }

                doc.fontSize(14)
                    .text(questionNumber + questionText, { paragraphGap: 10 })
                    .moveDown(0.5);

                verticalPosition = doc.y;

                // Obsługa obrazu
                if (q.image) {
                    try {
                        const dimensions = sizeOf(q.image);
                        const maxWidth = 400;
                        const ratio = maxWidth / dimensions.width;
                        const scaledHeight = dimensions.height * ratio;

                        if (verticalPosition + scaledHeight > doc.page.height - margin) {
                            doc.addPage();
                            verticalPosition = margin;
                        }

                        doc.image(q.image, { width: maxWidth, align: 'center' });
                        verticalPosition += scaledHeight + 20;
                        doc.y = verticalPosition;
                        doc.moveDown(1);
                    } catch (imageError) {
                        console.error('Błąd obrazu:', imageError);
                        doc.fontSize(12)
                            .fillColor('red')
                            .text('[BŁĄD OBRAZU]', { align: 'center' })
                            .fillColor('black');
                    }
                }

                // Wyjaśnienie pytania
                if (q.explanation && pdfContent.options.includeExplanations) {
                    const explanationText = "Wyjasnienie: " + removeDiacritics(q.explanation);
                    doc.fontSize(12)
                        .fillColor('#666')
                        .text(explanationText, { indent: 20 })
                        .moveDown(0.5);
                }

                // Odpowiedzi
                q.answers.forEach((ans, i) => {
                    const prefix = `${String.fromCharCode(65 + i)}. `;
                    let answerText = prefix + removeDiacritics(ans.text);

                    if (pdfContent.options.includeCorrectAnswers && ans.correct) {
                        answerText += " (poprawna)";
                    }

                    doc.fontSize(12)
                        .fillColor('black')
                        .text(answerText, { indent: 20 })
                        .moveDown(0.3);

                    if (ans.explanation && pdfContent.options.includeExplanations) {
                        doc.fontSize(10)
                            .fillColor('#999')
                            .text(`Wyjasnienie: ${removeDiacritics(ans.explanation)}`, { indent: 40 })
                            .moveDown(0.2);
                    }
                });

                doc.moveDown(1);
                verticalPosition = doc.y;
            });

            doc.end();

            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            return { success: true, filePath: savePath };
        } catch (error) {
            console.error("Błąd generowania PDF:", error);
            return { success: false, error: error.message };
        }
    });

    // Przykładowa funkcja kopiowania synchronizowanego (opcjonalnie)
    function copyFileSync({ sourcePath, targetPath }) {
        try {
            const src = path.resolve(sourcePath.toString());
            const dest = path.resolve(targetPath.toString());
            console.log(`Próba kopiowania: ${src} -> ${dest}`);
            fssync.copyFileSync(src, dest);
            return { success: true };
        } catch (error) {
            console.error("Błąd kopiowania pliku:", error);
            return { success: false, error: error.message };
        }
    }

    ipcMain.handle('copy-file', async (event, { source, destination }) => {
        console.log("Source:", source, "Destination:", destination);

        if (typeof source !== "string" || typeof destination !== "string") {
            console.error("Invalid arguments: source and destination must be strings.");
            return { success: false, error: "Invalid arguments: source and destination must be strings." };
        }

        try {
            const src = path.resolve(source);
            const dest = path.resolve(destination);
            // Sprawdzenie czy źródło istnieje
            const sourceExists = await fs.access(src).then(() => true).catch(() => false);
            if (!sourceExists) {
                return { success: false, error: `Source file not found: ${src}` };
            }

            console.log(`Copying file from: ${src} -> ${dest}`);
            await fs.copyFile(src, dest);
            console.log("File copied!");
            return { success: true };
        } catch (error) {
            console.error('Error copying file:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('copyFile', async (event, { source, destination }) => {
        console.log("Źródło:", source, "Cel:", destination);

        if (typeof source !== "string" || typeof destination !== "string") {
            console.error("Nieprawidłowe argumenty: source i destination muszą być stringami!");
            return { success: false, error: "Invalid arguments: source and destination must be strings." };
        }

        try {
            const src = path.resolve(source);
            const dest = path.resolve(destination);
            console.log(`Kopiowanie pliku z: ${src} -> ${dest}`);
            await fs.copyFile(src, dest);
            console.log("Plik skopiowany!");
            return { success: true };
        } catch (error) {
            console.error('Błąd kopiowania pliku:', error);
            return { success: false, error: error.message };
        }
    });

    // --- AutoUpdater ---

    autoUpdater.on("update-available", () => {
        const response = dialog.showMessageBoxSync(mainWindow, {
            type: "info",
            title: "Nowa aktualizacja dostępna",
            message: "Dostępna jest nowa wersja aplikacji. Czy chcesz ją pobrać?",
            buttons: ["Tak", "Nie"],
        });

        if (response === 0) {
            autoUpdater.downloadUpdate();
        }
    });

    autoUpdater.on("update-downloaded", () => {
        const response = dialog.showMessageBoxSync(mainWindow, {
            type: "info",
            title: "Aktualizacja pobrana",
            message: "Aplikacja zostanie teraz zaktualizowana i uruchomiona ponownie.",
            buttons: ["Zainstaluj teraz"],
        });

        if (response === 0) {
            autoUpdater.quitAndInstall();
        }
    });

    // Dodajemy zdarzenie update-not-available – informuje użytkownika, że nie ma aktualizacji
    autoUpdater.on("update-not-available", () => {
        dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Brak aktualizacji",
            message: "Aktualnie korzystasz z najnowszej wersji aplikacji."
        });
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
autoUpdater.on("download-progress", (progressObj) => {
    mainWindow.webContents.send("download-progress", progressObj.percent);
});

function checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify();
}
