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
      <!-- Przycisk "Nowy plik" umieszczony na dole sekcji listy plików -->
      <button v-if="currentFileName" @click="resetCurrentFile" class="new-file-btn">
        Nowy plik
      </button>
    </div>

    <!-- Główny formularz -->
    <div class="form-container">
      <div class="test-name-header">
        <h1>Tworzenie pytań</h1>
        <h2 class="test-name">{{ storedTestName }}</h2>
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
          <div class="image-upload">
            <button type="button" @click="chooseImage" class="image-btn">
              {{ selectedImage ? 'Zmodyfikuj zdjęcie' : 'Dodaj zdjęcie' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Formularz pytania -->
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <textarea
            v-model.trim="currentQuestion"
            placeholder="Wpisz swoje pytanie"
            required
            rows="3"
            class="question-input"
            :class="{ 'input-error': showErrors && !currentQuestion }"
          ></textarea>
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
            <!-- Czerwony przycisk z ikoną kosza do usunięcia zdjęcia -->
            <button type="button" @click="removeImage" class="remove-btn image-remove-btn" title="Usuń zdjęcie">
              🗑
            </button>
          </div>
        </div>

        <!-- Sekcja odpowiedzi -->
        <div class="answers-section">
          <h3>Odpowiedzi:</h3>
          <div
            v-for="(answer, index) in answers"
            :key="index"
            class="answer-item"
          >
            <input
              type="text"
              v-model.trim="answer.text"
              placeholder="Wpisz odpowiedź"
              class="answer-input"
              :class="{ 'input-error': showErrors && !answer.text }"
              @input="clearAddError"
            />
            <label class="correct-label">
              <input
                type="checkbox"
                v-model="answer.isCorrect"
                class="correct-checkbox"
              />
              Poprawna
            </label>
            <button
              v-if="answers.length > 1"
              @click="confirmRemove(index)"
              class="remove-btn"
              type="button"
              title="Usuń odpowiedź"
            >
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
            <button
              type="button"
              @click="addAnswer"
              class="add-answer-btn"
              :disabled="addAnswerPending"
            >
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
    // Pobranie bieżącej trasy (route)
    const route = useRoute();
    return { route };
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
      files: [],
      currentFileName: null,
      selectedImage: null,
    };
  },
  computed: {
    // Zwraca nazwę testu po usunięciu znaków specjalnych
    storedTestName() {
      return this.sanitize(this.route.query.testName || "nienazwany_test");
    },
    // Wyciąga nazwę pliku obrazu z pełnej ścieżki
    imageFileName() {
      if (!this.selectedImage) return "";
      const parts = this.selectedImage.split(/[\\/]/);
      return parts[parts.length - 1];
    },
    // Sprawdza, czy przynajmniej jedna odpowiedź ma tekst
    hasValidAnswers() {
      return this.answers.some((a) => a.text.trim() !== "");
    },
    // Sprawdza, czy przynajmniej jedna odpowiedź jest oznaczona jako poprawna
    hasCorrectAnswer() {
      return this.answers.some((a) => a.isCorrect);
    },
    // Sprawdza, czy formularz jest poprawnie wypełniony
    isFormValid() {
      return (
        this.currentQuestion.trim() !== "" &&
        this.hasValidAnswers &&
        this.hasCorrectAnswer
      );
    },
    // Sprawdza, czy wszystkie odpowiedzi są wypełnione
    allAnswersFilled() {
      return this.answers.every((a) => a.text.trim() !== "");
    },
  },
  methods: {
    // Usuwa znaki specjalne z tekstu, używane przy generowaniu nazw plików
    sanitize(text) {
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .substring(0, 50);
    },
    // Nawigacja do poprzedniej strony
    goBack() {
      this.$router.go(-1); // Cofnięcie o jedną stronę w historii
    },
    // Wybór folderu do zapisu
    async selectFolder() {
      try {
        const folderPath = await window.electronAPI.selectFolder();
        if (folderPath) {
          this.selectedFolder = folderPath;
          this.folderError = "";
          await this.fetchFiles(); // Po wyborze folderu wczytuje listę plików
        } else {
          this.folderError = "Nie wybrano folderu";
        }
      } catch (error) {
        this.folderError = "Nie udało się wybrać folderu.";
      }
    },
    // Pobiera listę plików (tylko .txt) z wybranego folderu
    async fetchFiles() {
      if (!this.selectedFolder) return;
      try {
        const result = await window.electronAPI.listFiles(this.selectedFolder);
        if (result.success) {
          this.files = result.files.filter((file) => file.endsWith(".txt"));
        } else {
          this.showNotification("Nie udało się wczytać plików", "error");
        }
      } catch (error) {
        console.error("Błąd pobierania plików:", error);
        this.showNotification("Błąd pobierania plików", "error");
      }
    },
    // Zmiana folderu – resetuje wybrane dane i formularz
    changeFolder() {
      this.selectedFolder = null;
      this.files = [];
      this.currentFileName = null;
      this.resetForm();
    },
    // Wczytuje zawartość pliku i ustawia dane formularza
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
        // Pobranie markera z pierwszej linii
        const marker = lines[0].trim();
        // Jeśli druga linia zawiera znacznik obrazu, wyodrębniamy nazwę obrazu
        let offset = 1;
        if (lines[1].startsWith("[img]")) {
          const imgLine = lines[1].trim();
          const imgFileName = imgLine.substring(5, imgLine.length - 6); // Usuwamy [img] oraz [/img]
          // Ustawiamy obraz – zakładamy, że obraz znajduje się w wybranym folderze
          this.selectedImage = this.selectedFolder + "/" + imgFileName;
          offset = 2;
        } else {
          this.selectedImage = null;
        }
        // Ustawienie pytania oraz listy odpowiedzi
        this.currentQuestion = lines[offset].trim();
        const answersText = lines.slice(offset + 1);
        const bits = marker.slice(1).split("");
        this.answers = answersText.map((text, index) => ({
          text: text.trim(),
          isCorrect: bits[index] === "1",
        }));
        this.currentFileName = fileName;
        this.showNotification("Plik wczytany poprawnie", "success");
      } catch (error) {
        console.error("Błąd przy wczytywaniu pliku:", error);
        this.showNotification("Błąd przy wczytywaniu pliku", "error");
      }
    },
    // Wybór zdjęcia (ścieżka do pliku obrazu)
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
    // Usuwa zdjęcie z pytania
    removeImage() {
      this.selectedImage = null;
      this.showNotification("Zdjęcie usunięte", "success");
    },
    // Zapisuje pytanie do pliku oraz wykonuje kopiowanie zdjęcia i zapis nazwy testu
    async handleSubmit() {
      if (!this.validateForm()) return;
      if (!this.selectedFolder) {
        this.showNotification("Wybierz folder zapisu!", "error");
        return;
      }
      // Obliczenie markera poprawności odpowiedzi
      const correctMarker = "X" + this.answers.map((a) => (a.isCorrect ? "1" : "0")).join("");
      // Jeśli nie wczytano pliku, generujemy nazwę na podstawie pytania
      const fileName =
        this.currentFileName ||
        `${this.sanitize(this.currentQuestion).substring(0, 20)}.txt`;

      // Przygotowanie zawartości pliku
      let fileContent = "";
      if (this.selectedImage) {
        fileContent = [
          correctMarker,
          "[img]" + this.imageFileName + "[/img]",
          this.currentQuestion,
          ...this.answers.map((a) => a.text.trim()),
        ].join("\n");
      } else {
        fileContent = [
          correctMarker,
          this.currentQuestion,
          ...this.answers.map((a) => a.text.trim()),
        ].join("\n");
      }

      // Zapis pliku z pytaniem
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

      // Jeśli wybrano zdjęcie, kopiujemy je do folderu docelowego
      if (this.selectedImage) {
        try {
          const destination = this.selectedFolder + "/" + this.imageFileName;
          const copyResult = await window.electronAPI.copyFile(
            this.selectedImage,
            destination
          );
          if (!copyResult.success) {
            this.showNotification(
              "Pytanie zapisane, ale nie udało się skopiować zdjęcia",
              "error"
            );
          }
        } catch (error) {
          console.error("Błąd podczas kopiowania zdjęcia:", error);
        }
      }

      // Zapis nazwy testu do pliku testname.txt
      try {
        const testNameResult = await window.electronAPI.saveFile({
          folder: this.selectedFolder,
          fileName: "testname.txt",
          fileContent: this.storedTestName,
        });
        if (!testNameResult.success) {
          this.showNotification(
            "Pytanie zapisane, ale nie udało się zapisać testname.txt",
            "error"
          );
        }
      } catch (error) {
        console.error("Błąd podczas zapisu testname.txt:", error);
      }

      // Reset formularza i usunięcie wybranych plików/zdjęcia
      this.resetForm();
      this.currentFileName = null;
      this.selectedImage = null;
    },
    // Dodaje nową pustą odpowiedź
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
    // Pyta o potwierdzenie usunięcia odpowiedzi, a następnie usuwa
    confirmRemove(index) {
      if (confirm("Czy na pewno chcesz usunąć tę odpowiedź?")) {
        this.removeAnswer(index);
      }
    },
    // Usuwa odpowiedź o podanym indeksie (o ile pozostała przynajmniej jedna)
    removeAnswer(index) {
      if (this.answers.length > 1) {
        this.answers.splice(index, 1);
      }
    },
    // Czyści błąd przy dodawaniu odpowiedzi
    clearAddError() {
      this.addAnswerError = null;
      this.addAnswerPending = false;
    },
    // Walidacja formularza – ustawia flagę wyświetlania błędów
    validateForm() {
      this.showErrors = true;
      return this.isFormValid;
    },
    // Resetuje dane formularza (pytanie oraz odpowiedzi)
    resetForm() {
      this.currentQuestion = "";
      this.answers = [{ text: "", isCorrect: false }];
      this.showErrors = false;
    },
    // Resetuje bieżący plik i formularz oraz usuwa wybrane zdjęcie
    resetCurrentFile() {
      this.resetForm();
      this.currentFileName = null;
      this.selectedImage = null;
    },
    // Wyświetla powiadomienie na określony czas
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
/* Stylowanie komponentu – niezmienione względem oryginału */

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
  width: 79%;
  margin-left: 3.2rem;
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
  align-items: flex-start;
  padding-right: 150px;
}

.selected-folder-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.selected-folder-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #404040;
  border: 1px solid #404040;
  border-radius: 6px;
  padding: 8px 12px;
  flex-grow: 1;
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
  display: flex;
  align-items: center;
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
  width: 175px;
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

.question-input {
  width: 90%;
  padding: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1.1rem;
  resize: none;
  text-align: center;
  margin: 1rem 0;
}

.image-preview-section {
  margin: 1rem 0;
  text-align: center;
}

.image-preview {
  position: relative;
}

/* Ograniczenie maksymalnych rozmiarów podglądu zdjęcia */
.image-preview img {
  max-width: 250px;
  max-height: 250px;
  margin-top: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* Przycisk usuwania zdjęcia – wycentrowany wertykalnie w swoim kontenerze */
.image-remove-btn {
  position: absolute;
  top: 50%;
  right: 5px;
  transform: translateY(-50%);
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
  resize: none;
  text-align: center;
}

.correct-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  margin-left: 11rem;
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
  display: flex;
  align-items: center;
  justify-content: center;
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
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
