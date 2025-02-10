<template>
    <div class="merging-wrapper">
        <header class="merging-header">
            <button @click="goToMainMenu" class="menu-btn">🏠</button>
            <h1 class="page-title">Scalanie folderów z pytaniami</h1>
        </header>

        <section class="folder-selection">
            <h2>Wybierz foldery źródłowe</h2>
            <h4>(skąd będą kopiowane pliki)</h4>
            <ul>
                <li v-for="(folder, index) in sourceFolders" :key="folder">
                    <span class="folder-name">{{ folder }}</span>
                    <button @click="removeSourceFolder(index)" class="remove-btn">Usuń</button>
                </li>
            </ul>
            <button @click="addSourceFolder" class="action-btn">Dodaj folder źródłowy</button>
        </section>

        <section class="target-folder">
            <h2>Wybierz folder docelowy</h2>
            <h4>(dokąd będą kopiowane pliki)</h4>
            <p v-if="targetFolder" class="selected-folder">
                Wybrany folder: <strong>{{ targetFolder }}</strong>
            </p>
            <button @click="selectTargetFolder" class="action-btn">Wybierz folder docelowy</button>
        </section>

        <section class="test-name-selection">
            <h2>Nazwa testu</h2>
            <input type="text"
                   v-model="testName"
                   placeholder="Wpisz nazwę testu"
                   class="text-input" />
        </section>

        <section class="merge-actions">
            <button @click="mergeFolders" :disabled="!canMerge" class="merge-btn">
                Scal foldery
            </button>
        </section>
    </div>

    <!-- Pop-up notyfikacji wewnątrz aplikacji -->
    <div v-if="notificationPopupVisible" class="notification-popup">
        <div class="notification-content">
            <p>{{ notificationPopupText }}</p>
            <button @click="closeNotification" class="close-notif-btn">OK</button>
        </div>
    </div>
</template>

<script>
    import { ref, computed } from "vue";
    import { useRouter } from "vue-router";
    import path from "path";

    export default {
        name: "MergingFolders",
        setup() {
            // Pomocnicze funkcje do operacji na nazwach plików
            function getFileExtension(filename) {
                return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
            }
            function getFileNameWithoutExtension(filename) {
                return filename.slice(0, (filename.lastIndexOf(".") >>> 0));
            }

            const router = useRouter();

            // Zmienne główne
            const sourceFolders = ref([]);
            const targetFolder = ref(null);
            const testName = ref("");
            // Zmienna na wewnętrzny pop-up notyfikacji
            const notificationPopupVisible = ref(false);
            const notificationPopupText = ref("");

            // Zmienna pomocnicza – warunek, czy można rozpocząć scalanie
            const canMerge = computed(
                () =>
                    sourceFolders.value.length > 0 &&
                    targetFolder.value &&
                    testName.value.trim() !== ""
            );

            // Funkcja do wyświetlania notyfikacji wewnętrznego pop-upu
            function showNotification(text) {
                notificationPopupText.value = text;
                notificationPopupVisible.value = true;
            }
            function closeNotification() {
                notificationPopupVisible.value = false;
                notificationPopupText.value = "";
            }

            // Dodaj folder źródłowy – najpierw sprawdzamy, czy folder zawiera co najmniej jeden obsługiwany plik
            async function addSourceFolder() {
                try {
                    const folderPath = await window.electronAPI.selectFolder();
                    if (folderPath && !sourceFolders.value.includes(folderPath)) {
                        const result = await window.electronAPI.listFiles(folderPath);
                        if (result.success) {
                            // Filtrujemy pliki o obsługiwanych rozszerzeniach, pomijając "testname.txt"
                            const validFiles = result.files.filter((file) => {
                                const ext = getFileExtension(file).toLowerCase();
                                return (
                                    ["txt", "png", "jpg", "jpeg"].includes(ext) &&
                                    file.toLowerCase() !== "testname.txt"
                                );
                            });
                            if (validFiles.length === 0) {
                                showNotification(
                                    "Wybrany folder źródłowy nie zawiera żadnych obsługiwanych plików."
                                );
                                return;
                            }
                        }
                        sourceFolders.value.push(folderPath);
                    }
                } catch (error) {
                    console.error("Błąd przy wybieraniu folderu źródłowego:", error);
                    showNotification("Błąd przy wybieraniu folderu źródłowego.");
                }
            }

            function removeSourceFolder(index) {
                sourceFolders.value.splice(index, 1);
            }

            async function selectTargetFolder() {
                try {
                    const folderPath = await window.electronAPI.selectFolder();
                    if (folderPath) {
                        targetFolder.value = folderPath;
                    }
                } catch (error) {
                    console.error("Błąd przy wybieraniu folderu docelowego:", error);
                    showNotification("Błąd przy wybieraniu folderu docelowego.");
                }
            }

            // Funkcja scalająca foldery
            async function mergeFolders() {
                if (!canMerge.value) return;
                showNotification("Rozpoczynanie scalania...");
                let mergedFilesCount = 0;
                const existingFiles = new Set();

                for (const source of sourceFolders.value) {
                    try {
                        const result = await window.electronAPI.listFiles(source);
                        if (result.success) {
                            for (const file of result.files) {
                                // Pomijamy plik "testname.txt"
                                if (file.toLowerCase() === "testname.txt") continue;

                                const ext = getFileExtension(file);
                                const baseName = getFileNameWithoutExtension(file);
                                if (!["txt", "png", "jpg", "jpeg"].includes(ext.toLowerCase()))
                                    continue; // pomijamy nieobsługiwane typy plików

                                let newFileName = file;
                                let version = 1;
                                while (existingFiles.has(newFileName.toLowerCase())) {
                                    version++;
                                    newFileName = `${baseName}_v${version}.${ext}`;
                                }
                                existingFiles.add(newFileName.toLowerCase());

                                // Odczytujemy zawartość pliku (tryb binarny dla obrazów)
                                const isBinary = ["png", "jpg", "jpeg"].includes(ext.toLowerCase());
                                const readResult = await window.electronAPI.readFile({
                                    folder: source,
                                    fileName: file,
                                    isBinary: isBinary,
                                });
                                if (!readResult.success) {
                                    console.warn(`Nie udało się odczytać pliku ${file}`);
                                    continue;
                                }
                                // Zapisujemy plik do folderu docelowego
                                const saveResult = await window.electronAPI.saveFile({
                                    folder: targetFolder.value,
                                    fileName: newFileName,
                                    fileContent: readResult.content,
                                    isBinary: isBinary,
                                });
                                if (saveResult.success) {
                                    mergedFilesCount++;
                                } else {
                                    console.warn(`Nie udało się zapisać pliku ${newFileName}`);
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Błąd scalania folderu:", source, error);
                    }
                }

                // Zapisujemy plik "testname.txt" w folderze docelowym z nazwą testu wprowadzoną przez użytkownika
                const saveTestNameResult = await window.electronAPI.saveFile({
                    folder: targetFolder.value,
                    fileName: "testname.txt",
                    fileContent: testName.value,
                    isBinary: false,
                });
                showNotification(
                    `Scalanie zakończone. Skopiowano ${mergedFilesCount} plików.`
                );
            }

            // Funkcja pomocnicza – sanitizacja tekstu (opcjonalnie)
            function sanitize(text) {
                return text
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/[^a-z0-9_]/g, "")
                    .substring(0, 50);
            }

            function goToMainMenu() {
                router.push("/");
            }

            return {
                sourceFolders,
                targetFolder,
                testName,
                mergeStatus: notificationPopupText, // opcjonalnie, jeśli chcesz odwołać się do treści pop-upu
                canMerge,
                addSourceFolder,
                removeSourceFolder,
                selectTargetFolder,
                mergeFolders,
                goToMainMenu,
                sanitize,
                // Pop-up notyfikacji
                notificationPopupVisible,
                notificationPopupText,
                closeNotification,
            };
        },
    };
</script>

<style scoped>
    .merging-wrapper {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
        background: #1a1a1a;
        border-radius: 8px;
        color: #fff;
        font-family: sans-serif;
    }

    .merging-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1rem;
        margin-bottom: 1.5rem;
    }

    .menu-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 4px;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: #fff;
        font-size: 1.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
        margin-right: 1rem;
    }

        .menu-btn:hover {
            transform: translateY(-2px);
        }

    .page-title {
        flex-grow: 1;
        text-align: center;
        margin: 0;
        font-size: 1.5rem;
    }

    /* Sekcja wyboru folderów źródłowych */
    .folder-selection,
    .target-folder,
    .test-name-selection,
    .merge-actions {
        margin-bottom: 1.5rem;
    }

        .folder-selection ul {
            list-style: none;
            padding: 0;
        }

        .folder-selection li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }

    .folder-name {
        word-break: break-all;
    }

    .remove-btn {
        background: #ff4444;
        border: none;
        border-radius: 4px;
        padding: 0.3rem 0.7rem;
        cursor: pointer;
        transition: transform 0.2s;
    }

        .remove-btn:hover {
            transform: translateY(-2px);
        }

    .action-btn {
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 6px;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: #fff;
        cursor: pointer;
        transition: transform 0.2s;
        margin-top: 0.5rem;
    }

        .action-btn:hover {
            transform: translateY(-2px);
        }

    .selected-folder {
        margin-bottom: 0.5rem;
    }

    .test-name-selection input.text-input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #444;
        border-radius: 4px;
        background: #2a2a2a;
        color: #fff;
    }

    .merge-actions {
        text-align: center;
    }

    .merge-btn {
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 6px;
        background: linear-gradient(135deg, #42b983, #2ecc71);
        color: #fff;
        cursor: pointer;
        transition: transform 0.2s;
    }

        .merge-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .merge-btn:hover:not(:disabled) {
            transform: translateY(-2px);
        }

    /* Style dla pop-up notyfikacji */
    .notification-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    }

    .notification-content {
        background: #1a1a1a;
        color: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 80%;
        text-align: center;
    }

    .close-notif-btn {
        margin-top: 15px;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        background: #42b983;
        color: #fff;
        cursor: pointer;
        transition: transform 0.2s;
    }

        .close-notif-btn:hover {
            transform: translateY(-2px);
        }
</style>
