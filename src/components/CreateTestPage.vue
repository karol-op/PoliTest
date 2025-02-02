<template>
    <div class="create-test-page">
        <h1>Create New Test</h1>

        <form @submit.prevent="handleSubmit">
            <div class="form-group">
                <label for="testTitle">Test Title:</label>
                <input type="text"
                       id="testTitle"
                       v-model="testTitle"
                       required
                       placeholder="Enter test title">
            </div>

            <div class="form-group">
                <label>Questions:</label>
                <textarea v-model="questions"
                          placeholder="Enter questions (one per line)"
                          rows="5"></textarea>
            </div>

            <button type="submit" class="submit-btn">Create Test</button>
        </form>
    </div>
    <nav>
        <RouterLink to="/">Home</RouterLink>
    </nav>
</template>

<script>
    export default {
        data() {
            return {
                testTitle: '',
                questions: ''
            }
        },
        methods: {
            handleSubmit() {
                // Tutaj logika wysyłania formularza
                const questionsArray = this.questions.split('\n').filter(q => q.trim());

                console.log('Creating test:', {
                    title: this.testTitle,
                    questions: questionsArray
                });

                // Reset formularza
                this.testTitle = '';
                this.questions = '';
            }
        }
    }
</script>

<style scoped>
    .create-test-page {
        max-width: 800px;
        margin: 20px auto;
        padding: 20px;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }

    input[type="text"], textarea {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
    }

    .submit-btn {
        background-color: #42b983;
        color: white;
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
    }

        .submit-btn:hover {
            background-color: #3aa876;
        }
</style>