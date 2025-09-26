// Nama File: PollutionHeatmapPlatform.jsx (Versi Tersinkronisasi & Canggih)
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip as LeafletTooltip, LayersControl } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Wind, Thermometer, Droplets, Factory, CheckCircle, MapPin, CloudSun, CloudRain, Sun, AlertTriangle, Info, BarChartHorizontal, University, Server, Clock, GitCommit, ThermometerSun, Hourglass, ShieldAlert } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- BAGIAN 1: FUNGSI HELPER & KALKULASI PROFESIONAL ---
const calculateAQI = (pm25) => {
  const breakpoints = [
    { aqi: [0, 50], pm: [0, 12.0] }, { aqi: [51, 100], pm: [12.1, 35.4] },
    { aqi: [101, 150], pm: [35.5, 55.4] }, { aqi: [151, 200], pm: [55.5, 150.4] },
    { aqi: [201, 300], pm: [150.5, 250.4] }, { aqi: [301, 500], pm: [250.5, 500.4] },
  ];
  const bp = breakpoints.find(b => pm25 >= b.pm[0] && pm25 <= b.pm[1]);
  if (!bp) return 500;
  const [I_hi, I_lo] = bp.aqi; const [C_hi, C_lo] = bp.pm;
  return Math.round(((I_hi - I_lo) / (C_hi - C_lo)) * (pm25 - C_lo) + I_lo);
};

const getAQIDetails = (aqi) => {
  if (aqi <= 50) return { category: 'Baik', color: 'text-green-400', hex: '#4ade80' };
  if (aqi <= 100) return { category: 'Sedang', color: 'text-yellow-400', hex: '#facc15' };
  if (aqi <= 150) return { category: 'Tidak Sehat (Kelompok Sensitif)', color: 'text-orange-400', hex: '#fb923c' };
  return { category: 'Tidak Sehat', color: 'text-red-500', hex: '#ef4444' };
};

// [BARU] Fungsi untuk mendapatkan status prediksi SVM yang sinkron
const getSvmPrediction = (aqi) => {
    if (aqi <= 100) return { title: 'Kualitas Udara Terkendali', desc: 'Prediksi SVM menunjukkan sebaran polutan masih dalam batas aman untuk area sekitar.', color: 'bg-green-500/10 text-green-300', icon: <CheckCircle className="w-8 h-8"/> };
    if (aqi <= 150) return { title: 'Waspada Peningkatan Polusi', desc: 'Prediksi SVM mendeteksi adanya potensi dampak kesehatan bagi kelompok sensitif di beberapa titik.', color: 'bg-yellow-500/10 text-yellow-300', icon: <AlertTriangle className="w-8 h-8"/> };
    return { title: 'Tindakan Mitigasi Diperlukan', desc: 'Prediksi SVM mengindikasikan sebaran polutan telah mencapai level tidak sehat yang dapat berdampak pada masyarakat luas.', color: 'bg-red-500/10 text-red-300', icon: <ShieldAlert className="w-8 h-8"/> };
};

const pollutantDetails = {
    pm25: { name: 'Partikulat PM₂.₅', desc: 'Partikel udara sangat halus (< 2.5 mikron) yang dapat masuk jauh ke dalam paru-paru dan aliran darah, menjadi risiko kesehatan utama.' },
    co: { name: 'Karbon Monoksida (CO)', desc: 'Gas beracun yang tidak berbau dan tidak berwarna, hasil dari pembakaran tidak sempurna. Mengurangi kemampuan darah membawa oksigen.' },
    so2: { name: 'Sulfur Dioksida (SO₂)', desc: 'Gas reaktif yang terkait dengan pembakaran bahan bakar fosil, dapat menyebabkan hujan asam dan masalah pernapasan.' },
    nox: { name: 'Nitrogen Oksida (NOₓ)', desc: 'Sekelompok gas yang berkontribusi pada pembentukan kabut asap, hujan asam, dan iritasi sistem pernapasan.' },
};

// [BARU] Fungsi untuk pewarnaan data dinamis
const getDynamicDataColor = (type, value) => {
    if (type === 'temp') {
        if (value > 32) return 'text-orange-400';
        if (value < 28) return 'text-cyan-400';
        return 'text-white';
    }
    if (type === 'humidity') {
        if (value > 85) return 'text-blue-400';
        return 'text-white';
    }
    if (type === 'wind') {
        if (value > 20) return 'text-red-400';
        return 'text-white';
    }
};

// --- BAGIAN 2: KONFIGURASI & SIMULASI DATA ---
const INDUSTRY_CENTER = { lat: 4.58, lng: 97.75, name: "PT. Medco E&P Malaka", emissions: { co: 250, so2: 180, nox: 120, pm25: 90 } };
const generateDummySensorData = (center, count, radius, wind) => { /* ... (fungsi ini tetap sama, tidak perlu diubah) ... */
    const sensors = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI; const distance = Math.random() * radius;
      const lat = center.lat + (distance * Math.cos(angle)) * 0.1; const lng = center.lng + (distance * Math.sin(angle)) * 0.1;
      const windAngle = (wind.deg * Math.PI) / 180; const dx = lng - center.lng; const dy = lat - center.lat;
      const projectedDistance = (dx * Math.cos(windAngle) + dy * Math.sin(windAngle));
      const decayFactor = Math.max(0, 1 - (distance / radius) * 0.7 - Math.max(0, -projectedDistance * 5));
      const pm25 = parseFloat((center.emissions.pm25 * decayFactor * (0.8 + Math.random() * 0.4)).toFixed(2));
      sensors.push({
        id: i + 1, name: `Sensor ${(i + 1).toString().padStart(3, '0')}`, position: [lat, lng],
        co: parseFloat((center.emissions.co * decayFactor * (0.8 + Math.random() * 0.4)).toFixed(2)),
        so2: parseFloat((center.emissions.so2 * decayFactor * (0.8 + Math.random() * 0.4)).toFixed(2)),
        nox: parseFloat((center.emissions.nox * decayFactor * (0.8 + Math.random() * 0.4)).toFixed(2)),
        pm25: pm25, aqi: calculateAQI(pm25),
      });
    }
    return sensors;
};
const generateDummyBMKGData = () => { /* ... (fungsi ini tetap sama, tidak perlu diubah) ... */
    const weatherConditions = ['Cerah', 'Berawan', 'Hujan Ringan'];
    return {
        temp: parseFloat((27 + Math.random() * 7).toFixed(1)), humidity: Math.floor(60 + Math.random() * 30),
        wind: { speed: parseFloat((5 + Math.random() * 25).toFixed(1)), deg: Math.floor(Math.random() * 360) },
        weather: weatherConditions[Math.floor(Math.random() * weatherConditions.length)]
    };
};

// --- BAGIAN 3: KOMPONEN UTAMA ---
const PollutionHeatmapPlatform = () => {
  const [sensorData, setSensorData] = useState([]);
  const [bmkgData, setBmkgData] = useState(generateDummyBMKGData());
  const [activePollutant, setActivePollutant] = useState('pm25');
  const [historicalData, setHistoricalData] = useState([]);

  const runSimulation = useCallback(() => { /* ... (fungsi ini tetap sama) ... */
    const newBmkgData = generateDummyBMKGData(); const newSensorData = generateDummySensorData(INDUSTRY_CENTER, 50, 1.5, newBmkgData.wind);
    setBmkgData(newBmkgData); setSensorData(newSensorData);
    setHistoricalData(prevData => {
      const newData = [...prevData, { time: new Date().toLocaleTimeString(), ...newSensorData.reduce((acc, sensor) => ({
        co: Math.max(acc.co || 0, sensor.co), so2: Math.max(acc.so2 || 0, sensor.so2),
        nox: Math.max(acc.nox || 0, sensor.nox), pm25: Math.max(acc.pm25 || 0, sensor.pm25),
      }), {}) }];
      return newData.length > 20 ? newData.slice(newData.length - 20) : newData;
    });
  }, []);

  useEffect(() => {
    runSimulation(); const interval = setInterval(runSimulation, 5000);
    return () => clearInterval(interval);
  }, [runSimulation]);

  const getPollutantColor = (value, pollutant) => { /* ... (fungsi ini tetap sama) ... */
    const thresholds = { co: { good: 50, moderate: 150, bad: 250 }, so2: { good: 40, moderate: 100, bad: 180 }, nox: { good: 30, moderate: 80, bad: 120 }, pm25: { good: 15, moderate: 50, bad: 90 },};
    const t = thresholds[pollutant];
    if (value < t.good) return "#28a745"; if (value < t.moderate) return "#ffc107";
    if (value < t.bad) return "#fd7e14"; return "#dc3545";
  };
  
  const WeatherIcon = ({ weather }) => { /* ... (fungsi ini tetap sama) ... */
    if (weather === 'Cerah') return <Sun className="w-5 h-5 text-yellow-400" />; if (weather === 'Berawan') return <CloudSun className="w-5 h-5 text-gray-400" />;
    if (weather === 'Hujan Ringan') return <CloudRain className="w-5 h-5 text-blue-400" />; return null;
  };
  
  // Kalkulasi data yang disinkronkan
  const highestPollutant = sensorData.reduce((max, sensor) => sensor[activePollutant] > max.value ? { value: sensor[activePollutant], name: sensor.name } : max, { value: 0, name: '' });
  const maxAqiSensor = sensorData.reduce((max, s) => s.aqi > max.aqi ? s : max, { aqi: 0 });
  const aqiDetails = getAQIDetails(maxAqiSensor.aqi);
  const svmPrediction = getSvmPrediction(maxAqiSensor.aqi);
  const windRoseData = [{ direction: 'Angin', speed: bmkgData.wind.speed, angle: bmkgData.wind.deg }];
  const sensorStatusDistribution = {
    baik: sensorData.filter(s => s.aqi <= 50).length,
    sedang: sensorData.filter(s => s.aqi > 50 && s.aqi <= 100).length,
    tidakSehat: sensorData.filter(s => s.aqi > 100).length,
  };
  const dominantPollutant = 'PM₂.₅'; // Simulasi, bisa dibuat lebih kompleks
  const dispersalTime = bmkgData.wind.speed > 5 ? `~${Math.round(60 / (bmkgData.wind.speed / 10))} Menit` : '> 2 Jam';

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 flex justify-between items-center z-50">
          <div className="flex items-center space-x-3"><Factory className="w-8 h-8 text-cyan-400" /><div><h1 className="text-xl font-bold tracking-wider">PLATFORM PREDIKSI POLUSI UDARA</h1><p className="text-xs text-gray-400">PT. Medco E&P Malaka - Aceh Timur | Real-time GIS & SVM Prediction</p></div></div>
          <div className="text-sm font-mono bg-gray-900 px-3 py-1 rounded-md">{new Date().toLocaleString('id-ID')}</div>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 flex-grow">
        <div className="lg:col-span-3 flex flex-col"><div className="bg-gray-800 rounded-lg shadow-lg p-4 flex-grow"><MapContainer center={[INDUSTRY_CENTER.lat, INDUSTRY_CENTER.lng]} zoom={11} className="h-full w-full rounded-md" scrollWheelZoom={true}><LayersControl position="topright"><LayersControl.BaseLayer checked name="Satelit"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Esri &mdash; i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"/></LayersControl.BaseLayer><LayersControl.BaseLayer name="Peta Gelap"><TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{y}{r}.png" attribution='&copy; CARTO' /></LayersControl.BaseLayer></LayersControl><Marker position={[INDUSTRY_CENTER.lat, INDUSTRY_CENTER.lng]}><Popup>{INDUSTRY_CENTER.name}</Popup></Marker>{sensorData.map(sensor => (<CircleMarker key={sensor.id} center={sensor.position} pathOptions={{ color: getPollutantColor(sensor[activePollutant], activePollutant), fillColor: getPollutantColor(sensor[activePollutant], activePollutant), fillOpacity: 0.6 }} radius={5 + (sensor[activePollutant] / 20)}><LeafletTooltip><div className="text-left"><span className="font-bold">{sensor.name}</span><br/><hr className="my-1"/>CO: {sensor.co} µg/m³<br/>SO₂: {sensor.so2} µg/m³<br/>NOₓ: {sensor.nox} µg/m³<br/>PM₂.₅: {sensor.pm25} µg/m³<br/><b>ISPU: {sensor.aqi}</b></div></LeafletTooltip></CircleMarker>))}</MapContainer></div></div>
        <div className="lg:col-span-1 bg-gray-800 rounded-lg shadow-lg p-1 lg:h-[calc(100vh-104px)]"><div className="overflow-y-auto h-full p-3 custom-scrollbar"><div className="flex flex-col gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4"><h3 className="font-semibold mb-3">Kontrol Peta Heatmap</h3><div className="grid grid-cols-2 gap-2">{['pm25', 'co', 'so2', 'nox'].map(p => (<button key={p} onClick={() => setActivePollutant(p)} className={`p-2 text-sm rounded-md transition-all duration-200 ${activePollutant === p ? 'bg-cyan-500 shadow-lg' : 'bg-gray-700 hover:bg-gray-600'}`}>{p.toUpperCase().replace('PM25', 'PM₂.₅')}</button>))}</div></div>
              <div className="bg-gray-900/50 rounded-lg p-4"><h3 className="font-semibold mb-3 flex items-center gap-2"><BarChartHorizontal size={18}/> Status Indeks Kualitas Udara (ISPU)</h3><div className='text-center p-2 rounded-lg bg-gray-900'><div className={`text-5xl font-bold ${aqiDetails.color}`}>{maxAqiSensor.aqi}</div><div className={`text-lg font-semibold ${aqiDetails.color}`}>{aqiDetails.category}</div><div className='text-xs text-gray-400 mt-1'>Berdasarkan PM₂.₅ tertinggi</div></div></div>
              
              {/* KARTU PREDIKSI SVM YANG SUDAH SINKRON */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Status Prediksi</h3>
                  <div className={`flex items-center gap-3 p-3 rounded-md ${svmPrediction.color}`}>
                      {svmPrediction.icon}
                      <div><p className="font-bold">{svmPrediction.title}</p><p className="text-xs">{svmPrediction.desc}</p></div>
                  </div>
              </div>

              {/* FITUR BARU: Polutan Dominan & Estimasi Dispersi */}
              <div className="bg-gray-900/50 rounded-lg p-4 grid grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold text-xs text-cyan-400 mb-1 flex items-center gap-1"><Info size={14}/> Polutan Dominan</h4>
                    <p className="text-xl font-bold">{dominantPollutant}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-xs text-cyan-400 mb-1 flex items-center gap-1"><Hourglass size={14}/> Estimasi Dispersi</h4>
                    <p className="text-xl font-bold">{dispersalTime}</p>
                </div>
              </div>
              
              {/* DATA LINGKUNGAN DENGAN PEWARNAAN DINAMIS */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Data Lingkungan (BMKG)</h3>
                  <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Thermometer className="w-4 h-4" /> Suhu Udara</span> <span className={`font-bold transition-colors duration-500 ${getDynamicDataColor('temp', bmkgData.temp)}`}>{bmkgData.temp}°C</span></div>
                      <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Droplets className="w-4 h-4" /> Kelembaban</span> <span className={`font-bold transition-colors duration-500 ${getDynamicDataColor('humidity', bmkgData.humidity)}`}>{bmkgData.humidity}%</span></div>
                      <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Wind className="w-4 h-4" /> Angin</span> <span className={`font-bold transition-colors duration-500 ${getDynamicDataColor('wind', bmkgData.wind.speed)}`}>{bmkgData.wind.speed} km/j ({bmkgData.wind.deg}°)</span></div>
                      <div className="flex justify-between items-center"><span className="flex items-center gap-2"><WeatherIcon weather={bmkgData.weather} /> Cuaca</span> <span className="font-bold">{bmkgData.weather}</span></div>
                  </div>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock size={18}/> Prakiraan Cuaca 3 Jam ke Depan</h3>
                  <div className="flex justify-around text-center text-xs text-gray-400">
                      <div className="flex flex-col items-center gap-1"><span>+1 Jam</span><CloudSun size={22}/><span className="font-bold text-white">{(bmkgData.temp - 0.5).toFixed(1)}°C</span></div>
                      <div className="flex flex-col items-center gap-1"><span>+2 Jam</span><CloudRain size={22}/><span className="font-bold text-white">{(bmkgData.temp - 1).toFixed(1)}°C</span></div>
                      <div className="flex flex-col items-center gap-1"><span>+3 Jam</span><Sun size={22}/><span className="font-bold text-white">{bmkgData.temp.toFixed(1)}°C</span></div>
                  </div>
              </div>
              
              {/* MAWAR ANGIN DENGAN ANIMASI */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Wind size={18}/> Visualisasi Mawar Angin</h3>
                  <div className="h-40 wind-rose-container" style={{'--wind-angle': `${bmkgData.wind.deg}deg`}}>
                      <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={windRoseData}>
                              <PolarGrid stroke="#4A5568"/>
                              <PolarAngleAxis dataKey="direction" tick={{ fill: 'transparent' }} />
                              <PolarRadiusAxis angle={90} domain={[0, 40]} tick={false} axisLine={false} />
                              <Radar name="Kecepatan" dataKey="speed" stroke={aqiDetails.hex} fill={aqiDetails.hex} fillOpacity={0.7} className="radar-point"/>
                          </RadarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4"><h3 className="font-semibold mb-3 flex items-center gap-2"><Server size={18}/> Distribusi Status Sensor</h3><div className="text-xs space-y-2"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><div className="flex-grow">Baik ({sensorStatusDistribution.baik} sensor)</div></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="flex-grow">Sedang ({sensorStatusDistribution.sedang} sensor)</div></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><div className="flex-grow">Tidak Sehat ({sensorStatusDistribution.tidakSehat} sensor)</div></div></div></div>
              <div className="bg-gray-900/50 rounded-lg p-4 h-64"><h3 className="font-semibold mb-3">Tren Polutan Maksimum</h3><ResponsiveContainer width="100%" height="100%"><LineChart data={historicalData} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /><XAxis dataKey="time" stroke="#A0AEC0" fontSize={10} /><YAxis stroke="#A0AEC0" fontSize={10}/><RechartsTooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} /><Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/><Line type="monotone" dataKey="pm25" name="PM₂.₅" stroke="#8884d8" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="co" name="CO" stroke="#82ca9d" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="so2" name="SO₂" stroke="#ffc658" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
              
              {/* FITUR BARU: Status Data */}
              <div className="bg-gray-900/50 rounded-lg p-4 text-xs text-gray-400"><h3 className="font-semibold mb-3 flex items-center gap-2"><GitCommit size={18}/> Status Data</h3><div className="flex justify-between"><span>Sumber:</span> <span>Sensor & BMKG</span></div><div className="flex justify-between"><span>Pembaruan Terakhir:</span> <span>{new Date().toLocaleTimeString('id-ID')}</span></div></div>
        </div></div></div>
      </main>
      <footer className="bg-gray-900 border-t border-gray-700 p-4 text-center text-gray-400 text-xs">
          <div className="flex justify-center items-center gap-4"><University size={24}/><div><p>&copy; 2025 | Penelitian PNBP Universitas Malikussaleh</p><p className='font-bold'>Sistem Informasi Prediksi Sebaran Polutan Emisi Industri Menggunakan Metode SVM</p></div></div>
      </footer>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
        .wind-rose-container .recharts-polar-radius-axis { transform-origin: center; transition: transform 0.8s ease-in-out; transform: rotate(var(--wind-angle)); }
        @keyframes pulse-radar { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.2); } }
        .wind-rose-container .radar-point path { animation: pulse-radar 2s infinite; }
      `}</style>
    </div>
  );
};

export default PollutionHeatmapPlatform;