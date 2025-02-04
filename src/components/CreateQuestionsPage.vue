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
    </div>

    <!-- Główny formularz -->
    <div class="form-container">
      <div class="test-name-header">
        <h1>Tworzenie pytań</h1>
        <h2 class="test-name">{{ storedTestName }}</h2>
        <button v-if="currentFileName" @click="resetCurrentFile" class="new-file-btn">
          Nowy plik
        </button>
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
import path from "path";

export default {
  setup() {
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
    storedTestName() {
      return this.sanitize(this.route.query.testName || "nienazwany_test");
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
    goBack() {
      this.$router.go(-1); // Lub inna logika nawigacji
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
          this.files = result.files.filter((file) => file.endsWith(".txt"));
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
        if (result.success) {
          const content = result.content;
          const lines = content.split("\n");
          if (lines.length < 2) {
            this.showNotification("Plik jest niepoprawny", "error");
            return;
          }
          const marker = lines[0].trim();

          if (lines[1].startsWith("[img]")) {
            this.selectedImage = null;
            this.currentQuestion = lines[2].trim();
            const answersText = lines.slice(3);
            const bits = marker.slice(1).split("");

            this.answers = answersText.map((text, index) => ({
              text: text.trim(),
              isCorrect: bits[index] === "1",
            }));
          } else {
            this.currentQuestion = lines[1].trim();
            const answersText = lines.slice(2);
            const bits = marker.slice(1).split("");

            this.answers = answersText.map((text, index) => ({
              text: text.trim(),
              isCorrect: bits[index] === "1",
            }));
          }
          this.currentFileName = fileName;
          this.showNotification("Plik wczytany poprawnie", "success");
        } else {
          this.showNotification("Nie udało się wczytać pliku", "error");
        }
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
    async handleSubmit() {
      if (!this.validateForm()) return;
      if (!this.selectedFolder) {
        this.showNotification("Wybierz folder zapisu!", "error");
        return;
      }

      const fileName =
        this.currentFileName ||
        (() => {
          const correctMarker =
            "X" + this.answers.map((a) => (a.isCorrect ? "1" : "0")).join("");
          return `${this.sanitize(this.currentQuestion).substring(0, 20)}.txt`;
        })();

      let fileContent = "";
      const correctMarker =
        "X" + this.answers.map((a) => (a.isCorrect ? "1" : "0")).join("");
      if (this.selectedImage) {
        fileContent = [
          correctMarker,
          `[img]${this.imageFileName}[/img]`,
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

      this.resetForm();
      this.currentFileName = null;
      this.selectedImage = null;
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
    resetCurrentFile() {
      this.resetForm();
      this.currentFileName = null;
      this.selectedImage = null;
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

.test-name-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #eee;
  text-align: center;
  position: relative;
}

.new-file-btn {
  position: absolute;
  top: 0;
  right: 0;
  background: #2196f3;
  color: #fff;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
}

.new-file-btn:hover {
  transform: scale(1.05);
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

.image-preview img {
  max-width: 100%;
  max-height: 200px;
  margin-top: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
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