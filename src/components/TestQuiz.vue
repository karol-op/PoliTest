<template>
    <div class="quiz-wrapper">
        <!-- Główna część quizu -->
        <div class="quiz-page">
            <!-- Nagłówek -->
            <header class="quiz-header">
                <button @click="goToMainMenu" class="menu-btn">🏠</button>
                <h1 class="test-name">{{ testName }}</h1>
                <button @click="openSettings" class="menu-btn">
                    <i class="settings-icon">⚙️</i>
                </button>
            </header>

            <!-- Ładowanie i błąd -->
            <div v-if="loading" class="loading">Ładowanie pytań...</div>
            <div v-else-if="error" class="error">{{ error }}</div>

            <!-- Test zakończony -->
            <div v-else-if="pendingQuestions.length === 0 && currentDisplayIndex === history.length">
                <h2>Quiz zakończony! 🍺</h2>
                <p>Twój wynik: {{ score }} / {{ history.length }}</p>
                <button @click="restartQuiz" class="restart-btn">Restart Quiz</button>
            </div>

            <!-- Wyświetlane pytanie -->
            <div v-else>
                <div class="question-section">
                    <p>
                        Pytanie
                        <span v-if="inReviewMode">{{ currentDisplayIndex + 1 }}</span>
                        <span v-else>{{ history.length + 1 }}</span>
                        z {{ history.length + pendingQuestions.length }}
                    </p>
                    <div class="question-header">
                        <h2 class="question-text">{{ displayedQuestion.question }}</h2>
                        <button v-if="displayedQuestion.explanation"
                                @click="openExplanation('Wyjaśnienie pytania', displayedQuestion.explanation)"
                                class="explanation-btn">
                            ?
                        </button>
                    </div>
                    <img v-if="displayedQuestion.image"
                         :src="displayedQuestion.image"
                         @click="zoomImage(displayedQuestion.image)"
                         alt="Obrazek do pytania"
                         class="question-image" />
                </div>

                <!-- Lista odpowiedzi -->
                <div class="answers-section">
                    <ul>
                        <li v-for="(answer, index) in shuffledAnswers" :key="index" class="answer-item">
                            <div class="answer-wrapper">
                                <button @click="selectAnswer(answer)"
                                        :class="[ isSelected(answer) ? 'selected' : '',
                          { correct: inReviewMode && isSelected(answer) && answer.correct,
                            missed: inReviewMode && !isSelected(answer) && answer.correct,
                            incorrect: inReviewMode && isSelected(answer) && !answer.correct } ]"
                                        :disabled="inReviewMode"
                                        class="answer-btn">
                                    {{ answer.text }}
                                    <span v-if="isSelected(answer)" class="checkmark">✓</span>
                                </button>
                                <button v-if="inReviewMode && answer.explanation"
                                        @click="openExplanation('Wyjaśnienie odpowiedzi', answer.explanation)"
                                        class="explanation-btn">
                                    ?
                                </button>
                            </div>
                        </li>
                    </ul>
                </div>


                <div class="confirmation">
                    <button v-if="history.length > 0 && currentDisplayIndex > 0" @click="goBack" class="back-btn">←</button>
                    <button v-if="inReviewMode" @click="goForward" class="next-btn">Następne pytanie</button>
                    <button v-else @click="confirmAnswers" class="confirm-btn" :disabled="selectedAnswers.length === 0">
                        Potwierdź wybory
                    </button>
                </div>

                <!-- Wyświetlanie nazwy pliku z aktualnym pytaniem -->
                <div v-if="inReviewMode && displayedQuestion && displayedQuestion.fileName" class="file-info">
                    {{ displayedQuestion.fileName }}
                </div>
            </div>
        </div>

        <!-- Popup powiększonego obrazka -->
        <div v-if="showZoomedImage" class="image-zoom-popup" @click.self="closeZoom">
            <div class="zoomed-image-container">
                <img :src="currentZoomedImage" alt="Powiększony obrazek" class="zoomed-image" />
                <button @click="closeZoom" class="close-zoom-btn">×</button>
            </div>
        </div>

        <!-- Panel statystyk -->
        <div class="stats-panel">
            <h2>Statystyki</h2>
            <p>Udzielone odpowiedzi</p>
            <div class="progress-container">
                <span class="correct-count">{{ score }}</span>
                <div class="progress-bar">
                    <div class="progress-correct" :style="{ width: answeredPercentage + '%' }"></div>
                    <div class="progress-incorrect" :style="{ width: (history.length ? (100 - answeredPercentage) : 0) + '%' }"></div>
                </div>
                <span class="wrong-count">{{ history.length - score }}</span>
            </div>
            <p>Opanowane pytania</p>
            <div class="progress-container">
                <span class="correct-count">{{ masteredQuestions }}</span>
                <div class="progress-bar">
                    <div class="progress-correct" :style="{ width: masteredPercentage + '%' }"></div>
                </div>
                <span class="wrong-count">{{ totalQuestions - masteredQuestions }}</span>
            </div>
            <p>Czas:</p>
            <p>{{ formattedTime }}</p>
            <button @click="saveProgress" class="save-progress-btn">Zapisz postęp</button>
        </div>

        <!-- Popup ustawień -->
        <div v-if="showSettingsPopup" class="settings-popup">
            <div class="settings-content">
                <h2>Ustawienia quizu</h2>
                <label>Dodatkowe powtórzenia przy błędnej odpowiedzi:</label>
                <input type="number" v-model.number="additionalRepetitions" min="0" />
                <label>Wstępne powtórzenia: (zmiana zostanie zastosowana dopiero przy następnym restarcie quizu)</label>
                <input type="number" v-model.number="initialRepetitions" min="1" />
                <label>Maksymalna liczba powtórzeń:</label>
                <input type="number" v-model.number="maximumRepetitions" min="1" />
                <div class="popup-buttons">
                    <button @click="saveSettings">Zapisz</button>
                    <button @click="closeSettings" class="cancel-btn">Anuluj</button>
                </div>
            </div>
        </div>

        <!-- Popup wyjaśnień -->
        <div v-if="explanationPopupVisible" class="explanation-popup">
            <div class="explanation-content">
                <h2>{{ explanationPopupTitle }}</h2>
                <p>{{ explanationPopupText }}</p>
                <button @click="closeExplanation" class="close-explanation-btn">Zamknij</button>
            </div>
        </div>

        <!-- Custom popup (zamiast window.confirm/alert) -->
        <div v-if="customPopup.visible" class="custom-popup">
            <div class="custom-popup-content">
                <h2>{{ customPopup.title }}</h2>
                <p>{{ customPopup.message }}</p>
                <div class="popup-buttons">
                    <button v-if="customPopup.type === 'confirm'" @click="customPopupConfirm" class="popup-btn">Tak</button>
                    <button v-if="customPopup.type === 'confirm'" @click="customPopupCancel" class="popup-btn">Nie</button>
                    <button v-if="customPopup.type === 'alert'" @click="customPopupConfirm" class="popup-btn">OK</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import { ref, reactive, computed, onMounted, watch } from 'vue';
    import { useRoute, useRouter } from 'vue-router';

    export default {
        name: 'TestQuiz',
        setup() {
            console.log("Setting up TestQuiz component");

            // -----------------------------------
            // Mechanizm Custom Popup
            // -----------------------------------
            const customPopup = reactive({
                visible: false,
                type: '', // 'confirm' lub 'alert'
                title: '',
                message: '',
                onConfirm: null,
                onCancel: null,
            });

            const showCustomPopup = (type, title, message, onConfirm, onCancel) => {
                customPopup.type = type;
                customPopup.title = title;
                customPopup.message = message;
                customPopup.onConfirm = onConfirm;
                customPopup.onCancel = onCancel;
                customPopup.visible = true;
            };

            const customPopupConfirm = () => {
                if (customPopup.onConfirm) {
                    customPopup.onConfirm();
                }
                customPopup.visible = false;
            };

            const customPopupCancel = () => {
                if (customPopup.onCancel) {
                    customPopup.onCancel();
                }
                customPopup.visible = false;
            };

            // -----------------------------------
            // Zoom obrazka
            // -----------------------------------
            const showZoomedImage = ref(false);
            const currentZoomedImage = ref(null);
            const zoomImage = (imageUrl) => {
                console.log("Zooming image:", imageUrl);
                currentZoomedImage.value = imageUrl;
                showZoomedImage.value = true;
            };
            const closeZoom = () => {
                showZoomedImage.value = false;
                currentZoomedImage.value = null;
            };

            // -----------------------------------
            // Ustawienia quizu
            // -----------------------------------
            const totalQuestions = ref(0);
            const storedSettings = JSON.parse(localStorage.getItem("quizSettings") || "{}");
            const additionalRepetitions = ref(storedSettings.additionalRepetitions ?? 1);
            const initialRepetitions = ref(storedSettings.initialRepetitions ?? 1);
            const maximumRepetitions = ref(storedSettings.maximumRepetitions ?? 5);
            const showSettingsPopup = ref(false);

            const route = useRoute();
            const router = useRouter();
            const folder = decodeURIComponent(route.query.folder);
            console.log("Folder:", folder);
            const testName = ref("Test");
            const loading = ref(true);
            const error = ref("");

            // Tablice pytań
            const pendingQuestions = ref([]);
            const history = ref([]);
            // Wybrane odpowiedzi dla bieżącego pytania
            const selectedAnswers = ref([]);
            // Timer
            const startTime = ref(null);
            const elapsedTime = ref(0);
            let timerInterval = null;

            // Flaga, czy postęp został zapisany
            const progressSaved = ref(false);

            // currentDisplayIndex: jeśli mniejszy niż długość historii – przeglądamy już odpowiedziane pytanie;
            // jeśli równy długości historii – wyświetlamy bieżące pytanie.
            const currentDisplayIndex = ref(0);
            const inReviewMode = computed(() => currentDisplayIndex.value < history.value.length);

            // Pytanie wyświetlane zależy od trybu
            const displayedQuestion = computed(() =>
                inReviewMode.value
                    ? history.value[currentDisplayIndex.value].question
                    : pendingQuestions.value[0] || {}
            );

            // Wybrane odpowiedzi – z historii lub bieżące
            const displayedSelectedAnswers = computed(() =>
                inReviewMode.value
                    ? history.value[currentDisplayIndex.value].selected
                    : selectedAnswers.value
            );

            const score = computed(() => history.value.filter(entry => entry.correct).length);
            const answeredPercentage = computed(() =>
                history.value.length > 0 ? (score.value / history.value.length) * 100 : 0
            );
            const formattedTime = computed(() => {
                const seconds = elapsedTime.value;
                const hrs = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            });

            // -----------------------------------
            // Popup wyjaśnień
            // -----------------------------------
            const explanationPopupVisible = ref(false);
            const explanationPopupText = ref("");
            const explanationPopupTitle = ref("");
            const openExplanation = (title, text) => {
                explanationPopupTitle.value = title;
                explanationPopupText.value = text;
                explanationPopupVisible.value = true;
            };
            const closeExplanation = () => {
                explanationPopupVisible.value = false;
            };

            // -----------------------------------
            // Mapa powtórzeń – po wczytaniu stanu będziemy ją przebudowywać
            // -----------------------------------
            const maxDuplicateMap = ref({});

            // Obliczanie opanowanych pytań – przyjmujemy, że klucz to questionId
            const masteredQuestions = computed(() => {
                let count = 0;
                for (const key in maxDuplicateMap.value) {
                    // Filtrujemy historię według questionId
                    const entries = history.value.filter(entry => entry.question.questionId === key);
                    const finalEntry = entries.reduce((prev, current) =>
                        (!prev || current.question.repeatNumber > prev.question.repeatNumber) ? current : prev, null);
                    // Szukamy w kolejce (pendingQuestions) instancji z tym samym questionId
                    const pendingForQuestion = pendingQuestions.value.filter(q => q.questionId === key);
                    if (finalEntry && finalEntry.correct && pendingForQuestion.length === 0) {
                        count++;
                    }
                }
                return count;
            });
            const masteredPercentage = computed(() =>
                totalQuestions.value > 0 ? (masteredQuestions.value / totalQuestions.value) * 100 : 0
            );

            // -----------------------------------
            // Ładowanie pytań
            // -----------------------------------
            const loadQuestions = async () => {
                if (!folder) {
                    error.value = "Brak wybranego folderu.";
                    loading.value = false;
                    return;
                }
                try {
                    const result = await window.electronAPI.listFiles(folder);
                    if (result.success) {
                        const txtFiles = result.files.filter(file =>
                            file.endsWith(".txt") && !file.toLowerCase().startsWith("testname")
                        );
                        totalQuestions.value = txtFiles.length;
                        const loadedQuestions = [];
                        for (const fileName of txtFiles) {
                            const res = await window.electronAPI.readFile({ folder, fileName });
                            if (res.success) {
                                const qObj = parseQuestion(res.content, fileName);
                                if (qObj) {
                                    loadedQuestions.push(qObj);
                                }
                            }
                        }
                        if (loadedQuestions.length === 0) {
                            error.value = "Brak pytań w folderze.";
                        } else {
                            let initialQueue = [];
                            loadedQuestions.forEach(q => {
                                // Używamy questionId
                                maxDuplicateMap.value[q.questionId] = initialRepetitions.value;
                                for (let i = 1; i <= initialRepetitions.value; i++) {
                                    initialQueue.push({ ...q, repeatNumber: i });
                                }
                            });
                            pendingQuestions.value = shuffleArray(initialQueue);
                            const testNameResult = await window.electronAPI.readFile({ folder, fileName: "testname.txt" });
                            if (testNameResult.success) {
                                testName.value = testNameResult.content.trim();
                            }
                        }
                    } else {
                        error.value = "Nie udało się wczytać plików.";
                    }
                } catch (e) {
                    error.value = "Wystąpił błąd podczas wczytywania pytań.";
                } finally {
                    loading.value = false;
                }
            };

            // -----------------------------------
            // Parsowanie pytania
            // -----------------------------------
            const parseQuestion = (content, fileName) => {
                const lines = content.split("\n").map(l => l.trim()).filter(l => l !== "");
                if (lines.length < 2) return null;
                const marker = lines[0];
                let offset = 1;
                let image = null;
                if (lines[1].startsWith("[img]") && lines[1].endsWith("[/img]")) {
                    const imageFileName = lines[1].substring(5, lines[1].length - 6);
                    image = folder + "/" + imageFileName;
                    offset = 2;
                }
                const questionText = lines[offset];
                // Obliczamy questionId jako kombinację nazwy pliku i treści pytania
                const questionId = `${fileName}:${questionText}`;
                let questionExplanation = null;
                let answerLines = [];
                if (lines[offset + 1] && lines[offset + 1].startsWith("[exp]") && lines[offset + 1].endsWith("[/exp]")) {
                    questionExplanation = lines[offset + 1].substring(5, lines[offset + 1].length - 6);
                    answerLines = lines.slice(offset + 2);
                } else {
                    answerLines = lines.slice(offset + 1);
                }
                const bits = marker.slice(1).split("");
                const answers = [];
                let i = 0, bitIndex = 0;
                while (i < answerLines.length && bitIndex < bits.length) {
                    const answerText = answerLines[i];
                    let answerExplanation = null;
                    if (answerLines[i + 1] && answerLines[i + 1].startsWith("[exp]") && answerLines[i + 1].endsWith("[/exp]")) {
                        answerExplanation = answerLines[i + 1].substring(5, answerLines[i + 1].length - 6);
                        i += 2;
                    } else {
                        i++;
                    }
                    answers.push({
                        text: answerText,
                        explanation: answerExplanation,
                        correct: bits[bitIndex] === "1"
                    });
                    bitIndex++;
                }
                return {
                    question: questionText,
                    explanation: questionExplanation,
                    image,
                    answers,
                    fileName,
                    questionId // Dodajemy właściwość questionId
                };
            };

            // -----------------------------------
            // Mieszanie tablicy
            // -----------------------------------
            const shuffleArray = (array) => {
                const newArray = array.slice();
                for (let i = newArray.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
                }
                return newArray;
            };

            // -----------------------------------
            // Losowe mieszanie odpowiedzi – dla bieżącego pytania
            // -----------------------------------
            const shuffledAnswers = ref([]);
            watch(displayedQuestion, (newQuestion) => {
                if (newQuestion && newQuestion.answers && Array.isArray(newQuestion.answers)) {
                    // Ustawiamy losową kolejność odpowiedzi przy zmianie pytania
                    shuffledAnswers.value = shuffleArray(newQuestion.answers);
                } else {
                    shuffledAnswers.value = [];
                }
            }, { immediate: true });

            // -----------------------------------
            // Obsługa wyboru odpowiedzi – tylko dla bieżącego pytania
            // -----------------------------------
            const selectAnswer = (answer) => {
                if (inReviewMode.value) return;
                const index = selectedAnswers.value.indexOf(answer);
                if (index > -1) {
                    selectedAnswers.value.splice(index, 1);
                } else {
                    selectedAnswers.value.push(answer);
                }
                progressSaved.value = false;
            };
            const isSelected = (answer) => {
                return displayedSelectedAnswers.value.includes(answer);
            };

            // -----------------------------------
            // Zatwierdzanie bieżącej odpowiedzi
            // -----------------------------------
            const confirmAnswers = () => {
                if (selectedAnswers.value.length === 0) return;

                if (!startTime.value) {
                    startTime.value = Date.now();
                    timerInterval = setInterval(() => {
                        elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000);
                    }, 1000);
                }

                const currentQuestion = pendingQuestions.value[0];
                const correctAnswers = currentQuestion.answers.filter(a => a.correct);
                const isCorrect = (correctAnswers.length === selectedAnswers.value.length) &&
                    selectedAnswers.value.every(a => a.correct);

                history.value.push({
                    question: currentQuestion,
                    selected: [...selectedAnswers.value],
                    correct: isCorrect
                });

                if (isCorrect) {
                    // Przy poprawnej odpowiedzi usuwamy tylko bieżącą instancję pytania.
                    pendingQuestions.value.shift();
                } else {
                    const currentRepeat = currentQuestion.repeatNumber || 1;
                    let copies = additionalRepetitions.value + 1;
                    const available = maximumRepetitions.value - currentRepeat;
                    if (copies > available) copies = available;
                    for (let i = 1; i <= copies; i++) {
                        const newRepeat = currentRepeat + i;
                        if (newRepeat > maximumRepetitions.value) break;
                        pendingQuestions.value.push({
                            ...currentQuestion,
                            repeatNumber: newRepeat
                        });
                        // Używamy questionId do aktualizacji mapy powtórzeń
                        const key = currentQuestion.questionId;
                        if (!maxDuplicateMap.value[key] || maxDuplicateMap.value[key] < newRepeat) {
                            maxDuplicateMap.value[key] = newRepeat;
                        }
                    }
                    pendingQuestions.value.shift();
                    pendingQuestions.value = shuffleArray(pendingQuestions.value);
                }

                selectedAnswers.value = [];
                currentDisplayIndex.value = history.value.length - 1;
                progressSaved.value = false;
            };

            // -----------------------------------
            // Nawigacja – cofanie i przejście do kolejnego pytania
            // -----------------------------------
            const goBack = () => {
                if (currentDisplayIndex.value > 0) {
                    currentDisplayIndex.value--;
                }
            };
            const goForward = () => {
                if (inReviewMode.value) {
                    if (currentDisplayIndex.value < history.value.length - 1) {
                        currentDisplayIndex.value++;
                    } else {
                        currentDisplayIndex.value = history.value.length;
                    }
                }
            };

            // -----------------------------------
            // Przejście do strony głównej
            // -----------------------------------
            const goToMainMenu = () => {
                if (!progressSaved.value && (history.value.length > 0 || pendingQuestions.value.length > 0)) {
                    showCustomPopup(
                        'confirm',
                        'Niezapisany postęp',
                        'Masz niezapisany postęp testu. Czy chcesz zapisać postęp przed powrotem do strony głównej?',
                        () => {
                            saveProgress();
                            router.push("/");
                        },
                        () => {
                            router.push("/");
                        }
                    );
                } else {
                    router.push("/");
                }
            };

            const restartQuiz = () => {
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                startTime.value = null;
                elapsedTime.value = 0;
                history.value = [];
                selectedAnswers.value = [];
                currentDisplayIndex.value = 0;
                progressSaved.value = false;
                loadQuestions();
            };

            const openSettings = () => {
                showSettingsPopup.value = true;
            };
            const closeSettings = () => {
                showSettingsPopup.value = false;
            };
            const saveSettings = () => {
                if (initialRepetitions.value > maximumRepetitions.value) {
                    showCustomPopup(
                        'alert',
                        'Błąd',
                        'Wstępne powtórzenia nie mogą być większe niż maksymalna liczba powtórzeń.',
                        () => { }
                    );
                    return;
                }
                localStorage.setItem("quizSettings", JSON.stringify({
                    additionalRepetitions: additionalRepetitions.value,
                    initialRepetitions: initialRepetitions.value,
                    maximumRepetitions: maximumRepetitions.value
                }));
                showSettingsPopup.value = false;
            };

            // -----------------------------------
            // Zapis postępu – używamy klucza "quizProgress_<testName>"
            // -----------------------------------
            const saveProgress = () => {
                const progressData = {
                    testName: testName.value,
                    history: history.value,
                    pendingQuestions: pendingQuestions.value,
                    currentDisplayIndex: currentDisplayIndex.value,
                    elapsedTime: elapsedTime.value
                };
                const key = `quizProgress_${testName.value}`;
                localStorage.setItem(key, JSON.stringify(progressData));
                progressSaved.value = true;
                showCustomPopup('alert', 'Sukces', 'Postęp zapisany!', () => { });
            };

            // -----------------------------------
            // Wczytywanie postępu – wczytujemy zapisany stan dla aktualnego testu
            // -----------------------------------
            const loadProgress = (data) => {
                try {
                    const progressData = JSON.parse(data);
                    history.value = progressData.history || [];
                    pendingQuestions.value = progressData.pendingQuestions || [];
                    currentDisplayIndex.value = progressData.currentDisplayIndex || 0;
                    elapsedTime.value = progressData.elapsedTime || 0;
                    progressSaved.value = true;
                    // Przebuduj maxDuplicateMap na podstawie historii
                    maxDuplicateMap.value = {};
                    history.value.forEach(entry => {
                        const key = entry.question.questionId;
                        if (!maxDuplicateMap.value[key] || entry.question.repeatNumber > maxDuplicateMap.value[key]) {
                            maxDuplicateMap.value[key] = entry.question.repeatNumber;
                        }
                    });
                    if (timerInterval) {
                        clearInterval(timerInterval);
                        timerInterval = null;
                    }
                    startTime.value = Date.now() - (elapsedTime.value * 1000);
                    timerInterval = setInterval(() => {
                        elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000);
                    }, 1000);
                } catch (e) {
                    console.error("Błąd przy wczytywaniu postępu", e);
                }
            };

            // -----------------------------------
            // Zatrzymywanie timera, gdy quiz się kończy
            // -----------------------------------
            watch(
                () => (pendingQuestions.value.length === 0 && currentDisplayIndex.value === history.value.length),
                (finished) => {
                    if (finished && timerInterval) {
                        clearInterval(timerInterval);
                        timerInterval = null;
                    }
                }
            );

            // -----------------------------------
            // OnMounted – ładowanie pytań, wczytywanie postępu (dla aktualnego testu)
            // oraz obsługa zamykania okna (Electron)
            // -----------------------------------
            onMounted(async () => {
                await loadQuestions();
                const key = `quizProgress_${testName.value}`;
                const savedProgress = localStorage.getItem(key);
                if (savedProgress) {
                    showCustomPopup(
                        'confirm',
                        'Zapisany postęp',
                        'Wykryto zapisany postęp testu. Czy chcesz go wczytać?',
                        () => { loadProgress(savedProgress); },
                        () => { /* Użytkownik odrzucił wczytanie – pozostawiamy zapis */ }
                    );
                }

                // Obsługa zamykania okna – w Electronie
                if (window.electronAPI && window.electronAPI.onWindowClose) {
                    window.electronAPI.onWindowClose((event) => {
                        if (!progressSaved.value && (history.value.length > 0 || pendingQuestions.value.length > 0)) {
                            event.preventDefault();
                            showCustomPopup(
                                'confirm',
                                'Niezapisany postęp',
                                'Masz niezapisany postęp testu. Czy chcesz zapisać postęp przed zamknięciem?',
                                () => {
                                    saveProgress();
                                    window.electronAPI.closeWindow();
                                },
                                () => {
                                    window.electronAPI.closeWindow();
                                }
                            );
                        } else {
                            window.electronAPI.closeWindow();
                        }
                    });
                }
            });

            return {
                testName,
                loading,
                error,
                pendingQuestions,
                history,
                selectedAnswers,
                currentDisplayIndex,
                displayedQuestion,
                displayedSelectedAnswers,
                inReviewMode,
                score,
                answeredPercentage,
                formattedTime,
                additionalRepetitions,
                initialRepetitions,
                maximumRepetitions,
                showSettingsPopup,
                totalQuestions,
                masteredQuestions,
                masteredPercentage,
                explanationPopupVisible,
                explanationPopupText,
                explanationPopupTitle,
                openExplanation,
                closeExplanation,
                selectAnswer,
                isSelected,
                confirmAnswers,
                goBack,
                goForward,
                goToMainMenu,
                restartQuiz,
                openSettings,
                closeSettings,
                saveSettings,
                showZoomedImage,
                currentZoomedImage,
                zoomImage,
                closeZoom,
                saveProgress,
                loadProgress,
                customPopup,
                customPopupConfirm,
                customPopupCancel,
                // Dodany nowy ref z losowo uporządkowanymi odpowiedziami
                shuffledAnswers
            };
        }
    };
</script>


<style scoped>
    /* Nowy styl dla wyświetlania nazwy pliku z aktualnym pytaniem */
    .file-info {
        font-size: 0.8rem;
        color: #aaa;
        margin-top: 10px;
        text-align: center;
    }

    .image-zoom-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        cursor: zoom-out;
    }

    .zoomed-image-container {
        position: relative;
        max-width: 90%;
        max-height: 90%;
    }

    .zoomed-image {
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }

    .close-zoom-btn {
        position: relative;
        top: -433px;
        right: 53px;
        font-size: 3rem;
        color: red;
        background: none;
        border: none;
        cursor: pointer;
        transition: transform 0.2s;
    }

        .close-zoom-btn:hover {
            transform: scale(1.2);
        }

    .question-image {
        cursor: zoom-in;
        transition: transform 0.2s;
    }

        .question-image:hover {
            transform: scale(1.02);
        }

    .quiz-wrapper {
        display: flex;
        gap: 2rem;
        align-items: flex-start;
        justify-content: center;
        padding: 2rem;
    }

    .quiz-page {
        position: relative;
        max-width: 800px;
        width: 100%;
        padding: 2rem;
        background: #1a1a1a;
        border-radius: 8px;
        color: #fff;
        text-align: center;
    }

    .quiz-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 1rem;
        margin-bottom: 1rem;
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

    .test-name {
        flex-grow: 1;
        text-align: center;
        margin: 0;
        font-size: 1.5rem;
    }

    .loading,
    .error {
        font-size: 1.2rem;
        margin: 1rem 0;
    }

    .question-section {
        margin-bottom: 1.5rem;
    }

    .question-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .question-text {
        font-size: 1.5rem;
        margin: 1rem 0;
        text-align: center;
        flex: 1;
    }

    .question-image {
        max-width: 300px;
        max-height: 300px;
        margin: 1rem 0;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .answers-section ul {
        list-style: none;
        padding: 0;
    }

    .answer-item {
        margin: 0.5rem 0;
    }

    .answer-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .answer-btn {
        position: relative;
        padding: 0.8rem 1.5rem;
        font-size: 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        width: 100%;
        max-width: 400px;
        transition: background 0.3s ease;
        background: #333;
        color: #fff;
    }

        .answer-btn.selected {
            border: 2px solid #fff;
        }

        .answer-btn:hover:not(:disabled) {
            background: #505050;
        }

    .checkmark {
        position: absolute;
        top: 4px;
        right: 4px;
        font-size: 1rem;
        color: #fff;
    }

    .answer-btn.correct {
        background: #42b983;
        color: #fff;
    }

    .answer-btn.incorrect {
        background: #ff4444;
        color: #fff;
    }

    .answer-btn.missed {
        background: #f1c40f;
        color: #fff;
    }

    .confirmation {
        margin-top: 1.5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
    }

    .confirm-btn,
    .restart-btn {
        padding: 0.8rem 1.5rem;
        font-size: 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: #fff;
        transition: transform 0.2s;
    }

        .confirm-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .confirm-btn:hover:not(:disabled),
        .restart-btn:hover {
            transform: translateY(-2px);
        }

    .next-btn {
        padding: 0.8rem 1.5rem;
        font-size: 1rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: #fff;
        transition: transform 0.2s;
    }

        .next-btn:hover {
            transform: translateY(-2px);
        }

    .back-btn {
        border: none;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: #fff;
        font-size: 1rem;
        cursor: pointer;
        border-radius: 4px;
        transition: transform 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

        .back-btn:hover {
            transform: translateY(-2px);
        }

    .stats-panel {
        width: 250px;
        background: #1a1a1a;
        border-radius: 8px;
        padding: 1rem;
        color: #fff;
        font-size: 0.9rem;
        text-align: center;
    }

        .stats-panel h2 {
            margin-top: 0;
        }

        .stats-panel p {
            margin: 0.5rem 0;
        }

    .progress-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 1rem;
    }

    .progress-bar {
        flex: 1;
        height: 10px;
        background: #444;
        border-radius: 5px;
        overflow: hidden;
        margin: 0 10px;
        display: flex;
    }

    .progress-correct {
        height: 100%;
        background: #42b983;
        transition: width 0.3s ease;
    }

    .progress-incorrect {
        height: 100%;
        background: #ff4444;
        transition: width 0.3s ease;
    }

    .correct-count,
    .wrong-count {
        font-weight: bold;
    }

    .settings-popup {
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

    .settings-content {
        background: #1a1a1a;
        padding: 2rem;
        border-radius: 8px;
        width: 300px;
        text-align: center;
    }

        .settings-content h2 {
            margin-top: 0;
            color: #fff;
        }

        .settings-content label {
            display: block;
            margin: 1rem 0 0.5rem;
            text-align: left;
            color: #fff;
        }

        .settings-content input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #444;
            border-radius: 4px;
            background: #2a2a2a;
            color: #fff;
        }

        .settings-content button {
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 4px;
            background: linear-gradient(135deg, #2196f3, #1976d2);
            color: #fff;
            cursor: pointer;
        }

        .settings-content .cancel-btn {
            background: #ff4444;
            margin-left: 0.5rem;
        }

    .popup-buttons {
        margin-top: 1rem;
        display: flex;
        justify-content: center;
        gap: 1rem;
    }

    .explanation-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1100;
    }

    .explanation-content {
        background: #1a1a1a;
        padding: 2rem;
        border-radius: 8px;
        width: 300px;
        text-align: center;
        color: #fff;
    }

    .close-explanation-btn {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: #fff;
        cursor: pointer;
    }

    .explanation-btn {
        margin-left: 0.5rem;
        padding: 0.2rem 0.5rem;
        border: none;
        border-radius: 50%;
        background: #2196f3;
        color: #fff;
        cursor: pointer;
        font-size: 0.8rem;
    }

    .save-progress-btn {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: linear-gradient(135deg, #42b983, #2ecc71);
        color: #fff;
        transition: transform 0.2s;
    }

        .save-progress-btn:hover {
            transform: translateY(-2px);
        }

    /* Style dla custom popup */
    .custom-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1500;
    }

    .custom-popup-content {
        background: #1a1a1a;
        padding: 2rem;
        border-radius: 8px;
        width: 300px;
        text-align: center;
        color: #fff;
    }

    .popup-btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: #fff;
        cursor: pointer;
    }

        .popup-btn:hover {
            transform: translateY(-2px);
        }
</style>
