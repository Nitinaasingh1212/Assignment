/* =============================================
   Productivity Dashboard — script.js
   ============================================= */

// ─── Apply saved theme BEFORE render to avoid flash ───────────────────────
(function applyThemeEarly() {
  const saved = localStorage.getItem('pd-theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

/* =============================================
   1. DASHBOARD NAVIGATION
   ============================================= */
const dashboard    = document.getElementById('dashboard');
const featureView  = document.getElementById('feature-view');
const backBtn      = document.getElementById('back-btn');
const cards        = document.querySelectorAll('.card');
const allSections  = document.querySelectorAll('.feature-section');

let activeFeature = null;

/** Show a feature section, hide the dashboard */
function openFeature(featureId) {
  if (activeFeature === featureId) return; // already open — ignore double-click

  // Hide all feature sections first
  allSections.forEach(s => s.classList.add('hidden'));

  const target = document.getElementById('feature-' + featureId);
  if (!target) return;

  dashboard.classList.add('hidden');
  featureView.classList.remove('hidden');
  target.classList.remove('hidden');
  activeFeature = featureId;

  // Run any init logic needed when section opens
  if (featureId === 'planner') renderPlannerSlots();
  if (featureId === 'weather') fetchWeather();
  if (featureId === 'quote')   fetchQuote();
}

/** Return to the dashboard */
function closeFeature() {
  featureView.classList.add('hidden');
  allSections.forEach(s => s.classList.add('hidden'));
  dashboard.classList.remove('hidden');
  activeFeature = null;
}

// Attach card click listeners
cards.forEach(card => {
  card.addEventListener('click', () => openFeature(card.dataset.feature));
});

backBtn.addEventListener('click', closeFeature);


/* =============================================
   2. DATE & TIME DISPLAY
   ============================================= */
const dateEl = document.getElementById('current-date');
const timeEl = document.getElementById('current-time');

function updateDateTime() {
  const now  = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const dayName = days[now.getDay()];
  const date    = now.getDate();
  const month   = months[now.getMonth()];
  const year    = now.getFullYear();

  const hours   = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm    = hours >= 12 ? 'PM' : 'AM';
  const h12     = String(hours % 12 || 12).padStart(2, '0');

  dateEl.textContent = `${dayName}, ${date} ${month} ${year}`;
  timeEl.textContent = `${h12}:${minutes}:${seconds} ${ampm}`;
}

// Run once immediately, then every second
updateDateTime();
setInterval(updateDateTime, 1000);


/* =============================================
   3. DYNAMIC BACKGROUND
   ============================================= */
const timeOfDayGradients = {
  morning:   'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',  // 5–11
  afternoon: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',  // 12–16
  evening:   'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',  // 17–20
  night:     'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', // 21–4
};

function updateDynamicBackground() {
  const hour = new Date().getHours();
  let period;
  if (hour >= 5  && hour <= 11) period = 'morning';
  else if (hour >= 12 && hour <= 16) period = 'afternoon';
  else if (hour >= 17 && hour <= 20) period = 'evening';
  else period = 'night';

  document.documentElement.style.setProperty('--dynamic-bg', timeOfDayGradients[period]);
}

updateDynamicBackground();
// Re-check every 10 minutes in case the app stays open across a boundary
setInterval(updateDynamicBackground, 10 * 60 * 1000);


/* =============================================
   4. THEME SWITCH (Light / Dark)
   ============================================= */
const themeToggle = document.getElementById('theme-toggle');

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.textContent = '🌙';
  }
  localStorage.setItem('pd-theme', theme);
}

// Sync toggle icon with current theme on load
applyTheme(getCurrentTheme());

themeToggle.addEventListener('click', () => {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});


/* =============================================
   5. TODO LIST
   ============================================= */
const todoInput   = document.getElementById('todo-input');
const todoAddBtn  = document.getElementById('todo-add-btn');
const todoListEl  = document.getElementById('todo-list');

/** Load tasks from Local Storage */
function loadTasks() {
  return JSON.parse(localStorage.getItem('pd-tasks') || '[]');
}

/** Save tasks to Local Storage */
function saveTasks(tasks) {
  localStorage.setItem('pd-tasks', JSON.stringify(tasks));
}

/** Render the entire task list */
function renderTasks() {
  const tasks = loadTasks();
  todoListEl.innerHTML = '';

  if (tasks.length === 0) {
    todoListEl.innerHTML = '<li style="color:var(--text-secondary);font-size:0.9rem;">No tasks yet. Add one above!</li>';
    return;
  }

  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = 'todo-item' +
                   (task.completed ? ' completed' : '') +
                   (task.important ? ' important' : '');
    li.dataset.index = index;

    li.innerHTML = `
      <span class="task-text">${escapeHtml(task.text)}</span>
      <div class="todo-actions">
        <button class="btn-icon" data-action="important" title="Mark important">⭐</button>
        <button class="btn-icon" data-action="complete"  title="Toggle complete">✔️</button>
        <button class="btn-icon danger" data-action="delete" title="Delete task">🗑️</button>
      </div>
    `;
    todoListEl.appendChild(li);
  });
}

/** Add a new task */
function addTask() {
  const text = todoInput.value.trim();
  if (!text) return;

  const tasks = loadTasks();
  tasks.push({ text, completed: false, important: false });
  saveTasks(tasks);
  renderTasks();
  todoInput.value = '';
  todoInput.focus();
}

// Event delegation for task actions
todoListEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const li    = btn.closest('.todo-item');
  const index = parseInt(li.dataset.index, 10);
  const tasks = loadTasks();
  const action = btn.dataset.action;

  if (action === 'complete')  tasks[index].completed = !tasks[index].completed;
  if (action === 'important') tasks[index].important = !tasks[index].important;
  if (action === 'delete')    tasks.splice(index, 1);

  saveTasks(tasks);
  renderTasks();
});

todoAddBtn.addEventListener('click', addTask);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

// Load on startup
renderTasks();


/* =============================================
   6. DAILY PLANNER
   ============================================= */
const plannerSlotsEl = document.getElementById('planner-slots');

/** Generate hourly labels 12 AM – 11 PM */
function getHourLabel(hour) {
  if (hour === 0)  return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function loadPlanner() {
  return JSON.parse(localStorage.getItem('pd-planner') || '{}');
}

function savePlannerEntry(hour, value) {
  const data = loadPlanner();
  data[hour] = value;
  localStorage.setItem('pd-planner', JSON.stringify(data));
}

function renderPlannerSlots() {
  const currentHour = new Date().getHours();
  const data = loadPlanner();
  plannerSlotsEl.innerHTML = '';

  for (let h = 0; h < 24; h++) {
    const slot = document.createElement('div');
    slot.className = 'planner-slot' + (h === currentHour ? ' current-hour' : '');

    const timeSpan = document.createElement('span');
    timeSpan.className = 'slot-time';
    timeSpan.textContent = getHourLabel(h);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'slot-input';
    input.placeholder = 'Add plan...';
    input.value = data[h] || '';
    input.dataset.hour = h;

    // Save on blur (when user finishes typing)
    input.addEventListener('blur', () => savePlannerEntry(h, input.value.trim()));
    // Also save on Enter
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
    });

    slot.appendChild(timeSpan);
    slot.appendChild(input);
    plannerSlotsEl.appendChild(slot);
  }

  // Auto-scroll to current hour
  const currentSlot = plannerSlotsEl.querySelector('.current-hour');
  if (currentSlot) {
    setTimeout(() => currentSlot.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }
}


/* =============================================
   7. DAILY GOALS
   ============================================= */
const goalsInput    = document.getElementById('goals-input');
const goalsAddBtn   = document.getElementById('goals-add-btn');
const goalsListEl   = document.getElementById('goals-list');
const goalsProgress = document.getElementById('goals-progress');

function loadGoals() {
  return JSON.parse(localStorage.getItem('pd-goals') || '[]');
}

function saveGoals(goals) {
  localStorage.setItem('pd-goals', JSON.stringify(goals));
}

function updateGoalsProgress(goals) {
  const done  = goals.filter(g => g.completed).length;
  const total = goals.length;
  goalsProgress.textContent = `${done} of ${total} completed`;
  goalsProgress.style.color = total > 0 && done === total ? 'var(--success)' : 'var(--accent)';
}

function renderGoals() {
  const goals = loadGoals();
  goalsListEl.innerHTML = '';

  if (goals.length === 0) {
    goalsListEl.innerHTML = '<li style="color:var(--text-secondary);font-size:0.9rem;">No goals yet. Add one above!</li>';
    updateGoalsProgress(goals);
    return;
  }

  goals.forEach((goal, index) => {
    const li = document.createElement('li');
    li.className = 'goal-item' + (goal.completed ? ' completed' : '');
    li.dataset.index = index;

    li.innerHTML = `
      <span class="goal-text">${escapeHtml(goal.text)}</span>
      <div class="goal-actions">
        <button class="btn-icon" data-action="toggle" title="Toggle complete">
          ${goal.completed ? '↩️' : '✔️'}
        </button>
        <button class="btn-icon danger" data-action="delete" title="Delete goal">🗑️</button>
      </div>
    `;
    goalsListEl.appendChild(li);
  });

  updateGoalsProgress(goals);
}

function addGoal() {
  const text = goalsInput.value.trim();
  if (!text) return;

  const goals = loadGoals();
  goals.push({ text, completed: false });
  saveGoals(goals);
  renderGoals();
  goalsInput.value = '';
  goalsInput.focus();
}

goalsListEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const li     = btn.closest('.goal-item');
  const index  = parseInt(li.dataset.index, 10);
  const goals  = loadGoals();
  const action = btn.dataset.action;

  if (action === 'toggle') goals[index].completed = !goals[index].completed;
  if (action === 'delete') goals.splice(index, 1);

  saveGoals(goals);
  renderGoals();
});

goalsAddBtn.addEventListener('click', addGoal);
goalsInput.addEventListener('keydown', e => { if (e.key === 'Enter') addGoal(); });

renderGoals();


/* =============================================
   8. POMODORO TIMER
   ============================================= */
const timerDisplay  = document.getElementById('timer-display');
const sessionLabel  = document.getElementById('session-label');
const timerStartBtn = document.getElementById('timer-start');
const timerPauseBtn = document.getElementById('timer-pause');
const timerResetBtn = document.getElementById('timer-reset');

const WORK_DURATION  = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5  * 60; // 5 minutes in seconds

let timerInterval    = null;
let remainingSeconds = WORK_DURATION;
let isWorkSession    = true;
let timerRunning     = false;

/** Format seconds → MM:SS */
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = formatTime(remainingSeconds);
}

function startTimer() {
  if (timerRunning) return; // prevent multiple intervals

  timerRunning = true;
  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      handleTimerEnd();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning     = false;
  isWorkSession    = true;
  remainingSeconds = WORK_DURATION;
  sessionLabel.textContent = 'Work Session';
  updateTimerDisplay();
}

function handleTimerEnd() {
  // Switch session type
  isWorkSession = !isWorkSession;

  if (isWorkSession) {
    remainingSeconds = WORK_DURATION;
    sessionLabel.textContent = 'Work Session';
    alert('Break is over! Time to focus. 💪');
  } else {
    remainingSeconds = BREAK_DURATION;
    sessionLabel.textContent = 'Break Session';
    alert('Work session complete! Take a 5-minute break. ☕');
  }

  updateTimerDisplay();
}

timerStartBtn.addEventListener('click', startTimer);
timerPauseBtn.addEventListener('click', pauseTimer);
timerResetBtn.addEventListener('click', resetTimer);

// Init display
updateTimerDisplay();


/* =============================================
   9. MOTIVATION QUOTE
   ============================================= */
const quoteText   = document.getElementById('quote-text');
const quoteAuthor = document.getElementById('quote-author');
const newQuoteBtn = document.getElementById('new-quote-btn');

// Fallback quotes (shown if API fails)
const fallbackQuotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "You are never too old to set another goal or dream a new dream.", author: "C.S. Lewis" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
];

async function fetchQuote() {
  quoteText.textContent   = 'Loading...';
  quoteAuthor.textContent = '';
  newQuoteBtn.disabled    = true;

  try {
    // Using a free, no-auth-required quotes API
    const res  = await fetch('https://dummyjson.com/quotes/random');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();

    quoteText.textContent   = `"${data.quote}"`;
    quoteAuthor.textContent = `— ${data.author}`;
  } catch {
    // Fallback to local quotes
    const q = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    quoteText.textContent   = `"${q.text}"`;
    quoteAuthor.textContent = `— ${q.author}`;
  } finally {
    newQuoteBtn.disabled = false;
  }
}

newQuoteBtn.addEventListener('click', fetchQuote);
// Initial quote loaded when user opens the feature (called from openFeature)


/* =============================================
   10. WEATHER WIDGET
   ============================================= */
const weatherLocation  = document.getElementById('weather-location');
const weatherTemp      = document.getElementById('weather-temperature');
const weatherCond      = document.getElementById('weather-condition');
const weatherHumidity  = document.getElementById('weather-humidity');
const weatherWind      = document.getElementById('weather-wind');
const weatherRefreshBtn = document.getElementById('weather-refresh-btn');

// Mini weather in top bar
const weatherMiniTemp  = document.getElementById('weather-temp');
const weatherMiniDesc  = document.getElementById('weather-desc');

async function fetchWeather() {
  weatherLocation.textContent = 'Fetching location...';
  weatherTemp.textContent     = '--°C';
  weatherCond.textContent     = '--';
  weatherHumidity.textContent = '--%';
  weatherWind.textContent     = '-- km/h';
  weatherRefreshBtn.disabled  = true;

  try {
    // Step 1: Get user coordinates
    const coords = await getUserCoords();

    // Step 2: Fetch weather from Open-Meteo (free, no API key needed)
    const { lat, lon, city } = coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
                `&wind_speed_unit=kmh&temperature_unit=celsius`;

    const res  = await fetch(url);
    if (!res.ok) throw new Error('Weather API error');
    const data = await res.json();

    const current  = data.current;
    const temp     = Math.round(current.temperature_2m);
    const humidity = current.relative_humidity_2m;
    const wind     = Math.round(current.wind_speed_10m);
    const condText = weatherCodeToText(current.weather_code);

    weatherLocation.textContent = city;
    weatherTemp.textContent     = `${temp}°C`;
    weatherCond.textContent     = condText;
    weatherHumidity.textContent = `${humidity}%`;
    weatherWind.textContent     = `${wind} km/h`;

    // Update mini widget in top bar
    weatherMiniTemp.textContent = `${temp}°C`;
    weatherMiniDesc.textContent = condText;

  } catch (err) {
    weatherLocation.textContent = 'Unable to fetch weather';
    weatherTemp.textContent     = '--°C';
    weatherCond.textContent     = err.message.includes('denied')
      ? 'Location access denied'
      : 'Check your connection';
  } finally {
    weatherRefreshBtn.disabled = false;
  }
}

/** Wrap Geolocation API in a Promise */
function getUserCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Fallback to a default city (London)
      resolve({ lat: 51.5074, lon: -0.1278, city: 'London (default)' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // Reverse geocode using Open-Meteo's geocoding (no key needed)
        let city = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        try {
          const geoRes  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          const geoData = await geoRes.json();
          city = geoData.address?.city
              || geoData.address?.town
              || geoData.address?.village
              || geoData.address?.county
              || city;
        } catch { /* use coordinate fallback */ }

        resolve({ lat, lon, city });
      },
      err => {
        // Location denied — fall back to London
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ lat: 51.5074, lon: -0.1278, city: 'London (location denied)' });
        } else {
          reject(new Error('Location unavailable'));
        }
      },
      { timeout: 8000 }
    );
  });
}

/**
 * Convert WMO weather codes to human-readable text.
 * https://open-meteo.com/en/docs#weathervariables
 */
function weatherCodeToText(code) {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Icy fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
    80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Heavy thunderstorm',
  };
  return map[code] || 'Unknown';
}

weatherRefreshBtn.addEventListener('click', fetchWeather);


/* =============================================
   UTILITY — Escape HTML to prevent XSS
   ============================================= */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
