<template>
  <div class="quiz-wrapper">
    <!-- Kontener quizu -->
    <div class="quiz-page">
      <!-- Nagłówek z przyciskiem powrotu oraz nazwą testu -->
      <header class="quiz-header">
        <button @click="goToMainMenu" class="main-menu-btn">
          🏠︎
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 12l9-9 9 9v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-6H9v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-9z"/>
        </button>
        <h1 class="test-name">{{ testName }}</h1>
      </header>

      <!-- Ekran ładowania lub błąd -->
      <div v-if="loading" class="loading">Ładowanie pytań...</div>
      <div v-else-if="error" class="error">{{ error }}</div>

      <!-- Wynik quizu -->
      <div v-else-if="quizFinished && reviewIndex === null">
        <h2>Quiz zakończony!</h2>
        <p>Twój wynik: {{ score }} / {{ questions.length }}</p>
        <button @click="restartQuiz" class="restart-btn">Restart Quiz</button>
      </div>

      <!-- Wyświetlanie bieżącego lub przeglądowego pytania -->
      <div v-else>
        <div class="question-section">
          <p>
            Pytanie
            <span v-if="!isReview">{{ currentQuestionIndex + 1 }}</span>
            <span v-else>{{ reviewIndex + 1 }}</span>
            z {{ questions.length }}
          </p>
          <h2 class="question-text">{{ displayedQuestion.question }}</h2>
          <img v-if="displayedQuestion.image"
               :src="displayedQuestion.image"
               alt="Obrazek do pytania"
               class="question-image" />
        </div>

        <div class="answers-section">
          <ul>
            <li v-for="(answer, index) in displayedQuestion.answers"
                :key="index" class="answer-item">
              <button @click="toggleAnswer(answer)"
                      :class="[
                        isSelected(answer) ? 'selected' : '',
                        {
                          correct: showAnswerForDisplayed && isSelected(answer) && answer.correct,
                          missed: showAnswerForDisplayed && !isSelected(answer) && answer.correct,
                          incorrect: showAnswerForDisplayed && isSelected(answer) && !answer.correct
                        }
                      ]"
                      :disabled="showAnswerForDisplayed"
                      class="answer-btn">
                {{ answer.text }}
                <span v-if="isSelected(answer)" class="checkmark">✓</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Przyciski potwierdzające wybór oraz informacja zwrotna -->
        <div v-if="!showAnswerForDisplayed && !isReview" class="confirmation">
          <button @click="confirmAnswers" class="confirm-btn" :disabled="selectedAnswers.length === 0">
            Potwierdź wybory
          </button>
        </div>

        <div v-if="showAnswerForDisplayed" class="feedback">
          <p v-if="displayedQuestionCorrect" class="feedback-correct">Poprawna odpowiedź!</p>
          <p v-else class="feedback-incorrect">Niepoprawna odpowiedź.</p>
          <!-- Nawigacja oraz wyświetlenie nazwy pliku w zależności od trybu -->
          <template v-if="!isReview">
            <div class="navigation-btns">
              <button v-if="currentQuestionIndex > 0 && answersHistory[currentQuestionIndex - 1]"
                      @click="reviewPrevious" class="prev-btn">
                ←
              </button>
              <button @click="nextQuestion" class="next-btn">Następne pytanie</button>
            </div>
            <p class="file-name">{{ displayedQuestion.fileName }}</p>
          </template>
          <template v-else>
            <button @click="exitReview" class="next-btn">Powrót do bieżącego pytania</button>
          </template>
        </div>
      </div>
    </div>

    <!-- Panel statystyk -->
    <div class="stats-panel">
      <h2>Statystyki</h2>
      <p>Odpowiedzi udzielone: {{ answeredCount }} / {{ questions.length }}</p>
      <div class="progress-container">
        <span class="correct-count">{{ score }}</span>
        <div class="progress-bar">
          <div class="progress-correct" :style="{ width: answeredCount > 0 ? progressPercentage + '%' : '0%' }"></div>
          <div class="progress-incorrect" :style="{ width: answeredCount > 0 ? (100 - progressPercentage) + '%' : '0%' }"></div>
        </div>
        <span class="wrong-count">{{ answeredCount - score }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

export default {
  name: "TestQuiz",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const folder = decodeURIComponent(route.query.folder);
    const testName = ref("Test");
    const loading = ref(true);
    const error = ref("");
    const questions = ref([]);
    const currentQuestionIndex = ref(0);
    const answersHistory = ref([]);
    const selectedAnswers = ref([]);
    const showAnswer = ref(false);
    const score = ref(0);
    const reviewIndex = ref(null);
    const isReview = computed(() => reviewIndex.value !== null);
    const currentQuestion = computed(() => questions.value[currentQuestionIndex.value]);
    const displayedQuestion = computed(() =>
      isReview.value ? questions.value[reviewIndex.value] : currentQuestion.value
    );
    const showAnswerForDisplayed = computed(() => isReview.value || showAnswer.value);
    const displayedSelectedAnswers = computed(() => {
      if (isReview.value) {
        return answersHistory.value[reviewIndex.value] ? answersHistory.value[reviewIndex.value].selected : [];
      } else {
        return selectedAnswers.value;
      }
    });
    const displayedQuestionCorrect = computed(() => {
      if (isReview.value) {
        return answersHistory.value[reviewIndex.value] ? answersHistory.value[reviewIndex.value].correct : false;
      } else {
        return showAnswer.value && currentQuestionCorrect.value;
      }
    });
    const currentQuestionCorrect = ref(false);
    const quizFinished = computed(
      () => currentQuestionIndex.value >= questions.value.length && !isReview.value
    );
    const answeredCount = computed(() => answersHistory.value.filter(entry => entry !== undefined).length);
    const progressPercentage = computed(() => {
      return answeredCount.value > 0 ? (score.value / answeredCount.value) * 100 : 0;
    });

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
            questions.value = shuffleArray(loadedQuestions);
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
      const shuffledAnswers = shuffleArray(answers);
      return { question: questionText, image, answers: shuffledAnswers, fileName };
    };

    const shuffleArray = (array) => {
      const newArray = array.slice();
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };

    const toggleAnswer = (answer) => {
      if (showAnswerForDisplayed.value) return;
      if (!isReview.value) {
        const index = selectedAnswers.value.indexOf(answer);
        if (index > -1) {
          selectedAnswers.value.splice(index, 1);
        } else {
          selectedAnswers.value.push(answer);
        }
      }
    };

    const isSelected = (answer) => {
      return displayedSelectedAnswers.value.includes(answer);
    };

    const confirmAnswers = () => {
      if (selectedAnswers.value.length === 0) return;
      showAnswer.value = true;
      const correctAnswers = currentQuestion.value.answers.filter(a => a.correct);
      const isAnswerCorrect = correctAnswers.length === selectedAnswers.value.length &&
                              selectedAnswers.value.every(a => a.correct);
      currentQuestionCorrect.value = isAnswerCorrect;
      if (isAnswerCorrect) {
        score.value++;
      }
      answersHistory.value[currentQuestionIndex.value] = {
        selected: [...selectedAnswers.value],
        correct: isAnswerCorrect
      };
    };

    const nextQuestion = () => {
      selectedAnswers.value = [];
      showAnswer.value = false;
      currentQuestionCorrect.value = false;
      if (isReview.value) {
        reviewIndex.value = null;
      } else {
        currentQuestionIndex.value++;
      }
    };

    const reviewPrevious = () => {
      if (currentQuestionIndex.value > 0 && answersHistory.value[currentQuestionIndex.value - 1]) {
        reviewIndex.value = currentQuestionIndex.value - 1;
      }
    };

    const exitReview = () => {
      reviewIndex.value = null;
    };

    const goToMainMenu = () => {
      router.push("/");
    };

    const restartQuiz = () => {
      currentQuestionIndex.value = 0;
      score.value = 0;
      questions.value = shuffleArray(questions.value);
      selectedAnswers.value = [];
      showAnswer.value = false;
      currentQuestionCorrect.value = false;
      answersHistory.value = [];
      reviewIndex.value = null;
    };

    onMounted(() => {
      loadQuestions();
    });

    return {
      folder,
      testName,
      loading,
      error,
      questions,
      currentQuestionIndex,
      currentQuestion,
      displayedQuestion,
      selectedAnswers,
      isSelected,
      confirmAnswers,
      toggleAnswer,
      nextQuestion,
      restartQuiz,
      score,
      quizFinished,
      currentQuestionCorrect,
      showAnswerForDisplayed,
      displayedQuestionCorrect,
      reviewPrevious,
      exitReview,
      isReview,
      reviewIndex,
      answersHistory,
      goToMainMenu,
      answeredCount,
      progressPercentage
    };
  }
};
</script>

<style scoped>
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

/* Nagłówek z przyciskiem powrotu i nazwą testu */
.quiz-header {
  display: flex;
  align-items: center;
  justify-content: center; /* Wycentrowanie zawartości */
  position: relative;      /* Potrzebne dla absolutnego pozycjonowania przycisku */
  margin-bottom: 1rem;
}

.main-menu-btn {
  position: absolute;
  left: 0; /* Umiejscowienie przycisku po lewej */
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
  margin: 0;
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

/* Nazwa pliku */
.file-name {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #ccc;
}

/* Panel statystyk */
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

/* Pasek postępu */
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

/* Reszta stylów */
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
</style>
