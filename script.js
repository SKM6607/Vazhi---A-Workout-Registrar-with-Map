'use strict';

import {Cycling, Running, TypeOfWorkout} from './Logic.js';

class Application {
    static #FORM = document.querySelector('.form');
    static #WORKOUTS_CONTAINER = document.querySelector('.workouts');
    static #TYPE = document.querySelector('.form__input--type');
    static #DISTANCE = document.querySelector('.form__input--distance');
    static #DURATION = document.querySelector('.form__input--duration');
    static #CADENCE = document.querySelector('.form__input--cadence');
    static #ELEVATION = document.querySelector('.form__input--elevation');

    static #DEFAULT_ZOOM = 17;
    static #STORAGE_KEY = 'workouts';

    map;
    markerLayer;
    markers = new Map();
    workouts = []
    selectedCoords;
    isPinning = false;

    static startApplication() {
        new Application();
    }

    constructor() {
        if(new.target===Application){
            console.error("ERROR: Unable to instantiate Application Class. Use Application.startApplication() instead.")
            throw new Error("Error: Instantiating Class Application")
        }
        this.#init();
    }

    /* ------------------ INIT ------------------ */

    #init() {
        navigator.geolocation.getCurrentPosition
        (
            pos => {
                const {latitude, longitude} = pos.coords;
                this.#initMap([latitude, longitude]);
            },
            err => alert(err.message)
        );
    }

    #initMap(coords) {
        this.map = L.map('map').setView(coords, Application.#DEFAULT_ZOOM);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

        this.markerLayer = L.layerGroup().addTo(this.map);

        this.#loadFromStorage();
        this.#renderAll();
        this.#setupListeners();
    }

    /* ------------------ STORAGE ------------------ */

    #loadFromStorage() {
        const data = JSON.parse(localStorage.getItem(Application.#STORAGE_KEY));
        if (!data) return;

        this.workouts = data.map(w =>
            w.type === TypeOfWorkout.CYCLING
                ? Object.assign(new Cycling(), w)
                : Object.assign(new Running(), w)
        );
    }

    #saveToStorage() {
        localStorage.setItem(
            Application.#STORAGE_KEY,
            JSON.stringify(this.workouts)
        );
    }

    /* ------------------ RENDERING ------------------ */

    #renderAll() {
        this.#showEmptyMessage();
        this.#renderWorkoutList();
        this.#renderMarkers();
    }

    #renderWorkoutList() {
        document.querySelectorAll('.workout').forEach(el => el.remove());
        this.workouts.forEach(w => this.#renderWorkout(w));
    }

    #renderWorkout(workout) {

        let html = `
<li class="workout workout--${workout.type}" data-id="${workout.activityId}">
            <div class="delete__workout">
                <button class="delete__workout__button" data-id="${workout.activityId}">Delete</button>
            </div>
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details"><span
                class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span> <span
                class="workout__value">${workout.distance}</span> <span class="workout__unit">km</span></div>
            <div class="workout__details"><span class="workout__icon">⏱</span> <span
                class="workout__value">${workout.duration}</span> <span class="workout__unit">min</span></div>`
        ;
        if (workout.type === 'running')
            html += ` <div class="workout__details"><span
            class="workout__icon">⚡️</span> <span class="workout__value">${workout.rate}</span> <span
            class="workout__unit">min/km</span></div>
            <div class="workout__details"><span class="workout__icon">🦶🏼</span> <span
                class="workout__value">${workout.cadence}</span> <span class="workout__unit">spm</span></div>
        </li>   `;
        if (workout.type === 'cycling') html +=
            `  <div class="workout__details"><span class="workout__icon">⚡️</span> <span
                class="workout__value">${workout.rate}</span> <span class="workout__unit">km/h</span></div>
        <div class="workout__details"><span class="workout__icon">⛰</span> <span
            class="workout__value">${workout.elevationGain}</span> <span class="workout__unit">m</span></div>
    </li>`
        ;
        Application.#FORM.insertAdjacentHTML('afterend', html);
    }

    #renderMarkers() {
        this.markerLayer.clearLayers();
        this.markers.clear();
        this.workouts.forEach(w => this.#createMarker(w));
    }

    #createMarker(workout) {
        const marker = L.marker(workout.coords).addTo(this.markerLayer);

        marker.bindPopup(
            `<strong>${workout.type}</strong> #${workout.activityId % 1000}`,
            {autoClose: false}
        );

        this.markers.set(workout.activityId, marker);
    }

    /* ------------------ EVENTS ------------------ */

    #setupListeners() {
        this.map.on('click', e => this.#onMapClick(e));

        Application.#FORM.addEventListener('keydown', e => {
            if (e.target.classList.contains('form__input')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if(!this.#inputValidation())  {
                        alert("Error: Invalid Values")
                        this.#resetInputTags()
                        return
                    }
                    this.#addWorkout();
                    this.#formAction();
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.#formAction()
                }
            }

        });

        Application.#WORKOUTS_CONTAINER.addEventListener('click', e => {
            const el = e.target.closest('.workout');
            if (!el) return;

            const id = Number(el.dataset.id);

            if (e.target.classList.contains('delete__workout__button')) {
                this.#deleteWorkout(id);
            } else {
                const w = this.workouts.find(w => w.activityId === id);
                this.map.panTo(w.coords);
            }
        });

        Application.#TYPE.addEventListener(
            'change',
            this.#toggleElevationField
        );
        document.querySelector('.clear__all').addEventListener('click', () => this.#clearAll());
    }

    #onMapClick(e) {
        this.selectedCoords = [e.latlng.lat, e.latlng.lng];
        this.isPinning = true;
        this.#showEmptyMessage()
        this.#resetInputTags();
    }

    /* ------------------ LOGIC ------------------ */

    #addWorkout() {
        const dist = Number.parseInt(Application.#DISTANCE.value);
        const dur = Number.parseInt(Application.#DURATION.value);
        const cad = Number.parseInt(Application.#CADENCE.value);
        const elev = Number(Application.#ELEVATION.value);
        const type = Application.#TYPE.value;
        const workout =
            type.toLowerCase() === TypeOfWorkout.CYCLING
                ? new Cycling(dist, dur, this.selectedCoords, elev)
                : new Running(dist, dur, this.selectedCoords, cad);
        this.workouts.push(workout);
        this.#saveToStorage();
        this.#renderAll();
        this.#formAction()
    }

    #formAction() {
        Application.#FORM.classList.toggle('hidden');
        this.isPinning = !this.isPinning;
    }

    #deleteWorkout(id) {
        this.workouts = this.workouts.filter(w => w.activityId !== id);
        this.#saveToStorage();
        this.#renderAll();
    }


    #resetInputTags() {
        Application.#DISTANCE.value = Application.#DURATION.value = Application.#CADENCE.value = Application.#ELEVATION.value = '';
        Application.#DISTANCE.focus()
    }

    #inputValidation() {
        const dist = Number.parseInt(Application.#DISTANCE.value)
        const cad = Number.parseInt(Application.#CADENCE.value)
        const elevation = Number.parseInt(Application.#ELEVATION.value)
        const dur = Number.parseInt(Application.#DURATION.value)
        const type=Application.#TYPE.value.toLowerCase()
        return !(dist <= 0 || dur <= 0 ||
            Number.isNaN(dist) || Number.isNaN(dur) ||
            (type === TypeOfWorkout.RUNNING && (Number.isNaN(cad) || cad <= 0)) ||
            (type === TypeOfWorkout.CYCLING && Number.isNaN(elevation)));

    }

    #showEmptyMessage() {
        const h1 = document.querySelector('.workouts h1');
        const clearButton = document.querySelector('.clear__all')
        const HIDDEN = 'hidden'
        const l = this.workouts.length
        if (!l && !this.isPinning) {
            h1.classList.remove(HIDDEN)
            clearButton.classList.add(HIDDEN)
            Application.#FORM.classList.add(HIDDEN)
        }else{
            h1.classList.add(HIDDEN)
            clearButton.classList.remove(HIDDEN)
            Application.#FORM.classList.remove(HIDDEN)
        }
    }

    #clearAll() {
        this.workouts = []
        this.markers = new Map();
        localStorage.clear()
        this.#renderAll()
    }

    #toggleElevationField() {
        Application.#ELEVATION.closest('.form__row').classList.toggle('form__row--hidden');
        Application.#CADENCE.closest('.form__row').classList.toggle('form__row--hidden');
    }
}

Application.startApplication();
