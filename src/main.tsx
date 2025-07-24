import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { OKRDataProvider } from './hooks/useOKRData';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OKRDataProvider>
      <App />
    </OKRDataProvider>
  </StrictMode>
);
