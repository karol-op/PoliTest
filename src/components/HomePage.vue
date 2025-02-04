<template>
    <div id="app">
        <h1>PoliTest</h1>
        <nav>
            <RouterLink to="/createtest" class="btn">
                Stwórz test
            </RouterLink>

            <!-- Przycisk do wyboru folderu -->
            <button @click="openFolderDialog" class="btn">
                Otwórz test
            </button>

            <!-- Ukryty input do wyboru folderu -->
            <input type="file"
                   ref="folderInput"
                   @change="handleFolderSelection"
                   style="display: none;"
                   webkitdirectory
                   directory />
        </nav>

        <!-- Sekcja z ostatnimi testami -->
        <div class="recent-tests">
            <h2>Ostatnio otwierane testy</h2>
            <ul class="tests-list">
                <li v-for="(test, index) in recentTests"
                    :key="index"
                    class="test-item"
                    @click="openTest(test)">
                    {{ test }}
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import { useRouter } from 'vue-router'

    const router = useRouter()
    const folderInput = ref(null)

    const recentTests = ref([
        "Test podstawowy",
        "Egzamin końcowy",
        "Powtórka materiału",
        "Przykładowy test 1"
    ])

    const openFolderDialog = () => {
        folderInput.value.click()
    }

    const handleFolderSelection = (event) => {
        const files = event.target.files
        if (files.length > 0) {
            const path = files[0].webkitRelativePath
            const folderName = path.split('/')[0]

            // Dodaj wybrany folder do ostatnich testów
            if (!recentTests.value.includes(folderName)) {
                recentTests.value.unshift(folderName)
            }

            // Przekieruj do widoku testu
            router.push({
                name: 'testview',
                query: { folder: folderName }
            })
        }
    }

    const openTest = (testName) => {
        router.push({
            name: 'testview',
            query: { folder: testName }
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