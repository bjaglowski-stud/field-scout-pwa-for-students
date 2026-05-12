import { createApp } from 'vue'
import App from './App.vue'

// Importuj initDB aby wyzwolić inicjalizację
import { initDB } from './utils/db.js'

// Inicjalizuj aplikację
const app = createApp(App)
app.mount('#app')

// Inicjalizuj IndexedDB
initDB().then(() => {
    console.log('✅ IndexedDB zainitialisowany pomyślnie')
}).catch((error) => {
    console.error('❌ Błąd inicjalizacji IndexedDB:', error)
})

// Rejestruj Service Worker dla PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then((registration) => {
                console.log('✅ Service Worker zarejestrowany:', registration)

                // Nasłuchuj na aktualizacje Service Workera
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing
                    console.log('🔄 Nowa wersja Service Workera znaleziona')

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            console.log('✅ Service Worker zaktualizowany!')
                            // Opcjonalnie: wyświetl powiadomienie użytkownikowi
                            if (confirm('🔄 Dostępna jest nowa wersja aplikacji. Czy przeładować?')) {
                                window.location.reload()
                            }
                        }
                    })
                })
            })
            .catch((error) => {
                console.error('❌ Błąd rejestracji Service Workera:', error)
            })
    })
}

// Obsłuż instalację aplikacji (install prompt)
let deferredPrompt

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    console.log('📱 Event A2HS (Add to Home Screen) dostępny')

    // Możesz wyświetlić przycisk "Zainstaluj aplikację"
    // i zapamiętać deferredPrompt do później
})

window.addEventListener('appinstalled', () => {
    console.log('✅ Aplikacja zainstalowana na urządzeniu!')
    deferredPrompt = null
})

// Obsłuż tryb online/offline
window.addEventListener('online', () => {
    console.log('🌐 Aplikacja wróciła do trybu online')
    // Możesz tutaj wysłać dane oczekujące na synchronizację
})

window.addEventListener('offline', () => {
    console.log('📴 Aplikacja przeszła w tryb offline')
})

console.log('🚀 Field Scout PWA załadowana!')

