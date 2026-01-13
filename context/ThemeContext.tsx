import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeColors {
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    cardGradientStart: string;
    cardGradientEnd: string;
    inputBackground: string;
    placeholder: string;
    notification: string;
}

const lightColors: ThemeColors = {
    background: '#f8f9fa', // Soft light gray background
    surface: '#ffffff', // Pure white for cards
    primary: '#3572EF', // Brand blue for primary buttons and accents
    text: '#0f172a', // Rich dark blue-gray for text
    textSecondary: '#64748b', // Muted slate for secondary text
    border: '#e2e8f0', // Subtle border
    success: '#10b981', // Modern green
    error: '#ef4444', // Modern red
    cardGradientStart: '#ffffff',
    cardGradientEnd: '#f8fafc',
    inputBackground: '#f1f5f9', // Light slate background
    placeholder: '#94a3b8', // Muted placeholder
    notification: '#ec4899', // Modern pink
};

const darkColors: ThemeColors = {
    background: '#0a0a1a',
    surface: 'rgba(255, 255, 255, 0.05)',
    primary: '#00ffff', // Cyan
    text: '#ffffff',
    textSecondary: '#999999',
    border: 'rgba(255, 255, 255, 0.1)',
    success: '#00ff00',
    error: '#ff4444',
    cardGradientStart: '#1a1a2e',
    cardGradientEnd: '#0a0a1a',
    inputBackground: 'rgba(255, 255, 255, 0.05)',
    placeholder: '#666666',
    notification: '#ff00aa', // Neon Pink
};

interface ThemeContextType {
    theme: Theme;
    colors: ThemeColors;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [theme, setTheme] = useState<Theme>(systemScheme === 'dark' ? 'dark' : 'light');

    // Default to dark if system scheme is not available or user prefers dark
    useEffect(() => {
        if (systemScheme) {
            setTheme(systemScheme === 'dark' ? 'dark' : 'light');
        } else {
            setTheme('dark'); // Default to dark/cyberpunk as per original design
        }
    }, [systemScheme]);

    const colors = theme === 'dark' ? darkColors : lightColors;

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
