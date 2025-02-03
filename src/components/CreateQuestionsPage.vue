<template>
    <div class="questions-page">
        <div class="test-name-header">
            <h1>Tworzenie pytań</h1>
            <h2 class="test-name">{{ storedTestName }}</h2>
        </div>

        <!-- WYBÓR LOKALIZACJI ZAPISU -->
        <div class="folder-section">
            <div v-if="!selectedFolder">
                <button @click="selectFolder" class="folder-btn">
                    📁 Wybierz lokalizację zapisu
                </button>
                <p v-if="folderError" class="error-message">{{ folderError }}</p>
            </div>
            <div v-else>
                <p class="selected-folder">
                    📁 Wybrana lokalizacja: <strong>{{ selectedFolder }}</strong>
                </p>
                <button @click="changeFolder" class="folder-btn">
                    🔄 Zmień lokalizację
                </button>
            </div>
        </div>

        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <textarea v-model.trim="currentQuestion"
                          placeholder="Wpisz swoje pytanie"
                          required
                          rows="3"
                          class="question-input"
                          :class="{ 'input-error': showErrors && !currentQuestion }"></textarea>
                <span v-if="showErrors && !currentQuestion" class="error-message">
                    Pytanie jest wymagane
                </span>
            </div>

            <div class="answers-section">
                <h3>Odpowiedzi:</h3>
                <div v-for="(answer, index) in answers"
                     :key="index"
                     class="answer-item">
                    <input type="text"
                           v-model.trim="answer.text"
                           placeholder="Wpisz odpowiedź"
                           class="answer-input"
                           :class="{ 'input-error': showErrors && !answer.text }"
                           @input="clearAddError" />
                    <label class="correct-label">
                        <input type="checkbox"
                               v-model="answer.isCorrect"
                               class="correct-checkbox" />
                        Poprawna
                    </label>
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

            <div v-if="showErrors && !hasCorrectAnswer" class="error-message">
                Przynajmniej jedna odpowiedź musi być oznaczona jako poprawna
            </div>

            <div class="button-group">
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
        </form>
    </div>
    <!-- Powiadomienia -->
    <transition name="fade">
        <div v-if="notification" :class="['notification', notification.type]">
            {{ notification.message }}
        </div>
    </transition>
</template>


<script>
    import { useRoute, useRouter } from "vue-router";

    export default {
        setup() {
            const route = useRoute();
            const router = useRouter();
            return { route, router };
        },
        data() {
            return {
                currentQuestion: "",
                answers: [{ text: "", isCorrect: false }],
                showErrors: false,
                addAnswerError: null,
                addAnswerPending: false,
                selectedFolder: null,
                folderError: "",
                notification: null,
            };
        },
        computed: {
            storedTestName() {
                return this.sanitize(this.route.query.testName || "nienazwany_test");
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
        methods: {
            sanitize(text) {
                return text
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/\s+/g, "_")
                    .replace(/[^a-z0-9_]/g, "")
                    .substring(0, 50);
            },
            async selectFolder() {
                try {
                    const folderPath = await window.electronAPI.selectFolder();
                    if (folderPath) {
                        this.selectedFolder = folderPath;
                        this.folderError = "";
                    } else {
                        this.folderError = "Nie wybrano folderu";
                    }
                } catch (error) {
                    console.error("Błąd przy wyborze folderu:", error);
                    this.folderError = "Nie udało się wybrać folderu.";
                }
            },
            changeFolder() {
                this.selectedFolder = null;
            },
            async handleSubmit() {
                if (!this.validateForm()) return;
                if (!this.selectedFolder) {
                    this.showNotification("Wybierz folder zapisu!", "error");
                    return;
                }
                const correctMarker =
                    "X" + this.answers.map((a) => (a.isCorrect ? "1" : "0")).join("");
                const fileName = `${this.sanitize(
                    this.currentQuestion
                ).substring(0, 20)}_${correctMarker}.txt`;
                const fileContent = [
                    correctMarker,
                    this.currentQuestion,
                    ...this.answers.map((a) => a.text.trim()),
                ].join("\n");
                try {
                    const result = await window.electronAPI.saveFile({
                        folder: this.selectedFolder,
                        fileName,
                        fileContent,
                    });
                    if (result.success) {
                        this.showNotification("Pytanie zapisane pomyślnie!", "success");
                    } else {
                        this.showNotification("Nie udało się zapisać pliku.", "error");
                    }
                } catch (error) {
                    console.error("Błąd podczas zapisu pliku:", error);
                    this.showNotification("Nie udało się zapisać pliku.", "error");
                }
                this.resetForm();
            },
            addAnswer() {
                if (!this.allAnswersFilled) {
                    this.addAnswerError =
                        "Wypełnij wszystkie istniejące odpowiedzi przed dodaniem nowej";
                    this.addAnswerPending = true;
                    setTimeout(() => {
                        this.addAnswerError = null;
                        this.addAnswerPending = false;
                    }, 3000);
                    return;
                }
                this.answers.push({ text: "", isCorrect: false });
                this.addAnswerError = null;
                this.addAnswerPending = false;
            },
            confirmRemove(index) {
                if (confirm("Czy na pewno chcesz usunąć tę odpowiedź?")) {
                    this.removeAnswer(index);
                }
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
                this.answers = [{ text: "", isCorrect: false }];
                this.showErrors = false;
            },
            goBack() {
                this.router.push({ name: "createtest" });
            },
            showNotification(message, type) {
                this.notification = { message, type };
                setTimeout(() => {
                    this.notification = null;
                }, 3000);
            },
        },
    };
</script>

<style scoped>


    .test-name-header {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #eee;
        text-align: center;
    }

    .test-name {
        color: #42b983;
        margin-top: 0.5rem;
    }

    .folder-section {
        margin-bottom: 1.5rem;
    }

        .folder-section p.selected-folder {
            font-size: 0.9rem; /* Mniejsza czcionka dla wybranej lokalizacji */
            text-align: center;
        }

    .folder-btn {
        background: linear-gradient(135deg, #42b983, #36a174);
        color: white;
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        margin-bottom: 0.5rem;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .question-input {
        width: 90%;
        padding: 1rem;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1.1rem;
        resize: none;
        text-align: center;
    }

    .answers-section {
        margin: 2rem 0;
    }

    .answer-item {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
    }

    .answer-input {
        width: 170%;
        padding: 0.8rem;
        border: 2px solid #ddd;
        border-radius: 6px;
        text-align: center;
    }

    .correct-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        white-space: nowrap;
        margin-left: 10rem;
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

    .button-group {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        justify-content: center;
    }

    .add-answer-btn {
        background: linear-gradient(135deg, #42b983, #36a174);
        color: white;
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }

    .submit-btn {
        background: linear-gradient(135deg, #2196F3, #1976D2);
        color: white;
        padding: 0.8rem 2rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }

    .back-btn {
        margin-top: 2rem;
        padding: 8px 15px;
        background: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
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
    .questions-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .selected-folder {
        font-size: 0.9rem;
    }

    .remove-btn {
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 6px;
        margin-top: 5px;
        width: 40px;
        height: 36px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
    }
</style>
