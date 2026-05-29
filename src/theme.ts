import { createTheme } from '@mui/material/styles';
import { teal, orange, red, green, grey, blue } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1565c0',
      light: '#1e88e5',
      dark: '#0d47a1',
      contrastText: '#fff',
    },
    secondary: {
      main: teal[400],
      light: teal[300],
      dark: teal[600],
      contrastText: '#fff',
    },
    error: { main: red[400] },
    warning: { main: orange[400] },
    success: { main: green[400] },
    info: { main: blue[400] },
    background: {
      default: '#050d1a',
      paper: '#0a1929',
    },
    text: {
      primary: '#e3f2fd',
      secondary: '#90caf9',
    },
    divider: 'rgba(100, 181, 246, 0.12)',
    grey: { ...grey },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600, textTransform: 'none' as const },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #050d1a 0%, #071428 50%, #050d1a 100%)',
          minHeight: '100vh',
          scrollbarWidth: 'thin',
          scrollbarColor: '#1565c0 #0a1929',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: '#0a1929' },
          '&::-webkit-scrollbar-thumb': { background: '#1565c0', borderRadius: 3 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(100, 181, 246, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(100, 181, 246, 0.08)',
          background: 'linear-gradient(135deg, rgba(10,25,41,0.9) 0%, rgba(13,33,55,0.9) 100%)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, textTransform: 'none' as const },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
          '&:hover': { background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: '#90caf9', borderBottomColor: 'rgba(100,181,246,0.2)' },
        body: { borderBottomColor: 'rgba(100,181,246,0.06)' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(100,181,246,0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(100,181,246,0.5)' },
          },
        },
      },
    },
  },
});

export default theme;
