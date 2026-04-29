import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import CharacterCreateView from '../views/CharacterCreateView.vue'
import CharacterSelectView from '../views/CharacterSelectView.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/dashboard', component: Dashboard },
  { path: '/characterCreateView', component: CharacterCreateView },
  { path: '/characterSelectView', component: CharacterSelectView },
  { path: '/guest', component: () => import('../views/GuestView.vue')}
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
