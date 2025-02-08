<template>
    <div class="merging-wrapper">
        <!-- Nagłówek z przyciskiem powrotu -->
        <header class="merging-header">
            <button @click="goToMainMenu" class="menu-btn">🏠</button>
            <h1 class="page-title">Scalanie folderów z pytaniami</h1>
        </header>

        <!-- Wybór folderów źródłowych -->
        <section class="folder-selection">
            <h2>Wybierz foldery źródłowe</h2>
            <ul>
                <li v-for="(folder, index) in sourceFolders" :key="folder">
                    <span class="folder-name">{{ folder }}</span>
                    <button @click="removeSourceFolder(index)" class="remove-btn">Usuń</button>
                </li>
            </ul>
            <button @click="addSourceFolder" class="action-btn">Dodaj folder źródłowy</button>
        </section>

        <!-- Wybór folderu docelowego -->
        <section class="target-folder">
            <h2>Wybierz folder docelowy</h2>
            <p v-if="targetFolder" class="selected-folder">
                Wybrany folder: <strong>{{ targetFolder }}</strong>
            </p>
            <button @click="selectTargetFolder" class="action-btn">Wybierz folder docelowy</button>
        </section>

        <!-- Wybór nazwy testu -->
        <section class="test-name-selection">
            <h2>Nazwa testu</h2>
            <input type="text"
                   v-model="testName"
                   placeholder="Wpisz nazwę testu"
                   class="text-input" />
        </section>

        <!-- Przycisk scalania -->
        <section class="merge-actions">
            <button @click="mergeFolders" :disabled="!canMerge" class="merge-btn">
                Scal foldery
            </button>
        </section>

        <!-- Status scalania -->
        <section class="merge-status" v-if="mergeStatus">
            <p>{{ mergeStatus }}</p>
        </section>
    </div>
</template>

<script>
    import { ref, computed } from "vue";
    import { useRouter } from "vue-router";

    export default {
        name: "MergingFolders",
        setup() {
            const router = useRouter();

            // Foldery źródłowe i docelowy
            const sourceFolders = ref([]);
            const targetFolder = ref(null);
            // Nazwa testu (dla pliku testname.txt)
            const testName = ref("");
            // Status scalania (komunikat)
            const mergeStatus = ref("");

            // Możliwość scalania – musi być wybranych co najmniej jeden folder źródłowy,
            // ustalony folder docelowy oraz wpisana nazwa testu
            const canMerge = computed(
                () =>
                    sourceFolders.value.length > 0 &&
                    targetFolder.value &&
                    testName.value.trim() !== ""
            );

            // Dodanie folderu źródłowego
            async function addSourceFolder() {
                try {
                    const folderPath = await window.electronAPI.selectFolder();
                    if (folderPath && !sourceFolders.value.includes(folderPath)) {
                        sourceFolders.value.push(folderPath);
                    }
                } catch (error) {
                    console.error("Błąd przy wybieraniu folderu źródłowego:", error);
                }
            }

            // Usunięcie folderu źródłowego
            function removeSourceFolder(index) {
                sourceFolders.value.splice(index, 1);
            }

            // Wybór folderu docelowego
            async function selectTargetFolder() {
                try {
                    const folderPath = await window.electronAPI.selectFolder();
                    if (folderPath) {
                        targetFolder.value = folderPath;
                    }
                } catch (error) {
                    console.error("Błąd przy wybieraniu folderu docelowego:", error);
                }
            }

            // Scalanie folderów – kopiowanie plików (pomijając testname.txt) oraz zapisywanie nowego testname.txt
            async function mergeFolders() {
                if (!canMerge.value) return;
                mergeStatus.value = "Rozpoczynanie scalania...";

                // Zapisz nową nazwę testu w pliku testname.txt w folderze docelowym
                try {
                    const sanitizedTestName = sanitize(testName.value);
                    const result = await window.electronAPI.saveFile({
                        folder: targetFolder.value,
                        fileName: "testname.txt",
                        fileContent: sanitizedTestName,
                    });
                    if (!result.success) {
                        mergeStatus.value = "Błąd przy zapisie pliku testname.txt.";
                        return;
                    }
                } catch (error) {
                    console.error("Błąd przy zapisie testname.txt:", error);
                    mergeStatus.value = "Błąd przy zapisie testname.txt.";
                    return;
                }

                // Kopiowanie plików z folderów źródłowych
                let mergedFilesCount = 0;
                // Obiekt do śledzenia duplikatów – liczba wystąpień danej bazowej nazwy
                const duplicateCount = {};

                for (const source of sourceFolders.value) {
                    try {
                        const result = await window.electronAPI.listFiles(source);
                        if (result.success) {
                            // Wybieramy pliki .txt, pomijając testname.txt
                            const files = result.files.filter(
                                (file) =>
                                    file.endsWith(".txt") &&
                                    file.toLowerCase() !== "testname.txt"
                            );
                            for (const file of files) {
                                const readResult = await window.electronAPI.readFile({
                                    folder: source,
                                    fileName: file,
                                });
                                if (!readResult.success) {
                                    console.warn(
                                        `Nie udało się odczytać pliku ${file} z folderu ${source}`
                                    );
                                    continue;
                                }
                                // Ustal bazową nazwę (bez rozszerzenia)
                                let baseName = file.replace(/\.txt$/i, "");
                                let newFileName = baseName + ".txt";

                                // Jeśli już wystąpił duplikat, dodajemy sufiks
                                if (!duplicateCount[baseName]) {
                                    duplicateCount[baseName] = 0;
                                } else {
                                    duplicateCount[baseName]++;
                                    newFileName = `${baseName}_v${duplicateCount[baseName]}.txt`;
                                }

                                // Zapisz plik w folderze docelowym
                                const saveResult = await window.electronAPI.saveFile({
                                    folder: targetFolder.value,
                                    fileName: newFileName,
                                    fileContent: readResult.content,
                                });
                                if (saveResult.success) {
                                    mergedFilesCount++;
                                } else {
                                    console.warn(
                                        `Nie udało się zapisać pliku ${newFileName} w folderze docelowym`
                                    );
                                }
                            }
                        } else {
                            console.warn(`Nie udało się wczytać plików z folderu ${source}`);
                        }
                    } catch (error) {
                        console.error("Błąd podczas scalania folderu:", source, error);
                    }
                }
                mergeStatus.value = `Scalanie zakończone. Skopiowano ${mergedFilesCount} plików.`;
            }

            // Funkcja sanitizująca tekst – usuwa znaki specjalne, zmienia spacje na podkreślenia, itp.
            function sanitize(text) {
                return text
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/[^a-z0-9_]/g, "")
                    .substring(0, 50);
            }

            // Powrót do strony głównej
            function goToMainMenu() {
                router.push("/");
            }

            return {
                sourceFolders,
                targetFolder,
                testName,
                mergeStatus,
                canMerge,
                addSourceFolder,
                removeSourceFolder,
                selectTargetFolder,
                mergeFolders,
                goToMainMenu,
                sanitize,
            };
        },
    };
</script>

<style scoped>
    /* Stylizacja zgodna z referencyjnymi stylami z quizu */
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
    .merge-actions,
    .merge-status {
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

    .merge-status {
        text-align: center;
        font-size: 1.1rem;
    }
</style>
