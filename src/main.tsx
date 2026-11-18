import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './modules/catalog/catalog.css';

const root = document.getElementById('root') ?? document.getElementById('app');
if (!root) throw new Error('Missing application mount point.');
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
