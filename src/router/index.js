import { createRouter, createWebHistory } from 'vue-router';
import EmptyLayout from '../layouts/EmptyLayout.vue';
import MainLayout from '../layouts/MainLayout.vue';
import HomePage from '../components/HomePage.vue';
import CreateTest from '../components/CreateTestPage.vue';
import CreateQuestions from '../components/CreateQuestionsPage.vue';
import TestQuiz from '../components/TestQuiz.vue';
import MergingFolders from '../components/MergingFolders.vue';
const routes = [
    // Landing page z EmptyLayout
    {
        path: '/',
        component: EmptyLayout,
        children: [
            {
                path: '',
                name: 'home',
                component: HomePage 
            }
        ]
    },

    {
        path: '/',
        component: MainLayout, 
        children: [
            {
                path: 'createtest',
                name: 'createtest',
                component: CreateTest
            },
            {
                path: 'createquestions',
                name: 'createquestions',
                component: CreateQuestions,
                props: (route) => ({
                    testName: route.query.testName || ''
                })
            },
            {
                path: 'testquiz',
                name: 'testquiz',
                component: TestQuiz
            },
            {
                path: 'mergingfolders',
                name: 'mergingfolders',
                component: MergingFolders
            }
        ]
    }
];

const router = createRouter({
    history: createWebHistory('/'),
    routes
});

export default router;