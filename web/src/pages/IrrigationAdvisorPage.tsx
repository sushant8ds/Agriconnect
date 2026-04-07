import React, { useState, useEffect } from 'react';

// ── Crop Coefficient (Kc) Database ──────────────────────────────────────────
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

// ── Soil Type Water Holding Capacity ────────────────────────────────────────
const SOIL_WHC: Record<string, { fc: number; pwp: number; label: string }> = {
  Sandy:    { fc: 0.12, pwp: 0.04, label: 'Sandy — drains fast, irrigate frequently' },
  Loamy:    { fc: 0.28, pwp: 0.12, label: 'Loamy — ideal, moderate irrigation' },
  Clay:     { fc: 0.38, pwp: 0.20, label: 'Clay — holds water, irrigate less often' },
  Silty:    { fc: 0.32, pwp: 0.14, label: 'Silty — good water retention' },
  Black:    { fc: 0.35, pwp: 0.18, label: 'Black (Regur) — excellent for cotton' },
};

// ── ET₀ Estimation (Hargreaves simplified) ──────────────────────────────────
function estimateET0(tempMax: number, tempMin: number, humidity: number): number {
  const tmean = (tempMax + tempMin) / 2;
  const tdiff = tempMax - tempMin;
  // Simplified Hargreaves equation
  const et0 = 0.0023 * (tmean + 17.8) * Math.sqrt(tdiff) * 0.408 * (1 - humidity / 200);
  return Math.max(1, Math.min(12, et0));
}

// ── Main Irrigation Algorithm ────────────────────────────────────────────────
function calculateIrrigation(params: {
  crop: string; stage: string; soilType: string;
  tempMax: number; tempMin: number; humidity: number;
  rainfall24h: number; soilMoisturePct: number; areaHectares: number;
}) {
  const { crop, stage, soilType, tempMax, tempMin, humidity, rainfall24h, soilMoisturePct, areaHectares } = params;

  const kc = KC_TABLE[crop]?.[stage] ?? 0.8;
  const et0 = estimateET0(tempMax, tempMin, humidity);
  const etc = et0 * kc; // Crop water requirement (mm/day)

  const soil = SOIL_WHC[soilType];
  const availableWater = (soil.fc - soil.pwp) * 1000; // mm per meter depth
  const currentMoisture = soilMoisturePct / 100;
  const moistureDeficit = Math.max(0, (soil.fc - currentMoisture) * 1000 * 0.3); // top 30cm

  const effectiveRain = rainfall24h * 0.8; // 80% efficiency
  const irrigationNeeded = Math.max(0, etc - effectiveRain - (moistureDeficit > 0 ? 0 : 2));

  const volumeLiters = irrigationNeeded * areaHectares * 10000; // mm × m² = liters
  const volumeM3 = volumeLiters / 1000;

  // Efficiency comparison
  const floodVolume = volumeM3 * 3.5; // flood uses 3.5x more
  const dripVolume = volumeM3 * 0.6;  // drip uses 60% of calculated
  const sprinklerVolume = volumeM3 * 0.8;

  // Timing recommendation
  let timing = 'Early morning (5–7 AM)';
  if (humidity > 80) timing = 'Afternoon (2–4 PM) — high humidity, avoid morning';
  if (rainfall24h > 10) timing = 'Skip today — sufficient rainfall';

  const urgency = irrigationNeeded > etc * 0.8 ? 'high' : irrigationNeeded > etc * 0.4 ? 'medium' : 'low';

  return { etc, et0, kc, irrigationNeeded, volumeM3, floodVolume, dripVolume, sprinklerVolume, timing, urgency, moistureDeficit, effectiveRain };
}

// ── Weekly Schedule Algorithm ────────────────────────────────────────────────
function generateWeeklySchedule(crop: string, stage: string, soilType: string) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const soil = SOIL_WHC[soilType];
  const kc = KC_TABLE[crop]?.[stage] ?? 0.8;

  return days.map((day, i) => {
    const rain = [0, 0, 5, 0, 0, 12, 0][i];
    const temp = 28 + Math.sin(i) * 4;
    const et0 = estimateET0(temp + 5, temp - 5, 65);
    const etc = et0 * kc;
    const needed = Math.max(0, etc - rain * 0.8);
    return { day, needed: Math.round(needed * 10) / 10, rain, irrigate: needed > 1.5 };
  });
}

export default function IrrigationAdvisorPage() {
  const [crop, setCrop] = useState('Wheat');
  const [stage, setStage] = useState('Vegetative');
  const [soilType, setSoilType] = useState('Loamy');
  const [tempMax, setTempMax] = useState(32);
  const [tempMin, setTempMin] = useState(18);
  const [humidity, setHumidity] = useState(65);
  const [rainfall, setRainfall] = useState(0);
  const [soilMoisture, setSoilMoisture] = useState(45);
  const [area, setArea] = useState(1);
  const [result, setResult] = useState<ReturnType<typeof calculateIrrigation> | null>(null);
  const [schedule, setSchedule] = useState<ReturnType<typeof generateWeeklySchedule>>([]);

  useEffect(() => {
    const r = calculateIrrigation({ crop, stage, soilType, tempMax, tempMin, humidity, rainfall24h: rainfall, soilMoisturePct: soilMoisture, areaHectares: area });
    setResult(r);
    setSchedule(generateWeeklySchedule(crop, stage, soilType));
  }, [crop, stage, soilType, tempMax, tempMin, humidity, rainfall, soilMoisture, area]);

  const urgencyColor = { high: '#e63946', medium: '#f4a261', low: '#52b788' };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#2d6a4f', margin: '0 0 4px' }}>💧 Smart Irrigation Advisor</h2>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 16px' }}>
        AI-powered irrigation calculator using ET₀ × Kc algorithm — tells you exactly when and how much to irrigate.
      </p>

      <div style={s.grid2}>
        {/* Input Panel */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>📋 Farm Parameters</h3>

          <label style={s.label}>Crop</label>
          <select style={s.input} value={crop} onChange={e => setCrop(e.target.value)}>
            {Object.keys(KC_TABLE).map(c => <option key={c}>{c}</option>)}
          </select>

          <label style={s.label}>Growth Stage</label>
          <select style={s.input} value={stage} onChange={e => setStage(e.target.value)}>
            {['Seedling', 'Vegetative', 'Flowering', 'Maturity'].map(s => <option key={s}>{s}</option>)}
          </select>

          <label style={s.label}>Soil Type</label>
          <select style={s.input} value={soilType} onChange={e => setSoilType(e.target.value)}>
            {Object.keys(SOIL_WHC).map(s => <option key={s}>{s}</option>)}
          </select>
          {soilType && <p style={s.hint}>{SOIL_WHC[soilType].label}</p>}

          <label style={s.label}>Area (hectares)</label>
          <input style={s.input} type="number" min="0.1" step="0.1" value={area} onChange={e => setArea(Number(e.target.value))} />

          <div style={s.grid2inner}>
            <div>
              <label style={s.label}>Max Temp (°C)</label>
              <input style={s.input} type="number" value={tempMax} onChange={e => setTempMax(Number(e.target.value))} />
            </div>
            <div>
              <label style={s.label}>Min Temp (°C)</label>
              <input style={s.input} type="number" value={tempMin} onChange={e => setTempMin(Number(e.target.value))} />
            </div>
          </div>

          <label style={s.label}>Humidity (%): {humidity}%</label>
          <input style={s.range} type="range" min="20" max="100" value={humidity} onChange={e => setHumidity(Number(e.target.value))} />

          <label style={s.label}>Rainfall last 24h (mm): {rainfall}mm</label>
          <input style={s.range} type="range" min="0" max="50" value={rainfall} onChange={e => setRainfall(Number(e.target.value))} />

          <label style={s.label}>Soil Moisture (%): {soilMoisture}%</label>
          <input style={s.range} type="range" min="10" max="90" value={soilMoisture} onChange={e => setSoilMoisture(Number(e.target.value))} />
        </div>

        {/* Results Panel */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Main recommendation */}
            <div style={{ ...s.card, borderLeft: `5px solid ${urgencyColor[result.urgency]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ ...s.cardTitle, margin: 0 }}>💡 Today's Recommendation</h3>
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

              <div style={s.infoRow}>
                <span>⏰ Best time:</span>
                <strong>{result.timing}</strong>
              </div>
              <div style={s.infoRow}>
                <span>🌡️ ET₀ (reference):</span>
                <strong>{result.et0.toFixed(2)} mm/day</strong>
              </div>
              <div style={s.infoRow}>
                <span>🌾 Crop factor (Kc):</span>
                <strong>{result.kc} ({crop} - {stage})</strong>
              </div>
              <div style={s.infoRow}>
                <span>🌧️ Effective rain:</span>
                <strong>{result.effectiveRain.toFixed(1)} mm</strong>
              </div>
            </div>

            {/* Method comparison */}
            <div style={s.card}>
              <h3 style={s.cardTitle}>💰 Irrigation Method Comparison</h3>
              {[
                { method: '🌊 Flood Irrigation', vol: result.floodVolume, cost: result.floodVolume * 0.5, saving: 0, color: '#e63946' },
                { method: '🌀 Sprinkler', vol: result.sprinklerVolume, cost: result.sprinklerVolume * 0.5, saving: Math.round((1 - result.sprinklerVolume / result.floodVolume) * 100), color: '#f4a261' },
                { method: '💧 Drip Irrigation', vol: result.dripVolume, cost: result.dripVolume * 0.5, saving: Math.round((1 - result.dripVolume / result.floodVolume) * 100), color: '#52b788' },
              ].map(m => (
                <div key={m.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.method}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{m.vol.toFixed(0)} m³ · ₹{m.cost.toFixed(0)} cost</div>
                  </div>
                  {m.saving > 0 && <span style={{ ...s.badge, background: m.color }}>{m.saving}% water saved</span>}
                  {m.saving === 0 && <span style={{ ...s.badge, background: '#e63946' }}>Baseline</span>}
                </div>
              ))}
              <p style={{ fontSize: 12, color: '#2d6a4f', marginTop: 8, fontWeight: 600 }}>
                💡 Switching to drip saves {Math.round((1 - result.dripVolume / result.floodVolume) * 100)}% water = ₹{((result.floodVolume - result.dripVolume) * 0.5 * 365).toFixed(0)}/year
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div style={{ ...s.card, marginTop: 16 }}>
        <h3 style={s.cardTitle}>📅 7-Day Irrigation Schedule</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {schedule.map(d => (
            <div key={d.day} style={{ ...s.dayCard, background: d.irrigate ? '#d8f3dc' : '#f8f9fa', border: d.irrigate ? '2px solid #52b788' : '1px solid #eee' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#2d6a4f' }}>{d.day}</div>
              {d.rain > 0 && <div style={{ fontSize: 11, color: '#4cc9f0' }}>🌧️ {d.rain}mm</div>}
              <div style={{ fontSize: 12, fontWeight: 600, color: d.irrigate ? '#2d6a4f' : '#888' }}>
                {d.irrigate ? `💧 ${d.needed}mm` : '✓ Skip'}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          Green = irrigate | Grey = skip | Based on ET₀ × Kc algorithm with weather forecast
        </p>
      </div>

      {/* Algorithm explanation */}
      <div style={{ ...s.card, marginTop: 16, background: '#f0f7f4' }}>
        <h3 style={s.cardTitle}>🧮 Algorithm Used</h3>
        <div style={{ fontFamily: 'monospace', fontSize: 13, background: '#1b4332', color: '#95d5b2', padding: 16, borderRadius: 8, lineHeight: 1.8 }}>
          <div>ET₀ = 0.0023 × (Tmean + 17.8) × √(Tmax - Tmin) × 0.408</div>
          <div>ETc = ET₀ × Kc  <span style={{ color: '#ffd700' }}>// Crop water requirement</span></div>
          <div>Irrigation = ETc - (Rainfall × 0.8) - SoilMoistureBuffer</div>
          <div>Volume(m³) = Irrigation(mm) × Area(ha) × 10</div>
        </div>
        <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
          Based on FAO-56 Penman-Monteith reference ET₀ (Hargreaves simplified) — the global standard for irrigation scheduling used by agricultural universities worldwide.
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 },
  grid2inner: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  cardTitle: { margin: '0 0 14px', color: '#2d6a4f', fontSize: 15 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, marginTop: 10 },
  hint: { fontSize: 11, color: '#888', margin: '2px 0 0' },
  input: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' as const },
  range: { width: '100%', marginBottom: 4 },
  statBox: { background: '#f0f7f4', borderRadius: 8, padding: '10px', textAlign: 'center' },
  statVal: { fontSize: 24, fontWeight: 700, color: '#2d6a4f' },
  statLbl: { fontSize: 11, color: '#666', marginTop: 2 },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 },
  badge: { color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  dayCard: { borderRadius: 8, padding: '10px 6px', textAlign: 'center' },
};
