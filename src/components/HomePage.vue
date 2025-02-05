<template>
    <div id="app">
        <h1>PoliTest</h1>
        <nav>
            <RouterLink to="/createtest" class="btn">
                Stwórz test
            </RouterLink>

            <button @click="openFolderDialog" class="btn">
                Otwórz test
            </button>

            <input type="file"
                   ref="folderInput"
                   @change="handleFolderSelection"
                   style="display: none;"
                   webkitdirectory
                   directory />
        </nav>

        <div class="recent-tests">
            <h2>Ostatnio otwierane testy</h2>
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

const openFolderDialog = () => {
    folderInput.value.click()
}

const handleFolderSelection = async (event) => {
    const files = event.target.files
    if (files.length > 0) {
        try {
            // Pobierz pierwszą ścieżkę absolutną
            const absolutePath = files[0].path
            const folderPath = absolutePath.substring(0, absolutePath.lastIndexOf('\\')) // Dla Windowsa

            let testName = folderPath.split('\\').pop() // Domyślnie nazwa folderu

            // Szukaj pliku z nazwą testu
            const nameFile = Array.from(files).find(f => f.name === 'testname.txt')
            if (nameFile) {
                testName = await readFileContent(nameFile)
                testName = testName.trim()
            }

            updateRecentTests(testName, folderPath)
            saveRecentTests()
            navigateToTest(folderPath)

        } catch (error) {
            console.error('Błąd podczas przetwarzania folderu:', error)
            alert('Wystąpił błąd podczas wczytywania testu')
        } finally {
            event.target.value = null
        }
    }
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

const navigateToTest = (folderPath) => {
    router.push({
        name: 'testquiz',
        query: { folder: encodeURIComponent(folderPath) }
    })
}

const openTest = (folderPath) => {
    router.push({
        name: 'testquiz',
        query: { folder: encodeURIComponent(folderPath) }
    })
}
</script>


<style scoped>
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