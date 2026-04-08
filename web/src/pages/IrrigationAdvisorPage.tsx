import React, { useState, useEffect } from 'react';

// ── Indian farming locations with coordinates ────────────────────────────────
const LOCATIONS = [
  { name: 'Belagavi, Karnataka', lat: 15.8497, lng: 74.4977 },
  { name: 'Bangalore Rural, Karnataka', lat: 13.1986, lng: 77.7066 },
  { name: 'Dharwad, Karnataka', lat: 15.4589, lng: 75.0078 },
  { name: 'Hubli, Karnataka', lat: 15.3647, lng: 75.1240 },
  { name: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Nashik, Maharashtra', lat: 19.9975, lng: 73.7898 },
  { name: 'Aurangabad, Maharashtra', lat: 19.8762, lng: 75.3433 },
  { name: 'Nagpur, Maharashtra', lat: 21.1458, lng: 79.0882 },
  { name: 'Hyderabad, Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Warangal, Telangana', lat: 17.9784, lng: 79.5941 },
  { name: 'Coimbatore, Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { name: 'Madurai, Tamil Nadu', lat: 9.9252, lng: 78.1198 },
  { name: 'Ludhiana, Punjab', lat: 30.9010, lng: 75.8573 },
  { name: 'Amritsar, Punjab', lat: 31.6340, lng: 74.8723 },
  { name: 'Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Jodhpur, Rajasthan', lat: 26.2389, lng: 73.0243 },
  { name: 'Bhopal, Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Indore, Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Patna, Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Varanasi, Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  { name: 'Lucknow, Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Ahmedabad, Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Surat, Gujarat', lat: 21.1702, lng: 72.8311 },
  { name: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Bhubaneswar, Odisha', lat: 20.2961, lng: 85.8245 },
];

// ── Crop Coefficient (Kc) Database ───────────────────────────────────────────
const KC_TABLE: Record<string, Record<string, number>> = {
  Wheat:    { Seedling: 0.30, Vegetative: 0.70, Flowering: 1.15, Maturity: 0.40 },
  Rice:     { Seedling: 1.05, Vegetative: 1.20, Flowering: 1.20, Maturity: 0.90 },
  Tomato:   { Seedling: 0.40, Vegetative: 0.80, Flowering: 1.15, Maturity: 0.80 },
  Cotton:   { Seedling: 0.35, Vegetative: 0.70, Flowering: 1.20, Maturity: 0.50 },
  Maize:    { Seedling: 0.30, Vegetative: 0.70, Flowering: 1.20, Maturity: 0.60 },
  Potato:   { Seedling: 0.45, Vegetative: 0.75, Flowering: 1.15, Maturity: 0.75 },
  Onion:    { Seedling: 0.50, Vegetative: 0.70, Flowering: 1.05, Maturity: 0.75 },
  Sugarcane:{ Seedling: 0.40, Vegetative: 1.00, Flowering: 1.25, Maturity: 0.75 },
  Soybean:  { Seedling: 0.40, Vegetative: 0.80, Flowering: 1.15, Maturity: 0.50 },
  Groundnut:{ Seedling: 0.45, Vegetative: 0.75, Flowering: 1.15, Maturity: 0.60 },
};

const SOIL_WHC: Record<string, { fc: number; pwp: number; label: string }> = {
  Sandy:    { fc: 0.12, pwp: 0.04, label: 'Sandy — drains fast, irrigate frequently' },
  Loamy:    { fc: 0.28, pwp: 0.12, label: 'Loamy — ideal, moderate irrigation' },
  Clay:     { fc: 0.38, pwp: 0.20, label: 'Clay — holds water, irrigate less often' },
  Silty:    { fc: 0.32, pwp: 0.14, label: 'Silty — good water retention' },
  Black:    { fc: 0.35, pwp: 0.18, label: 'Black (Regur) — excellent for cotton' },
};

interface WeatherData {
  tempMax: number; tempMin: number; humidity: number;
  rainfall: number; windSpeed: number; description: string; icon: string;
}

// ── Fetch real weather from Open-Meteo (free, no API key) ────────────────────
async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&hourly=relativehumidity_2m&current_weather=true&timezone=Asia%2FKolkata&forecast_days=1`;
  const res = await fetch(url);
  const data = await res.json();

  const tempMax = data.daily.temperature_2m_max[0] ?? 32;
  const tempMin = data.daily.temperature_2m_min[0] ?? 20;
  const rainfall = data.daily.precipitation_sum[0] ?? 0;
  const windSpeed = data.daily.windspeed_10m_max[0] ?? 10;
  const humidity = data.hourly.relativehumidity_2m[12] ?? 65; // noon humidity
  const currentTemp = data.current_weather?.temperature ?? tempMax;

  let description = 'Clear sky';
  let icon = '☀️';
  if (rainfall > 10) { description = 'Heavy rain'; icon = '⛈️'; }
  else if (rainfall > 2) { description = 'Light rain'; icon = '🌧️'; }
  else if (humidity > 80) { description = 'Cloudy / Overcast'; icon = '☁️'; }
  else if (humidity > 60) { description = 'Partly cloudy'; icon = '⛅'; }
  else if (currentTemp > 38) { description = 'Hot & sunny'; icon = '🌡️'; }

  return { tempMax, tempMin, humidity, rainfall, windSpeed, description, icon };
}

function estimateET0(tempMax: number, tempMin: number, humidity: number): number {
  const tmean = (tempMax + tempMin) / 2;
  const tdiff = Math.max(1, tempMax - tempMin);
  const et0 = 0.0023 * (tmean + 17.8) * Math.sqrt(tdiff) * 0.408 * (1 - humidity / 200);
  return Math.max(1, Math.min(12, et0));
}

function calculateIrrigation(params: {
  crop: string; stage: string; soilType: string;
  tempMax: number; tempMin: number; humidity: number;
  rainfall24h: number; soilMoisturePct: number; areaHectares: number;
}) {
  const { crop, stage, soilType, tempMax, tempMin, humidity, rainfall24h, soilMoisturePct, areaHectares } = params;
  const kc = KC_TABLE[crop]?.[stage] ?? 0.8;
  const et0 = estimateET0(tempMax, tempMin, humidity);
  const etc = et0 * kc;
  const soil = SOIL_WHC[soilType];
  const currentMoisture = soilMoisturePct / 100;
  const moistureDeficit = Math.max(0, (soil.fc - currentMoisture) * 1000 * 0.3);
  const effectiveRain = rainfall24h * 0.8;
  const irrigationNeeded = Math.max(0, etc - effectiveRain - (moistureDeficit > 0 ? 0 : 2));
  const volumeM3 = irrigationNeeded * areaHectares * 10;
  const floodVolume = volumeM3 * 3.5;
  const dripVolume = volumeM3 * 0.6;
  const sprinklerVolume = volumeM3 * 0.8;
  let timing = 'Early morning (5–7 AM)';
  if (humidity > 80) timing = 'Afternoon (2–4 PM) — high humidity, avoid morning';
  if (rainfall24h > 10) timing = 'Skip today — sufficient rainfall';
  const urgency = irrigationNeeded > etc * 0.8 ? 'high' : irrigationNeeded > etc * 0.4 ? 'medium' : 'low';
  return { etc, et0, kc, irrigationNeeded, volumeM3, floodVolume, dripVolume, sprinklerVolume, timing, urgency, effectiveRain };
}

export default function IrrigationAdvisorPage() {
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [crop, setCrop] = useState('Wheat');
  const [stage, setStage] = useState('Vegetative');
  const [soilType, setSoilType] = useState('Loamy');
  const [soilMoisture, setSoilMoisture] = useState(45);
  const [area, setArea] = useState(1);
  const [result, setResult] = useState<ReturnType<typeof calculateIrrigation> | null>(null);

  async function loadWeather(loc: typeof LOCATIONS[0]) {
    setWeatherLoading(true);
    setWeatherError('');
    setWeather(null);
    try {
      const w = await fetchWeather(loc.lat, loc.lng);
      setWeather(w);
    } catch {
      setWeatherError('Could not fetch weather. Check your internet connection.');
    } finally {
      setWeatherLoading(false);
    }
  }

  useEffect(() => { loadWeather(selectedLocation); }, []);

  useEffect(() => {
    if (!weather) return;
    const r = calculateIrrigation({
      crop, stage, soilType,
      tempMax: weather.tempMax, tempMin: weather.tempMin,
      humidity: weather.humidity, rainfall24h: weather.rainfall,
      soilMoisturePct: soilMoisture, areaHectares: area,
    });
    setResult(r);
  }, [weather, crop, stage, soilType, soilMoisture, area]);

  const urgencyColor: Record<string, string> = { high: '#e63946', medium: '#f4a261', low: '#52b788' };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#2d6a4f', margin: '0 0 4px' }}>💧 Smart Irrigation Advisor</h2>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 16px' }}>
        Select your location to get real weather data, then get precise irrigation advice.
      </p>

      {/* Step 1: Location Selection */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>📍 Step 1 — Select Your Location</h3>
        <select style={s.input} value={selectedLocation.name}
          onChange={e => {
            const loc = LOCATIONS.find(l => l.name === e.target.value)!;
            setSelectedLocation(loc);
            loadWeather(loc);
          }}>
          {LOCATIONS.map(l => <option key={l.name}>{l.name}</option>)}
        </select>
        <button style={s.btn} onClick={() => loadWeather(selectedLocation)} disabled={weatherLoading}>
          {weatherLoading ? '⏳ Fetching weather...' : '🔄 Refresh Weather'}
        </button>
        {weatherError && <p style={{ color: '#e63946', fontSize: 13, marginTop: 8 }}>{weatherError}</p>}
      </div>

      {/* Step 2: Live Weather Card */}
      {weatherLoading && (
        <div style={{ ...s.card, textAlign: 'center', color: '#888', padding: 24 }}>
          ⏳ Fetching real weather for {selectedLocation.name}...
        </div>
      )}

      {weather && !weatherLoading && (
        <div style={{ ...s.card, background: 'linear-gradient(135deg, #1b4332, #2d6a4f)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>🌤️ Live Weather — {selectedLocation.name}</h3>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>Real data from Open-Meteo API</p>
            </div>
            <span style={{ fontSize: 48 }}>{weather.icon}</span>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>{weather.description}</p>
          <div style={s.weatherGrid}>
            <div style={s.weatherStat}>
              <div style={s.weatherVal}>{weather.tempMax}°C</div>
              <div style={s.weatherLbl}>Max Temp</div>
            </div>
            <div style={s.weatherStat}>
              <div style={s.weatherVal}>{weather.tempMin}°C</div>
              <div style={s.weatherLbl}>Min Temp</div>
            </div>
            <div style={s.weatherStat}>
              <div style={s.weatherVal}>{weather.humidity}%</div>
              <div style={s.weatherLbl}>Humidity</div>
            </div>
            <div style={s.weatherStat}>
              <div style={s.weatherVal}>{weather.rainfall}mm</div>
              <div style={s.weatherLbl}>Rainfall</div>
            </div>
            <div style={s.weatherStat}>
              <div style={s.weatherVal}>{weather.windSpeed}</div>
              <div style={s.weatherLbl}>Wind km/h</div>
            </div>
          </div>
          {weather.rainfall > 5 && (
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 13 }}>
              🌧️ Rain detected — irrigation may not be needed today
            </div>
          )}
        </div>
      )}

      {/* Step 3: Crop & Soil Parameters */}
      {weather && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>🌾 Step 2 — Crop & Soil Details</h3>
          <div style={s.grid2}>
            <div>
              <label style={s.label}>Crop</label>
              <select style={s.input} value={crop} onChange={e => setCrop(e.target.value)}>
                {Object.keys(KC_TABLE).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Growth Stage</label>
              <select style={s.input} value={stage} onChange={e => setStage(e.target.value)}>
                {['Seedling', 'Vegetative', 'Flowering', 'Maturity'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Soil Type</label>
              <select style={s.input} value={soilType} onChange={e => setSoilType(e.target.value)}>
                {Object.keys(SOIL_WHC).map(s => <option key={s}>{s}</option>)}
              </select>
              <p style={s.hint}>{SOIL_WHC[soilType].label}</p>
            </div>
            <div>
              <label style={s.label}>Farm Area (hectares)</label>
              <input style={s.input} type="number" min="0.1" step="0.1" value={area}
                onChange={e => setArea(Number(e.target.value))} />
            </div>
          </div>
          <label style={s.label}>Current Soil Moisture: {soilMoisture}%</label>
          <input style={s.range} type="range" min="10" max="90" value={soilMoisture}
            onChange={e => setSoilMoisture(Number(e.target.value))} />
        </div>
      )}

      {/* Step 4: Results */}
      {result && weather && (
        <>
          <div style={{ ...s.card, borderLeft: `5px solid ${urgencyColor[result.urgency]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ ...s.cardTitle, margin: 0 }}>💡 Irrigation Recommendation</h3>
              <span style={{ ...s.badge, background: urgencyColor[result.urgency] }}>
                {result.urgency === 'high' ? '🔴 Irrigate Now' : result.urgency === 'medium' ? '🟡 Irrigate Today' : '🟢 Can Wait'}
              </span>
            </div>
            <div style={s.grid3}>
              <div style={s.statBox}>
                <div style={s.statVal}>{result.irrigationNeeded.toFixed(1)}</div>
                <div style={s.statLbl}>mm needed</div>
              </div>
              <div style={s.statBox}>
                <div style={s.statVal}>{result.volumeM3.toFixed(0)}</div>
                <div style={s.statLbl}>m³ for {area}ha</div>
              </div>
              <div style={s.statBox}>
                <div style={s.statVal}>{result.etc.toFixed(1)}</div>
                <div style={s.statLbl}>mm/day ET</div>
              </div>
            </div>
            {[
              ['⏰ Best time', result.timing],
              ['🌡️ ET₀ (reference)', `${result.et0.toFixed(2)} mm/day`],
              ['🌾 Crop factor (Kc)', `${result.kc} (${crop} - ${stage})`],
              ['🌧️ Effective rain today', `${result.effectiveRain.toFixed(1)} mm`],
            ].map(([k, v]) => (
              <div key={k} style={s.infoRow}><span>{k}</span><strong>{v}</strong></div>
            ))}
          </div>

          {/* Method comparison */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>💰 Irrigation Method Comparison</h3>
            {[
              { method: '🌊 Flood Irrigation', vol: result.floodVolume, color: '#e63946', saving: 0 },
              { method: '🌀 Sprinkler', vol: result.sprinklerVolume, color: '#f4a261', saving: Math.round((1 - result.sprinklerVolume / result.floodVolume) * 100) },
              { method: '💧 Drip Irrigation', vol: result.dripVolume, color: '#52b788', saving: Math.round((1 - result.dripVolume / result.floodVolume) * 100) },
            ].map(m => (
              <div key={m.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.method}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{m.vol.toFixed(0)} m³ · ₹{(m.vol * 0.5).toFixed(0)} cost</div>
                </div>
                <span style={{ ...s.badge, background: m.color }}>
                  {m.saving > 0 ? `${m.saving}% saved` : 'Baseline'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16 },
  cardTitle: { margin: '0 0 14px', color: '#2d6a4f', fontSize: 15 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 },
  weatherGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 },
  weatherStat: { background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' },
  weatherVal: { fontSize: 18, fontWeight: 700 },
  weatherLbl: { fontSize: 10, opacity: 0.8, marginTop: 2 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, marginTop: 8 },
  hint: { fontSize: 11, color: '#888', margin: '2px 0 0' },
  input: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' as const },
  range: { width: '100%', marginBottom: 4 },
  btn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, marginTop: 10, width: '100%' },
  statBox: { background: '#f0f7f4', borderRadius: 8, padding: '10px', textAlign: 'center' },
  statVal: { fontSize: 22, fontWeight: 700, color: '#2d6a4f' },
  statLbl: { fontSize: 11, color: '#666', marginTop: 2 },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 },
  badge: { color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
};
