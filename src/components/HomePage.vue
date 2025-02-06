<template>
    <div id="app">
        <h1>PoliTest</h1>
        <nav>
            <RouterLink to="/createtest" class="btn">
                Stwórz test
            </RouterLink>

            <button @click="showActionDialog = true" class="btn">
                Wczytaj test
            </button>

            <!-- Action selection dialog -->
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
                    </div>
                    <button @click="showActionDialog = false" class="dialog-cancel-btn">
                        Anuluj
                    </button>
                </div>
            </div>

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
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const folderInput = ref(null)
const recentTests = ref([])
const showActionDialog = ref(false)
const selectedAction = ref(null)

onMounted(() => {
    loadRecentTests()
})

const loadRecentTests = () => {
    const storedTests = localStorage.getItem('recentTests')
    if (storedTests) {
        recentTests.value = JSON.parse(storedTests)
    }
}

const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsText(file)
    })
}



const selectAction = (action) => {
    selectedAction.value = action
    showActionDialog.value = false
    folderInput.value.click()
}

const handleFolderSelection = async (event) => {
    const files = event.target.files
    if (files.length > 0 && selectedAction.value) {
        try {
            const absolutePath = files[0].path
            const folderPath = absolutePath.substring(0, absolutePath.lastIndexOf('\\'))

            let testName = folderPath.split('\\').pop()

            const nameFile = Array.from(files).find(f => f.name === 'testname.txt')
            if (nameFile) {
                testName = await readFileContent(nameFile)
                testName = testName.trim()
            }

            if (selectedAction.value === 'quiz') {
                updateRecentTests(testName, folderPath)
                saveRecentTests()
            }

            navigateToTest(folderPath, selectedAction.value)

        } catch (error) {
            console.error('Błąd podczas przetwarzania folderu:', error)
            alert('Wystąpił błąd podczas wczytywania testu')
        } finally {
            event.target.value = null
            selectedAction.value = null
        }
    }
}

const navigateToTest = (folderPath, action) => {
    const routeName = action === 'quiz' ? 'testquiz' : 'createquestions'
    router.push({
        name: routeName,
        query: { folder: encodeURIComponent(folderPath) }
    })
}

const updateRecentTests = (name, folder) => {
    recentTests.value = recentTests.value.filter(t => t.folder !== folder)
    recentTests.value.unshift({ name, folder })

    if (recentTests.value.length > 5) {
        recentTests.value = recentTests.value.slice(0, 5)
    }
}

const saveRecentTests = () => {
    localStorage.setItem('recentTests', JSON.stringify(recentTests.value))
}



const openTest = (folderPath) => {
    router.push({
        name: 'testquiz',
        query: { folder: encodeURIComponent(folderPath) }
    })
}
</script>


<style scoped>
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
    background-color: #2d2d2d;
    padding: 1rem;
    margin: 0.5rem 0;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    color: white;
}

.test-item:hover {
    background-color: #3d3d3d;
    transform: translateX(5px);
}
</style>