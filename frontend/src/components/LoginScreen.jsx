import React, { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores';

/**
 * Login component with improved accessibility and error handling
 */
export function LoginScreen() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await login(name.trim(), pin);
      
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to access your time tracking dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div 
              className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your name"
                disabled={isLoading}
                autoComplete="username"
                required
                aria-describedby={error ? "error-message" : undefined}
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="pin" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              PIN
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your PIN"
                disabled={isLoading}
                autoComplete="current-password"
                required
                aria-describedby={error ? "error-message" : undefined}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-describedby={isLoading ? "loading-message" : undefined}
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Screen reader announcements */}
        {isLoading && (
          <div id="loading-message" className="sr-only" aria-live="polite">
            Signing in, please wait...
          </div>
        )}
        
        {error && (
          <div id="error-message" className="sr-only" aria-live="assertive">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}