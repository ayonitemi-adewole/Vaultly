import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  ArrowLeftRight,
  Settings,
  LogOut,
  PlusCircle
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/add-asset', label: 'Add Asset', icon: PlusCircle },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/markets', label: 'Markets', icon: TrendingUp },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const AppSidebar = () => {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white text-slate-900 border-r border-gray-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900">
          <TrendingUp className="size-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">Vaultly</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle + Logout */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700">
        <div className="mb-3">
          <ThemeSwitcher variant="button" className="w-full justify-start" />
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
        >
          <LogOut className="size-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;

