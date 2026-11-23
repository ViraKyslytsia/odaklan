import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import './styles/toast.css';
import { ToastProvider } from './context/ToastContext.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <LanguageProvider>
            <ToastProvider>
                <BrowserRouter>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </BrowserRouter>
            </ToastProvider>
        </LanguageProvider>
    </StrictMode>
);
        