// Ambil elemen DOM
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const weatherContent = document.getElementById('weatherContent');

// Elemen current weather
const cityName = document.getElementById('cityName');
const countryName = document.getElementById('countryName');
const dateTime = document.getElementById('dateTime');
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const description = document.getElementById('description');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');

// Search history
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];

// Event listeners
searchBtn.addEventListener('click', searchWeather);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWeather();
});

// Default load
window.addEventListener('load', () => {
    if (searchHistory.length > 0) {
        cityInput.value = searchHistory[0];
        searchWeather();
    } else {
        cityInput.value = 'Jakarta';
        searchWeather();
    }
    renderHistory();
});

// ============================================
// FUNGSI UTAMA
// ============================================
async function searchWeather() {
    const city = cityInput.value.trim();
    
    if (!city) {
        alert('Masukkan nama kota');
        return;
    }
    
    showLoading();
    
    try {
        // Dapatkan koordinat
        const coords = await getCoordinates(city);
        
        // Dapatkan cuaca & forecast
        const [weatherData, forecastData] = await Promise.all([
            getWeather(coords.lat, coords.lon),
            getForecast(coords.lat, coords.lon)
        ]);
        
        // Tampilkan data
        displayWeather({
            city: coords.name,
            country: coords.country,
            ...weatherData
        });
        
        displayForecast(forecastData);
        
        // Simpan ke history
        addToHistory(coords.name);
        
    } catch (err) {
        console.error(err);
        showError();
    }
}

// ============================================
// API GEOCODING
// ============================================
async function getCoordinates(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id&format=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
        throw new Error('Kota tidak ditemukan');
    }
    
    const result = data.results[0];
    return {
        lat: result.latitude,
        lon: result.longitude,
        name: result.name,
        country: result.country
    };
}

// ============================================
// API CUACA (CURRENT)
// ============================================
async function getWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,apparent_temperature&timezone=auto`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    const current = data.current_weather;
    const hourly = data.hourly;
    
    // Cari data per jam yang sesuai
    const timeIndex = hourly.time.findIndex(t => t === current.time);
    
    return {
        temp: current.temperature,
        wind: current.windspeed,
        weatherCode: current.weathercode,
        humidity: timeIndex !== -1 ? hourly.relativehumidity_2m[timeIndex] : 0,
        feelsLike: timeIndex !== -1 ? hourly.apparent_temperature[timeIndex] : current.temperature,
        description: getWeatherDescription(current.weathercode)
    };
}

// ============================================
// API FORECAST 5 HARI
// ============================================
async function getForecast(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.daily;
}

// ============================================
// TAMPILKAN CURRENT WEATHER
// ============================================
function displayWeather(data) {
    loading.classList.add('hidden');
    weatherContent.classList.remove('hidden');
    error.classList.add('hidden');
    
    // Format tanggal
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    cityName.textContent = data.city;
    countryName.textContent = data.country;
    dateTime.textContent = now.toLocaleDateString('id-ID', options);
    weatherIcon.textContent = getWeatherIcon(data.weatherCode);
    temperature.textContent = `${Math.round(data.temp)}°C`;
    description.textContent = data.description;
    feelsLike.textContent = `${Math.round(data.feelsLike)}°C`;
    humidity.textContent = `${data.humidity}%`;
    windSpeed.textContent = `${data.wind} km/h`;
    pressure.textContent = '1013 hPa'; // Default karena Open-Meteo ga kasih pressure
}

// ============================================
// TAMPILKAN FORECAST
// ============================================
function displayForecast(data) {
    const forecastContainer = document.querySelector('.grid.grid-cols-2.md\\:grid-cols-5');
    forecastContainer.innerHTML = '';
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    
    for (let i = 0; i < 5; i++) {
        const date = new Date(data.time[i]);
        const dayName = days[date.getDay()];
        const maxTemp = Math.round(data.temperature_2m_max[i]);
        const minTemp = Math.round(data.temperature_2m_min[i]);
        const weatherCode = data.weathercode[i];
        
        const card = document.createElement('div');
        card.className = 'backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:border-purple-500/30 transition';
        card.innerHTML = `
            <div class="text-gray-400 text-sm mb-1">${dayName}</div>
            <div class="text-3xl my-2">${getWeatherIcon(weatherCode)}</div>
            <div class="text-lg font-light">${maxTemp}°</div>
            <div class="text-xs text-gray-500">${minTemp}°</div>
        `;
        
        forecastContainer.appendChild(card);
    }
}

// ============================================
// SEARCH HISTORY
// ============================================
function addToHistory(city) {
    // Hapus duplikat
    searchHistory = searchHistory.filter(c => c.toLowerCase() !== city.toLowerCase());
    // Tambah di depan
    searchHistory.unshift(city);
    // Batasi 5 history
    if (searchHistory.length > 5) searchHistory.pop();
    
    localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    searchHistory.forEach(city => {
        const chip = document.createElement('button');
        chip.className = 'px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white hover:border-purple-500/30 transition';
        chip.textContent = city;
        chip.onclick = () => {
            cityInput.value = city;
            searchWeather();
        };
        historyList.appendChild(chip);
    });
}

// Hapus history
document.getElementById('clearHistory').addEventListener('click', () => {
    searchHistory = [];
    localStorage.removeItem('weatherHistory');
    renderHistory();
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function getWeatherDescription(code) {
    const desc = {
        0: 'Cerah', 1: 'Cerah Berawan', 2: 'Berawan', 3: 'Mendung',
        45: 'Kabut', 48: 'Kabut',
        51: 'Gerimis', 53: 'Gerimis', 55: 'Gerimis Deras',
        61: 'Hujan Ringan', 63: 'Hujan', 65: 'Hujan Deras',
        71: 'Salju Ringan', 73: 'Salju', 75: 'Salju Deras',
        80: 'Hujan Lokal', 81: 'Hujan', 82: 'Hujan Deras',
        95: 'Badai Petir', 96: 'Badai Petir', 99: 'Badai Petir'
    };
    return desc[code] || 'Cerah';
}

function getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌧️';
    if (code >= 95) return '⛈️';
    return '☀️';
}

function showLoading() {
    loading.classList.remove('hidden');
    weatherContent.classList.add('hidden');
    error.classList.add('hidden');
}

function showError() {
    loading.classList.add('hidden');
    weatherContent.classList.add('hidden');
    error.classList.remove('hidden');
}