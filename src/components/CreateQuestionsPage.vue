<template>
    <div class="questions-page">
        <div class="test-name-header">
            <h1>Tworzenie pytań dla testu:</h1>
            <h2 class="test-name">{{ storedTestName }}</h2>
        </div>

        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <label>Pytanie:</label>
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
                           @input="clearAddError">
                    <label class="correct-label">
                        <input type="checkbox"
                               v-model="answer.isCorrect"
                               class="correct-checkbox">
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

                <button type="submit"
                        class="submit-btn">
                    💾 Zapisz pytanie
                </button>
            </div>
        </form>

        <button @click="goBack" class="back-btn">← Wróć do konfiguracji testu</button>
    </div>
</template>

<script>
    import { useRoute, useRouter } from 'vue-router'

    export default {
        setup() {
            const route = useRoute()
            const router = useRouter()
            return { route, router }
        },

        data() {
            return {
                currentQuestion: '',
                answers: [{ text: '', isCorrect: false }],
                showErrors: false,
                addAnswerError: null,
                addAnswerPending: false
            }
        },

        computed: {
            storedTestName() {
                return this.sanitize(this.route.query.testName || 'Nienazwany test')
            },

            hasValidAnswers() {
                return this.answers.some(a => a.text.trim() !== '')
            },

            hasCorrectAnswer() {
                return this.answers.some(a => a.isCorrect)
            },

            isFormValid() {
                return (
                    this.currentQuestion.trim() !== '' &&
                    this.hasValidAnswers &&
                    this.hasCorrectAnswer
                )
            },

            allAnswersFilled() {
                return this.answers.every(a => a.text.trim() !== '')
            }
        },

        methods: {
            sanitize(text) {
                return text
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_]/g, '')
                    .substring(0, 50)
            },

            handleSubmit() {
                if (!this.validateForm()) return

                // Generowanie znacznika poprawnych odpowiedzi
                const correctAnswersMarker = 'X' + this.answers
                    .map(answer => answer.isCorrect ? '1' : '0')
                    .join('')

                // Tworzenie zawartości pliku
                const fileContent = [
                    correctAnswersMarker,
                    this.currentQuestion,
                    ...this.answers.map(a => a.text.trim())
                ].join('\n')

                // Generowanie nazwy pliku
                const questionFilename = this.sanitize(this.currentQuestion).substring(0, 20)
                const testFolder = this.storedTestName
                const filename = `TESTY/${testFolder}/${questionFilename}_${correctAnswersMarker}.txt`

                // Tworzenie i pobieranie pliku
                const blob = new Blob([fileContent], { type: 'text/plain' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = filename
                link.click()
                URL.revokeObjectURL(link.href)

                // Reset formularza
                this.resetForm()
            },

            addAnswer() {
                if (!this.allAnswersFilled) {
                    this.addAnswerError = "Wypełnij wszystkie istniejące odpowiedzi przed dodaniem nowej"
                    this.addAnswerPending = true
                    setTimeout(() => {
                        this.addAnswerError = null
                        this.addAnswerPending = false
                    }, 3000)
                    return
                }

                this.answers.push({ text: '', isCorrect: false })
                this.addAnswerError = null
                this.addAnswerPending = false
            },

            confirmRemove(index) {
                if (confirm("Czy na pewno chcesz usunąć tę odpowiedź?")) {
                    this.removeAnswer(index)
                }
            },

            removeAnswer(index) {
                if (this.answers.length > 1) {
                    this.answers.splice(index, 1)
                }
            },

            clearAddError() {
                this.addAnswerError = null
                this.addAnswerPending = false
            },

            validateForm() {
                this.showErrors = true
                return this.isFormValid
            },

            resetForm() {
                this.currentQuestion = ''
                this.answers = [{ text: '', isCorrect: false }]
                this.showErrors = false
            },

            goBack() {
                this.router.push({ name: 'createtest' })
            }
        }
    }
</script>

<style scoped>
    /* Style pozostają bez zmian jak w poprzedniej wersji */
    .test-name-header {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #eee;
    }

    .test-name {
        color: #42b983;
        margin-top: 0.5rem;
    }

    .question-input {
        width: 100%;
        padding: 1rem;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1.1rem;
        resize: none;
    }

    .answer-item {
        display: grid;
        grid-template-columns: 1fr auto auto auto;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
    }

    .answer-input {
        width: 100%;
        padding: 0.8rem;
        border: 2px solid #ddd;
        border-radius: 6px;
    }

    .remove-btn {
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 4px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: background 0.2s;
    }

    .input-error {
        border-color: #ff4444 !important;
    }

    .error-message {
        color: #ff4444;
        font-size: 0.9rem;
        margin-top: 0.5rem;
        display: block;
    }

    .button-group {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
    }

    .add-answer-btn {
        background: #42b983;
        color: white;
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
    }

    .submit-btn {
        background: #2196F3;
        color: white;
        padding: 0.8rem 2rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
    }

    .back-btn {
        margin-top: 2rem;
        padding: 8px 15px;
        background: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
    }
</style>