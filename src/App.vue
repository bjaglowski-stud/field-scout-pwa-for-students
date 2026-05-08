<template>
  <div id="app" :class="{ 'offline': !isOnline }">
    <header>
      <h1>📍 Field Scout v1.0</h1>
      <div class="status-bar" :class="isOnline ? 'bg-green' : 'bg-red'">
        {{ isOnline ? 'Tryb Online' : 'Tryb Offline' }}
      </div>
    </header>

    <main>
      <LocationLogger />
    </main>

    <footer>
      <p>Konwersatorium Terenowe - PWA & Vue.js</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import LocationLogger from './components/LocationLogger.vue';

const isOnline = ref(navigator.onLine);

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
};

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>

<style>
/* Prosty stylowanie mobilne */
:root { --p-color: #42b883; --s-color: #35495e; }
body { margin: 0; font-family: sans-serif; background: #f4f4f4; }
#app { display: flex; flex-direction: column; min-height: 100vh; }
header { background: var(--s-color); color: white; padding: 1rem; text-align: center; }
.status-bar { padding: 5px; font-size: 0.8rem; transition: 0.3s; }
.bg-green { background: #2ecc71; }
.bg-red { background: #e74c3c; }
main { flex: 1; padding: 1rem; }
footer { font-size: 0.7rem; text-align: center; padding: 1rem; color: #777; }
</style>