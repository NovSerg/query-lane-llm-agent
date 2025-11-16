/**
 * Storage Switch Component
 * Toggle between localStorage and external memory
 */

'use client';

import { useState, useEffect } from 'react';
import { Switch, FormControlLabel, Typography, Box, Alert } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import CloudIcon from '@mui/icons-material/Cloud';
import type { StorageType } from '@/lib/storage-adapter';
import { getStorageTypePreference, setStorageTypePreference } from '@/lib/storage-adapter';

interface StorageSwitchProps {
  onChange?: (type: StorageType) => void;
  disabled?: boolean;
}

export function StorageSwitch({ onChange, disabled }: StorageSwitchProps) {
  const [storageType, setStorageType] = useState<StorageType>('localStorage');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const type = getStorageTypePreference();
    setStorageType(type);
    setMounted(true);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType: StorageType = event.target.checked ? 'externalMemory' : 'localStorage';
    setStorageType(newType);
    setStorageTypePreference(newType);

    if (onChange) {
      onChange(newType);
    }
  };

  if (!mounted) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={storageType === 'externalMemory'}
            onChange={handleChange}
            disabled={disabled}
            color="primary"
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {storageType === 'localStorage' ? (
              <StorageIcon fontSize="small" />
            ) : (
              <CloudIcon fontSize="small" />
            )}
            <Typography variant="body2">
              {storageType === 'localStorage' ? 'Браузер (localStorage)' : 'Сервер (external memory)'}
            </Typography>
          </Box>
        }
      />

      {storageType === 'externalMemory' && (
        <Alert severity="info" sx={{ mt: 1, fontSize: '0.875rem' }}>
          <Typography variant="caption">
            Данные сохраняются в <code>data/memory.json</code> на сервере.
            Доступны между перезапусками и поддерживают семантический поиск.
          </Typography>
        </Alert>
      )}

      {storageType === 'localStorage' && (
        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.875rem' }}>
          <Typography variant="caption">
            Данные хранятся только в браузере. Могут быть потеряны при очистке кэша.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
