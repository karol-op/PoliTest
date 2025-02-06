<template>
    <div class="create-test-page">
        <h1>Utwórz nowy test</h1>
        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <input type="text"
                       id="testName"
                       v-model.trim="testName"
                       required
                       placeholder="Wpisz nazwę testu"
                       class="test-name-input" />
            </div>
            <div class="button-group">
                <button type="submit" class="submit-btn">
                    Przejdź do tworzenia pytań
                </button>
                <RouterLink to="/" class="back-btn">
                    Wróć
                </RouterLink>
            </div>
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
        margin: 4rem auto;
        padding: 2rem;
        text-align: center;
    }

    h1 {
        font-size: 2.5rem;
        margin-bottom: 1.5rem;
        color: white;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .test-name-input {
        width: 100%;
        padding: 1rem;
        border: 2px solid #42b983;
        border-radius: 8px;
        font-size: 1rem;
        background-color: #2d2d2d;
        color: white;
        outline: none;
        transition: all 0.3s ease;
    }

    .test-name-input:focus {
        border-color: #36a174;
        box-shadow: 0 0 8px rgba(66, 185, 131, 0.3);
    }

    .test-name-input::placeholder {
        color: #888;
    }

    .button-group {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
    }

    .submit-btn {
        background: linear-gradient(135deg, #42b983, #36a174);
        color: white;
        padding: 1rem 2rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.3s ease;
    }

    .submit-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(66, 185, 131, 0.3);
    }

    .back-btn {
        background: linear-gradient(135deg, #666, #444);
        color: white;
        padding: 1rem 2rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        text-decoration: none;
        transition: all 0.3s ease;
    }

    .back-btn:hover {
        background: linear-gradient(135deg, #777, #555);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 102, 102, 0.3);
    }
</style>
