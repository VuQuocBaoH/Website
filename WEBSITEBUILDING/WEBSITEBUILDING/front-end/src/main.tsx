import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js') 
      .then(registration => {
        console.log('thành công:', registration);
      })
      .catch(registrationError => {
        console.error('thất bại:', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);


