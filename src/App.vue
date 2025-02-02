<template>
    <p>
        <strong>Current route path:</strong> {{ $route.fullPath }} 
    </p>
    <HomePage /> <!-- Wstawiamy HelloWorld jako główny komponent -->
    <nav>
        <RouterLink to="/">Go to Home</RouterLink>
        <RouterLink to="/createtest">Go to About</RouterLink>
    </nav>
    <main>
        <RouterView />
    </main>
</template>
