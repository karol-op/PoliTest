<template>
    <div>
        <router-view></router-view> <!-- Tutaj będzie renderowany odpowiedni komponent -->
    </div>
</template>

<script>
    export default {
        name: 'App',
        created() {
            // Przekierowanie do domyślnej strony po załadowaniu aplikacji
            this.$router.push('/');
        }
    };
</script>

<style>
    /* Style aplikacji */
</style>
