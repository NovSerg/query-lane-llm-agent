'use client';

import { useMemo, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from '@/lib/mui-theme';

interface ThemeProviderProps {
  children: ReactNode;
  isDarkMode: boolean;
}

export function ThemeProvider({ children, isDarkMode }: ThemeProviderProps) {
  const theme = useMemo(
    () => createAppTheme(isDarkMode ? 'dark' : 'light'),
    [isDarkMode]
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
