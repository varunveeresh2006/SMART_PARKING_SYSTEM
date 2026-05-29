import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import InputAdornment from '@mui/material/InputAdornment';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      navigate('/');
    }
  };

  const handleDemoLogin = async (role: 'user' | 'admin') => {
    setLoading(true);
    setError('');
    const creds = role === 'admin'
      ? { email: 'admin@orionmall.com', password: 'Admin@1234' }
      : { email: 'demo@orionmall.com', password: 'Demo@1234' };
    const { error: err } = await signIn(creds.email, creds.password);
    setLoading(false);
    if (err) {
      setError(`Demo account not set up yet. Please sign up first. (${err})`);
    } else {
      navigate('/');
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #050d1a 0%, #071428 50%, #050d1a 100%)',
      p: 2,
    }}>
      {/* Background decoration */}
      <Box sx={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none',
      }}>
        {[...Array(6)].map((_, i) => (
          <Box key={i} sx={{
            position: 'absolute',
            width: { xs: 200, md: 400 },
            height: { xs: 200, md: 400 },
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(21,101,192,0.${3 - (i % 3)}) 0%, transparent 70%)`,
            top: `${[10, 60, 30, 80, 5, 50][i]}%`,
            left: `${[10, 80, 50, 20, 70, 40][i]}%`,
            transform: 'translate(-50%, -50%)',
          }} />
        ))}
      </Box>

      <Card sx={{
        maxWidth: 440, width: '100%', position: 'relative', zIndex: 1,
        background: 'linear-gradient(135deg, rgba(10,25,41,0.95) 0%, rgba(13,33,55,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(100,181,246,0.15)',
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: 3, mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg, #1565c0, #1e88e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(21,101,192,0.4)',
            }}>
              <LocalParkingIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Orion Mall Smart Parking System
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth label="Email Address" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              InputProps={{
                startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
              }}
            />
            <TextField
              fullWidth label="Password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
              }}
            />
            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={loading}
              sx={{ mt: 1, py: 1.5, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>OR</Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined" fullWidth size="small"
              onClick={() => handleDemoLogin('user')}
              disabled={loading}
              sx={{ borderColor: 'rgba(100,181,246,0.3)', color: 'text.secondary' }}
            >
              Demo User
            </Button>
            <Button
              variant="outlined" fullWidth size="small"
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              sx={{ borderColor: 'rgba(0,150,136,0.3)', color: 'secondary.main' }}
            >
              Demo Admin
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#1e88e5', textDecoration: 'none', fontWeight: 600 }}>
                Sign Up
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
