import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GlobalThemeSettings } from './components/GlobalThemeSettings';
import './styles.css';
import './live.css';
import './operations.css';
import './components/role-portal.css';
import './components/card-assignment.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <GlobalThemeSettings />
  </React.StrictMode>,
);
