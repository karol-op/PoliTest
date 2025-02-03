<template>
    <div id="app">
        <h1>PoliTest</h1>
        <nav>
            <RouterLink to="/createtest" class="btn">
                Utwórz test
            </RouterLink>
        </nav>
    </div>
</template>

<script setup>
</script>

<style scoped>
    /* stylizacja przycisku */
    .btn {
        display: inline-block; /* Umożliwia ustawienie paddingu i tła */
        padding: 0.8em 1.5em; /* Dodaje przestrzeń wewnętrzną, by cały obszar był klikalny */
        background: linear-gradient(135deg, #42b983, #36a174); /* Kolor tła przycisku */
        color: rgba(255, 255, 255, 0.87); /* Kolor tekstu */
        text-decoration: none; /* Usuwa podkreślenie z linka */
        border: 1px solid transparent;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.3s ease, transform 0.2s ease;
    }

        /* Efekt po najechaniu */
        .btn:hover {
            background: linear-gradient(135deg, #36a174, #42b983);
            transform: translateY(-2px);
        }

    /* Opcjonalne ustawienia dla nav */
    nav {
        margin-top: 20px;
    }
</style>
