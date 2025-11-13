'use client';

import { useState, useMemo } from 'react';
import { Message, CompactionSettings } from '@/lib/types';
import { Button } from './ui/button';
import {
  getCompactionPreview,
  shouldCompactByCount,
} from '@/lib/message-compactor';
import { shouldCompact } from '@/lib/token-counter';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MuiButton from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CompressIcon from '@mui/icons-material/Compress';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CircularProgress from '@mui/material/CircularProgress';

interface CompactButtonProps {
  messages: Message[];
  systemPrompt: string;
  model: string;
  onCompact: () => Promise<void>;
  config?: CompactionSettings;
  disabled?: boolean;
  className?: string;
}

export function CompactButton({
  messages,
  systemPrompt,
  model,
  onCompact,
  config,
  disabled = false,
  className = '',
}: CompactButtonProps) {
  const [isCompacting, setIsCompacting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Map CompactionSettings to CompactionConfig
  const compactionConfig = config ? {
    keepFirstMessages: config.keepFirstMessages,
    keepLastMessages: config.keepLastMessages,
  } : undefined;

  // Check both: message count AND token usage
  const shouldShowByCount = shouldCompactByCount(messages, compactionConfig);
  const shouldShowByTokens = useMemo(() => {
    const threshold = config?.threshold || 10; // Порог снижен до 10%
    return shouldCompact(messages, systemPrompt, model, threshold);
  }, [messages, systemPrompt, model, config]);

  const shouldShow = shouldShowByCount || shouldShowByTokens;
  const preview = getCompactionPreview(messages, compactionConfig);

  const handleCompact = async () => {
    setIsCompacting(true);
    try {
      await onCompact();
      setShowConfirm(false);
    } catch (error) {
      console.error('Compaction failed:', error);
    } finally {
      setIsCompacting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={disabled || isCompacting || !shouldShow}
        className={`text-xs ${className}`}
        title={shouldShow ? 'Сжать диалог' : 'Недостаточно сообщений для сжатия'}
      >
        🗜️ Сжать
      </Button>

      <Dialog
        open={showConfirm}
        onClose={() => !isCompacting && setShowConfirm(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: 'background.paper',
          },
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.15,
              }}
            >
              <CompressIcon sx={{ color: 'primary.main', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" component="div" fontWeight={600}>
                Сжать диалог
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Освободите место в контексте
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        {/* Content */}
        <DialogContent sx={{ pt: 2, pb: 2 }}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="body2" color="text.secondary">
              Все сообщения будут заменены структурированным резюме, созданным AI.
              Резюме сохранит важный контекст: выполненные задачи, технические
              детали и текущий этап работы. Это позволит продолжить диалог без
              потери информации.
            </Typography>

            {/* Preview box */}
            <Box
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 2,
                p: 2,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                fontWeight={500}
                color="text.secondary"
                display="block"
                mb={1}
              >
                Что произойдет:
              </Typography>
              <Typography
                variant="caption"
                component="pre"
                fontFamily="monospace"
                sx={{ whiteSpace: 'pre-line', margin: 0 }}
              >
                {preview}
              </Typography>
            </Box>

            {/* Warning */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                p: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(237, 108, 2, 0.15)'
                    : 'rgba(255, 152, 0, 0.1)',
                borderRadius: 1.5,
                border: 1,
                borderColor: 'warning.main',
              }}
            >
              <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 20 }} />
              <Typography variant="caption" color="warning.dark">
                Действие необратимо. Исходные сообщения будут удалены из истории
                диалога.
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        {/* Footer */}
        <DialogActions sx={{ px: 3, py: 2 }}>
          <MuiButton
            onClick={() => setShowConfirm(false)}
            disabled={isCompacting}
            color="inherit"
          >
            Отмена
          </MuiButton>
          <MuiButton
            onClick={handleCompact}
            disabled={isCompacting}
            variant="contained"
            startIcon={isCompacting ? <CircularProgress size={16} /> : null}
          >
            {isCompacting ? 'Сжимаю...' : 'Сжать'}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
