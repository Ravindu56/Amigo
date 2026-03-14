/**
 * AuthForm.jsx
 *
 * FIX: Was calling AuthContext#login() as if it were an API method.
 * AuthContext#login() only saves state; it does NOT call the server.
 * 
 * Correct flow:
 *   1. Call authAPI.login() / authAPI.register() to hit the server → sets JWT cookie
 *   2. Pass the returned user object to AuthContext#login() → saves to state + localStorage
 *   3. navigate('/dashboard')
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash,
  FaVideo, FaArrowRight, FaLeaf,
} from 'react-icons/fa';
import { useAuth }  from '../context/AuthContext';
import { authAPI }  from '../services/api';

const AuthForm = () => {
  const navigate  = useNavigate();
  const { login } = useAuth();       // login() = save user to state + localStorage

  const [mode,     setMode]     = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });

  const handleChange = (e) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);

    try {
      let userData;

      if (mode === 'login') {
        // Step 1: hit the server — sets the httpOnly JWT cookie
        userData = await authAPI.login({
          email:    formData.email,
          password: formData.password,
        });
      } else {
        // Step 1: register — server creates user + sets cookie
        userData = await authAPI.register({
          fullName: formData.fullName,
          email:    formData.email,
          password: formData.password,
        });
        setSuccess('Account created! Redirecting…');
      }

      // Step 2: save user to AuthContext state + localStorage
      login(userData);

      // Step 3: navigate (small delay for register to show success msg)
      if (mode === 'login') {
        navigate('/dashboard', { replace: true });
      } else {
        setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
      }

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero flex">

      {/* ── LEFT — Brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gradient-sage p-12 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-24 -right-20 w-80 h-80 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <FaVideo className="text-white text-base" />
          </div>
          <span className="font-display font-bold text-xl text-white">Amigo</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <FaLeaf className="text-white/70 text-sm" />
            <span className="text-white/70 text-sm font-medium">Calm. Collaborative. Connected.</span>
          </div>
          <h1 className="font-display font-bold text-4xl text-white leading-tight mb-4">
            Your team’s meeting space, reimagined
          </h1>
          <p className="text-white/75 text-base leading-relaxed max-w-xs">
            A distraction-free environment designed to reduce meeting fatigue and help your team do their best work.
          </p>
          <div className="flex flex-wrap gap-2 mt-8">
            {['HD Video', 'Screen Share', 'Chat', 'Recordings', 'Team Spaces'].map(f => (
              <span key={f} className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">{f}</span>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
          <p className="text-white/90 text-sm leading-relaxed">
            “Amigo changed how our remote team collaborates. The calm interface genuinely reduces meeting stress.”
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">SK</div>
            <div>
              <p className="text-white text-xs font-semibold">Sarah Kim</p>
              <p className="text-white/60 text-[11px]">Head of Engineering, NovaTech</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-beige-50">
        <div className="w-full max-w-md animate-slide-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-sage flex items-center justify-center">
              <FaVideo className="text-white text-sm" />
            </div>
            <span className="font-display font-bold text-lg text-charcoal-900">Amigo</span>
          </div>

          <div className="card p-8">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-charcoal-900">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-sm text-charcoal-500 mt-1.5">
                {mode === 'login'
                  ? 'Sign in to your Amigo workspace'
                  : 'Join thousands of calm collaborators'}
              </p>
            </div>

            {error   && <div className="alert-error mb-5">{error}</div>}
            {success && <div className="alert-success mb-5">{success}</div>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {mode === 'register' && (
                <div>
                  <label className="input-label">Full Name</label>
                  <div className="input-group">
                    <FaUser className="input-icon" />
                    <input type="text" name="fullName" value={formData.fullName}
                      onChange={handleChange} className="input-with-icon"
                      placeholder="Jane Smith" required autoFocus />
                  </div>
                </div>
              )}

              <div>
                <label className="input-label">Email Address</label>
                <div className="input-group">
                  <FaEnvelope className="input-icon" />
                  <input type="email" name="email" value={formData.email}
                    onChange={handleChange} className="input-with-icon"
                    placeholder="you@amigo.com" required
                    autoFocus={mode === 'login'} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="input-label mb-0">Password</label>
                  {mode === 'login' && (
                    <button type="button"
                      className="text-xs text-mint-600 hover:text-mint-700 font-medium transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="input-group">
                  <FaLock className="input-icon" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-with-icon pr-10"
                    placeholder={mode === 'register' ? 'Min. 8 characters' : 'Your password'}
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3.5 text-charcoal-400 hover:text-charcoal-600 transition-colors">
                    {showPass ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full justify-center mt-1 py-3 text-base disabled:opacity-60">
                {loading
                  ? <span className="spinner border-white/30 border-t-white" />
                  : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <FaArrowRight className="text-xs" /></>}
              </button>
            </form>

            <p className="text-center text-sm text-charcoal-500 mt-6">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button type="button"
                onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
                className="text-sage-600 font-semibold hover:text-sage-700 transition-colors">
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
