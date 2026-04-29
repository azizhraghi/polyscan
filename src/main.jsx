import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import PolyScan from './PolyScan.jsx';
import MobileScanner from './MobileScanner.jsx';

function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "#/mobile") return <MobileScanner />;
  return <PolyScan />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
