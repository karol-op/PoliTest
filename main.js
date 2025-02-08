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
            const content = await fs.readFile(filePath, isBinary ? null : 'utf8'); // Binary mode when needed
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
    ipcMain.handle('show-save-dialog', async (event, options) => {
        const result = await dialog.showSaveDialog(options);
        return result;
    });
ipcMain.handle('export-pdf', async (event, options) => {
    console.log('Eksportowanie PDF z opcjami:', options);

    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const { pdfContent, savePath } = options;

    const removeDiacritics = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    try {
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(savePath);
        doc.pipe(writeStream);

        const title = removeDiacritics(pdfContent.testName);
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();

        for (const q of pdfContent.questions) {
            const questionText = `${pdfContent.questions.indexOf(q) + 1}. ${removeDiacritics(q.question)}`;
            doc.fontSize(14).text(questionText);

            if (q.image) {
                try {
                    // Get image dimensions to calculate scaling
                    const imageStats = fs.statSync(q.image);
                    const image = doc.image(q.image, {
                        fit: [400, 250], // Maintain aspect ratio, fit within bounds
                        align: 'center',
                        // Add below line to avoid overlapping
                        // moveDown: 1 // Add some space after the image
                    });
                    doc.moveDown(1); // Add some space after the image
                    // or
                    // doc.moveDown(image.height + 10); // Add space based on image height + margin
                } catch (imageError) {
                    console.error('Błąd podczas wstawiania obrazu:', imageError);
                    doc.fontSize(12).fillColor('red').text("Błąd: Nie można załadować obrazu.", { align: 'center' });
                    doc.fillColor('black'); // Reset color
                }
            }

            if (q.explanation && pdfContent.options.includeExplanations) {
                const explanationText = "Wyjaśnienie: " + removeDiacritics(q.explanation);
                doc.fontSize(12).fillColor('gray').text(explanationText, { indent: 20 });
                doc.fillColor('black');
            }

            q.answers.forEach((ans, i) => {
                const answerPrefix = String.fromCharCode(65 + i) + ". ";
                let answerText = answerPrefix + removeDiacritics(ans.text);

                if (pdfContent.options.includeCorrectAnswers && ans.correct) {
                    answerText += " (poprawna)";
                }
                doc.fontSize(12).text(answerText, { indent: 20 });

                if (ans.explanation && pdfContent.options.includeExplanations) {
                    const ansExplanation = "Wyjaśnienie: " + removeDiacritics(ans.explanation);
                    doc.fontSize(10).fillColor('gray').text(ansExplanation, { indent: 40 });
                    doc.fillColor('black');
                }
            });

            doc.moveDown(); // Space between questions
        }

        doc.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        console.log('PDF wygenerowany w:', savePath);
        return { success: true, filePath: savePath };
    } catch (error) {
        console.error("Error generating PDF:", error);
        return { success: false, error: error.message };
    }
});
    function copyFile({ sourcePath, targetPath }) {
        try {
            const src = path.resolve(sourcePath.toString());  // Konwersja na string
            const dest = path.resolve(targetPath.toString());

            console.log(`Próba kopiowania: ${src} -> ${dest}`);

            fs.copyFileSync(src, dest);
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

            // Check if source exists
            const sourceExists = await fs.access(src).then(() => true).catch(() => false);
            if (!sourceExists) {
                return { success: false, error: `Source file not found: ${src}` };
            }

            console.log(`Copying file from: ${src} -> ${dest}`);
            await fs.copyFile(src, dest); // Używamy asynchronicznej fs.copyFile
            console.log("File copied!");
            return { success: true };
        } catch (error) {
            console.error('Error copying file:', error);
            return { success: false, error: error.message };
        }
    });


    ipcMain.handle('copyFile', async (event, { source, destination }) => {
        console.log("Źródło:", source, "Cel:", destination); // Debug

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
