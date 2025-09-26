import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Droplets, AlertTriangle, CheckCircle, TrendingUp, Users, Calendar, Plus, X } from 'lucide-react';

// Data sumur yang diperbanyak dan lebih realistis, mengambil nama kecamatan di Aceh Utara
const initialWaterQualityData = [
  { id: 1, location: 'Baktiya', suhu: 28.5, kekeruhan: 2.1, salinitas: 0.3, ph: 7.2, do: 6.8, tds: 150, fe: 0.1, mn: 0.05, status: 'Baik', ika: 88 },
  { id: 2, location: 'Syamtalira Bayu', suhu: 29.2, kekeruhan: 4.5, salinitas: 0.5, ph: 6.8, do: 5.9, tds: 250, fe: 0.4, mn: 0.2, status: 'Sedang', ika: 72 },
  { id: 3, location: 'Tanah Luas', suhu: 27.8, kekeruhan: 1.8, salinitas: 0.2, ph: 7.5, do: 7.2, tds: 120, fe: 0.05, mn: 0.02, status: 'Baik', ika: 92 },
  { id: 4, location: 'Muara Batu', suhu: 30.1, kekeruhan: 6.2, salinitas: 0.8, ph: 6.5, do: 4.8, tds: 450, fe: 0.8, mn: 0.5, status: 'Buruk', ika: 58 },
  { id: 5, location: 'Meurah Mulia', suhu: 28.9, kekeruhan: 3.2, salinitas: 0.4, ph: 7.0, do: 6.5, tds: 180, fe: 0.2, mn: 0.1, status: 'Sedang', ika: 75 },
  { id: 6, location: 'Lhoksukon', suhu: 29.5, kekeruhan: 5.1, salinitas: 0.6, ph: 6.7, do: 5.2, tds: 320, fe: 0.6, mn: 0.3, status: 'Buruk', ika: 61 },
  { id: 7, location: 'Kuta Makmur', suhu: 28.1, kekeruhan: 1.5, salinitas: 0.2, ph: 7.3, do: 7.0, tds: 110, fe: 0.1, mn: 0.04, status: 'Baik', ika: 90 },
  { id: 8, location: 'Sawang', suhu: 28.6, kekeruhan: 2.5, salinitas: 0.3, ph: 7.1, do: 6.7, tds: 160, fe: 0.15, mn: 0.08, status: 'Baik', ika: 86 },
  { id: 9, location: 'Banda Baro', suhu: 29.8, kekeruhan: 4.8, salinitas: 0.5, ph: 6.9, do: 6.0, tds: 280, fe: 0.3, mn: 0.15, status: 'Sedang', ika: 71 },
];

const initialHistoricalData = [
  { tahun: 2020, supply: 450000, populasi: 520000, konsumsi: 380000 },
  { tahun: 2021, supply: 465000, populasi: 535000, konsumsi: 395000 },
  { tahun: 2022, supply: 478000, populasi: 550000, konsumsi: 410000 },
  { tahun: 2023, supply: 485000, populasi: 565000, konsumsi: 425000 },
  { tahun: 2024, supply: 492000, populasi: 580000, konsumsi: 440000 },
];

// SVM diperbarui dengan parameter baru (TDS, Fe, Mn)
class SimpleSVM {
  constructor() {
    // Menambahkan bobot untuk parameter baru
    this.weights = { suhu: -0.2, kekeruhan: -0.8, salinitas: -1.2, ph: 0.6, do: 1.4, tds: -0.5, fe: -1.0, mn: -0.8, bias: 0.1 };
  }

  predict(features) {
    const { suhu, kekeruhan, salinitas, ph, do: dissolved_oxygen, tds, fe, mn } = features;
    // Normalisasi fitur, termasuk yang baru
    const normalizedFeatures = {
      suhu: (suhu - 28) / 5,
      kekeruhan: kekeruhan / 10,
      salinitas: salinitas / 2,
      ph: (ph - 7) / 2,
      do: (dissolved_oxygen - 6) / 3,
      tds: (tds - 250) / 250, // Asumsi nilai tengah 250
      fe: fe / 0.5, // Asumsi batas atas 0.5
      mn: mn / 0.3 // Asumsi batas atas 0.3
    };
    const score = Object.keys(this.weights).reduce((acc, key) => {
      if (key === 'bias') return acc;
      return acc + (normalizedFeatures[key] || 0) * this.weights[key];
    }, 0) + this.weights.bias;

    const ika = Math.max(0, Math.min(100, 75 + score * 20));
    let status, viability;
    if (ika >= 80) { status = 'Baik'; viability = 'Layak'; }
    else if (ika >= 60) { status = 'Sedang'; viability = 'Perlu Perhatian'; }
    else { status = 'Buruk'; viability = 'Tidak Layak'; }
    return { ika: Math.round(ika), status, viability };
  }
}

const svm = new SimpleSVM();

function WaterQualityPlatform() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [waterQualityData, setWaterQualityData] = useState(initialWaterQualityData);
  const [predictionInput, setPredictionInput] = useState({ suhu: 28, kekeruhan: 2, salinitas: 0.3, ph: 7, do: 6.5, tds: 150, fe: 0.1, mn: 0.05 });
  const [populationInput, setPopulationInput] = useState(600000);
  const [predictions, setPredictions] = useState({});
  const [historicalData, setHistoricalData] = useState(initialHistoricalData);
  const [showAddWellModal, setShowAddWellModal] = useState(false);
  const [newWellData, setNewWellData] = useState({ location: '', suhu: 28, kekeruhan: 2, salinitas: 0.3, ph: 7, do: 6.5, tds: 150, fe: 0.1, mn: 0.05 });

  const handleAddWell = () => {
    const newId = waterQualityData.length > 0 ? Math.max(...waterQualityData.map(d => d.id)) + 1 : 1;
    const { status, ika } = svm.predict(newWellData);
    setWaterQualityData([...waterQualityData, { ...newWellData, id: newId, status, ika }]);
    setShowAddWellModal(false);
    setNewWellData({ location: '', suhu: 28, kekeruhan: 2, salinitas: 0.3, ph: 7, do: 6.5, tds: 150, fe: 0.1, mn: 0.05 });
  };

  const handleAddHistoricalData = () => {
    const lastYearData = historicalData[historicalData.length - 1];
    const newYear = {
      tahun: lastYearData.tahun + 1,
      populasi: Math.round(lastYearData.populasi * 1.025), // Asumsi pertumbuhan populasi 2.5%
      konsumsi: Math.round(lastYearData.konsumsi * 1.035), // Asumsi pertumbuhan konsumsi 3.5%
      supply: lastYearData.supply // Supply di set sama, untuk diinput manual
    };
    setHistoricalData([...historicalData, newYear]);
  };
  
  const handleSupplyChange = (tahun, value) => {
    const updatedData = historicalData.map(d =>
      d.tahun === tahun ? { ...d, supply: parseInt(value) || 0 } : d
    );
    setHistoricalData(updatedData);
  };

  const latestData = historicalData[historicalData.length - 1];

  useEffect(() => {
    const result = svm.predict(predictionInput);
    setPredictions(result);
  }, [predictionInput]);

  const calculateSupplyDuration = () => {
    if (!latestData) return 0;
    const currentSupply = latestData.supply;
    const currentConsumption = latestData.konsumsi;
    const growthRate = 0.035;
    let consumption = currentConsumption;
    let years = 0;
    while (currentSupply > consumption && years < 50) {
      years++;
      consumption *= (1 + growthRate);
    }
    return years;
  };

  const calculatePopulationCapacity = (population) => {
    if (!latestData) return { requiredSupply: 0, capacity: 0, sufficient: false };
    const currentSupply = latestData.supply;
    const perCapitaConsumption = 150;
    const annualPerCapita = perCapitaConsumption * 365 / 1000;
    const requiredSupply = population * annualPerCapita;
    const capacity = (requiredSupply / currentSupply) * 100;
    return {
      requiredSupply: Math.round(requiredSupply),
      capacity: Math.round(capacity),
      sufficient: capacity <= 100
    };
  };

  const supplyDuration = calculateSupplyDuration();
  const populationCapacity = calculatePopulationCapacity(populationInput);

  const statusColors = { 'Baik': 'text-green-600 bg-green-100', 'Sedang': 'text-yellow-600 bg-yellow-100', 'Buruk': 'text-red-600 bg-red-100' };
  const viabilityColors = { 'Layak': 'text-green-600', 'Perlu Perhatian': 'text-yellow-600', 'Tidak Layak': 'text-red-600' };

  const populationChartData = [
    { name: 'Kebutuhan Supply', value: populationCapacity.requiredSupply, color: '#F87171' },
    { name: 'Kapasitas Supply', value: latestData?.supply || 0, color: '#4ADE80' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal untuk tambah sumur */}
      {showAddWellModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Tambah Data Sumur Baru</h3>
              <button onClick={() => setShowAddWellModal(false)} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Lokasi Sumur" value={newWellData.location} onChange={e => setNewWellData({...newWellData, location: e.target.value})} className="col-span-2 px-3 py-2 border rounded-md" />
              {Object.keys(newWellData).filter(k => k !== 'location').map(key => (
                 <div key={key}>
                   <label className="text-sm font-medium capitalize">{key}</label>
                   <input type="number" step="0.1" value={newWellData[key]} onChange={e => setNewWellData({...newWellData, [key]: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-md mt-1" />
                 </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleAddWell} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-semibold">Simpan</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-blue-900 text-white shadow-lg">
        {/* ... (Header tidak berubah) ... */}
         <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Droplets className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">PDAM Tirta Mon Pasee</h1>
                <p className="text-blue-200">Platform Prediksi Kualitas Air</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-200">Kabupaten Aceh Utara</p>
              <p className="text-xs text-blue-300">Support Vector Machine (SVM)</p>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white shadow-md">
       {/* ... (Navigasi tidak berubah) ... */}
       <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[{ id: 'dashboard', label: 'Dashboard', icon: BarChart }, { id: 'prediction', label: 'Prediksi Sumur', icon: Droplets }, { id: 'supply', label: 'Durasi Supply', icon: TrendingUp }, { id: 'population', label: 'Analisis Populasi', icon: Users }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setSelectedTab(id)} className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${selectedTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-blue-600'}`}>
                <Icon className="h-4 w-4" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {selectedTab === 'dashboard' && (
          <div className="space-y-8">
            {/* ... (Kartu statistik tidak berubah, tapi data dinamis) ... */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sumur</p>
                    <p className="text-2xl font-bold text-gray-900">{waterQualityData.length}</p>
                  </div>
                  <Droplets className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sumur Layak</p>
                    <p className="text-2xl font-bold text-green-600">{waterQualityData.filter(w => w.ika >= 80).length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Rata-rata IKA</p>
                    <p className="text-2xl font-bold text-blue-600">{Math.round(waterQualityData.reduce((sum, w) => sum + w.ika, 0) / waterQualityData.length)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Durasi Supply</p>
                    <p className="text-2xl font-bold text-orange-600">{supplyDuration} Tahun</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Data Kualitas Air Sumur</h3>
                <button onClick={() => setShowAddWellModal(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
                  <Plus size={16} />
                  <span className="text-sm font-medium">Tambah Sumur</span>
                </button>
              </div>
              {/* Box tabel dengan gulir */}
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suhu (°C)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kekeruhan (NTU)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salinitas (%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DO (mg/L)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TDS (mg/L)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fe (mg/L)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mn (mg/L)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IKA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {waterQualityData.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.suhu}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.kekeruhan}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.salinitas}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.ph}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.do}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.tds}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.fe}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.mn}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{item.ika}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[item.status]}`}>{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Grafik Indeks Kualitas Air (IKA)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={waterQualityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ika" name="Indeks Kualitas Air" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {selectedTab === 'prediction' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Prediksi Kelayakan Sumur Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Input form dengan parameter baru */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.keys(predictionInput).map(key => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{key.replace('_', ' ')}</label>
                      <input 
                        type="number" 
                        value={predictionInput[key]} 
                        onChange={(e) => setPredictionInput({ ...predictionInput, [key]: parseFloat(e.target.value) })} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        step="0.1" 
                      />
                    </div>
                  ))}
                </div>
                {/* Hasil prediksi */}
                <div className="space-y-6">
                  {/* ... (Hasil Prediksi SVM tidak berubah) ... */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Hasil Prediksi SVM</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Indeks Kualitas Air (IKA):</span>
                        <span className="text-xl font-bold text-blue-600">{predictions.ika}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Status Kualitas:</span>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[predictions.status]}`}>{predictions.status}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Kelayakan Sumur:</span>
                        <span className={`text-sm font-semibold ${viabilityColors[predictions.viability]}`}>{predictions.viability}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-blue-900 mb-3">Interpretasi Hasil</h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      {predictions.ika >= 80 && (<p>• Sumur dalam kondisi baik dan layak untuk digunakan sebagai sumber air baku PDAM.</p>)}
                      {predictions.ika >= 60 && predictions.ika < 80 && (<p>• Sumur memerlukan perhatian khusus dan monitoring rutin sebelum digunakan.</p>)}
                      {predictions.ika < 60 && (<p>• Sumur tidak layak digunakan dan memerlukan treatment khusus atau pencarian lokasi alternatif.</p>)}
                      <p>• Model SVM menganalisis 8 parameter utama untuk akurasi yang lebih tinggi.</p>
                      <p>• Hasil prediksi dapat digunakan sebagai dasar pengambilan keputusan operasional PDAM.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedTab === 'supply' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Prediksi Durasi Supply Air</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Grafik Supply vs Konsumsi</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tahun" />
                      <YAxis />
                      <Tooltip formatter={(value) => [value.toLocaleString() + ' m³', '']} />
                      <Legend />
                      <Line type="monotone" dataKey="supply" stroke="#1E40AF" strokeWidth={2} name="Supply" />
                      <Line type="monotone" dataKey="konsumsi" stroke="#BE123C" strokeWidth={2} name="Konsumsi" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* ... (Kartu Prediksi Durasi & Rekomendasi tidak berubah) ... */}
                <div className="space-y-6">
                  <div className="bg-orange-50 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                      <h4 className="text-lg font-semibold text-orange-900">Prediksi Durasi Supply</h4>
                    </div>
                    <div className="text-3xl font-bold text-orange-600 mb-2">{supplyDuration} Tahun</div>
                    <p className="text-sm text-orange-800">Berdasarkan tren konsumsi saat ini dengan pertumbuhan 3.5% per tahun</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="text-md font-semibold text-blue-900 mb-3">Rekomendasi</h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li>• Perlu investasi infrastruktur air baru dalam 10-15 tahun</li>
                      <li>• Implementasi program konservasi air untuk memperpanjang durasi supply</li>
                      <li>• Eksplorasi sumber air alternatif di wilayah Aceh Utara</li>
                      <li>• Monitoring rutin kualitas dan kuantitas supply existing</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-white rounded-lg ">
                <div className="flex justify-between items-center px-6 pt-4 mb-4">
                  <h4 className="text-md font-semibold text-gray-800">Data Historis & Input Supply</h4>
                   <button onClick={handleAddHistoricalData} className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
                    <Plus size={16} />
                    <span className="text-sm font-medium">Tambah Tahun</span>
                  </button>
                </div>
                 {/* Box tabel historis dengan gulir */}
                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tahun</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Populasi</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konsumsi (m³)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supply (m³)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Input Supply (m³)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historicalData.map((item) => (
                        <tr key={item.tahun}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.tahun}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.populasi.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.konsumsi.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.supply.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              value={item.supply}
                              onChange={(e) => handleSupplyChange(item.tahun, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              step="1000"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedTab === 'population' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Analisis Kapasitas Supply vs Populasi</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Proyeksi Populasi Aceh Utara</label>
                    <input type="number" value={populationInput} onChange={(e) => setPopulationInput(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" step="1000" />
                  </div>
                   {/* Grafik Pie baru */}
                  <div className='bg-gray-50 p-4 rounded-lg'>
                    <h4 className="text-md font-semibold text-gray-800 mb-4 text-center">Visualisasi Kapasitas Supply</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={populationChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                             {populationChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(value) => value.toLocaleString() + ' m³'}/>
                          <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-6">
                  {/* ... (Kartu Analisis Kapasitas tidak berubah) ... */}
                   <div className={`rounded-lg p-6 ${populationCapacity.sufficient ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                      {populationCapacity.sufficient ? (<CheckCircle className="h-6 w-6 text-green-600" />) : (<AlertTriangle className="h-6 w-6 text-red-600" />)}
                      <h4 className={`text-lg font-semibold ${populationCapacity.sufficient ? 'text-green-900' : 'text-red-900'}`}>Analisis Kapasitas</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Populasi Target:</span>
                        <span className="font-medium">{populationInput.toLocaleString()} jiwa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Kebutuhan Supply:</span>
                        <span className="font-medium">{populationCapacity.requiredSupply.toLocaleString()} m³/tahun</span>
                      </div>
                       <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Kapasitas Tersedia:</span>
                        <span className="font-medium">{latestData?.supply.toLocaleString()} m³/tahun</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tingkat Kapasitas:</span>
                        <span className={`font-bold text-lg ${populationCapacity.capacity > 100 ? 'text-red-600' : 'text-green-600'}`}>{populationCapacity.capacity}%</span>
                      </div>
                      <div className="pt-2 border-t">
                        <span className={`text-sm font-medium ${populationCapacity.sufficient ? 'text-green-800' : 'text-red-800'}`}>{populationCapacity.sufficient ? '✓ Supply mencukupi untuk populasi target' : '✗ Supply tidak mencukupi - perlu penambahan kapasitas'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-12">
      {/* ... (Footer diperbarui dengan parameter baru) ... */}
       <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">PDAM Tirta Mon Pasee</h4>
              <p className="text-gray-300 text-sm">Platform prediksi kualitas air menggunakan algoritma Support Vector Machine (SVM) untuk optimalisasi pengelolaan sumber daya air di Kabupaten Aceh Utara.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Teknologi</h4>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>• Support Vector Machine (SVM)</li>
                <li>• React & Vite</li>
                <li>• Real-time Data Processing</li>
                <li>• Predictive Analytics</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Parameter Monitoring</h4>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>• Suhu, Kekeruhan, Salinitas, pH, DO</li>
                <li>• Total Dissolved Solids (TDS)</li>
                <li>• Kandungan Besi (Fe)</li>
                <li>• Kandungan Mangan (Mn)</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-300 text-sm">© 2025 PDAM Tirta Mon Pasee - Universitas Malikussaleh</p>
              <p className="text-gray-400 text-xs mt-2 md:mt-0">Penelitian PNBP 2025 - Kode Referensi: 25.01.FT.52</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default WaterQualityPlatform;