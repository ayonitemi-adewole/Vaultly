import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrendingUp, Mail, Lock, Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { createUserProfile } from '@/services/user';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;
    if (user?.uid) {
      await createUserProfile(user.uid, email);
    }

    navigate("/dashboard");
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to create account";
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};

  const passwordRequirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
    { met: /[!@#$%^&*.]/.test(password), text: 'One special character' },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background transition-colors duration-300 dark:bg-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-80 w-80 rounded-full bg-muted blur-3xl dark:bg-slate-800" />
        <div className="absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-muted blur-3xl dark:bg-slate-800" />
      </div>

      <div className="relative w-full max-w-md px-4 py-12">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-black/5 dark:shadow-slate-900/20">
              <TrendingUp className="size-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground dark:text-slate-100">Vaultly</span>
          </Link>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl bg-card p-8 shadow-xl shadow-black/5 dark:bg-slate-900 dark:shadow-slate-900/20">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground dark:text-slate-100">Create your account</h1>
            <p className="text-sm text-muted-foreground">Start tracking your crypto portfolio</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
              <Lock className="size-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground dark:text-slate-100">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="h-12 border-border bg-background pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-primary dark:bg-slate-900 dark:border-slate-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground dark:text-slate-100">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  className="h-12 border-border bg-background pl-11 pr-12 text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-primary dark:bg-slate-900 dark:border-slate-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {password.length > 0 && (
              <div className="space-y-2 rounded-xl bg-muted p-4 dark:bg-slate-800">
                <p className="text-xs font-medium text-muted-foreground">Password requirements:</p>
                <div className="flex flex-wrap gap-3">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-1 text-xs ${
                        req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                      }`}
                    >
                      <Check className="size-3" />
                      {req.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-primary">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
