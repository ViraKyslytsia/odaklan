import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource-variable/space-grotesk';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/home.css';
import './styles/exams.css';
import './styles/lang.css';
import './styles/dialogs.css';
import './styles/tasks.css';
import './styles/stats.css';
import './styles/schedule.css';
import './styles/page-art.css';
import './styles/social.css';
import './styles/admin.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import './styles/toast.css';
import { ToastProvider } from './context/ToastContext.jsx';
import { api } from './api';
// будим сервер на бесплатном хостинге заранее, пока человек открывает сайт и вводит пароль
api.health().catch(() => { });

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <LanguageProvider>
            <ToastProvider>
                <HashRouter>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </HashRouter>
            </ToastProvider>
        </LanguageProvider>
    </StrictMode>
);
        