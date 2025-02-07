<template>
  <div class="quiz-wrapper">
    <!-- Główna część quizu -->
    <div class="quiz-page">
      <!-- Nagłówek: przycisk powrotu, wyśrodkowana nazwa quizu i przycisk ustawień -->
      <header class="quiz-header">
        <button @click="goToMainMenu" class="main-menu-btn">🏠︎</button>
        <h1 class="test-name">{{ testName }}</h1>
        <button @click="openSettings" class="settings-btn">
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
          <p class="file-name">
  {{ currentQuestion.fileName }}
</p>
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
    // Ustawienia powtórzeń (domyślnie: additional = 1, initial = 1, max = 5)
    const totalQuestions=ref(0);
    const storedSettings = JSON.parse(localStorage.getItem("quizSettings") || "{}");
    const additionalRepetitions = ref(storedSettings.additionalRepetitions ?? 1);
    const initialRepetitions = ref(storedSettings.initialRepetitions ?? 1);
    const maximumRepetitions = ref(storedSettings.maximumRepetitions ?? 5);
    const showSettingsPopup = ref(false);

    const route = useRoute();
    const router = useRouter();
    const folder = decodeURIComponent(route.query.folder);
    const testName = ref("Test");
    const loading = ref(true);
    const error = ref("");

    // Kolejki pytań i historia
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





    const masteredQuestions = computed(() => {
  const groups = {}; // Tworzymy grupy według pytania (po nazwie pliku)
  history.value.forEach(entry => {
    const fileName = entry.question.fileName;
    // Tworzymy grupę, jeżeli jeszcze nie istnieje
    groups[fileName] = groups[fileName] || [];
    // Sprawdzamy, czy odpowiedź była poprawna
    groups[fileName].push(entry.correct);
  });
  
  // Pytanie uznajemy za opanowane, jeśli było poprawnie odpowiedziane w jakimkolwiek powtórzeniu
  const mastered = Object.values(groups).filter(attempts => attempts.includes(true));
  return mastered.length;
});






    
    // Aktualizacja nazwy testu
    const checkForNameUpdate = async () => {
      try {
        const result = await window.electronAPI.readFile({ folder, fileName: "testname.txt" });
        if (result.success) {
          const newName = result.content.trim();
          if (newName !== testName.value) {
            testName.value = newName;
            const recentTests = JSON.parse(localStorage.getItem("recentTests") || "[]");
            const updatedTests = recentTests.map(t =>
              t.folder === folder ? { ...t, name: newName } : t
            );
            localStorage.setItem("recentTests", JSON.stringify(updatedTests));
          }
        }
      } catch (err) {
        console.error("Błąd sprawdzania aktualizacji nazwy:", err);
      }
    };

    // Ładowanie pytań – dla każdego pytania tworzymy kopie wg initialRepetitions
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
            file.endsWith(".txt") && file.toLowerCase() !== "testname.txt"
          );
          totalQuestions.value = txtFiles.length;
          const loadedQuestions = [];
          for (const fileName of txtFiles) {
            const res = await window.electronAPI.readFile({ folder, fileName });
            if (res.success) {
              const qObj = parseQuestion(res.content, fileName);
              if (qObj) loadedQuestions.push(qObj);
            }
          }
          if (loadedQuestions.length === 0) {
            error.value = "Brak pytań w folderze.";
          } else {
            let initialQueue = [];
            loadedQuestions.forEach(q => {
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
        console.error(e);
        error.value = "Wystąpił błąd podczas wczytywania pytań.";
      } finally {
        loading.value = false;
      }
    };

    // Parsowanie pytania
    const parseQuestion = (content, fileName) => {
      const lines = content.split("\n").map(l => l.trim()).filter(l => l !== "");
      if (lines.length < 2) return null;
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
      return { question: questionText, image, answers, fileName };
    };

    // Tasowanie tablicy
    const shuffleArray = (array) => {
      const newArray = array.slice();
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };

    // Obsługa wyboru odpowiedzi
    const toggleAnswer = (answer) => {
      if (showAnswer.value) return;
      const index = selectedAnswers.value.indexOf(answer);
      if (index > -1) {
        selectedAnswers.value.splice(index, 1);
      } else {
        selectedAnswers.value.push(answer);
      }
    };

    const isSelected = (answer) => {
      return selectedAnswers.value.includes(answer);
    };

    // Potwierdzenie odpowiedzi
// Potwierdzenie odpowiedzi
// Potwierdzenie odpowiedzi
const confirmAnswers = () => {
  if (selectedAnswers.value.length === 0) return;
  
  showAnswer.value = true; // Pokazujemy feedback po potwierdzeniu odpowiedzi

  const correctAnswers = currentQuestion.value.answers.filter(a => a.correct);
  const isCorrect = (correctAnswers.length === selectedAnswers.value.length) &&
                    selectedAnswers.value.every(a => a.correct);
  currentQuestionCorrect.value = isCorrect;

  // Zapisujemy wynik do historii
  history.value.push({
    question: currentQuestion.value,
    selected: [...selectedAnswers.value],
    correct: isCorrect
  });

  // Obsługuje dodatkowe powtórzenia dla błędnych odpowiedzi
  if (!isCorrect) {
    const currentRepeat = currentQuestion.value.repeatNumber || 1;
    let copies = additionalRepetitions.value + 1; // sztucznie dodajemy +1
    const available = maximumRepetitions.value - currentRepeat;

    if (copies > available) copies = available;

    // Dodajemy kopie pytania z nowym numerem powtórzenia
    for (let i = 1; i <= copies; i++) {
      const newRepeat = currentRepeat + i;
      if (newRepeat > maximumRepetitions.value) break;

      pendingQuestions.value.push({ 
        ...currentQuestion.value, 
        repeatNumber: newRepeat 
      });
    }
  }
};



    // Przechodzenie do kolejnego pytania – usuwamy bieżące pytanie z kolejki
// Przechodzenie do kolejnego pytania – usuwamy bieżące pytanie z kolejki
const nextQuestion = () => {
  selectedAnswers.value = [];
  showAnswer.value = false;
  currentQuestionCorrect.value = false;
  
  // Usuwamy pytanie z kolejki
  if (pendingQuestions.value.length > 0) {
    pendingQuestions.value.shift();
  }

  // Tasowanie pytań po przejściu do kolejnego pytania
  pendingQuestions.value = shuffleArray(pendingQuestions.value);
};



    const goToMainMenu = () => {
      router.push("/");
    };

    const restartQuiz = () => {
      score.value = 0;
      history.value = [];
      selectedAnswers.value = [];
      showAnswer.value = false;
      currentQuestionCorrect.value = false;
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
        alert("Wstępne powtórzenia nie mogą być większe niż maksymalna liczba powtórzeń.");
        return;
      }
      localStorage.setItem("quizSettings", JSON.stringify({
        additionalRepetitions: additionalRepetitions.value,
        initialRepetitions: initialRepetitions.value,
        maximumRepetitions: maximumRepetitions.value
      }));
      showSettingsPopup.value = false;
      console.log("Nowe ustawienia:", additionalRepetitions.value, initialRepetitions.value, maximumRepetitions.value);
    };

    onMounted(() => {
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
/* Dodatkowe style dla sekcji opanowanych pytań */
.stats-panel .progress-bar {
  background: #444; /* Szare tło dla niewykorzystanej części */
}

.stats-panel .progress-correct {
  background: #42b983; /* Zielony dla opanowanych */
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

.main-menu-btn {
  position: absolute;
  left: 0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 4px;
  background: linear-gradient(135deg, #2196f3, #1976d2);
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-menu-btn:hover {
  transform: translateY(-2px);
}

.test-name {
  flex-grow: 1;
  text-align: center;
  margin: 0;
  font-size: 1.5rem;
}

.settings-btn {
  background: linear-gradient(135deg, #2196f3, #1976d2);
  border: none;
  cursor: pointer;
}

.settings-icon {
  color: #2196f3;
  font-size: 1.8rem;
  transition: transform 0.2s;
}

.settings-icon:hover {
  transform: translateY(-2px);
}

.next-btn {
  height: 40px;
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

.next-btn:hover {
  transform: translateY(-2px);
}

.file-name {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #ccc;
}

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
