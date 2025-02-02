import { createRouter, createWebHistory } from 'vue-router';
import EmptyLayout from '../layouts/EmptyLayout.vue';
import MainLayout from '../layouts/MainLayout.vue';
import HomePage from '../components/HomePage.vue';
import CreateTest from '../components/CreateTestPage.vue';

const routes = [
    // Landing page z EmptyLayout
    {
        path: '/',
        component: EmptyLayout,
        children: [
            {
                path: '',
                name: 'home',
                component: HomePage // Strona docelowa bez nawigacji
            }
        ]
    },

    // Wszystkie inne strony z MainLayout
    {
        path: '/',
        component: MainLayout, // Główny layout z nawigacją
        children: [
            {
                path: 'createtest',
                name: 'createtest',
                component: CreateTest
            },
            // Dodaj inne podstrony tutaj
        ]
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;