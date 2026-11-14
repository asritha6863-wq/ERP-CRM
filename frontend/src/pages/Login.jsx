import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import NishkaLogo from '../components/NishkaLogo.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f8f8fb' }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f0f1a 0%, #1a0a14 50%, #2d0a1f 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f72f6e, transparent)' }} />
        <div className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #f72f6e, transparent)' }} />

        <div className="relative z-10 text-center max-w-sm">
          <NishkaLogo white size="lg" />
          <div className="mt-10 space-y-3">
            <h1 className="text-3xl font-bold text-white leading-tight">
              Jewellery CRM<br />
              <span style={{ color: '#f72f6e' }}>Management Suite</span>
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Complete retail intelligence platform for leads, customers,
              sales pipeline and business analytics.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[['Leads', 'Pipeline'], ['Customers', '360°'], ['Analytics', 'Live']].map(([a, b]) => (
              <div key={a} className="rounded-2xl p-3" style={{ background: 'rgba(247,47,110,0.08)', border: '1px solid rgba(247,47,110,0.15)' }}>
                <p className="text-sm font-bold text-white">{a}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#f72f6e' }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <NishkaLogo size="lg" />
          </div>

          <div className="bg-white rounded-3xl shadow-card p-8 border border-gray-100">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-sm text-gray-400 mt-1">Sign in to your CRM account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@jewellerycrm.com"
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 tracking-wide uppercase">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input pr-11"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-70"
                style={{ background: loading ? '#e57094' : 'linear-gradient(135deg, #f72f6e, #c40f56)', boxShadow: '0 4px 24px -4px rgba(247,47,110,0.4)' }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Nishka CRM · Momentous Jewellery Management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
