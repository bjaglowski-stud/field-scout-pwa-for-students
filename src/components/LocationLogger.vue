<template>
  <div class="logger">
    <section class="controls">
      <button @click="getLocation" :disabled="loading">
        {{ loading ? 'Pobieranie GPS...' : 'Pobierz Lokalizację' }}
      </button>
      
      <div v-if="coords" class="coords-box">
        <p>Szerokość: {{ coords.latitude.toFixed(4) }}</p>
        <p>Długość: {{ coords.longitude.toFixed(4) }}</p>
      </div>

      <textarea 
        v-model="note" 
        placeholder="Opisz co widzisz w terenie..."
        rows="4"
      ></textarea>
      
      <button @click="saveNote" class="btn-save" :disabled="!note || !coords">
        Zapisz obserwację
      </button>

      <div v-if="migrationMessage" class="migration-info">
        {{ migrationMessage }}
      </div>
    </section>

    <section class="history">
      <h3>Twoje obserwacje (IndexedDB - Offline-First):</h3>
      <div v-if="logs.length === 0" class="empty-state">
        <p>Brak obserwacji. Zacznij zbierać dane!</p>
      </div>
      <ul v-else>
        <li v-for="(item, index) in logs" :key="item.id || index">
          <div class="obs-header">
            <strong>{{ item.time }}</strong>
            <button @click="deleteLog(item.id)" class="btn-delete" title="Usuń">🗑️</button>
          </div>
          <small>📍 {{ item.lat?.toFixed(4) }}, {{ item.lng?.toFixed(4) }}</small>
          <p>{{ item.content }}</p>
        </li>
      </ul>
    </section>

    <section class="tools">
      <h3>Narzędzia</h3>
      <button @click="exportData" class="btn-tool">📥 Eksportuj JSON</button>
      <button @click="clearAllData" class="btn-tool btn-danger">🗑️ Wyczyść wszystkie</button>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  getAllObservations,
  addObservation,
  deleteObservation,
  clearAllObservations,
  exportObservationsAsJSON,
  migrateFromLocalStorage
} from '../utils/db.js';

const coords = ref(null);
const loading = ref(false);
const note = ref("");
const logs = ref([]);
const migrationMessage = ref("");

// Inicjalizacja komponentu
onMounted(async () => {
  // Migruj dane z localStorage jeśli istnieją
  const migratedCount = await migrateFromLocalStorage();
  if (migratedCount > 0) {
    migrationMessage.value = `✅ Przemigrowano ${migratedCount} obserwacji z localStorage do IndexedDB!`;
    setTimeout(() => {
      migrationMessage.value = "";
    }, 5000);
  }

  // Załaduj obserwacje z IndexedDB
  await loadLogs();
});

const getLocation = () => {
  loading.value = true;
  if (!navigator.geolocation) {
    alert("Geolokalizacja nie jest wspierana!");
    loading.value = false;
    return;
  }

  navigator.geolocation.getCurrentPosition((position) => {
    coords.value = position.coords;
    loading.value = false;
  }, (err) => {
    alert("Błąd GPS: " + err.message);
    loading.value = false;
  });
};

const saveNote = async () => {
  if (!note.value || !coords.value) return;

  const newLog = {
    time: new Date().toLocaleTimeString(),
    lat: coords.value.latitude,
    lng: coords.value.longitude,
    content: note.value
  };

  // Zapisz do IndexedDB (Offline-First)
  try {
    const id = await addObservation(newLog);
    console.log('✅ Obserwacja zapisana w IndexedDB z ID:', id);
    
    // Załaduj ponownie listę
    await loadLogs();
    
    // Reset formularza
    note.value = "";
    coords.value = null;
  } catch (error) {
    console.error('❌ Błąd zapisu obserwacji:', error);
    alert("Błąd zapisu obserwacji!");
  }
};

const loadLogs = async () => {
  try {
    logs.value = await getAllObservations();
  } catch (error) {
    console.error('❌ Błąd ładowania obserwacji:', error);
    logs.value = [];
  }
};

const deleteLog = async (id) => {
  if (!confirm("Czy na pewno usunąć tę obserwację?")) return;

  try {
    await deleteObservation(id);
    await loadLogs();
  } catch (error) {
    console.error('❌ Błąd usunięcia obserwacji:', error);
    alert("Błąd usunięcia obserwacji!");
  }
};

const clearAllData = async () => {
  if (!confirm("⚠️ Czy na pewno usunąć WSZYSTKIE obserwacje? Operacja jest nieodwracalna!")) {
    return;
  }

  try {
    await clearAllObservations();
    await loadLogs();
    alert("✅ Wszystkie obserwacje zostały usunięte");
  } catch (error) {
    console.error('❌ Błąd czyszczenia bazy danych:', error);
    alert("Błąd czyszczenia bazy danych!");
  }
};

const exportData = async () => {
  try {
    const jsonData = await exportObservationsAsJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `field-scout-observations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("✅ Dane zostały wyeksportowane!");
  } catch (error) {
    console.error('❌ Błąd eksportu danych:', error);
    alert("Błąd eksportu danych!");
  }
};
</script>

<style scoped>
.logger { 
  display: flex; 
  flex-direction: column; 
  gap: 1rem; 
}

.controls { 
  display: flex; 
  flex-direction: column; 
  gap: 0.5rem; 
  background: white; 
  padding: 1rem; 
  border-radius: 8px; 
  box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
}

button { 
  padding: 12px; 
  background: var(--p-color, #42b883); 
  border: none; 
  color: white; 
  border-radius: 4px; 
  font-weight: bold; 
  cursor: pointer;
  transition: background 0.3s ease;
}

button:hover:not(:disabled) {
  background: #38a372;
}

button:disabled { 
  background: #ccc; 
  cursor: not-allowed;
}

button.btn-delete {
  padding: 6px 10px;
  font-size: 0.9rem;
  background: #ff6b6b;
  width: auto;
}

button.btn-delete:hover {
  background: #ee5a52;
}

button.btn-danger {
  background: #ff6b6b;
}

button.btn-danger:hover {
  background: #ee5a52;
}

button.btn-tool {
  background: #0066cc;
}

button.btn-tool:hover {
  background: #0052a3;
}

textarea { 
  width: 100%; 
  box-sizing: border-box; 
  padding: 10px; 
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
}

.coords-box { 
  font-family: monospace; 
  font-size: 0.9rem; 
  background: #eee; 
  padding: 5px; 
  text-align: center;
  border-radius: 4px;
  border-left: 4px solid var(--p-color, #42b883);
}

.migration-info {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
}

.history { 
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.history h3 {
  margin-top: 0;
  color: #333;
}

.history ul { 
  list-style: none; 
  padding: 0; 
  margin: 0;
}

.history li { 
  background: white; 
  margin-bottom: 0.5rem; 
  padding: 10px; 
  border-left: 4px solid var(--p-color, #42b883);
  border-radius: 4px;
  font-size: 0.9rem;
}

.obs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.obs-header strong {
  font-weight: bold;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 2rem 1rem;
  font-style: italic;
}

.tools {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tools h3 {
  margin-top: 0;
  color: #333;
}
</style>