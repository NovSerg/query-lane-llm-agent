'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { CustomFormat, OutputFormat } from '@/lib/types';

interface FormatEditorProps {
  format?: CustomFormat;
  onSave: (format: CustomFormat) => void;
  onCancel: () => void;
}

export function FormatEditor({ format, onSave, onCancel }: FormatEditorProps) {
  const [name, setName] = useState(format?.name || '');
  const [description, setDescription] = useState(format?.description || '');
  const [formatType, setFormatType] = useState<OutputFormat>(format?.format || 'json');
  const [systemPrompt, setSystemPrompt] = useState(
    format?.systemPrompt || getDefaultSystemPrompt('json')
  );
  const [exampleFormat, setExampleFormat] = useState(
    format?.exampleFormat || getDefaultExample('json')
  );

  useEffect(() => {
    // Update defaults when format type changes (only for new formats)
    if (!format && formatType) {
      setSystemPrompt(getDefaultSystemPrompt(formatType));
      setExampleFormat(getDefaultExample(formatType));
    }
  }, [formatType, format]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Пожалуйста, введите название формата');
      return;
    }

    if (!systemPrompt.trim()) {
      alert('Пожалуйста, введите системный промпт');
      return;
    }

    const newFormat: CustomFormat = {
      id: format?.id || `custom_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      format: formatType,
      systemPrompt: systemPrompt.trim(),
      exampleFormat: exampleFormat.trim(),
      isPinned: format?.isPinned || false,
      createdAt: format?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(newFormat);
  };

  return (
    <Dialog
      open={true}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {format ? 'Редактировать формат' : 'Создать новый формат'}
          </Typography>
          <IconButton onClick={onCancel} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Name */}
          <TextField
            label="Название"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Мой формат"
          />

          {/* Description */}
          <TextField
            label="Описание"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание формата"
          />

          {/* Format Type */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Тип формата *
            </Typography>
            <ToggleButtonGroup
              value={formatType}
              exclusive
              onChange={(_, value) => value && setFormatType(value)}
              fullWidth
            >
              <ToggleButton value="text">ТЕКСТ</ToggleButton>
              <ToggleButton value="json">JSON</ToggleButton>
              <ToggleButton value="xml">XML</ToggleButton>
              <ToggleButton value="custom">СВОЙ</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* System Prompt */}
          <Box>
            <TextField
              label="Системный промпт"
              required
              fullWidth
              multiline
              rows={10}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Введите системный промпт, который будет инструктировать ИИ как форматировать ответы..."
              sx={{
                '& textarea': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Этот промпт указывает ИИ, как именно форматировать ответ. Будьте конкретны и приводите примеры.
            </Typography>
          </Box>

          {/* Example Format */}
          <Box>
            <TextField
              label="Пример ответа (необязательно)"
              fullWidth
              multiline
              rows={6}
              value={exampleFormat}
              onChange={(e) => setExampleFormat(e.target.value)}
              placeholder="Покажите пример того, как должен выглядеть ответ..."
              sx={{
                '& textarea': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Пример помогает визуализировать ожидаемый формат ответа.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onCancel} variant="outlined">
          Отмена
        </Button>
        <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function getDefaultSystemPrompt(format: OutputFormat): string {
  switch (format) {
    case 'json':
      return `Верни ответ только в валидном JSON формате.

Пример:
{
  "result": "твой ответ здесь",
  "details": "дополнительная информация"
}

КРИТИЧЕСКИЕ ПРАВИЛА:
- Возвращай ТОЛЬКО валидный JSON
- БЕЗ markdown блоков кода
- БЕЗ пояснительного текста вне JSON
- Начинай с { и заканчивай }`;

    case 'xml':
      return `Верни ответ только в валидном XML формате.

Пример:
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <result>твой ответ здесь</result>
  <details>дополнительная информация</details>
</response>

КРИТИЧЕСКИЕ ПРАВИЛА:
- Возвращай ТОЛЬКО валидный XML
- БЕЗ markdown блоков кода
- БЕЗ пояснительного текста вне XML
- Включай XML декларацию
- Используй правильные закрывающие теги`;

    case 'custom':
      return `Верни ответ в следующем пользовательском формате:

[Твои инструкции по формату здесь]

КРИТИЧЕСКИЕ ПРАВИЛА:
- Следуй формату точно
- Будь последовательным
- Никакого дополнительного текста вне формата`;

    case 'text':
    default:
      return 'Предоставь чёткий, хорошо структурированный ответ.';
  }
}

function getDefaultExample(format: OutputFormat): string {
  switch (format) {
    case 'json':
      return `{
  "result": "...",
  "details": "..."
}`;

    case 'xml':
      return `<?xml version="1.0"?>
<response>
  <result>...</result>
  <details>...</details>
</response>`;

    case 'custom':
      return `[Пример вывода здесь]`;

    case 'text':
    default:
      return '';
  }
}
