'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function NavigationTracker() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Log user activity when navigating to a page
    useEffect(() => {
        if (!pathname || !user) return;

        // Extract page name from pathname
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = 'Home';
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];
            pageName = pathSegment || 'Home';
        }

        // Simulación de logging - en producción se implementaría con el backend
        console.log(`User navigated to: ${pageName}`);
    }, [pathname, user]);

    return null;
}