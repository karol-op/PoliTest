<template>
    <div id="app">
        <h1>PoliTest</h1>
        <nav>
            <RouterLink to="/createtest" class="btn">
                Stwórz test
            </RouterLink>

            <!-- Kliknięcie w "Wczytaj test" najpierw otwiera okno wyboru folderu -->
            <button @click="selectFolderForTest" class="btn">
                Wczytaj test
            </button>

            <!-- Okno dialogowe akcji pojawi się dopiero po wybraniu folderu -->
            <div v-if="showActionDialog" class="action-dialog-overlay">
                <div class="action-dialog">
                    <h3>Wybierz akcję</h3>
                    <div class="dialog-buttons">
                        <button @click="selectAction('quiz')" class="dialog-btn quiz-btn">
                            Rozpocznij quiz
                        </button>
                        <button @click="selectAction('modify')" class="dialog-btn modify-btn">
                            Modyfikuj test
                        </button>
                        <button @click="selectAction('export')" class="dialog-btn export-btn">
                            Eksportuj do PDF
                        </button>
                    </div>
                    <button @click="cancelAction" class="dialog-cancel-btn">
                        Anuluj
                    </button>
                </div>
            </div>

            <!-- Ukryty input służący do wyboru folderu -->
            <input type="file"
                   ref="folderInput"
                   @change="handleFolderSelection"
                   style="display: none;"
                   webkitdirectory
                   directory />
        </nav>

        <div class="recent-tests">
            <h2>Ostatnio uruchamiane quizy</h2>
            <ul class="tests-list">
                <li v-for="(test, index) in recentTests"
                    :key="index"
                    class="test-item"
                    @click="openTest(test.folder)">
                    {{ test.name }}
                    <button @click.stop="confirmDeleteTest(index)" class="delete-btn" title="Usuń z listy">
                        🗑️
                    </button>
                </li>
            </ul>
        </div>

        <!-- Okno potwierdzenia usunięcia quizu -->
        <div v-if="showDeleteConfirmation" class="delete-confirmation-overlay">
            <div class="delete-confirmation">
                <h3>Czy na pewno chcesz usunąć ten test?</h3>
                <div class="confirmation-buttons">
                    <button @click="deleteTest(selectedTestIndex)" class="confirm-delete-btn">Tak, usuń</button>
                    <button @click="cancelDelete" class="cancel-delete-btn">Anuluj</button>
                </div>
            </div>
        </div>

        <!-- Modal dla opcji eksportu PDF -->
        <div v-if="showExportOptions" class="export-options-overlay">
            <div class="export-options-dialog">
                <h3>Opcje eksportu PDF</h3>
                <div class="export-options">
                    <label>
                        <input type="checkbox" v-model="exportOptions.includeExplanations" />
                        Eksportuj wyjaśnienia
                    </label>
                    <label>
                        <input type="checkbox" v-model="exportOptions.includeCorrectAnswers" />
                        Eksportuj poprawne odpowiedzi
                    </label>
                </div>
                <div class="dialog-buttons">
                    <button @click="confirmExport" class="dialog-btn export-btn">Eksportuj</button>
                    <button @click="cancelExport" class="dialog-btn cancel-btn">Anuluj</button>
                </div>
            </div>
        </div>

        <!-- Pasek postępu aktualizacji – wyświetlany na dole strony -->
        <div class="update-progress" v-if="updateProgress !== null">
            <div class="progress-bar" :style="{ width: updateProgress + '%' }"></div>
            <span class="progress-text">{{ Math.round(updateProgress) }}%</span>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted } from 'vue'
    import { useRouter } from 'vue-router'

    const router = useRouter()

    // -------------------------
    // Zmienne ogólne
    // -------------------------
    const folderInput = ref(null)
    const recentTests = ref([])
    const showActionDialog = ref(false)

    // Zmienne przechowujące wybrany folder i nazwę testu
    const selectedFolder = ref(null)
    const selectedTestName = ref(null)

    // Zmienne obsługi potwierdzenia usunięcia
    const showDeleteConfirmation = ref(false)
    const selectedTestIndex = ref(null)

    // Zmienne obsługi eksportu
    const showExportOptions = ref(false)
    const exportOptions = ref({
        includeExplanations: false,
        includeCorrectAnswers: false
    })
    const exportPath = ref('')

    // Zmienne do ładowania pytań przy eksporcie
    const loading = ref(false)
    const error = ref("")
    const totalQuestions = ref(0)
    const pendingQuestions = ref([])
    const testName = ref("")
    const maxDuplicateMap = ref({})
    const initialRepetitions = ref(1) // Domyślna liczba powtórzeń

    // Nowa zmienna przechowująca postęp aktualizacji (w %)
    const updateProgress = ref(null)

    // -------------------------
    // Funkcje dotyczące testów ostatnich/wyboru folderu
    // -------------------------
    const loadRecentTests = async () => {
        const storedTests = localStorage.getItem('recentTests')
        if (storedTests) {
            const parsedTests = JSON.parse(storedTests)
            const updatedTests = await Promise.all(parsedTests.map(async test => {
                try {
                    const result = await window.electronAPI.readFile({
                        folder: test.folder,
                        fileName: 'testname.txt'
                    })
                    if (result.success) {
                        return { ...test, name: result.content.trim() }
                    }
                } catch (error) {
                    console.error('Błąd aktualizacji nazwy testu:', error)
                }
                return test
            }))
            recentTests.value = updatedTests
            saveRecentTests()
        }
    }

    const saveRecentTests = () => {
        localStorage.setItem('recentTests', JSON.stringify(recentTests.value))
    }

    const deleteTest = (index) => {
        recentTests.value.splice(index, 1)
        saveRecentTests()
        showDeleteConfirmation.value = false
    }

    const confirmDeleteTest = (index) => {
        selectedTestIndex.value = index
        showDeleteConfirmation.value = true
    }

    const cancelDelete = () => {
        showDeleteConfirmation.value = false
        selectedTestIndex.value = null
    }

    const selectFolderForTest = () => {
        folderInput.value.click()
    }

    const handleFolderSelection = async (event) => {
        const files = event.target.files
        if (files.length > 0) {
            try {
                const absolutePath = files[0].path
                const folderPath = absolutePath.substring(0, absolutePath.lastIndexOf('\\'))
                let testNameLocal = folderPath.split('\\').pop()
                const nameFile = Array.from(files).find(f => f.name === 'testname.txt')
                if (nameFile) {
                    testNameLocal = await readFileContent(nameFile)
                    testNameLocal = testNameLocal.trim()
                }
                selectedFolder.value = folderPath
                selectedTestName.value = testNameLocal
                console.log("Folder selected:", selectedFolder.value, "Test name:", selectedTestName.value)
                // Po wyborze folderu otwieramy okno dialogowe akcji
                showActionDialog.value = true
            } catch (error) {
                console.error('Błąd podczas przetwarzania folderu:', error)
                alert('Wystąpił błąd podczas wczytywania testu')
            } finally {
                event.target.value = null
            }
        }
    }

    const readFileContent = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                console.log("File read successfully:", file.name)
                resolve(reader.result)
            }
            reader.onerror = (err) => {
                console.error("Error reading file:", file.name, err)
                reject(err)
            }
            reader.readAsText(file)
        })
    }

    const updateRecentTests = (name, folder) => {
        recentTests.value = recentTests.value.filter(t => t.folder !== folder)
        recentTests.value.unshift({ name, folder })
        if (recentTests.value.length > 5) {
            recentTests.value = recentTests.value.slice(0, 5)
        }
        saveRecentTests()
    }

    const navigateToTest = (folderPath, action) => {
        let routeName = 'testquiz'
        if (action === 'modify') {
            routeName = 'createquestions'
        }
        router.push({
            name: routeName,
            query: { folder: encodeURIComponent(folderPath) }
        })
    }

    // -------------------------
    // Funkcja obsługująca wybór akcji (quiz, modyfikacja, eksport)
    // -------------------------
    const selectAction = async (action) => {
        showActionDialog.value = false
        if (action === 'quiz') {
            updateRecentTests(selectedTestName.value, selectedFolder.value)
            navigateToTest(selectedFolder.value, action)
            selectedFolder.value = null
            selectedTestName.value = null
        } else if (action === 'modify') {
            navigateToTest(selectedFolder.value, action)
            selectedFolder.value = null
            selectedTestName.value = null
        } else if (action === 'export') {
            console.log("Export to PDF action selected.")
            // Otwieramy dialog zapisu (przy użyciu Electron API)
            const saveResult = await window.electronAPI.showSaveDialog({
                title: "Wybierz lokalizację zapisu PDF",
                defaultPath: selectedTestName.value + ".pdf",
                filters: [{ name: "PDF Files", extensions: ["pdf"] }]
            })
            console.log("Save dialog result:", saveResult)
            if (saveResult.canceled) {
                console.log("User canceled the save dialog.")
                selectedFolder.value = null
                selectedTestName.value = null
                return
            }
            exportPath.value = saveResult.filePath
            console.log("Export path set to:", exportPath.value)
            // Pokazujemy okno modalne z opcjami eksportu
            showExportOptions.value = true
        }
    }

    const cancelAction = () => {
        showActionDialog.value = false
        selectedFolder.value = null
        selectedTestName.value = null
    }

    // -------------------------
    // Obsługa opcji eksportu
    // -------------------------
    const confirmExport = async () => {
        console.log("User confirmed export with options:", exportOptions.value)
        showExportOptions.value = false
        console.log("Loading questions for export. Folder:", selectedFolder.value)
        await loadQuestions()
        console.log("Questions loaded:", pendingQuestions.value)
        await generatePDF(exportOptions.value)
        // Reset stanu po eksporcie
        selectedFolder.value = null
        selectedTestName.value = null
        exportOptions.value = { includeExplanations: false, includeCorrectAnswers: false }
    }

    const cancelExport = () => {
        console.log("User canceled export.")
        showExportOptions.value = false
        exportOptions.value = { includeExplanations: false, includeCorrectAnswers: false }
        selectedFolder.value = null
        selectedTestName.value = null
    }

    // -------------------------
    // Funkcje ładowania i parsowania pytań
    // -------------------------
    const loadQuestions = async () => {
        console.log("Starting loadQuestions for export. Folder:", selectedFolder.value)
        if (!selectedFolder.value) {
            error.value = "Brak wybranego folderu."
            console.error("Error: Brak wybranego folderu.")
            loading.value = false
            return
        }
        loading.value = true
        try {
            const result = await window.electronAPI.listFiles(selectedFolder.value)
            console.log("Files listed:", result)
            if (result.success) {
                const txtFiles = result.files.filter(file =>
                    file.endsWith(".txt") && file.toLowerCase() !== "testname.txt"
                )
                totalQuestions.value = txtFiles.length
                console.log("Total questions found:", totalQuestions.value)
                const loadedQuestions = []
                for (const fileName of txtFiles) {
                    console.log("Reading file:", fileName)
                    const res = await window.electronAPI.readFile({ folder: selectedFolder.value, fileName })
                    console.log("File read result for", fileName, ":", res)
                    if (res.success) {
                        const qObj = parseQuestion(res.content, fileName)
                        console.log("Parsed question object for", fileName, ":", qObj)
                        if (qObj) {
                            loadedQuestions.push(qObj)
                        }
                    }
                }
                if (loadedQuestions.length === 0) {
                    error.value = "Brak pytań w folderze."
                    console.error("Error: Brak pytań w folderze.")
                } else {
                    let initialQueue = []
                    loadedQuestions.forEach(q => {
                        const plainQ = JSON.parse(JSON.stringify(q))
                        const key = `${plainQ.fileName}:${plainQ.question}`
                        maxDuplicateMap.value[key] = initialRepetitions.value
                        for (let i = 1; i <= initialRepetitions.value; i++) {
                            initialQueue.push({ ...plainQ, repeatNumber: i })
                        }
                    })
                    console.log("Initial queue before shuffling:", initialQueue)
                    // Używamy zmodyfikowanej funkcji shuffleArray – bez destrukturyzacji
                    const shuffled = shuffleArray(initialQueue)
                    pendingQuestions.value = JSON.parse(JSON.stringify(shuffled))
                    console.log("Questions loaded and shuffled. Pending questions:", pendingQuestions.value)
                    const testNameResult = await window.electronAPI.readFile({ folder: selectedFolder.value, fileName: "testname.txt" })
                    if (testNameResult.success) {
                        testName.value = testNameResult.content.trim()
                        console.log("Test name loaded:", testName.value)
                    }
                }
            } else {
                error.value = "Nie udało się wczytać plików."
                console.error("Error: Nie udało się wczytać plików.")
            }
        } catch (e) {
            error.value = "Wystąpił błąd podczas wczytywania pytań."
            console.error("Error during loadQuestions:", e)
        } finally {
            loading.value = false
            console.log("Finished loadQuestions. Loading state:", loading.value)
        }
    }

    const parseQuestion = (content, fileName) => {
        console.log("Parsing question from file:", fileName)
        const lines = content.split("\n").map(l => l.trim()).filter(l => l !== "")
        if (lines.length < 2) {
            console.warn("Not enough lines to parse question in file:", fileName)
            return null
        }
        const marker = lines[0]
        let offset = 1
        let image = null
        if (lines[1].startsWith("[img]") && lines[1].endsWith("[/img]")) {
            const imageFileName = lines[1].substring(5, lines[1].length - 6)
            image = selectedFolder.value + "/" + imageFileName
            offset = 2
            console.log("Image found in question:", image)
        }
        const questionText = lines[offset]
        let questionExplanation = null
        let answerLines = []
        if (lines[offset + 1] && lines[offset + 1].startsWith("[exp]") && lines[offset + 1].endsWith("[/exp]")) {
            questionExplanation = lines[offset + 1].substring(5, lines[offset + 1].length - 6)
            answerLines = lines.slice(offset + 2)
            console.log("Question explanation found:", questionExplanation)
        } else {
            answerLines = lines.slice(offset + 1)
        }
        const bits = marker.slice(1).split("")
        const answers = []
        let i = 0, bitIndex = 0
        while (i < answerLines.length && bitIndex < bits.length) {
            const answerText = answerLines[i]
            let answerExplanation = null
            if (answerLines[i + 1] && answerLines[i + 1].startsWith("[exp]") && answerLines[i + 1].endsWith("[/exp]")) {
                answerExplanation = answerLines[i + 1].substring(5, answerLines[i + 1].length - 6)
                console.log("Answer explanation for answer", bitIndex, "found:", answerExplanation)
                i += 2
            } else {
                i++
            }
            const isCorrect = bits[bitIndex] === "1"
            console.log("Answer", bitIndex, "parsed:", answerText, "Correct:", isCorrect)
            answers.push({
                text: answerText,
                explanation: answerExplanation,
                correct: isCorrect
            })
            bitIndex++
        }
        const questionObj = { question: questionText, explanation: questionExplanation, image, answers, fileName }
        console.log("Finished parsing question:", questionObj)
        return questionObj
    }

    // -------------------------
    // Funkcja mieszająca – bez destrukturyzacji (używamy zmiennej tymczasowej)
    // -------------------------
    const shuffleArray = (array) => {
        console.log("Shuffling array of length:", array.length)
        let arr = array.slice() // kopia tablicy
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            let temp = arr[i]
            arr[i] = arr[j]
            arr[j] = temp
        }
        console.log("Shuffling complete.")
        return arr
    }

    // -------------------------
    // Funkcja generująca PDF (przy użyciu Electron API)
    // -------------------------
    const generatePDF = async (options) => {
        console.log("Starting PDF generation with options:", options)
        try {
            // Konwertujemy obiekty reaktywne na zwykłe (plain)
            const plainQuestions = JSON.parse(JSON.stringify(pendingQuestions.value))
            const plainOptions = JSON.parse(JSON.stringify(options))
            const plainTestName = testName.value
            const pdfContent = {
                testName: plainTestName,
                questions: plainQuestions,
                options: plainOptions
            }
            console.log("PDF content prepared:", pdfContent)
            const result = await window.electronAPI.exportPDF({
                pdfContent,
                savePath: exportPath.value
            })
            console.log("PDF export result:", result)
            if (result.success) {
                alert("PDF exported successfully!")
            } else {
                alert("Failed to export PDF.")
            }
        } catch (e) {
            console.error("Error during PDF generation:", e)
            alert("Error during PDF generation.")
        }
    }

    const openTest = (folderPath) => {
        router.push({
            name: 'testquiz',
            query: { folder: encodeURIComponent(folderPath) }
        })
    }

    onMounted(() => {
        loadRecentTests()

        // Nasłuchujemy zdarzenia 'download-progress' wysyłanego z main.js
        if (window.electronAPI && window.electronAPI.on) {
            window.electronAPI.on('download-progress', (progress) => {
                updateProgress.value = progress
                // Opcjonalnie: ukryć pasek gdy postęp osiągnie 100%
                if (progress >= 100) {
                    setTimeout(() => {
                        updateProgress.value = null
                    }, 1000)
                }
            })
        }
    })
</script>

<style scoped>
    /* Twoje dotychczasowe style pozostają bez zmian */

    .action-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .action-dialog {
        background: #2d2d2d;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        width: 400px;
    }

        .action-dialog h3 {
            color: white;
            margin-bottom: 1.5rem;
        }

    .dialog-buttons {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .dialog-btn {
        padding: 1rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        transition: transform 0.2s ease;
    }

        .dialog-btn:hover {
            transform: translateY(-2px);
        }

    .quiz-btn {
        background: linear-gradient(135deg, #42b983, #36a174);
        color: white;
    }

    .modify-btn {
        background: linear-gradient(135deg, #2196F3, #1976D2);
        color: white;
    }

    .export-btn {
        background: linear-gradient(135deg, #ff9900, #ff7700);
        color: white;
    }

    .dialog-cancel-btn {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 0.5rem 1rem;
    }

        .dialog-cancel-btn:hover {
            color: #aaa;
        }

    .delete-confirmation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .delete-confirmation {
        background: #2d2d2d;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        width: 400px;
    }

        .delete-confirmation h3 {
            color: white;
            margin-bottom: 1.5rem;
        }

    .confirmation-buttons {
        display: flex;
        justify-content: space-between;
    }

    .confirm-delete-btn,
    .cancel-delete-btn {
        padding: 1rem 2rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
    }

    .confirm-delete-btn {
        background: #ff4444;
        color: white;
    }

        .confirm-delete-btn:hover {
            background: #ff3333;
        }

    .cancel-delete-btn {
        background: #2196f3;
        color: white;
    }

        .cancel-delete-btn:hover {
            background: #1976d2;
        }

    .export-options-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .export-options-dialog {
        background: #2d2d2d;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        width: 400px;
    }

        .export-options-dialog h3 {
            color: white;
            margin-bottom: 1.5rem;
        }

    .export-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
        text-align: left;
    }

        .export-options label {
            color: white;
            font-size: 1rem;
        }

    #app {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
        text-align: center;
    }

    h1 {
        font-size: 2.5rem;
        margin-bottom: 1.5rem;
        color: white;
    }

    nav {
        margin: 2rem 0;
    }

    .btn {
        display: inline-block;
        padding: 0.8em 1.5em;
        background: linear-gradient(135deg, #42b983, #36a174);
        color: rgba(255, 255, 255, 0.87);
        text-decoration: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.3s ease, transform 0.2s ease;
        margin: 0 0.5rem;
    }

        .btn:hover {
            background: linear-gradient(135deg, #36a174, #42b983);
            transform: translateY(-2px);
        }

    .recent-tests {
        margin-top: 3rem;
        padding: 2rem;
        background-color: #1a1a1a;
        border-radius: 12px;
    }

    h2 {
        color: #42b983;
        margin-bottom: 1.5rem;
    }

    .tests-list {
        list-style: none;
        padding: 0;
        margin: 0 auto;
        max-width: 600px;
    }

    .test-item {
        position: relative;
        background-color: #2d2d2d;
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        color: white;
        padding-right: 40px;
    }

    .delete-btn {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        padding: 5px;
        transition: color 0.2s ease;
    }

        .delete-btn:hover {
            color: #ff4444;
            background: rgba(255, 68, 68, 0.1);
            border-radius: 50%;
        }

    .test-item:hover {
        background-color: #3d3d3d;
        transform: translateX(5px);
    }

    /* Style dla paska postępu aktualizacji */
    .update-progress {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background: rgba(0, 0, 0, 0.6);
        padding: 5px;
        z-index: 10000;
        display: flex;
        align-items: center;
    }

    .progress-bar {
        height: 10px;
        background-color: #42b983;
        transition: width 0.2s ease;
        flex-grow: 1;
        margin-right: 10px;
    }

    .progress-text {
        color: white;
        font-size: 0.9rem;
    }
</style>
