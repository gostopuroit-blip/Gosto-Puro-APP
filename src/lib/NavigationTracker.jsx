import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    useEffect(() => {
        if (!isAuthenticated) return;
        const pathname = location.pathname;
        let pageName;
        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];
            const pageKeys = Object.keys(Pages);
            pageName = pageKeys.find(k => k.toLowerCase() === pathSegment.toLowerCase()) || null;
        }
        // Tracking de navegação pode ser adicionado aqui via app_analytics no futuro
        void pageName;
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}
