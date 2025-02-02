<template>
    <div class="create-test-page">
        <h1>Utwórz nowy test</h1>

        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <label for="testName">Nazwa testu:</label>
                <input type="text"
                       id="testName"
                       v-model.trim="testName"
                       required
                       placeholder="Wpisz nazwę testu"
                       class="test-name-input">
            </div>

            <button type="submit" class="submit-btn">Przejdź do tworzenia pytań</button>
        </form>
    </div>
</template>

<script>
    import { useRouter } from 'vue-router'

    export default {
        setup() {
            const router = useRouter()
            return { router }
        },

        data() {
            return {
                testName: ''
            }
        },

        methods: {
            handleSubmit() {
                if (this.testName.trim()) {
                    this.router.push({
                        name: 'createquestions',
                        query: { testName: this.testName }
                    })
                }
            }
        }
    }
</script>

<style scoped>
    .create-test-page {
        max-width: 600px;
        margin: 2rem auto;
        padding: 20px;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .test-name-input {
        width: 100%;
        padding: 0.8rem;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
    }

    .submit-btn {
        background: #42b983;
        color: white;
        padding: 1rem 2rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
    }
</style>