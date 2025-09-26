// Nama File: src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// =======================================================
//          PERBAIKAN DEFINITIF UNTUK IKON PETA
// =======================================================
// Dengan menempatkan ini di main.jsx, kita memastikan
// konfigurasi ikon Leaflet sudah benar sebelum komponen
// peta manapun sempat dirender.
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import markerShadowPng from "leaflet/dist/images/marker-shadow.png";

Icon.Default.mergeOptions({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng
});
// =======================================================

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);