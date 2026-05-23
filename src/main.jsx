import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

window.addEventListener('error', (event) => {
  document.body.innerHTML += `<div style="position:fixed;top:0;left:0;z-index:9999;background:red;color:white;padding:20px;width:100%;">${event.error?.stack || event.message}</div>`;
});

createRoot(document.getElementById('root')).render(
  <App />
)
