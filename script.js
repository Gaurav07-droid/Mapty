'use strict';

// console.log(`https://www.google.com/maps/@${28.1908179},${78.3888672}}`);

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //more modern js
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date....                   javascrip0t current
    // this.id.slice.bind..
    this.coords = coords; //[LAT,LONG  ]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  _setDescription() {
    // prettier-ignore
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / this.duration;
    return this.speed;
  }
}

// const run = new Running([39, -12], 5.2, 6, 99);
// const cycle = new Cycling([39, -12], 5, 4, 32);
// console.log(run, cycle);

////////////////////////////////////////////////////           /////////////////////////////////////////////////////////
//APPLICATION ARCHITECTURE /////////////////////////////////////////////////////////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const message = document.querySelector('.message');
const btnReset = document.querySelector('.btn-reset');
const closeBtn = document.querySelector('.close-btn');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //get users position
    this._getPosition();

    //getting data from local storage
    this._getStorage();

    //Add eventhandlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField); //fro toggling btween cycle adn running
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          message.style.opacity = 100;
          message.textContent = ' ⚠ Sorry! location not found';
        }
      );
  }

  _loadMap(position) {
    //from leaflet
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}}`);

    const coords = [latitude, longitude];

    // From the Leaflet library

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //13 is the zoom level

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Hnalding clicks on map and showing form/////////////////////////////////////////////
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden'); //removing form hidden class
    inputDistance.focus(); //focusing on the ditsance field
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.vlaue =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault(); //STOPPING PAGE FOR RELOAD

    // check for valid inputs///////////////////////////////
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    //Check for all positive///////////////////
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //Get data from the form//////////////////////////////////////////////////////
    const type = inputType.value;
    const distance = +inputDistance.value; // + here is converting to number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If workout running,create running object/////////////////////////////////////
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(duration, distance, cadence) ||
        !allPositive(duration, distance, cadence)
      ) {
        return alert('Inputs have to be Positive number');
      }
      workout = new Running([lat, lng], duration, distance, cadence);
      // console.log(workout);
    }

    //If workout cycling,create cycling object///////////////////////////////
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      //Check if data is valid
      if (
        //   !Number.isFinite(elevation) ||
        //   !Number.isFinite(duration) ||
        //   !Number.isFinite(elevation)
        !validInputs(duration, distance, elevation) ||
        !allPositive(duration, distance, elevation)
      )
        return alert('Inputs have to be Positive number');

      workout = new Cycling([lat, lng], duration, distance, elevation);
      // console.log(workout);
    }
    //Add new object to workput array

    this.#workouts.push(workout);

    //Render workout on map as marker//////////////////////////////

    this._renderWorkoutMarker(workout);

    //Render workout on list/////////////////////////////////////////////////////////

    this._renderWorkout(workout);

    //Hide form and Clearing input fileds
    this._hideForm();

    //Set local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // console.log(workout);
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚲'}${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
   <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚲'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.pace.toFixed(1)}</span>
    <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
    <span class="workout__icon">🦶🏼</span>
    <span class="workout__value">${workout.cadence}</span>
    <span class="workout__unit">spm</span>
    </div>  </li>

  `;
      form.insertAdjacentHTML('afterend', html);
    }

    if (workout.type === 'cycling') {
      html += `
     <div class="workout__details">

     <span class="workout__icon">⚡️</span>
     <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
      </div>
      
    <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevGain}</span>
    <span class="workout__unit">m</span>
    </div></li>`;

      form.insertAdjacentHTML('afterend', html);
    }
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    // console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    //public interface

    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); //convert data from objects to string in local storage
  }

  _getStorage() {
    const data = JSON.parse(localStorage.getItem('workouts')); //convert data to objects from string
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  //Deleting itesm from local storage
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
// btnReset.addEventListener('click', reset);

const app = new App();

//reset local storage
btnReset.addEventListener('click', app.reset);

//styling Reset btn
btnReset.addEventListener('mouseover', function (e) {
  e.target.style.color = 'white';
  e.target.style.cursor = 'pointer';
  setTimeout(function () {
    e.target.style.color = '';
  }, 500);
});

// //styling messg
message.addEventListener('mouseover', function (e) {
  e.target.style.color = 'skyblue';

  setTimeout(function () {
    e.target.style.color = '';
  }, 400);
});
