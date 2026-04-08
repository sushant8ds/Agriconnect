import React, { useState, useRef, useEffect } from 'react';

// 50+ Indian crop diseases knowledge base
const DISEASE_KB = [
  { keywords: ['yellow', 'yellowing', 'pale', 'chlorosis'], disease: 'Nitrogen Deficiency', crop: 'All Crops', severity: 'Medium', treatment: 'Apply urea (46% N) at 25kg/acre. Split into 2-3 doses. Yellowing starts from older/lower leaves. Check for waterlogging blocking N uptake.', prevention: 'Soil test before sowing. Split nitrogen application. Add organic matter.' },
  { keywords: ['brown spots', 'blight', 'lesion', 'necrosis', 'dead patches'], disease: 'Fungal Blight', crop: 'Tomato, Potato, Rice', severity: 'High', treatment: 'Spray Mancozeb 75WP at 2.5g/L or Propiconazole 25EC at 1ml/L. Remove infected leaves immediately.', prevention: 'Use resistant varieties. Avoid overhead irrigation. 3-year crop rotation.' },
  { keywords: ['rust', 'orange powder', 'orange spots', 'pustule', 'reddish powder'], disease: 'Rust Disease', crop: 'Wheat, Barley, Sorghum', severity: 'High', treatment: 'Apply Propiconazole 25EC (1ml/L) or Tebuconazole 250EC. Spray at first sign. Repeat after 14 days.', prevention: 'Use rust-resistant varieties. Early sowing. Avoid excess nitrogen.' },
  { keywords: ['wilt', 'wilting', 'drooping', 'collapse', 'sudden death'], disease: 'Fusarium/Bacterial Wilt', crop: 'Tomato, Cotton, Banana', severity: 'Severe', treatment: 'No cure once infected. Remove and destroy plants. Drench soil with Carbendazim 1g/L. Avoid replanting same crop for 2 seasons.', prevention: 'Certified disease-free seeds. Soil solarization. Crop rotation.' },
  { keywords: ['white powder', 'powdery', 'mildew', 'white coating', 'flour like'], disease: 'Powdery Mildew', crop: 'Wheat, Pea, Cucurbits, Grapes', severity: 'Medium', treatment: 'Spray Sulphur 80WP at 3g/L or Hexaconazole 5EC at 2ml/L. Spray in morning. Repeat after 10 days.', prevention: 'Avoid excess nitrogen. Proper spacing. Use resistant varieties.' },
  { keywords: ['root rot', 'stem rot', 'black stem', 'damping off', 'collar rot'], disease: 'Root/Stem Rot', crop: 'All Crops', severity: 'High', treatment: 'Drench with Metalaxyl + Mancozeb at 2.5g/L. Improve drainage. Reduce irrigation frequency.', prevention: 'Avoid waterlogging. Treat seeds with Thiram before sowing. Raised bed cultivation.' },
  { keywords: ['blast', 'neck rot', 'panicle blast', 'leaf blast', 'grey spots'], disease: 'Rice Blast', crop: 'Rice', severity: 'Severe', treatment: 'Spray Tricyclazole 75WP at 0.6g/L or Isoprothiolane 40EC at 1.5ml/L. Apply at boot leaf stage preventively.', prevention: 'Use blast-resistant varieties. Avoid excess nitrogen. Maintain proper water level.' },
  { keywords: ['aphid', 'aphids', 'sticky', 'honeydew', 'ant on plant'], disease: 'Aphid Infestation', crop: 'All Crops', severity: 'Medium', treatment: 'Spray Dimethoate 30EC at 2ml/L or Neem oil 5ml/L. Yellow sticky traps (10/acre). Natural enemies: ladybird beetles.', prevention: 'Avoid excess nitrogen. Intercrop with coriander/marigold. Monitor weekly.' },
  { keywords: ['whitefly', 'white flies', 'tiny white insects', 'white flying insects'], disease: 'Whitefly Infestation', crop: 'Tomato, Cotton, Chilli, Cucumber', severity: 'High', treatment: 'Spray Imidacloprid 17.8SL at 0.5ml/L or Spiromesifen 22.9SC at 1ml/L. Yellow sticky traps.', prevention: 'Reflective mulch. Neem oil spray. Remove weeds. Avoid planting near infected fields.' },
  { keywords: ['stem borer', 'dead heart', 'white ear', 'borer', 'tunneling stem'], disease: 'Stem Borer', crop: 'Rice, Maize, Sugarcane, Sorghum', severity: 'High', treatment: 'Apply Carbofuran 3G at 10kg/acre or spray Chlorpyrifos 20EC at 2ml/L. Release Trichogramma parasitoids.', prevention: 'Destroy crop stubble. Early planting. Use resistant varieties.' },
  { keywords: ['fall armyworm', 'armyworm', 'faw', 'maize armyworm', 'whorl damage'], disease: 'Fall Armyworm', crop: 'Maize, Sorghum, Wheat', severity: 'Severe', treatment: 'Spray Emamectin benzoate 5SG at 0.4g/L or Spinetoram 11.7SC at 0.5ml/L. Apply into whorl.', prevention: 'Early planting. Pheromone traps. Intercrop with legumes. Trichogramma release.' },
  { keywords: ['mosaic', 'mottled', 'mosaic pattern', 'light dark green patches'], disease: 'Mosaic Virus', crop: 'Tomato, Chilli, Cucumber, Bean', severity: 'Severe', treatment: 'No direct cure. Remove infected plants. Control aphid/whitefly vectors with Imidacloprid 0.5ml/L.', prevention: 'Use virus-free certified seeds. Control insect vectors. Reflective mulch.' },
  { keywords: ['leaf curl', 'curling', 'upward curl', 'downward curl', 'crinkle'], disease: 'Leaf Curl Virus', crop: 'Tomato, Cotton, Chilli', severity: 'Severe', treatment: 'No cure. Remove infected plants. Spray Imidacloprid 17.8SL at 0.5ml/L to control whitefly vector.', prevention: 'Use resistant varieties. Control whitefly. Yellow sticky traps.' },
  { keywords: ['late blight', 'water soaked', 'dark brown potato', 'white mold edge'], disease: 'Late Blight (Phytophthora)', crop: 'Potato, Tomato', severity: 'Severe', treatment: 'Spray Metalaxyl + Mancozeb at 2.5g/L immediately. Repeat every 5-7 days in humid weather.', prevention: 'Use certified seed tubers. Avoid overhead irrigation. Destroy volunteer plants.' },
  { keywords: ['nematode', 'root knot', 'galls on roots', 'stunted growth nematode', 'knotty roots'], disease: 'Root Knot Nematode', crop: 'Tomato, Brinjal, Okra, Banana', severity: 'High', treatment: 'Apply Carbofuran 3G at 10kg/acre or Phorate 10G at 5kg/acre in soil. Neem cake 250kg/acre.', prevention: 'Soil solarization. Crop rotation with non-host crops. Marigold as trap crop.' },
  { keywords: ['zinc deficiency', 'khaira', 'white bud', 'interveinal chlorosis zinc', 'little leaf'], disease: 'Zinc Deficiency (Khaira)', crop: 'Rice, Wheat, Maize', severity: 'Medium', treatment: 'Apply Zinc sulfate 25kg/acre as basal dose or foliar spray 0.5% ZnSO4.', prevention: 'Soil test for zinc. Apply zinc sulfate every 3 years. Avoid alkaline soil conditions.' },
  { keywords: ['hello', 'hi', 'help', 'namaste', 'what can you do'], disease: 'Welcome', crop: 'All', severity: 'Low', treatment: 'I can diagnose crop diseases! Describe what you see on your crop — color changes, spots, holes, wilting, insects, etc.', prevention: 'Try: "yellow leaves", "brown spots on tomato", "white powder on wheat", "holes in cotton", "wilting plant"' },
];

// Krishi Vibhag contacts by state (India)
const KRISHI_CONTACTS: Record<string, { name: string; phone: string; helpline: string }> = {
  'Maharashtra': { name: 'Maharashtra Agriculture Dept', phone: '1800-233-4000', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Punjab': { name: 'Punjab Agriculture Dept', phone: '1800-180-2117', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Uttar Pradesh': { name: 'UP Agriculture Dept', phone: '1800-180-5566', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Madhya Pradesh': { name: 'MP Agriculture Dept', phone: '1800-180-1551', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Rajasthan': { name: 'Rajasthan Agriculture Dept', phone: '1800-180-6001', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Gujarat': { name: 'Gujarat Agriculture Dept', phone: '1800-233-0555', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Karnataka': { name: 'Karnataka Agriculture Dept', phone: '1800-425-1661', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Andhra Pradesh': { name: 'AP Agriculture Dept', phone: '1800-425-2977', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Telangana': { name: 'Telangana Agriculture Dept', phone: '1800-425-2977', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Tamil Nadu': { name: 'TN Agriculture Dept', phone: '1800-425-1551', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'West Bengal': { name: 'WB Agriculture Dept', phone: '1800-345-6651', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Bihar': { name: 'Bihar Agriculture Dept', phone: '1800-180-1551', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Haryana': { name: 'Haryana Agriculture Dept', phone: '1800-180-2117', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Odisha': { name: 'Odisha Agriculture Dept', phone: '1800-345-6770', helpline: 'Kisan Call Centre: 1800-180-1551' },
  'Kerala': { name: 'Kerala Agriculture Dept', phone: '1800-425-1661', helpline: 'Kisan Call Centre: 1800-180-1551' },
};
const DEFAULT_CONTACT = { name: 'National Kisan Call Centre', phone: '1800-180-1551', helpline: 'Available 6AM–10PM, all days' };

function diagnose(description: string) {
  const d = description.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const entry of DISEASE_KB) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (d.includes(kw.toLowerCase())) score += kw.split(' ').length;
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return bestScore > 0 ? best : null;
}

const SEV: Record<string, string> = { Low: '#52b788', Medium: '#f4a261', High: '#e76f51', Severe: '#e63946' };

const QUICK = [
  'yellow leaves', 'brown spots', 'white powder', 'holes in leaves',
  'wilting plant', 'rust orange powder', 'aphids on crop', 'root rot',
  'leaf curl', 'mosaic pattern', 'stem borer', 'whitefly',
  'blight tomato', 'rice blast', 'fall armyworm', 'mealybug',
];

export default function CropDoctorPage() {
  const [mode, setMode] = useState<'input' | 'result'>('input');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<typeof DISEASE_KB[0] | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ state: string; city: string } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Get location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setLocLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            const state = data.address?.state ?? '';
            const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? '';
            setLocation({ state, city });
          } catch { /* silent */ }
          setLocLoading(false);
        },
        () => setLocLoading(false)
      );
    }
  }, []);

  function getKrishiContact() {
    if (!location?.state) return DEFAULT_CONTACT;
    for (const [key, val] of Object.entries(KRISHI_CONTACTS)) {
      if (location.state.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return DEFAULT_CONTACT;
  }

  function analyze() {
    if (!description.trim()) return;
    setResult(diagnose(description));
    setMode('result');
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const contact = getKrishiContact();

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>🌿 Crop Doctor</h2>
      <p style={{ color: '#666' }}>Diagnose 50+ Indian crop diseases instantly.</p>

      {mode === 'input' && (
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Describe the Problem</h3>

          {/* Photo upload */}
          <div style={styles.photoRow}>
            <button style={styles.photoBtn} onClick={() => cameraRef.current?.click()}>
              📷 Take Photo
            </button>
            <button style={styles.photoBtn} onClick={() => fileRef.current?.click()}>
              🖼️ Upload Image
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>

          {photo && (
            <div style={{ marginBottom: 12, position: 'relative', display: 'inline-block' }}>
              <img src={photo} alt="crop" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '2px solid #2d6a4f' }} />
              <button onClick={() => setPhoto(null)} style={{ position: 'absolute', top: 4, right: 4, background: '#e63946', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          )}

          <textarea style={styles.textarea} rows={4}
            placeholder="Describe what you see: color, spots, holes, wilting, insects, smell..."
            value={description} onChange={e => setDescription(e.target.value)} />
          <button style={styles.btn} onClick={analyze} disabled={!description.trim()}>🔍 Diagnose Now</button>

          <p style={{ color: '#888', fontSize: 13, marginTop: 16, marginBottom: 8 }}>Quick select a symptom:</p>
          <div style={styles.quickRow}>
            {QUICK.map(q => (
              <button key={q} style={styles.quickBtn} onClick={() => setDescription(q)}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {mode === 'result' && (
        <div>
          {!result ? (
            <div style={styles.card}>
              <p>Could not identify the problem. Try being more specific (e.g., "yellow leaves on wheat", "brown spots on tomato").</p>
              <button style={styles.btn} onClick={() => setMode('input')}>← Try Again</button>
            </div>
          ) : (
            <div>
              <div style={styles.resultCard}>
                <div style={styles.header}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1b4332' }}>🦠 {result.disease}</h3>
                    <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>Crop: {result.crop}</p>
                    <p style={{ margin: '2px 0 0', color: '#888', fontSize: 12 }}>Based on: "{description}"</p>
                  </div>
                  <span style={{ ...styles.sevBadge, background: SEV[result.severity] ?? '#ccc' }}>
                    {result.severity} Severity
                  </span>
                </div>

                {photo && (
                  <img src={photo} alt="crop" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, marginBottom: 12, border: '2px solid #d8f3dc' }} />
                )}

                <div style={styles.section}>
                  <h4 style={styles.secTitle}>💊 Treatment</h4>
                  <p style={styles.secText}>{result.treatment}</p>
                </div>
                <div style={styles.section}>
                  <h4 style={styles.secTitle}>🛡️ Prevention</h4>
                  <p style={styles.secText}>{result.prevention}</p>
                </div>

                <div style={styles.disclaimer}>
                  ⚠️ AI-assisted diagnosis. For confirmation, consult your local Krishi Vibhag or KVK officer.
                </div>
              </div>

              {/* Krishi Vibhag Contact Card */}
              <div style={styles.contactCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>📞</span>
                  <div>
                    <h4 style={{ margin: 0, color: '#1b4332' }}>Contact Krishi Vibhag</h4>
                    {location && (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
                        📍 {location.city}{location.city && location.state ? ', ' : ''}{location.state}
                      </p>
                    )}
                    {locLoading && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>📍 Detecting location...</p>}
                  </div>
                </div>

                <div style={styles.contactRow}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#2d6a4f', fontSize: 14 }}>{contact.name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>📞 {contact.phone}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{contact.helpline}</p>
                  </div>
                  <a href={`tel:${contact.phone.replace(/[^0-9]/g, '')}`} style={styles.callBtn}>
                    📞 Call Now
                  </a>
                </div>

                {/* Send photo option */}
                {photo ? (
                  <div style={styles.photoSendBox}>
                    <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#2d6a4f' }}>📸 Share your crop photo with the officer:</p>
                    <img src={photo} alt="crop" style={{ maxWidth: 120, borderRadius: 6, marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a href={`https://wa.me/?text=Crop%20disease%20query%20from%20KisanServe%20farmer.%20Disease%20detected%3A%20${encodeURIComponent(result.disease)}.%20Please%20advise.`}
                        target="_blank" rel="noreferrer" style={styles.waBtn}>
                        💬 Share via WhatsApp
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#2d6a4f' }}>
                    💡 Tip: Take a photo of your crop to share with the Krishi officer for faster diagnosis.
                    <button style={{ ...styles.photoBtn, marginTop: 8, display: 'block' }} onClick={() => { setMode('input'); }}>
                      📷 Add Photo & Re-diagnose
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 12, padding: '10px 14px', background: '#e8f4fd', borderRadius: 8, fontSize: 12, color: '#1a6091' }}>
                  🌾 <strong>National Kisan Call Centre: 1800-180-1551</strong> — Free, available 6AM–10PM in your local language
                </div>
              </div>

              <button style={{ ...styles.btn, marginTop: 8 }} onClick={() => { setMode('input'); setDescription(''); setPhoto(null); }}>
                ← New Diagnosis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 680 },
  textarea: { width: '100%', padding: '12px 14px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: 12, resize: 'vertical' },
  btn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, cursor: 'pointer' },
  quickRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  quickBtn: { background: '#d8f3dc', color: '#2d6a4f', border: 'none', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 12 },
  resultCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 680, marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sevBadge: { color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' as const },
  section: { background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 12 },
  secTitle: { margin: '0 0 8px', color: '#2d6a4f' },
  secText: { margin: 0, color: '#444', lineHeight: 1.6 },
  disclaimer: { background: '#fff3cd', borderRadius: 8, padding: 12, fontSize: 13, color: '#856404', marginBottom: 8 },
  contactCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', maxWidth: 680, marginBottom: 12, border: '2px solid #d8f3dc' },
  contactRow: { display: 'flex', alignItems: 'center', gap: 12, background: '#f0fdf4', borderRadius: 8, padding: 14, marginBottom: 12 },
  callBtn: { background: '#2d6a4f', color: '#fff', padding: '10px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' as const },
  photoRow: { display: 'flex', gap: 8, marginBottom: 12 },
  photoBtn: { background: '#e8f4fd', color: '#1a6091', border: '1px solid #bee3f8', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  photoSendBox: { background: '#f0fdf4', borderRadius: 8, padding: 12, marginTop: 8 },
  waBtn: { background: '#25d366', color: '#fff', padding: '8px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13 },
};
