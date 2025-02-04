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
            <button type="submit" class="submit-btn">
                Przejdź do tworzenia pytań
            </button>
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
        /* Usunięto tło i cień, aby kontener nie rozciągał się na całą szerokość ekranu */
        /* background-color: #1a1a1a; */
        /* box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); */
        text-align: center;
    }

    h1 {
        font-size: 2.5rem;
        margin-bottom: 1.5rem;
        color: white;
    }

    .form-group {
        margin-bottom: 1.5rem;
        text-align: left;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        color: #1a1a1a;
        font-weight: 500;
    }

    .test-name-input {
        width: 100%;
        padding: 0.8rem;
        border: 2px solid #ccc;
        border-radius: 8px;
        font-size: 1rem;
        background-color: #fff;
        color: #333;
        outline: none;
        transition: border-color 0.3s ease;
    }

        .test-name-input:focus {
            border-color: #42b983;
        }

        .test-name-input::placeholder {
            color: #888;
        }

    .submit-btn {
        background: linear-gradient(135deg, #42b983, #36a174);
        color: #ffffff;
        padding: 1rem 2rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        transition: background 0.3s ease, transform 0.2s ease;
    }

        .submit-btn:hover {
            background: linear-gradient(135deg, #36a174, #42b983);
            transform: translateY(-2px);
        }
</style>
