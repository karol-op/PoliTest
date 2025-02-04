<template>
    <div id="app">
      <h1>PoliTest</h1>
      <nav>
        <RouterLink to="/createtest" class="btn">
          Stwórz test
        </RouterLink>
        <!-- Dodany przycisk Otwórz test -->
        <RouterLink to="/testselection" class="btn">
          Otwórz test
        </RouterLink>
      </nav>
    </div>
  </template>
  
  <script setup>
    // Nie jest potrzebny dodatkowy kod w tym pliku
  </script>
  
  <style scoped>
    /* Stylizacja przycisków */
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
      margin-right: 1rem; /* Odstęp pomiędzy przyciskami */
    }
  
    .btn:hover {
      background: linear-gradient(135deg, #36a174, #42b983);
      transform: translateY(-2px);
    }
  
    nav {
      margin-top: 20px;
    }
  </style>
  