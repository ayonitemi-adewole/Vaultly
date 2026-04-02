import AppSidebar from '@/components/shared/app-sidebar';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

const Settings = () => {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <AppSidebar />
      <main className="ml-64 p-8">
        <div className="max-w-4xl space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5 dark:bg-slate-900">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Personalize your Vaultly experience.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Theme</h2>
            <p className="mt-1 text-sm text-muted-foreground">Switch between light and dark mode.</p>
            <div className="mt-4">
              <ThemeSwitcher variant="button" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;