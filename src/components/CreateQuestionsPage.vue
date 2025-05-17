<template>
    <div class="questions-page">
        <!-- Sekcja listy plików -->
        <div class="file-list-section">
            <h3>Pliki w folderze:</h3>
            <ul v-if="files.length" class="file-list">
                <li v-for="file in files" :key="file" class="file-item">
                    <button @click="loadFile(file)" class="file-button">
                        📄 {{ file }}
                    </button>
                </li>
            </ul>
            <p v-else class="no-files">Brak plików w folderze</p>
            <div class="file-actions">
                <button v-if="currentFileName" @click="resetCurrentFile" class="new-file-btn">
                    Nowy plik
                </button>
                <button v-if="currentFileName" @click="deleteCurrentFile" class="delete-file-btn">
                    Usuń plik
                </button>
            </div>
        </div>

        <!-- Główny formularz -->
        <div class="form-container">
            <div class="test-name-header">
                <h1>Tworzenie pytań</h1>
                <h2 class="test-name">
                    <span v-if="!editingTestName" @click="toggleEditTestName">
                        {{ storedTestName }}
                    </span>
                    <input v-else
                           type="text"
                           v-model="testName"
                           class="test-name-input-inline"
                           @blur="toggleEditTestName"
                           @keyup.enter="toggleEditTestName" />
                </h2>
            </div>

            <!-- Wybór folderu i zdjęcia -->
            <div class="folder-section">
                <div v-if="!selectedFolder">
                    <button @click="selectFolder" class="folder-btn">
                        📁 Wybierz lokalizację zapisu
                    </button>
                    <p v-if="folderError" class="error-message">{{ folderError }}</p>
                </div>
                <div v-else class="selected-folder-container">
                    <div class="selected-folder-display">
                        <p class="selected-folder">
                            📁 Wybrana lokalizacja: <strong>{{ selectedFolder }}</strong>
                        </p>
                        <button @click="changeFolder" class="reload-button" title="Zmień folder">
                            🔄
                        </button>
                    </div>
                    <div class="image-upload" v-if="!selectedImage">
                        <button type="button" @click="chooseImage" class="image-btn">
                            Dodaj zdjęcie
                        </button>
                    </div>
                </div>
            </div>

            <!-- Formularz pytania -->
            <form @submit.prevent="handleSubmit">
                <div class="form-group question-group input-container">
                    <textarea v-model.trim="currentQuestion"
                              placeholder="Wpisz swoje pytanie"
                              required
                              rows="3"
                              class="question-input"
                              :class="{ 'input-error': showErrors && !currentQuestion }"
                              @keydown.enter.prevent="handleQuestionEnter"
                              @input="sanitizeInput('currentQuestion')"></textarea>

                    <button type="button"
                            class="explanation-btn"
                            @click="openExplanationPopup('question')"
                            :class="{ 'btn-green': questionExplanation.trim() }">
                        {{ questionExplanation.trim() ? '?' : '?' }}
                    </button>
                    <span v-if="showErrors && !currentQuestion" class="error-message">
                        Pytanie jest wymagane
                    </span>
                </div>

                <!-- Podgląd zdjęcia -->
                <div v-if="selectedImage" class="image-preview-section">
                    <span class="image-name">
                        Wybrano: {{ imageFileName }}
                    </span>
                    <div class="image-preview">
                        <img :src="selectedImage" alt="Podgląd zdjęcia" />
                        <div class="image-actions">
                            <button type="button" @click="chooseImage" class="modify-image-btn" title="Zmień zdjęcie">
                                🔄
                            </button>
                            <button type="button" @click="removeImage" class="remove-btn image-remove-btn" title="Usuń zdjęcie">
                                🗑
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Sekcja odpowiedzi -->
                <div class="answers-section">
                    <h3>Odpowiedzi:</h3>
                    <div v-for="(answer, index) in answers"
                         :key="index"
                         class="answer-item">
                        <div class="answer-input-container">
                            <input type="text"
                                   v-model.trim="answer.text"
                                   placeholder="Wpisz odpowiedź"
                                   class="answer-input"
                                   :class="{ 'input-error': showErrors && !answer.text }"
                                   @keydown="handleAnswerKeys($event, index)"
                                   @input="sanitizeAnswer(index)"
                                   :data-answer-index="index" />
                        </div>

                        <label class="correct-label">
                            <input type="checkbox"
                                   v-model="answer.isCorrect"
                                   class="correct-checkbox" />
                      
                        </label>

                        <button type="button"
                                class="explanation-btn"
                                @click="openExplanationPopup('answer', index)"
                                :class="{ 'btn-green': answer.explanation.trim() }">
                            {{ answer.explanation.trim() ? '?' : '?' }}
                        </button>

                        <button type="button"
                                @click="handleAnswerImageAction(index)"
                                class="image-answer-btn"
                                :class="{ 'has-image': answer.image }"
                                :title="answer.image ? 'Akcje dla zdjęcia' : 'Dodaj zdjęcie do odpowiedzi'">
                            {{ answer.image ? '⚙️' : '📷' }}
                        </button>

                        <button v-if="answers.length > 1"
                                @click="confirmRemove(index)"
                                class="remove-btn"
                                type="button"
                                title="Usuń odpowiedź">
                            🗑
                        </button>
                    </div>
                    <div v-if="addAnswerError" class="error-message">
                        {{ addAnswerError }}
                    </div>
                </div>

                <!-- Walidacja -->
                <div v-if="showErrors && !hasCorrectAnswer" class="error-message">
                    Przynajmniej jedna odpowiedź musi być oznaczona jako poprawna
                </div>

                <!-- Przyciski akcji -->
                <div class="button-group">
                    <div class="action-buttons">
                        <button type="button"
                                @click="addAnswer"
                                class="add-answer-btn"
                                :disabled="addAnswerPending">
                            ➕ Dodaj odpowiedź
                        </button>
                        <button type="submit" class="submit-btn">
                            💾 Zapisz pytanie
                        </button>
                    </div>
                    <button type="button" @click="goBack" class="back-btn">
                        ← Wróć
                    </button>
                </div>
            </form>
        </div>

        <!-- Popup do edycji wyjaśnień -->
        <div v-if="explanationPopup.show" class="explanation-popup-overlay">
            <div class="explanation-popup">
                <h3>
                    Wyjaśnienie:
                    {{ explanationPopup.type === 'question' ? currentQuestion : (explanationPopup.answerIndex !== null ? answers[explanationPopup.answerIndex].text : '') }}
                </h3>
                <textarea v-model="popupExplanationText" placeholder="Wpisz wyjaśnienie"></textarea>
                <div class="popup-actions">
                    <button @click="saveExplanation" class="popup-save-btn">Zapisz</button>
                    <button @click="closeExplanationPopup" class="popup-cancel-btn">Anuluj</button>
                </div>
            </div>
        </div>

        <!-- Nowy popup akcji zdjęciowych -->
        <div v-if="imageActionPopup.show" class="explanation-popup-overlay">
            <div class="explanation-popup">
                <h3>Wybierz akcję dla zdjęcia</h3>
                <div class="popup-actions column">
                    <button @click="showImagePreview" class="popup-save-btn">Podgląd</button>
                    <button @click="changeImage" class="popup-save-btn">Zmień zdjęcie</button>
                    <button @click="removeImageAction" class="popup-cancel-btn">Usuń zdjęcie</button>
                    <button @click="closeImageActionPopup" class="popup-cancel-btn">Anuluj</button>
                </div>
            </div>
        </div>

        <!-- Popup podglądu zdjęcia -->
        <div v-if="imagePreviewPopup.show" class="explanation-popup-overlay">
            <div class="explanation-popup">
                <h3>Podgląd zdjęcia</h3>
                <img :src="imagePreviewPopup.imagePath" class="image-preview-popup" />
                <button @click="closeImagePreview" class="popup-cancel-btn">Zamknij</button>
            </div>
        </div>

        <!-- Confirmation Popup -->
        <div v-if="confirmationPopup.show" class="confirmation-popup-overlay">
            <div class="confirmation-popup">
                <p>{{ confirmationPopup.message }}</p>
                <div class="popup-actions">
                    <button @click="confirmAction" class="popup-save-btn">Tak</button>
                    <button @click="cancelAction" class="popup-cancel-btn">Nie</button>
                </div>
            </div>
        </div>

        <!-- Powiadomienia -->
        <transition name="fade">
            <div v-if="notification" :class="['notification', notification.type]">
                {{ notification.message }}
            </div>
        </transition>
    </div>
</template>

<script>
    import { useRoute } from "vue-router";

    export default {
        setup() {
            const route = useRoute();
            return { route };
        },
        data() {
            return {
                currentQuestion: "",
                questionExplanation: "",
                answers: [{ text: "", isCorrect: false, explanation: "", image: null }],
                showErrors: false,
                addAnswerError: null,
                addAnswerPending: false,
                selectedFolder: null,
                folderError: "",
                notification: null,
                files: [],
                currentFileName: null,
                selectedImage: null,
                explanationPopup: {
                    show: false,
                    type: "",
                    answerIndex: null,
                },
                popupExplanationText: "",
                testName: "",
                editingTestName: false,
                confirmationPopup: {
                    show: false,
                    message: "",
                    callback: null,
                },
                imageActionPopup: {
                    show: false,
                    index: null,
                    type: null,
                    imagePath: null
                },
                imagePreviewPopup: {
                    show: false,
                    imagePath: null
                }
            };
        },
        computed: {
            storedTestName() {
                return this.sanitize(this.testName || "nienazwany_test");
            },
            imageFileName() {
                if (!this.selectedImage) return "";
                const parts = this.selectedImage.split(/[\\/]/);
                return parts[parts.length - 1];
            },
            hasValidAnswers() {
                return this.answers.some((a) => a.text.trim() !== "");
            },
            hasCorrectAnswer() {
                return this.answers.some((a) => a.isCorrect);
            },
            isFormValid() {
                return (
                    this.currentQuestion.trim() !== "" &&
                    this.hasValidAnswers &&
                    this.hasCorrectAnswer
                );
            },
            allAnswersFilled() {
                return this.answers.every((a) => a.text.trim() !== "");
            },
        },
        mounted() {
            if (this.route.query.testName) {
                this.testName = this.route.query.testName;
            }
            if (this.route.query.folder) {
                this.selectedFolder = decodeURIComponent(this.route.query.folder);
                this.fetchFiles();
                if (!this.testName) {
                    window.electronAPI.readFile({
                        folder: this.selectedFolder,
                        fileName: 'testname.txt'
                    }).then(result => {
                        if (result.success) {
                            this.testName = result.content.trim();
                        } else {
                            this.testName = "nienazwany_test";
                        }
                    }).catch(error => {
                        console.error("Błąd przy wczytywaniu nazwy testu:", error);
                        this.testName = "nienazwany_test";
                    });
                }
            }
            window.addEventListener("keydown", this.handleKeyDown);
        },
        beforeDestroy() {
            window.removeEventListener("keydown", this.handleKeyDown);
        },
        methods: {
            openImageActionPopup(index, type) {
                if (type === 'main') {
                    this.imageActionPopup = {
                        show: true,
                        index: null,
                        type: 'main',
                        imagePath: this.selectedImage
                    };
                } else {
                    this.imageActionPopup = {
                        show: true,
                        index: index,
                        type: 'answer',
                        imagePath: this.answers[index].image
                    };
                }
            },
            handleAnswerImageAction(index) {
                if (this.answers[index].image) {
                    this.openImageActionPopup(index, 'answer');
                } else {
                    this.chooseAnswerImage(index);
                }
            },
            showImagePreview() {
                this.imagePreviewPopup = {
                    show: true,
                    imagePath: this.imageActionPopup.imagePath
                };
                this.closeImageActionPopup();
            },
            changeImage() {
                if (this.imageActionPopup.type === 'main') {
                    this.chooseImage();
                } else {
                    this.chooseAnswerImage(this.imageActionPopup.index);
                }
                this.closeImageActionPopup();
            },
            removeImageAction() {
                if (this.imageActionPopup.type === 'main') {
                    this.removeImage();
                } else {
                    this.answers[this.imageActionPopup.index].image = null;
                    this.showNotification("Zdjęcie odpowiedzi usunięte", "success");
                }
                this.closeImageActionPopup();
            },
            closeImageActionPopup() {
                this.imageActionPopup = {
                    show: false,
                    index: null,
                    type: null,
                    imagePath: null
                };
            },
            closeImagePreview() {
                this.imagePreviewPopup = {
                    show: false,
                    imagePath: null
                };
            },
            getImageFileName(path) {
                if (!path) return "";
                const parts = path.split(/[\\/]/);
                return parts[parts.length - 1];
            },
            sanitizeInput(field) {
                this[field] = this[field].replace(/[\r\n]+/g, ' ');
            },
            sanitizeAnswer(index) {
                this.answers[index].text = this.answers[index].text.replace(/[\r\n]+/g, ' ');
            },
            sanitize(text) {
                return text
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/[^a-z0-9_]/g, "")
                    .substring(0, 50);
            },
            toggleEditTestName() {
                this.editingTestName = !this.editingTestName;
            },
            goBack() {
                this.openConfirmationPopup(
                    "Czy na pewno chcesz wrócić do menu głównego? Zmiany SĄ zapisane.",
                    () => {
                        this.$router.go(-1);
                    }
                );
            },
            async selectFolder() {
                try {
                    const folderPath = await window.electronAPI.selectFolder();
                    if (folderPath) {
                        this.selectedFolder = folderPath;
                        this.folderError = "";
                        await this.fetchFiles();
                    } else {
                        this.folderError = "Nie wybrano folderu";
                    }
                } catch (error) {
                    this.folderError = "Nie udało się wybrać folderu.";
                }
            },
            async fetchFiles() {
                if (!this.selectedFolder) return;
                try {
                    const result = await window.electronAPI.listFiles(this.selectedFolder);
                    if (result.success) {
                        this.files = result.files.filter(
                            (file) => file.endsWith(".txt") && file !== "testname.txt"
                        );
                    } else {
                        this.showNotification("Nie udało się wczytać plików", "error");
                    }
                } catch (error) {
                    console.error("Błąd pobierania plików:", error);
                    this.showNotification("Błąd pobierania plików", "error");
                }
            },
            changeFolder() {
                this.selectedFolder = null;
                this.files = [];
                this.currentFileName = null;
                this.resetForm();
            },
            async loadFile(fileName) {
                if (!this.selectedFolder) {
                    this.showNotification("Wybierz folder zapisu!", "error");
                    return;
                }
                try {
                    const result = await window.electronAPI.readFile({
                        folder: this.selectedFolder,
                        fileName,
                    });
                    if (!result.success) {
                        this.showNotification("Nie udało się wczytać pliku", "error");
                        return;
                    }
                    const content = result.content;
                    const lines = content.split("\n");
                    if (lines.length < 2) {
                        this.showNotification("Plik jest niepoprawny", "error");
                        return;
                    }
                    const marker = lines[0].trim();
                    let offset = 1;
                    if (lines[1].startsWith("[img]")) {
                        const imgLine = lines[1].trim();
                        const imgFileName = imgLine.substring(5, imgLine.length - 6);
                        this.selectedImage = this.selectedFolder + "/" + imgFileName;
                        offset = 2;
                    } else {
                        this.selectedImage = null;
                    }
                    this.currentQuestion = lines[offset].trim();
                    offset++;
                    if (offset < lines.length && lines[offset].startsWith("[exp]") && lines[offset].endsWith("[/exp]")) {
                        this.questionExplanation = lines[offset].slice(5, -6);
                        offset++;
                    } else {
                        this.questionExplanation = "";
                    }
                    const bits = marker.slice(1).split("");
                    const loadedAnswers = [];
                    let answerIndex = 0;
                    while (offset < lines.length) {
                        const answerText = lines[offset].trim();
                        offset++;
                        let exp = "";
                        let img = null;
                        if (offset < lines.length && lines[offset].startsWith("[img]") && lines[offset].endsWith("[/img]")) {
                            const imgLine = lines[offset].trim();
                            const imgFileName = imgLine.substring(5, imgLine.length - 6);
                            img = this.selectedFolder + "/" + imgFileName;
                            offset++;
                        }
                        if (offset < lines.length && lines[offset].startsWith("[exp]") && lines[offset].endsWith("[/exp]")) {
                            exp = lines[offset].slice(5, -6);
                            offset++;
                        }
                        loadedAnswers.push({
                            text: answerText,
                            isCorrect: bits[answerIndex] === "1",
                            explanation: exp,
                            image: img,
                        });
                        answerIndex++;
                    }
                    this.answers = loadedAnswers;
                    this.currentFileName = fileName;
                    this.showNotification("Plik wczytany poprawnie", "success");
                } catch (error) {
                    console.error("Błąd przy wczytywaniu pliku:", error);
                    this.showNotification("Błąd przy wczytywaniu pliku", "error");
                }
            },
            async chooseImage() {
                try {
                    const imagePath = await window.electronAPI.selectImage();
                    if (imagePath) {
                        this.selectedImage = imagePath;
                        this.showNotification("Zdjęcie wybrane", "success");
                    }
                } catch (error) {
                    console.error("Błąd przy wybieraniu zdjęcia:", error);
                    this.showNotification("Błąd przy wybieraniu zdjęcia", "error");
                }
            },
            removeImage() {
                this.selectedImage = null;
                this.showNotification("Zdjęcie usunięte", "success");
            },
            async chooseAnswerImage(index) {
                try {
                    const imagePath = await window.electronAPI.selectImage();
                    if (imagePath) {
                        this.answers[index].image = imagePath;
                        this.showNotification("Zdjęcie dodane do odpowiedzi", "success");
                    }
                } catch (error) {
                    console.error("Błąd przy wybieraniu zdjęcia:", error);
                    this.showNotification("Błąd przy wybieraniu zdjęcia odpowiedzi", "error");
                }
            },
            async handleSubmit() {
                if (!this.validateForm()) return;
                if (!this.selectedFolder) {
                    this.showNotification("Wybierz folder zapisu!", "error");
                    return;
                }
                const correctMarker = "X" + this.answers.map((a) => (a.isCorrect ? "1" : "0")).join("");

                let fileName;
                if (this.currentFileName) {
                    fileName = this.currentFileName;
                } else {
                    let baseName = this.sanitize(this.currentQuestion).substring(0, 20) || "pytanie";
                    fileName = baseName + ".txt";
                    let counter = 2;
                    while (this.files.includes(fileName)) {
                        fileName = `${baseName}_v${counter}.txt`;
                        counter++;
                    }
                }

                let contentLines = [];
                contentLines.push(correctMarker);
                if (this.selectedImage) {
                    contentLines.push("[img]" + this.imageFileName + "[/img]");
                }
                contentLines.push(this.currentQuestion);
                if (this.questionExplanation.trim() !== "") {
                    contentLines.push("[exp]" + this.questionExplanation.trim() + "[/exp]");
                }
                this.answers.forEach((a) => {
                    contentLines.push(a.text.trim());
                    if (a.image) {
                        contentLines.push("[img]" + this.getImageFileName(a.image) + "[/img]");
                    }
                    if (a.explanation.trim() !== "") {
                        contentLines.push("[exp]" + a.explanation.trim() + "[/exp]");
                    }
                });
                const fileContent = contentLines.join("\n");

                try {
                    const result = await window.electronAPI.saveFile({
                        folder: this.selectedFolder,
                        fileName,
                        fileContent,
                    });
                    if (result.success) {
                        await this.fetchFiles();
                        this.showNotification("Pytanie zapisane pomyślnie!", "success");
                    } else {
                        this.showNotification("Nie udało się zapisać pliku.", "error");
                        return;
                    }
                } catch (error) {
                    console.error("Błąd podczas zapisu pliku:", error);
                    this.showNotification("Nie udało się zapisać pliku.", "error");
                    return;
                }

                const copyPromises = [];
                if (this.selectedImage) {
                    try {
                        const destination = this.selectedFolder + "/" + this.imageFileName;
                        copyPromises.push(window.electronAPI.copyFile(this.selectedImage, destination));
                    } catch (error) {
                        console.error("Błąd podczas kopiowania zdjęcia:", error);
                    }
                }

                this.answers.forEach((a) => {
                    if (a.image) {
                        const destination = this.selectedFolder + "/" + this.getImageFileName(a.image);
                        copyPromises.push(window.electronAPI.copyFile(a.image, destination).catch(error => {
                            console.error("Błąd podczas kopiowania zdjęcia odpowiedzi:", error);
                        }));
                    }
                });

                await Promise.all(copyPromises);

                try {
                    const testNameResult = await window.electronAPI.saveFile({
                        folder: this.selectedFolder,
                        fileName: "testname.txt",
                        fileContent: this.storedTestName,
                    });
                    if (!testNameResult.success) {
                        this.showNotification("Pytanie zapisane, ale nie udało się zapisać testname.txt", "error");
                    }
                } catch (error) {
                    console.error("Błąd podczas zapisu testname.txt:", error);
                }

                this.resetForm();
                this.currentFileName = null;
                this.selectedImage = null;
            },
            addAnswer() {
                if (!this.allAnswersFilled) {
                    this.addAnswerError = "Wypełnij wszystkie istniejące odpowiedzi przed dodaniem nowej";
                    this.addAnswerPending = true;
                    setTimeout(() => {
                        this.addAnswerError = null;
                        this.addAnswerPending = false;
                    }, 3000);
                    return;
                }

                this.answers.push({ text: "", isCorrect: false, explanation: "", image: null });
                this.$nextTick(() => {
                    this.focusAnswer(this.answers.length - 1);
                });
                this.addAnswerError = null;
                this.addAnswerPending = false;
            },
            confirmRemove(index) {
                this.openConfirmationPopup("Czy na pewno chcesz usunąć tę odpowiedź?", () => {
                    this.removeAnswer(index);
                });
            },
            removeAnswer(index) {
                if (this.answers.length > 1) {
                    this.answers.splice(index, 1);
                }
            },
            clearAddError() {
                this.addAnswerError = null;
                this.addAnswerPending = false;
            },
            validateForm() {
                this.showErrors = true;
                return this.isFormValid;
            },
            resetForm() {
                this.currentQuestion = "";
                this.questionExplanation = "";
                this.answers = [{ text: "", isCorrect: false, explanation: "", image: null }];
                this.showErrors = false;
            },
            resetCurrentFile() {
                this.resetForm();
                this.currentFileName = null;
                this.selectedImage = null;
            },
            async deleteCurrentFile() {
                if (!this.currentFileName) return;
                this.openConfirmationPopup(`Czy na pewno chcesz usunąć plik "${this.currentFileName}"?`, async () => {
                    try {
                        const result = await window.electronAPI.deleteFile({
                            folder: this.selectedFolder,
                            fileName: this.currentFileName,
                        });
                        if (result.success) {
                            this.showNotification("Plik usunięty", "success");
                            await this.fetchFiles();
                            this.resetCurrentFile();
                        } else {
                            this.showNotification("Nie udało się usunąć pliku", "error");
                        }
                    } catch (error) {
                        console.error("Błąd podczas usuwania pliku:", error);
                        this.showNotification("Błąd podczas usuwania pliku", "error");
                    }
                });
            },
            openExplanationPopup(type, answerIndex = null) {
                this.explanationPopup.type = type;
                this.explanationPopup.answerIndex = answerIndex;
                if (type === "question") {
                    this.popupExplanationText = this.questionExplanation;
                } else if (type === "answer" && answerIndex !== null) {
                    this.popupExplanationText = this.answers[answerIndex].explanation;
                }
                this.explanationPopup.show = true;
            },
            saveExplanation() {
                this.popupExplanationText = this.popupExplanationText.replace(/[\r\n]+/g, ' ');
                if (this.explanationPopup.type === "question") {
                    this.questionExplanation = this.popupExplanationText;
                } else if (this.explanationPopup.type === "answer" && this.explanationPopup.answerIndex !== null) {
                    this.answers[this.explanationPopup.answerIndex].explanation = this.popupExplanationText;
                }
                this.closeExplanationPopup();
            },
            closeExplanationPopup() {
                this.explanationPopup.show = false;
                this.popupExplanationText = "";
                this.explanationPopup.type = "";
                this.explanationPopup.answerIndex = null;
            },
            openConfirmationPopup(message, callback) {
                this.confirmationPopup.message = message;
                this.confirmationPopup.callback = callback;
                this.confirmationPopup.show = true;
            },
            confirmAction() {
                if (this.confirmationPopup.callback) {
                    this.confirmationPopup.callback();
                }
                this.confirmationPopup.show = false;
                this.confirmationPopup.message = "";
                this.confirmationPopup.callback = null;
            },
            cancelAction() {
                this.confirmationPopup.show = false;
                this.confirmationPopup.message = "";
                this.confirmationPopup.callback = null;
            },
            showNotification(message, type) {
                this.notification = { message, type };
                setTimeout(() => {
                    this.notification = null;
                }, 3000);
            },
            handleQuestionEnter(e) {
                if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                    this.addAnswer();
                }
            },
            handleAnswerKeys(e, index) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.focusAnswer(index + 1);
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.focusAnswer(index - 1);
                }

                if (e.ctrlKey && /^(?:Digit|Numpad)[1-9]$/.test(e.code)) {
                    e.preventDefault();
                    const num = parseInt(e.code.match(/[1-9]/)[0]);
                    const answerIndex = num - 1;
                    if (answerIndex < this.answers.length) {
                        this.answers[answerIndex].isCorrect = !this.answers[answerIndex].isCorrect;
                        this.$forceUpdate();
                    }
                }

                if (e.ctrlKey && e.key === 'Backspace' && !this.answers[index].text.trim()) {
                    e.preventDefault();
                    this.confirmRemove(index);
                }
            },
            focusAnswer(index) {
                const inputs = document.querySelectorAll('.answer-input');
                if (index >= 0 && index < inputs.length) {
                    inputs[index].focus();
                    inputs[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            },

            handleKeyDown(event) {
                if (event.ctrlKey && event.key.toLowerCase() === 'd') {
                    event.preventDefault();
                    this.addAnswer();
                }

                if (event.ctrlKey && event.key === 'Enter') {
                    event.preventDefault();
                    this.handleSubmit();
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'w') {
                    event.preventDefault();
                    const focused = document.activeElement;

                    if (focused.classList.contains('question-input')) {
                        this.openExplanationPopup('question');
                    }
                    else if (focused.classList.contains('answer-input')) {
                        const index = parseInt(focused.dataset.answerIndex);
                        if (!isNaN(index)) {
                            this.openExplanationPopup('answer', index);
                        }
                    }
                }
            },
        },
    };
</script>

<style scoped>
    .image-actions {
        position: absolute;
        top: 5px;
        right: -1px;
        display: flex;
        gap: 5px;
        margin-top: 2.5rem;
    }

    .modify-image-btn {
        background: #42b983;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 40px;
        height: 40px;
        padding: 5px;
        margin-right: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 100px;
    }

        .modify-image-btn:hover {
            background: #36a174;
        }

    .explanation-btn {
        background: #666;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 0.9rem;
        white-space: nowrap;
        transition: background-color 0.2s;
    }

    .btn-green {
        background: #42b983;
    }

    .input-container {
        position: relative;
        display: flex;
        gap: 10px;
        align-items: center;
    }

    .answer-item {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
        gap: 10px;
    }

    .answer-input-container {
        flex-grow: 1;
        position: relative;
    }

    .correct-label {
        margin: 0 0px;
        white-space: nowrap;
    }

    .file-actions {
        display: flex;
        justify-content: space-between;
        margin-top: auto;
        gap: 0.5rem;
    }

    .explanation-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .explanation-popup {
        background: #505050;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        width: 500px;
        text-align: center;
    }

        .explanation-popup textarea {
            width: 100%;
            height: 80px;
            margin: 0.5rem 0;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

    .popup-actions {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin-top: 0.5rem;
    }

        .popup-actions.column {
            flex-direction: column;
        }

    .popup-save-btn,
    .popup-cancel-btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }

    .popup-save-btn {
        background: #42b983;
        color: white;
    }

    .popup-cancel-btn {
        background: #ff4444;
        color: white;
    }

    .button-group {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 2rem;
    }

    .action-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    .back-btn {
        padding: 0.8rem 1.5rem;
        background: linear-gradient(135deg, #666, #444);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.2s;
    }

        .back-btn:hover {
            transform: scale(1.05);
            background: linear-gradient(135deg, #777, #555);
        }

    .questions-page {
        display: flex;
        gap: 3rem;
        padding: 2rem;
        padding-right: 150px;
    }

    .selected-folder-container {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;
        margin-bottom: 20px;
    }

    .selected-folder-display {
        flex-grow: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #404040;
        padding: 8px 12px;
        border-radius: 6px;
    }

    .selected-folder {
        margin: 0;
        font-size: 0.9rem;
        color: white;
    }

    .reload-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        color: white;
    }

        .reload-button:hover {
            background-color: #505050;
        }

    .image-upload {
        flex-shrink: 0;
    }

    .image-btn {
        background: linear-gradient(135deg, #42b983, #36a174);
        color: white;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
        transition: transform 0.2s;
    }

        .image-btn:hover {
            transform: scale(1.05);
        }

    .file-list-section {
        width: 225px;
        min-height: 600px;
        background: #404040;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-top: 70px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border-radius: 8px;
        padding: 1rem;
        color: white;
    }

    .file-list {
        list-style: none;
        padding: 0;
        margin-top: 1rem;
        max-height: 450px;
        overflow-y: auto;
    }

    .file-button {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        text-align: left;
        width: 100%;
        padding: 0.5rem;
        font-size: 1rem;
        transition: background-color 0.2s;
        border-radius: 4px;
    }

        .file-button:hover {
            background-color: #505050;
        }

    .new-file-btn {
        background: #2196f3;
        color: #fff;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        margin-top: auto;
        transition: transform 0.2s;
        height: 70px;
    }

        .new-file-btn:hover {
            transform: scale(1.05);
        }

    .test-name-header {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #eee;
        text-align: center;
        position: relative;
    }

    .test-name {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        cursor: pointer;
    }

    .test-name-input-inline {
        font-size: 1.5rem;
        text-align: center;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 4px;
        background: #fff;
        color: #000;
    }

    .edit-test-name-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        color: #42b983;
    }

    .question-input {
        width: 90%;
        padding: 1rem;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1.1rem;
        resize: none;
        text-align: center;
        flex-grow: 1;
    }

        .question-input:focus {
            outline: 2px solid #2196F3;
            box-shadow: 0 0 5px rgba(33, 150, 243, 0.5);
        }

    .image-preview-section {
        margin: 1rem 0;
        text-align: center;
    }

    .image-preview {
        position: relative;
    }

        .image-preview img {
            max-width: 250px;
            max-height: 250px;
            margin-top: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

    .answers-section {
        margin: 2rem 0;
    }

    .answer-input {
        width: 100%;
        padding: 0.8rem;
        border: 2px solid #ddd;
        border-radius: 6px;
        text-align: center;
    }

        .answer-input:focus {
            outline: 2px solid #42b983;
            box-shadow: 0 0 5px rgba(66, 185, 131, 0.5);
        }

    .input-error {
        border-color: #ff4444 !important;
    }

    .error-message {
        color: #ff4444;
        font-size: 0.9rem;
        margin-top: 0.5rem;
        text-align: center;
    }

    .add-answer-btn,
    .submit-btn {
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.2s;
    }

    .add-answer-btn {
        background: linear-gradient(135deg, #42b983, #36a174);
        color: white;
    }

    .submit-btn {
        background: linear-gradient(135deg, #2196F3, #1976D2);
        color: white;
    }

        .add-answer-btn:hover,
        .submit-btn:hover {
            transform: scale(1.05);
        }

    .remove-btn {
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .image-remove-btn {
        position: static;
        transform: none;
        margin: 0;
        height: 40px;
    }

    .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 9999;
    }

        .notification.success {
            background: #42b983;
        }

        .notification.error {
            background: #ff4444;
        }

    .fade-enter-active,
    .fade-leave-active {
        transition: opacity 0.5s;
    }

    .fade-enter,
    .fade-leave-to {
        opacity: 0;
    }

    .folder-btn {
        background: linear-gradient(135deg, #42b983, #36a174);
        color: white;
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        margin-bottom: 0.5rem;
        transition: transform 0.2s;
    }

        .folder-btn:hover {
            transform: scale(1.05);
        }

    .confirmation-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }

    .confirmation-popup {
        background: #505050;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        width: 300px;
        text-align: center;
    }

    .correct-checkbox {
        margin-left: 35px;
    }

    .image-answer-btn {
        background: #42b983;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

        .image-answer-btn.has-image {
            background: #42b983;
        }

    .image-preview-popup {
        max-width: 500px;
        max-height: 70vh;
        margin: 20px 0;
        border-radius: 8px;
    }
</style>