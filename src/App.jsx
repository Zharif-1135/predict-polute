// Nama File: App.jsx (Versi Perbaikan Fullscreen)

import React from 'react';
import PollutionHeatmapPlatform from './PollutionHeatmapPlatform';

// Pastikan Anda juga mengimpor file CSS utama jika belum
import './index.css';

function App() {
  // Langsung render komponen platform tanpa pembungkus apapun
  return (
    <PollutionHeatmapPlatform />
  );
}

export default App;