import { createMemoryHistory, createRouter } from 'vue-router'
import HomePage from '../components/HomePage.vue'
import CreateTestPage from '../components/CreateTestPage.vue'

const routes = [
    { path: '/', component: HomePage },
    { path: '/createtest', component: CreateTestPage},
]

const router = createRouter({
    history: createMemoryHistory(),
    routes,
})

export default router