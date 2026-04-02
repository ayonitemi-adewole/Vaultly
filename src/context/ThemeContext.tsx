import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setThemeMode: () => {},
  isLoading: false,
});

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);

  const applyTheme = (value: Theme) => {
    const root = document.documentElement;

    // Add transition class for smooth animation
    root.style.setProperty('--theme-transition', 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease');

    if (value === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    setTheme(value);
    localStorage.setItem('vaultly-theme', value);

    // Save to Firebase if user is authenticated
    if (auth.currentUser) {
      saveThemeToFirebase(value);
    }

    // Remove transition class after animation
    setTimeout(() => {
      root.style.removeProperty('--theme-transition');
    }, 300);
  };

  const saveThemeToFirebase = async (themeValue: Theme) => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid, 'preferences', 'theme');
      await setDoc(userRef, {
        theme: themeValue,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving theme to Firebase:', error);
    }
  };

  const loadThemeFromFirebase = async (): Promise<Theme | null> => {
    if (!auth.currentUser) return null;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid, 'preferences', 'theme');
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        return docSnap.data().theme as Theme;
      }
    } catch (error) {
      console.error('Error loading theme from Firebase:', error);
    }

    return null;
  };

  const toggleTheme = () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setThemeMode = (newTheme: Theme) => applyTheme(newTheme);

  useEffect(() => {
    const initializeTheme = async () => {
      setIsLoading(true);

      try {
        // First try Firebase preference
        const firebaseTheme = await loadThemeFromFirebase();
        if (firebaseTheme) {
          applyTheme(firebaseTheme);
          setIsLoading(false);
          return;
        }

        // Then try localStorage
        const stored = localStorage.getItem('vaultly-theme') as Theme | null;
        if (stored === 'dark' || stored === 'light') {
          applyTheme(stored);
          setIsLoading(false);
          return;
        }

        // Finally, system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
      } catch (error) {
        console.error('Error initializing theme:', error);
        // Fallback to light mode
        applyTheme('light');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
