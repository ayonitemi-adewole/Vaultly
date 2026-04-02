import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';

interface ThemeSwitcherProps {
  variant?: 'button' | 'icon';
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = 'icon',
  className = ''
}) => {
  const { theme, toggleTheme } = useTheme();

  if (variant === 'button') {
    return (
      <Button
        onClick={toggleTheme}
        variant="outline"
        size="sm"
        className={`gap-2 ${className}`}
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </Button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-700 transition hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
};