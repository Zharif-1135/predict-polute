// Nama File: PollutionHeatmapPlatform.jsx (Versi Profesional dengan Perbaikan Total UI & Fungsionalitas)
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, ZoomControl, CircleMarker } from 'react-leaflet';
import Papa from 'papaparse';
import L from 'leaflet';

// --- Impor Library & Aset ---
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Ikon & Aset
import { Upload, Wind, Thermometer, Droplets, Factory, ChevronLeft, ChevronRight, AlertTriangle, Info, Loader, Play, Pause, RotateCcw, Calendar, Cloud, Sun, CloudRain, Zap, Haze, CloudDrizzle, Atom, BarChart2, ListOrdered, Building, FileUp, ArrowUp, XCircle } from 'lucide-react';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";
import markerIcon2xPng from 'leaflet/dist/images/marker-icon-2x.png';

// --- Registrasi & Konfigurasi Awal ---
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Perbaikan bug ikon default Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2xPng, iconUrl: markerIconPng, shadowUrl: markerShadowPng });

// --- Ikon Kustom untuk Peta ---
const redFactoryIcon = L.divIcon({
  html: `<div style="background-color: #dc2626; width: 30px; height: 30px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 20px; color: white; border: 2px solid #fef2f2; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">🏭</div>`,
  className: 'dummy', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30]
});

const getVillageIcon = (isHighlighted = false) => L.divIcon({
    html: `<div style="font-size: 20px; transition: transform 0.2s ease-in-out; transform: scale(${isHighlighted ? 1.5 : 1}); transform-origin: bottom;">📍</div>`,
    className: 'dummy',
    iconSize: [20, 20],
    iconAnchor: [10, 20],
    popupAnchor: [0, -20]
});


// --- KONFIGURASI UTAMA & DATA DESA ---
const PT_COORDINATES = [4.44, 97.97];
const MAP_ZOOM_LEVEL = 12;
const VILLAGES_DATA = [
    { name: "Alue Ie Puteh", lat: 4.455, lon: 97.985 }, { name: "Blang Nisam", lat: 4.421, lon: 97.965 },
    { name: "Seuneubok Antara", lat: 4.470, lon: 97.950 }, { name: "Gampong Keude", lat: 4.410, lon: 98.010 },
    { name: "Paya Meuligoe", lat: 4.485, lon: 98.005 }, { name: "Tualang Dalam", lat: 4.390, lon: 97.940 },
    { name: "Buket Rata", lat: 4.435, lon: 98.021 }, { name: "Meurandeh", lat: 4.491, lon: 97.962 },
    { name: "Alue Gampong", lat: 4.385, lon: 98.001 }, { name: "Panton Rayeuk", lat: 4.462, lon: 97.925 },
];

// --- KOMPONEN-KOMPONEN BANTU ---
const CircleManager = ({ points }) => {
    return (
        <>
            {points.map((point, index) => (
                <CircleMarker
                    key={index}
                    center={[point[0], point[1]]}
                    radius={Math.max(5, Math.min(25, point[2] / 5))}
                    pathOptions={{
                        color: point[2] > 100 ? '#dc2626' : point[2] > 50 ? '#f59e0b' : '#10b981',
                        fillColor: point[2] > 100 ? '#dc2626' : point[2] > 50 ? '#f59e0b' : '#10b981',
                        fillOpacity: 0.6,
                        weight: 2,
                        opacity: 0.8
                    }}
                >
                    <Popup>
                        <div className="text-sm">
                            <div className="font-bold">Polusi Estimasi</div>
                            <div>PM10: {point[2].toFixed(2)} mg/Nm³</div>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </>
    );
};

const WindArrow = ({ degrees, speed }) => {
    if (typeof degrees !== 'number' || typeof speed !== 'number') return null;
    return (
        <div className="absolute bottom-4 left-4 z-[1000] p-2 bg-gray-800/70 rounded-lg backdrop-blur-sm text-center">
            <ArrowUp size={30} style={{ transform: `rotate(${degrees}deg)`, transition: 'transform 0.5s ease-out' }} className="text-white mx-auto"/>
            <p className="text-xs font-mono mt-1">{speed.toFixed(1)} m/s</p>
        </div>
    );
};

const DataItem = ({ icon, label, value, unit, color }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
            {icon}
            <span className="text-gray-300">{label}</span>
        </div>
        <div className="font-mono text-white" style={{color: color}}>{value ?? 'N/A'} <span className="text-gray-500 text-xs">{unit}</span></div>
    </div>
);

const FileUploader = ({ onFileUpload, title, requiredFileName, isUploaded }) => {
    const [isDragging, setIsDragging] = useState(false); const inputRef = useRef(null);
    const handleFile = (file) => { if (file && file.name === requiredFileName) { Papa.parse(file, { header: true, skipEmptyLines: true, complete: (results) => onFileUpload(results.data) }); } else { alert(`File tidak valid. Harap unggah file dengan nama "${requiredFileName}"`); } };
    const handleDragEvents = (e, dragging) => { e.preventDefault(); e.stopPropagation(); setIsDragging(dragging); };
    const handleDrop = (e) => { handleDragEvents(e, false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
    return (<div onClick={() => inputRef.current.click()} onDrop={handleDrop} onDragOver={(e) => handleDragEvents(e, true)} onDragEnter={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${isUploaded ? 'border-green-500 bg-green-900/50' : 'border-gray-600 hover:border-blue-500 hover:bg-gray-800/50'} ${isDragging ? 'border-blue-500 bg-blue-900/50' : ''}`}><FileUp size={20} className={isUploaded ? "text-green-400" : "text-gray-400"} /> <input type="file" ref={inputRef} onChange={(e) => handleFile(e.target.files[0])} accept=".csv" className="hidden" /> <p className={`mt-2 text-xs font-semibold ${isUploaded ? "text-green-300" : "text-gray-300"}`}>{title}</p> <p className="text-xs text-gray-500">{requiredFileName}</p> {isUploaded && <p className="text-xs text-green-400 mt-1">✓ Berhasil</p>} </div>);
};

// --- KOMPONEN UTAMA ---
const PollutionHeatmapPlatform = () => {
  const [bmkgData, setBmkgData] = useState([]);
  const [pollutionData, setPollutionData] = useState([]);
  const [mergedData, setMergedData] = useState([]);
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedVillage, setHighlightedVillage] = useState(null);
  
  const animationIntervalRef = useRef(null);
  const mapRef = useRef(null);

  const mergeData = useCallback(() => { 
    if (bmkgData.length === 0 || pollutionData.length === 0) return; 
    setIsLoading(true); 
    setTimeout(() => { // Simulasi loading untuk UX
      const pollutionMap = new Map(pollutionData.map(item => [item.Tanggal, item])); 
      const combinedData = bmkgData
        .map(bmkgItem => (pollutionMap.has(bmkgItem.Tanggal) ? { ...bmkgItem, ...pollutionMap.get(bmkgItem.Tanggal) } : null))
        .filter(Boolean)
        .sort((a, b) => new Date(a.Tanggal) - new Date(b.Tanggal)); 
      setMergedData(combinedData); 
      setCurrentDateIndex(0); 
      setIsLoading(false); 
    }, 500);
  }, [bmkgData, pollutionData]);
  
  useEffect(mergeData, [mergeData]);
  
  const handleNextDay = useCallback(() => { setCurrentDateIndex(prev => { if (prev >= mergedData.length - 1) { setIsPlaying(false); return prev; } return prev + 1; }); }, [mergedData.length]);
  const handlePrevDay = () => setCurrentDateIndex(prev => Math.max(prev - 1, 0));
  const handleReset = () => { setBmkgData([]); setPollutionData([]); setMergedData([]); setCurrentDateIndex(0); setIsPlaying(false); };

  useEffect(() => { if (isPlaying) { animationIntervalRef.current = setInterval(() => { handleNextDay(); }, 200); } else { clearInterval(animationIntervalRef.current); } return () => clearInterval(animationIntervalRef.current); }, [isPlaying, handleNextDay]);

  const currentData = useMemo(() => mergedData[currentDateIndex] || {}, [mergedData, currentDateIndex]);
  const getPollutionLevel = useCallback((pm10) => { const value = parseFloat(pm10); if (value > 150) return { label: 'Tidak Sehat', color: '#ef4444' }; if (value > 50) return { label: 'Sedang', color: '#f97316' }; if (value > 0) return { label: 'Baik', color: '#22c55e' }; return { label: 'N/A', color: '#9ca3af' }; }, []);
  
  const pollutionSpreadPoints = useMemo(() => { 
    if (!currentData['Partikulat (PM10) (mg/Nm3)']) return []; 
    const pm10 = parseFloat(currentData['Partikulat (PM10) (mg/Nm3)']); 
    const windSpeed = parseFloat(currentData.BMKG_WindSpeed_m_s) || 1; 
    const windRad = (parseFloat(currentData.BMKG_WindDir_deg) - 90) * (Math.PI / 180); 
    
    return Array.from({ length: 100 }, (_, i) => { 
      const distance = (i + 1) * 1000; // Spacing circles every 1km
      const angle = Math.random() * 2 * Math.PI; 
      const dX = distance * Math.cos(angle); 
      const dY = distance * Math.sin(angle) * 0.5; // Elliptical spread
      const rotatedX = dX * Math.cos(windRad) - dY * Math.sin(windRad); 
      const rotatedY = dX * Math.sin(windRad) + dY * Math.cos(windRad); 
      const lat = PT_COORDINATES[0] + rotatedY / 111111; 
      const lon = PT_COORDINATES[1] + rotatedX / (111111 * Math.cos(PT_COORDINATES[0] * Math.PI / 180)); 
      const intensity = pm10 * Math.exp(-distance / (3000 * Math.max(windSpeed, 1))); 
      return intensity > 5 ? [lat, lon, intensity] : null; 
    }).filter(Boolean); 
  }, [currentData]);
  
  const getWeatherIcon = (weather) => { const w = weather?.toLowerCase() || ''; if (w.includes('hujan ringan')) return <CloudDrizzle size={18} className="text-blue-400" />; if (w.includes('hujan')) return <CloudRain size={18} className="text-blue-400" />; if (w.includes('petir')) return <Zap size={18} className="text-yellow-400" />; if (w.includes('berawan')) return <Cloud size={18} className="text-gray-400" />; if (w.includes('cerah')) return <Sun size={18} className="text-yellow-300" />; return <Haze size={18} className="text-gray-500" />; };
  const allFilesUploaded = bmkgData.length > 0 && pollutionData.length > 0;

  const rankedVillages = useMemo(() => VILLAGES_DATA.map(village => { const pm10Source = parseFloat(currentData['Partikulat (PM10) (mg/Nm3)']); const windSpeed = parseFloat(currentData.BMKG_WindSpeed_m_s) || 1; const windDir = parseFloat(currentData.BMKG_WindDir_deg) || 0; const dx = (village.lon - PT_COORDINATES[1]) * (111111 * Math.cos(PT_COORDINATES[0] * Math.PI/180)); const dy = (village.lat - PT_COORDINATES[0]) * 111111; const distance = Math.sqrt(dx*dx + dy*dy); const angleToVillage = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; const windFactor = Math.cos(Math.abs(windDir - angleToVillage) * Math.PI / 180); const estimatedPm10 = (windFactor > 0) ? pm10Source * windFactor * Math.exp(-distance / (2500 * Math.max(windSpeed, 1))) : 0; return { ...village, pm10: Math.max(0, estimatedPm10) }; }).sort((a, b) => b.pm10 - a.pm10), [currentData]);

  const chartData = useMemo(() => ({
    labels: mergedData.map(d => new Date(d.Tanggal).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Konsentrasi PM10 (mg/Nm³)',
      data: mergedData.map(d => parseFloat(d['Partikulat (PM10) (mg/Nm3)']) || 0),
      borderColor: 'rgba(239, 68, 68, 0.8)',
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      pointBackgroundColor: mergedData.map((_, index) => index === currentDateIndex ? '#ffffff' : 'rgba(239, 68, 68, 0.8)'),
      pointBorderColor: mergedData.map((_, index) => index === currentDateIndex ? '#ef4444' : 'rgba(239, 68, 68, 0.8)'),
      pointRadius: mergedData.map((_, index) => index === currentDateIndex ? 6 : 3),
      pointBorderWidth: mergedData.map((_, index) => index === currentDateIndex ? 2 : 1),
      fill: true,
      tension: 0.4,
    }],
  }), [mergedData, currentDateIndex]);

  const chartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: '#9ca3af' }, grid: { color: '#4b5563' } }, x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1f2937', titleColor: '#e5e7eb' } } };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white font-sans text-sm overflow-hidden">
      
      {/* ================= PANEL KIRI (DATA POLUSI) ================= */}
      <div className={`z-20 flex flex-col h-full w-96 bg-gray-800/60 backdrop-blur-sm border-r border-gray-700 shadow-2xl p-4 gap-4 transition-opacity duration-500 ${!allFilesUploaded && 'opacity-50 pointer-events-none'}`}>
        <div className="text-center pb-3 border-b border-gray-700">
          <h2 className="text-lg font-bold flex items-center justify-center gap-2"><Atom size={20} className="text-red-400"/> Data Polusi Udara</h2>
          <p className="text-xs text-gray-400">Lokasi: {currentData['Lokasi'] || '...'}</p>
        </div>
        
        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
            <div>
              <h3 className="font-semibold text-base mb-2">Parameter Polutan</h3>
              <DataItem icon={<Atom size={16} className="text-red-400"/>} label="Partikulat (PM10)" value={parseFloat(currentData['Partikulat (PM10) (mg/Nm3)'])?.toFixed(2)} unit="mg/Nm³" color={getPollutionLevel(currentData['Partikulat (PM10) (mg/Nm3)']).color} />
              <DataItem icon={<Atom size={16} className="text-yellow-400"/>} label="SO2" value={parseFloat(currentData['SO2 (mg/Nm3)'])?.toFixed(2)} unit="mg/Nm³" />
              <DataItem icon={<Atom size={16} className="text-orange-400"/>} label="NOx" value={parseFloat(currentData['NOx (mg/Nm3)'])?.toFixed(2)} unit="mg/Nm³" />
              <DataItem icon={<Atom size={16} className="text-blue-400"/>} label="CO" value={parseFloat(currentData['CO (mg/Nm3)'])?.toFixed(2)} unit="mg/Nm³" />
              <DataItem icon={<Atom size={16} className="text-green-400"/>} label="CO2" value={parseFloat(currentData['CO2 (%vol)'])?.toFixed(2)} unit="%vol" />
              <DataItem icon={<Atom size={16} className="text-purple-400"/>} label="HC/VOC" value={parseFloat(currentData['HC/VOC (mg/Nm3)'])?.toFixed(2)} unit="mg/Nm³" />
              <DataItem icon={<Atom size={16} className="text-pink-400"/>} label="H2S" value={parseFloat(currentData['H2S (mg/Nm3)'])?.toFixed(2)} unit="mg/Nm³" />
              <DataItem icon={<Atom size={16} className="text-cyan-400"/>} label="NH3" value={parseFloat(currentData['NH3 (mg/Nm3)'])?.toFixed(2)} unit="mg/Nm³" />
              <DataItem icon={<Atom size={16} className="text-indigo-400"/>} label="Pb" value={parseFloat(currentData['Pb (mg/Nm3)'])?.toFixed(2)} unit="mg/Nm³" />
            </div>

            <div>
                <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                    Ranking Desa Terdampak
                    <span title="Estimasi dampak PM10 di setiap desa berdasarkan kekuatan sumber emisi, kecepatan & arah angin, serta jarak."><Info size={14} className="text-gray-500 cursor-help" /></span>
                </h3>
                 <div className="text-xs space-y-1.5 pl-2 max-h-36 overflow-y-auto">
                    {rankedVillages.map((village, index) => (
                      <div key={village.name} onMouseEnter={() => setHighlightedVillage(village.name)} onMouseLeave={() => setHighlightedVillage(null)} className="flex justify-between items-center p-1 rounded-md hover:bg-gray-700/50 transition-colors cursor-pointer">
                        <span className='truncate pr-2'>{index + 1}. {village.name}</span>
                        <span className="font-bold font-mono" style={{color: getPollutionLevel(village.pm10).color}}>{village.pm10.toFixed(2)}</span>
                      </div>
                    ))}
                 </div>
            </div>

            {allFilesUploaded && (
                <div>
                    <h3 className="font-semibold text-base mb-2">Tren Historis PM10</h3>
                    <div className="h-40">
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* ================= AREA PETA (TENGAH) ================= */}
      <main className="flex-grow relative">
        <MapContainer ref={mapRef} center={PT_COORDINATES} zoom={MAP_ZOOM_LEVEL} className="h-full w-full bg-gray-700" zoomControl={false}>
          <ZoomControl position="bottomright" />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satelit"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="&copy; Esri"/></LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Peta Jalan"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap'/></LayersControl.BaseLayer>
          </LayersControl>
          
          {allFilesUploaded && pollutionSpreadPoints.length > 0 && <CircleManager points={pollutionSpreadPoints} />}
          <Marker position={PT_COORDINATES} icon={redFactoryIcon}><Popup><b>PT Medco E&P Malaka</b><br/>Lokasi Sumber Emisi</Popup></Marker>
          {VILLAGES_DATA.map(village => ( <Marker key={village.name} position={[village.lat, village.lon]} icon={getVillageIcon(highlightedVillage === village.name)}> <Popup> <div className="text-sm"> <div className="font-bold border-b pb-1 mb-1">{village.name}</div></div></Popup> </Marker> ))}
        </MapContainer>

        {isLoading && (<div className="absolute inset-0 z-[1001] bg-gray-900/70 flex flex-col items-center justify-center"><Loader size={48} className="animate-spin text-blue-400" /><p className="mt-4 text-lg">Menggabungkan & Memproses Data...</p></div>)}

        {!allFilesUploaded && !isLoading && (
            <div className="absolute inset-0 z-[1000] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center text-center p-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Selamat Datang di Platform Heatmap Polusi</h1>
                    <p className="text-gray-300 max-w-xl mx-auto">Untuk memulai analisis, silakan unggah <strong className="text-white">data polusi</strong> dan <strong className="text-white">data BMKG</strong> menggunakan panel di sebelah kanan.</p>
                </div>
            </div>
        )}
        
        {allFilesUploaded && (
            <>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1002] w-full max-w-4xl px-4">
                    <div className="bg-gray-800/90 backdrop-blur-md rounded-lg p-4 shadow-2xl border border-gray-600">
                        <div className="flex items-center gap-4 justify-between mb-3">
                            <button onClick={handlePrevDay} disabled={currentDateIndex === 0} className="p-2.5 rounded-full bg-gray-700/70 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-600"><ChevronLeft size={22}/></button>
                            <div className="flex-grow text-center">
                                <p className="font-semibold text-xl text-white">{new Date(currentData.Tanggal || Date.now()).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                <p className="text-sm text-gray-300 mt-1">Data ke-{currentDateIndex + 1} dari {mergedData.length} hari</p>
                            </div>
                            <DatePicker 
                                selected={new Date(currentData.Tanggal || Date.now())} 
                                onChange={(date) => { 
                                    const dateString = date.toISOString().split('T')[0]; 
                                    const index = mergedData.findIndex(d => d.Tanggal === dateString); 
                                    if (index !== -1) setCurrentDateIndex(index); 
                                }} 
                                dateFormat="dd/MM/yyyy" 
                                customInput={<button className="p-2.5 rounded-full bg-gray-700/70 hover:bg-blue-600 transition-all duration-200 border border-gray-600" title="Pilih Tanggal"><Calendar size={22}/></button>} 
                            />
                            <button onClick={() => setIsPlaying(!isPlaying)} className="p-2.5 rounded-full bg-gray-700/70 hover:bg-green-600 transition-all duration-200 border border-gray-600" title={isPlaying ? "Pause" : "Play"}> 
                                {isPlaying ? <Pause size={22}/> : <Play size={22}/>} 
                            </button>
                            <button onClick={handleNextDay} disabled={currentDateIndex >= mergedData.length - 1} className="p-2.5 rounded-full bg-gray-700/70 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border border-gray-600"><ChevronRight size={22}/></button>
                        </div>
                        <div className="relative">
                            <input 
                                type="range" 
                                min="0" 
                                max={mergedData.length > 0 ? mergedData.length - 1 : 0} 
                                value={currentDateIndex} 
                                onChange={(e) => setCurrentDateIndex(Number(e.target.value))} 
                                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb" 
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentDateIndex / (mergedData.length - 1)) * 100}%, #4b5563 ${(currentDateIndex / (mergedData.length - 1)) * 100}%, #4b5563 100%)`
                                }}
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-2">
                                <span>{mergedData[0]?.Tanggal ? new Date(mergedData[0].Tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}</span>
                                <span>{mergedData[mergedData.length - 1]?.Tanggal ? new Date(mergedData[mergedData.length - 1].Tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <WindArrow degrees={parseFloat(currentData.BMKG_WindDir_deg)} speed={parseFloat(currentData.BMKG_WindSpeed_m_s)} />
            </>
        )}
      </main>

      {/* ================= PANEL KANAN (DATA BMKG) ================= */}
      <div className="z-20 flex flex-col h-full w-96 bg-gray-800/60 backdrop-blur-sm border-l border-gray-700 shadow-2xl p-4 gap-4">
        <div className="text-center pb-3 border-b border-gray-700">
            <h2 className="text-lg font-bold flex items-center justify-center gap-2"><Cloud size={20} className="text-blue-300"/> Data Meteorologi</h2>
            <p className="text-xs text-gray-400">Sumber: BMKG</p>
        </div>
        
        <div className={`flex-grow overflow-y-auto space-y-4 pr-2 transition-opacity duration-500 ${!allFilesUploaded && 'opacity-50 pointer-events-none'}`}>
            <div>
                <h3 className="font-semibold text-base mb-2">Parameter Cuaca Hari Ini</h3>
                <DataItem icon={<Thermometer size={16} className="text-red-400"/>} label="Suhu" value={currentData.BMKG_Temp_C} unit="°C" />
                <DataItem icon={<Droplets size={16} className="text-blue-400"/>} label="Kelembapan" value={currentData.BMKG_RH_pct} unit="%" />
                <DataItem icon={<Wind size={16} className="text-green-400"/>} label="Kecepatan Angin" value={currentData.BMKG_WindSpeed_m_s} unit="m/s" />
                <DataItem icon={<Wind size={16} className="text-green-400"/>} label="Arah Angin" value={currentData.BMKG_WindDir_deg} unit="°" />
                <DataItem icon={getWeatherIcon(currentData.BMKG_Weather)} label="Cuaca" value={currentData.BMKG_Weather} />
                <DataItem icon={<CloudRain size={16} className="text-cyan-400"/>} label="Curah Hujan" value={currentData.BMKG_Precip_mm} unit="mm" />
            </div>
        </div>

        <div className="flex flex-col pt-2 border-t border-gray-700">
            <h3 className="font-semibold text-base mb-2">Manajemen Data</h3>
             <div className="grid grid-cols-2 gap-3">
                <FileUploader onFileUpload={setPollutionData} title="Data Polusi" requiredFileName="data_pollution.csv" isUploaded={pollutionData.length > 0} />
                <FileUploader onFileUpload={setBmkgData} title="Data BMKG" requiredFileName="data_bmkg.csv" isUploaded={bmkgData.length > 0} />
             </div>
             {allFilesUploaded && <button onClick={handleReset} className="mt-3 w-full flex items-center justify-center gap-2 text-xs py-2 px-4 bg-red-800/70 hover:bg-red-700 rounded-lg transition-colors"><XCircle size={14}/> Reset Data & Mulai Ulang</button>}
        </div>
      </div>
    </div>
  );
};

export default PollutionHeatmapPlatform;