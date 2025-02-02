<template>
    <div>
        <h1>Hello World from Vue + Electron!</h1>
    </div>
    <p>
        <strong>Current route path:</strong> {{ $route.fullPath }}
    </p>
    <nav>
        <RouterLink to="/createtest">Create test</RouterLink>
    </nav>
</template>

<script setup>
</script>
