<template>
  <div class="quiz-wrapper">
    <!-- Główna część quizu -->
    <div class="quiz-page">
      <!-- Nagłówek: przyciski powrotu, wyśrodkowana nazwa quizu i przycisk ustawień -->
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

      <!-- Quiz zakończony -->
      <div v-else-if="pendingQuestions.length === 0 && !loading">
        <h2>Quiz zakończony!</h2>
        <p>Twój wynik: {{ score }} / {{ history.length }}</p>
        <button @click="restartQuiz" class="restart-btn">Restart Quiz</button>
      </div>

      <!-- Aktualne pytanie -->
      <div v-else>
        <div class="question-section">
          <p>Pytanie {{ history.length + 1 }} z {{ history.length + pendingQuestions.length }}</p>
          <h2 class="question-text">{{ currentQuestion.question }}</h2>
          <img v-if="currentQuestion.image" :src="currentQuestion.image" alt="Obrazek do pytania" class="question-image" />
        </div>

        <div class="answers-section">
          <ul>
            <li v-for="(answer, index) in currentQuestion.answers" :key="index" class="answer-item">
              <button @click="toggleAnswer(answer)"
                      :class="[
                        isSelected(answer) ? 'selected' : '',
                        {
                          correct: showAnswer && isSelected(answer) && answer.correct,
                          missed: showAnswer && !isSelected(answer) && answer.correct,
                          incorrect: showAnswer && isSelected(answer) && !answer.correct
                        }
                      ]"
                      :disabled="showAnswer"
                      class="answer-btn">
                {{ answer.text }}
                <span v-if="isSelected(answer)" class="checkmark">✓</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Feedback oraz przycisk "Następne pytanie" -->
        <div v-if="!showAnswer" class="confirmation">
          <button @click="confirmAnswers" class="confirm-btn" :disabled="selectedAnswers.length === 0">
            Potwierdź wybory
          </button>
        </div>
        <div v-if="showAnswer" class="feedback">
          <p v-if="currentQuestionCorrect" class="feedback-correct">Poprawna odpowiedź!</p>
          <p v-else class="feedback-incorrect">Niepoprawna odpowiedź.</p>
          <div class="navigation-btns">
            <button @click="nextQuestion" class="next-btn">Następne pytanie</button>
          </div>
          <p class="file-name">{{ currentQuestion.fileName }}</p>
        </div>
      </div>
    </div>

    <!-- Panel statystyk -->
    <div class="stats-panel">
      <h2>Statystyki</h2>
      
      <!-- Sekcja odpowiedzi -->
      <p>Odpowiedzi</p>
      <div class="progress-container">
        <span class="correct-count">{{ score }}</span>
        <div class="progress-bar">
          <div class="progress-correct" :style="{ width: answeredPercentage + '%' }"></div>
          <div class="progress-incorrect" :style="{ width: (history.length ? (100 - answeredPercentage) : 0) + '%' }"></div>
        </div>
        <span class="wrong-count">{{ history.length - score }}</span>
      </div>

      <!-- Nowa sekcja opanowanych pytań -->
      <p>Opanowane pytania</p>
      <div class="progress-container">
        <span class="correct-count">{{ masteredQuestions }}</span>
        <div class="progress-bar">
          <div class="progress-correct" :style="{ width: masteredPercentage + '%' }"></div>
        </div>
        <span class="wrong-count">{{ totalQuestions - masteredQuestions }}</span>
      </div>
    </div>

    <!-- Popup ustawień -->
    <div v-if="showSettingsPopup" class="settings-popup">
      <div class="settings-content">
        <h2>Ustawienia powtórzeń</h2>
        <label>Dodatkowe powtórzenia przy błędnej odpowiedzi:</label>
        <input type="number" v-model.number="additionalRepetitions" min="0" />
        <label>Wstępne powtórzenia:</label>
        <input type="number" v-model.number="initialRepetitions" min="1" />
        <label>Maksymalna liczba powtórzeń:</label>
        <input type="number" v-model.number="maximumRepetitions" min="1" />
        <div class="popup-buttons">
          <button @click="saveSettings">Zapisz</button>
          <button @click="closeSettings" class="cancel-btn">Anuluj</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export default {
  name: 'TestQuiz',
  setup() {
    console.log("Setting up TestQuiz component");

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

    const pendingQuestions = ref([]);
    const history = ref([]);
    const selectedAnswers = ref([]);
    const showAnswer = ref(false);
    const score = computed(() => history.value.filter(entry => entry.correct).length);
    const currentQuestionCorrect = ref(false);
    const currentQuestion = computed(() => pendingQuestions.value[0] || {});
    const answeredPercentage = computed(() =>
      history.value.length > 0 ? (score.value / history.value.length) * 100 : 0
    );

    // Mapa przechowująca najwyższy numer powtórzenia dla każdego pytania (klucz: "fileName:question")
    const maxDuplicateMap = ref({});

    // Zmodyfikowana logika opanowywania pytań – sprawdzamy tylko ostatnią próbę dla danego pytania
    const masteredQuestions = computed(() => {
      let count = 0;
      console.log("Computing masteredQuestions");
      for (const key in maxDuplicateMap.value) {
        const maxRepeat = maxDuplicateMap.value[key];
        console.log(`Checking mastery for question key: ${key} with maxRepeat: ${maxRepeat}`);
        
        // Pobieramy wszystkie wpisy historii dla danego pytania
        const entries = history.value.filter(entry => {
          const entryKey = `${entry.question.fileName}:${entry.question.question}`;
          return entryKey === key;
        });
        console.log(`History entries for ${key}:`, entries);
        
        // Znajdujemy wpis o najwyższym numerze powtórzenia (ostatnia próba)
        const finalEntry = entries.reduce((prev, current) => {
          return (!prev || current.question.repeatNumber > prev.question.repeatNumber) ? current : prev;
        }, null);
        
        if (finalEntry) {
          console.log(`Final attempt for ${key}: repeatNumber ${finalEntry.question.repeatNumber}, correctness: ${finalEntry.correct}`);
        } else {
          console.log(`No attempts found for ${key}`);
        }
        
        // Sprawdzamy, czy nie ma oczekujących instancji pytania
        const pendingForQuestion = pendingQuestions.value.filter(q => {
          const qKey = `${q.fileName}:${q.question}`;
          return qKey === key;
        });
        console.log(`Pending questions for ${key}:`, pendingForQuestion);
        
        if (finalEntry && finalEntry.correct && pendingForQuestion.length === 0) {
          console.log(`${key} is mastered (final attempt is correct and no pending instances).`);
          count++;
        } else {
          console.log(`${key} is NOT mastered.`);
        }
      }
      console.log("Total mastered questions count:", count);
      return count;
    });

    const masteredPercentage = computed(() => {
      const perc = totalQuestions.value > 0 ? (masteredQuestions.value / totalQuestions.value) * 100 : 0;
      console.log("Computed masteredPercentage:", perc);
      return perc;
    });

    // Ładowanie pytań – pobieranie listy plików, parsowanie oraz przygotowanie kolejki
    const loadQuestions = async () => {
      console.log("loadQuestions called");
      if (!folder) {
        error.value = "Brak wybranego folderu.";
        loading.value = false;
        console.error("Folder not provided");
        return;
      }
      try {
        const result = await window.electronAPI.listFiles(folder);
        console.log("List files result:", result);
        if (result.success) {
          const txtFiles = result.files.filter(file =>
            file.endsWith(".txt") && file.toLowerCase() !== "testname.txt"
          );
          totalQuestions.value = txtFiles.length;
          const loadedQuestions = [];
          for (const fileName of txtFiles) {
            console.log(`Reading file: ${fileName}`);
            const res = await window.electronAPI.readFile({ folder, fileName });
            if (res.success) {
              const qObj = parseQuestion(res.content, fileName);
              if (qObj) {
                loadedQuestions.push(qObj);
                console.log(`Parsed question from ${fileName}:`, qObj);
              } else {
                console.warn(`Failed to parse question from ${fileName}`);
              }
            } else {
              console.error(`Failed to read file: ${fileName}`);
            }
          }
          if (loadedQuestions.length === 0) {
            error.value = "Brak pytań w folderze.";
            console.error("No questions loaded");
          } else {
            let initialQueue = [];
            loadedQuestions.forEach(q => {
              const key = `${q.fileName}:${q.question}`;
              console.log(`Setting initial maxRepeat for ${key}: ${initialRepetitions.value}`);
              maxDuplicateMap.value[key] = initialRepetitions.value;
              for (let i = 1; i <= initialRepetitions.value; i++) {
                initialQueue.push({ ...q, repeatNumber: i });
              }
            });
            pendingQuestions.value = shuffleArray(initialQueue);
            console.log("Initial pendingQuestions:", pendingQuestions.value);
            const testNameResult = await window.electronAPI.readFile({ folder, fileName: "testname.txt" });
            if (testNameResult.success) {
              testName.value = testNameResult.content.trim();
              console.log("Loaded testName:", testName.value);
            }
          }
        } else {
          error.value = "Nie udało się wczytać plików.";
          console.error("Failed to list files");
        }
      } catch (e) {
        console.error("Error loading questions:", e);
        error.value = "Wystąpił błąd podczas wczytywania pytań.";
      } finally {
        loading.value = false;
      }
    };

    // Funkcja parsująca treść pliku do obiektu pytania
    const parseQuestion = (content, fileName) => {
      console.log(`Parsing question from file: ${fileName}`);
      const lines = content.split("\n").map(l => l.trim()).filter(l => l !== "");
      if (lines.length < 2) {
        console.warn(`Not enough lines in ${fileName} to parse question`);
        return null;
      }
      const marker = lines[0];
      let offset = 1;
      let image = null;
      if (lines[1].startsWith("[img]") && lines[1].endsWith("[/img]")) {
        const imgLine = lines[1];
        const imageFileName = imgLine.substring(5, imgLine.length - 6);
        image = folder + "/" + imageFileName;
        offset = 2;
      }
      const questionText = lines[offset];
      const answersText = lines.slice(offset + 1);
      const bits = marker.slice(1).split("");
      const answers = answersText.map((text, index) => ({
        text,
        correct: bits[index] === "1"
      }));
      const questionObj = { question: questionText, image, answers, fileName };
      console.log(`Parsed question object from ${fileName}:`, questionObj);
      return questionObj;
    };

    // Funkcja mieszająca tablicę
    const shuffleArray = (array) => {
      console.log("Shuffling array of length:", array.length);
      const newArray = array.slice();
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      console.log("Shuffled array:", newArray);
      return newArray;
    };

    const toggleAnswer = (answer) => {
      if (showAnswer.value) return;
      const index = selectedAnswers.value.indexOf(answer);
      if (index > -1) {
        selectedAnswers.value.splice(index, 1);
        console.log("Removed answer from selection:", answer);
      } else {
        selectedAnswers.value.push(answer);
        console.log("Added answer to selection:", answer);
      }
      console.log("Current selectedAnswers:", selectedAnswers.value);
    };

    const isSelected = (answer) => {
      return selectedAnswers.value.includes(answer);
    };

    // Potwierdzanie odpowiedzi dla bieżącego pytania
    const confirmAnswers = () => {
      if (selectedAnswers.value.length === 0) return;
      console.log("Confirming answers for current question:", currentQuestion.value);
      showAnswer.value = true;
      const correctAnswers = currentQuestion.value.answers.filter(a => a.correct);
      const isCorrect = (correctAnswers.length === selectedAnswers.value.length) &&
                        selectedAnswers.value.every(a => a.correct);
      currentQuestionCorrect.value = isCorrect;
      console.log("Is current question answered correctly?", isCorrect);

      history.value.push({
        question: currentQuestion.value,
        selected: [...selectedAnswers.value],
        correct: isCorrect
      });
      console.log("Updated history:", history.value);

      if (!isCorrect) {
        const currentRepeat = currentQuestion.value.repeatNumber || 1;
        let copies = additionalRepetitions.value + 1;
        const available = maximumRepetitions.value - currentRepeat;
        if (copies > available) copies = available;
        console.log(`Current repeat: ${currentRepeat}, adding ${copies} duplicate(s)`);
        for (let i = 1; i <= copies; i++) {
          const newRepeat = currentRepeat + i;
          if (newRepeat > maximumRepetitions.value) break;
          pendingQuestions.value.push({
            ...currentQuestion.value,
            repeatNumber: newRepeat
          });
          const key = `${currentQuestion.value.fileName}:${currentQuestion.value.question}`;
          if (!maxDuplicateMap.value[key] || maxDuplicateMap.value[key] < newRepeat) {
            maxDuplicateMap.value[key] = newRepeat;
            console.log(`Updated maxDuplicateMap for ${key} to ${newRepeat}`);
          }
        }
      }
      console.log("Pending questions after confirmAnswers:", pendingQuestions.value);
    };

    const nextQuestion = () => {
      console.log("Proceeding to next question");
      selectedAnswers.value = [];
      showAnswer.value = false;
      currentQuestionCorrect.value = false;
      if (pendingQuestions.value.length > 0) {
        console.log("Current question before shift:", pendingQuestions.value[0]);
        pendingQuestions.value.shift();
      }
      pendingQuestions.value = shuffleArray(pendingQuestions.value);
      console.log("Pending questions after shuffling:", pendingQuestions.value);
    };

    const goToMainMenu = () => {
      console.log("Navigating to main menu");
      router.push("/");
    };

    const restartQuiz = () => {
      console.log("Restarting quiz");
      history.value = [];
      selectedAnswers.value = [];
      showAnswer.value = false;
      currentQuestionCorrect.value = false;
      loadQuestions();
    };

    const openSettings = () => {
      console.log("Opening settings popup");
      showSettingsPopup.value = true;
    };

    const closeSettings = () => {
      console.log("Closing settings popup");
      showSettingsPopup.value = false;
    };

    const saveSettings = () => {
      console.log("Saving settings:", {
        additionalRepetitions: additionalRepetitions.value,
        initialRepetitions: initialRepetitions.value,
        maximumRepetitions: maximumRepetitions.value
      });
      if (initialRepetitions.value > maximumRepetitions.value) {
        alert("Wstępne powtórzenia nie mogą być większe niż maksymalna liczba powtórzeń.");
        console.error("Initial repetitions greater than maximum");
        return;
      }
      localStorage.setItem("quizSettings", JSON.stringify({
        additionalRepetitions: additionalRepetitions.value,
        initialRepetitions: initialRepetitions.value,
        maximumRepetitions: maximumRepetitions.value
      }));
      showSettingsPopup.value = false;
    };

    const checkForNameUpdate = () => {
      console.log("Checking for test name update");
      // Możesz tutaj dodać logikę aktualizacji nazwy testu, jeśli to potrzebne
    };

    onMounted(() => {
      console.log("Component mounted");
      loadQuestions();
      const interval = setInterval(checkForNameUpdate, 5000);
      return () => clearInterval(interval);
    });

    return {
      testName,
      loading,
      error,
      pendingQuestions,
      history,
      selectedAnswers,
      showAnswer,
      score,
      currentQuestion,
      currentQuestionCorrect,
      answeredPercentage,
      isSelected,
      confirmAnswers,
      toggleAnswer,
      nextQuestion,
      goToMainMenu,
      restartQuiz,
      openSettings,
      closeSettings,
      saveSettings,
      additionalRepetitions,
      initialRepetitions,
      maximumRepetitions,
      showSettingsPopup,
      totalQuestions,
      masteredQuestions,
      masteredPercentage
    };
  }
};
</script>

<style scoped>
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
/* Stylizacja nagłówka – symetryczny układ przycisków i wyśrodkowany testName */
.quiz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  margin-bottom: 1rem;
}

/* Klasa menu-btn używana zarówno dla przycisku Home jak i Ustawień */
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

/* Test name wyśrodkowany między przyciskami */
.test-name {
  flex-grow: 1;
  text-align: center;
  margin: 0;
  font-size: 1.5rem;
}

/* Pozostałe style pozostają bez zmian */
.stats-panel {
  width: 250px;
  background: #2a2a2a;
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
.stats-panel .progress-bar {
  background: #444;
}

.stats-panel .progress-correct {
  background: #42b983;
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

.loading,
.error {
  font-size: 1.2rem;
  margin: 1rem 0;
}

.question-section {
  margin-bottom: 1.5rem;
}

.question-text {
  font-size: 1.5rem;
  margin: 1rem 0;
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
  margin: 0.3rem;
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-btn:hover:not(:disabled),
.restart-btn:hover {
  transform: translateY(-2px);
}

.prev-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 1.5rem;
  line-height: 40px;
  text-align: center;
  border-radius: 4px;
  background: linear-gradient(135deg, #2196f3, #1976d2);
  border: none;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s;
  margin: 0.3rem;
}

.prev-btn:hover {
  transform: translateY(-2px);
}

.feedback {
  margin-top: 1.5rem;
}

.feedback-correct {
  color: #42b983;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.feedback-incorrect {
  color: #ff4444;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.navigation-btns {
  display: flex;
  justify-content: center;
  align-items: center;
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
  display: flex;
  justify-content: center;
}
</style>
