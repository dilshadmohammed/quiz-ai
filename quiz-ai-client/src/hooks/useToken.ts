import { useState, useEffect } from 'react';

const TOKEN_KEY = 'token';

export function useToken() {
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem(TOKEN_KEY);
    });

    useEffect(() => {
        const handleStorage = () => {
            setToken(localStorage.getItem(TOKEN_KEY));
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const saveToken = (newToken: string) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
    };

    const removeToken = () => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
    };

    return { token, saveToken, removeToken };
}