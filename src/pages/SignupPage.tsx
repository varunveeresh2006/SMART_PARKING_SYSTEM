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
import InputAdornment from '@mui/material/InputAdornment';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('Please fill in all fields'); return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await signUp(form.email, form.password, form.name, form.phone);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1500);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #050d1a 0%, #071428 50%, #050d1a 100%)', p: 2,
    }}>
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
        {[...Array(4)].map((_, i) => (
          <Box key={i} sx={{
            position: 'absolute', width: 350, height: 350, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(21,101,192,0.${2 + (i % 2)}) 0%, transparent 70%)`,
            top: `${[15, 70, 45, 85][i]}%`, left: `${[15, 75, 85, 30][i]}%`,
            transform: 'translate(-50%, -50%)',
          }} />
        ))}
      </Box>

      <Card sx={{
        maxWidth: 480, width: '100%', position: 'relative', zIndex: 1,
        background: 'linear-gradient(135deg, rgba(10,25,41,0.95) 0%, rgba(13,33,55,0.95) 100%)',
        backdropFilter: 'blur(20px)', border: '1px solid rgba(100,181,246,0.15)', borderRadius: 3,
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: 3, mx: 'auto', mb: 2,
              background: 'linear-gradient(135deg, #1565c0, #1e88e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(21,101,192,0.4)',
            }}>
              <LocalParkingIcon sx={{ fontSize: 36, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Join Orion Mall Smart Parking
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth label="Full Name" value={form.name}
              onChange={handleChange('name')} required
              InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
            />
            <TextField
              fullWidth label="Email Address" type="email" value={form.email}
              onChange={handleChange('email')} required
              InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
            />
            <TextField
              fullWidth label="Phone Number" value={form.phone}
              onChange={handleChange('phone')} required
              InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
            />
            <TextField
              fullWidth label="Password" type="password" value={form.password}
              onChange={handleChange('password')} required
              InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
            />
            <TextField
              fullWidth label="Confirm Password" type="password" value={form.confirm}
              onChange={handleChange('confirm')} required
              InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
            />
            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={loading} sx={{ mt: 1, py: 1.5, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#1e88e5', textDecoration: 'none', fontWeight: 600 }}>
                Sign In
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
