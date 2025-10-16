import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Dedicated login screen component with improved UX
 * Extracted from the main App component
 */
export function LoginScreen() {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!pin || pin.length !== 4) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(pin);
      setPin(''); // Clear PIN on success
    } catch (error) {
      // Error is handled by the AuthContext
      setPin(''); // Clear PIN on failure for security
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handlePinChange = (e) => {
    const value = e.target.value;
    // Only allow numeric input and limit to 4 digits
    if (/^\d{0,4}$/.test(value)) {
      setPin(value);
    }
  };

  const isDisabled = isSubmitting || loading || pin.length !== 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <form onSubmit={handleSubmit}>
          <div className="text-center mb-6" style={{ minHeight: '200px' }}>
            {/* Logo/Icon */}
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-indigo-600" size={32} />
            </div>
            
            {/* Title */}
            <h1 className="text-3xl font-bold mb-2 text-gray-800">Time Tracker</h1>
            <p className="text-gray-600 mb-6">Enter your 4-digit PIN</p>
            
            {/* PIN Input */}
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={handlePinChange}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 text-center text-2xl border-2 rounded-lg mb-4 focus:border-indigo-500 focus:outline-none transition-colors"
                placeholder="••••"
                maxLength={4}
                autoComplete="off"
                autoFocus
                disabled={isSubmitting || loading}
                aria-label="4-digit PIN"
              />
              
              {/* PIN Strength Indicator */}
              <div className="flex justify-center space-x-2 mb-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      pin.length >= i 
                        ? 'bg-indigo-500' 
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
              isDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200'
            }`}
            disabled={isDisabled}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </div>
            ) : loading ? (
              'Loading...'
            ) : (
              'Sign In'
            )}
          </button>

          {/* Demo Credentials */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 text-center font-medium mb-2">
              Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center">
                <span className="text-gray-600">Users:</span>
                <div className="font-mono text-gray-800">1234, 5678, 9012</div>
              </div>
              <div className="text-center">
                <span className="text-gray-600">Admin:</span>
                <div className="font-mono text-gray-800">0000</div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <p className="text-xs text-gray-400 text-center mt-4">
            🔒 Your PIN is encrypted and securely transmitted
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;