import { openDB } from 'idb';

const DB_NAME = 'fieldScoutDB';
const DB_VERSION = 1;
const STORE_NAME = 'observations';

/**
 * Inicjalizuje bazę danych IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Utwórz object store jeśli nie istnieje
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                // Utwórz indeksy dla lepszych zapytań
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('latitude', 'latitude', { unique: false });
            }
        },
    });
}

/**
 * Dodaje nową obserwację do bazy danych
 * @param {Object} observation - Obserwacja do zapisania
 * @returns {Promise<number>} ID dodanej obserwacji
 */
export async function addObservation(observation) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const newObservation = {
        ...observation,
        timestamp: new Date().getTime(),
        synced: false, // Flaga do Background Sync
    };

    const id = await store.add(newObservation);
    await tx.done;
    return id;
}

/**
 * Pobiera wszystkie obserwacje z bazy danych
 * @returns {Promise<Array>} Tablica wszystkich obserwacji
 */
export async function getAllObservations() {
    const db = await initDB();
    const allObservations = await db.getAll(STORE_NAME);
    // Zwróć w odwrotnym porządku (najnowsze pierwsze)
    return allObservations.reverse();
}

/**
 * Pobiera obserwacje z ostatnich N dni
 * @param {number} days - Liczba dni
 * @returns {Promise<Array>} Tablica obserwacji
 */
export async function getObservationsFromLastDays(days = 7) {
    const db = await initDB();
    const allObservations = await db.getAll(STORE_NAME);
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    return allObservations
        .filter(obs => obs.timestamp >= cutoffTime)
        .reverse();
}

/**
 * Usuwa obserwację z bazy danych
 * @param {number} id - ID obserwacji do usunięcia
 * @returns {Promise<void>}
 */
export async function deleteObservation(id) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await store.delete(id);
    await tx.done;
}

/**
 * Aktualizuje obserwację
 * @param {number} id - ID obserwacji
 * @param {Object} updates - Pola do aktualizacji
 * @returns {Promise<void>}
 */
export async function updateObservation(id, updates) {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const observation = await store.get(id);
    if (observation) {
        const updated = { ...observation, ...updates };
        await store.put(updated);
    }
    await tx.done;
}

/**
 * Czyści całą bazę danych
 * @returns {Promise<void>}
 */
export async function clearAllObservations() {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await store.clear();
    await tx.done;
}

/**
 * Pobiera obserwacje oczekujące na synchronizację
 * (dla Background Sync API)
 * @returns {Promise<Array>}
 */
export async function getUnsynccedObservations() {
    const db = await initDB();
    const allObservations = await db.getAll(STORE_NAME);
    return allObservations.filter(obs => !obs.synced);
}

/**
 * Oznacza obserwację jako zsynchronizowaną
 * @param {number} id - ID obserwacji
 * @returns {Promise<void>}
 */
export async function markObservationAsSynced(id) {
    await updateObservation(id, { synced: true });
}

/**
 * Eksportuje dane z IndexedDB do JSON (dla backup'u)
 * @returns {Promise<string>} JSON string wszystkich obserwacji
 */
export async function exportObservationsAsJSON() {
    const observations = await getAllObservations();
    return JSON.stringify(observations, null, 2);
}

/**
 * Importuje dane z JSON (dla restore)
 * @param {string} jsonData - JSON string do importu
 * @returns {Promise<number>} Liczba zaimportowanych obserwacji
 */
export async function importObservationsFromJSON(jsonData) {
    try {
        const observations = JSON.parse(jsonData);
        let count = 0;

        for (const obs of observations) {
            await addObservation({
                lat: obs.lat,
                lng: obs.lng,
                content: obs.content,
                time: obs.time || new Date().toLocaleTimeString(),
            });
            count++;
        }

        return count;
    } catch (error) {
        console.error('Błąd importu danych:', error);
        throw error;
    }
}

/**
 * Migruje dane z localStorage do IndexedDB (dla uaktualnień)
 * @returns {Promise<number>} Liczba zmigrowanych obserwacji
 */
export async function migrateFromLocalStorage() {
    const localStorageData = localStorage.getItem('field_logs');
    if (!localStorageData) {
        return 0;
    }

    try {
        const logs = JSON.parse(localStorageData);
        let count = 0;

        for (const log of logs) {
            await addObservation({
                lat: log.lat,
                lng: log.lng,
                content: log.content,
                time: log.time,
            });
            count++;
        }

        // Po udanej migracji usuń ze localStorage
        localStorage.removeItem('field_logs');
        return count;
    } catch (error) {
        console.error('Błąd migracji z localStorage:', error);
        return 0;
    }
}
