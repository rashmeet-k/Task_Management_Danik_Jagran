import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isResettingPassword) {
        if (!email) throw new Error("Email is required for password reset");
        const { sendPasswordResetEmail } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent successfully. Please check your inbox.');
        setIsResettingPassword(false);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || (isResettingPassword ? 'Error sending password reset email' : 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setIsResettingPassword(true);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      
      {/* Left branding column matching Page 1 exactly */}
      <div className="md:w-1/2 bg-[#090b11] text-white flex flex-col justify-between p-12 relative overflow-hidden">
        {/* Ambient background network grid elements */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
        
        {/* Top Spacer */}
        <div />

        {/* Center brand block */}
        <div className="flex flex-col items-center text-center relative z-10 my-auto">
          {/* Sunrise gradient logo */}
          <Logo width="w-32" height="h-16" />
          <span className="text-white font-serif font-black text-4xl leading-none tracking-wider mt-4">दैनिक जागरण</span>
          <h1 className="font-sans font-black text-3xl sm:text-4xl tracking-tight leading-none text-slate-300 mt-2">Newsroom Central</h1>
          <p className="font-sans text-slate-400 text-sm mt-3 tracking-wide">Task Management & Tracking</p>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-sans mt-8">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 no-invert" />
          <span>Jagran IT Systems</span>
        </div>
      </div>

      {/* Right Login card column matching Page 1 */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-100 shadow-xl flex flex-col gap-6">
          <div className="text-center flex flex-col items-center">
            <h2 className="font-sans font-bold text-2xl text-slate-800 tracking-tight">Welcome to Newsroom Central</h2>
            
            {/* Round Avatar icon */}
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mt-4 border border-blue-100 shadow-inner">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Email / ID input */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-sans font-bold text-slate-500 uppercase tracking-wider">Employee Email / ID</label>
              <input
                type="email"
                required
                placeholder="employee.email@jagran.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl text-xs font-sans text-slate-800 focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
            
            {/* Password input */}
            {!isResettingPassword && (
              <div className="flex flex-col gap-1 relative">
                <label className="text-[11px] font-sans font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-50 border border-slate-200 outline-none p-3 pr-10 rounded-xl text-xs font-sans text-slate-800 w-full focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Options block */}
            {!isResettingPassword && (
              <div className="flex items-center justify-between text-xs mt-1">
                <label className="flex items-center gap-2 text-slate-500 font-sans cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#00adef] focus:ring-blue-500"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[#00adef] hover:underline font-sans font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Error notifications */}
            {error && (
              <p className="text-xs text-red-500 font-sans font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">{error}</p>
            )}

            {/* Submit Login */}
            <button
              type="submit"
              disabled={loading}
              className="bg-[#00adef] hover:bg-sky-500 disabled:bg-blue-400 text-white font-sans text-sm font-bold p-3 rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isResettingPassword ? 'Send Reset Link' : 'Login')}
            </button>

            {/* Back to Login for Password Reset */}
            {isResettingPassword && (
              <div className="text-center mt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsResettingPassword(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            )}

          </form>
        </div>
      </div>

    </div>
  );
};
