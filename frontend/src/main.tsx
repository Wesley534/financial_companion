// frontend/src/main.tsx (Updated)

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // <-- ADD

const queryClient = new QueryClient(); // <-- ADD

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}> {/* <-- WRAP APP */}
      <App />
    </QueryClientProvider> {/* <-- WRAP APP */}
  </React.StrictMode>,
);