'use client';

import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DescriptionIcon from '@mui/icons-material/Description';
import DataObjectIcon from '@mui/icons-material/DataObject';
import CodeIcon from '@mui/icons-material/Code';
import { customFormats } from '@/lib/custom-formats';
import { CustomFormat, FormatConfig } from '@/lib/types';
import { FormatEditor } from './FormatEditor';

interface FormatConfiguratorProps {
  onFormatChange: (config: FormatConfig | null) => void;
  currentConfig?: FormatConfig | null;
}

export function FormatConfigurator({
  onFormatChange,
  currentConfig,
}: FormatConfiguratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formats, setFormats] = useState<CustomFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<CustomFormat | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pinnedFormatId, setPinnedFormatId] = useState<string | null>(null);

  useEffect(() => {
    loadFormats();
    const pinned = customFormats.getPinned();
    setPinnedFormatId(pinned?.id || null);

    // Auto-apply pinned format on mount
    if (pinned && !currentConfig) {
      applyFormat(pinned);
    }
  }, []);

  const loadFormats = () => {
    setFormats(customFormats.getAll());
  };

  const applyFormat = (format: CustomFormat) => {
    setSelectedFormat(format);
    onFormatChange({
      format: format.format,
      systemPrompt: format.systemPrompt,
      exampleFormat: format.exampleFormat,
      customFormatId: format.id,
      validationMode: 'lenient',
    });
  };

  const handleSelectFormat = (format: CustomFormat) => {
    applyFormat(format);
    setIsOpen(false);
  };

  const handleClearFormat = () => {
    setSelectedFormat(null);
    onFormatChange(null);
  };

  const handleNewFormat = () => {
    setIsEditing(true);
  };

  const handleEditFormat = (format: CustomFormat) => {
    setSelectedFormat(format);
    setIsEditing(true);
  };

  const handleDeleteFormat = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот формат?')) {
      customFormats.delete(id);
      loadFormats();

      if (selectedFormat?.id === id) {
        handleClearFormat();
      }

      if (pinnedFormatId === id) {
        setPinnedFormatId(null);
        customFormats.setPinned(null);
      }
    }
  };

  const handlePinFormat = (id: string) => {
    if (pinnedFormatId === id) {
      setPinnedFormatId(null);
      customFormats.setPinned(null);
    } else {
      setPinnedFormatId(id);
      customFormats.setPinned(id);
    }
  };

  const handleSaveFormat = (format: CustomFormat) => {
    if (selectedFormat && selectedFormat.id.startsWith('custom_')) {
      customFormats.update(selectedFormat.id, format);
    } else {
      customFormats.save({
        name: format.name,
        description: format.description,
        format: format.format,
        systemPrompt: format.systemPrompt,
        exampleFormat: format.exampleFormat,
        isPinned: false,
      });
    }

    setIsEditing(false);
    setSelectedFormat(null);
    loadFormats();
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'json':
        return <DataObjectIcon fontSize="small" />;
      case 'xml':
        return <CodeIcon fontSize="small" />;
      default:
        return <DescriptionIcon fontSize="small" />;
    }
  };

  return (
    <>
      <IconButton
        onClick={() => setIsOpen(true)}
        color={currentConfig ? 'primary' : 'default'}
        size="small"
        sx={{
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'scale(1.1) rotate(45deg)',
            boxShadow: 2,
          },
          '&:active': {
            transform: 'scale(0.95) rotate(45deg)',
          },
        }}
      >
        <SettingsIcon />
      </IconButton>

      <Dialog
        open={isOpen && !isEditing}
        onClose={() => setIsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Форматы ответов</Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleNewFormat}
              >
                Создать
              </Button>
              <IconButton size="small" onClick={() => setIsOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          {selectedFormat && (
            <Card
              variant="outlined"
              sx={{ mb: 2, bgcolor: 'primary.50', borderColor: 'primary.main' }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2">Активный формат</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedFormat.name}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={handleClearFormat}>
                    Очистить
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          <Box display="flex" flexDirection="column" gap={2}>
            {formats.map(format => (
              <Card
                key={format.id}
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  borderWidth: 2,
                  borderColor:
                    selectedFormat?.id === format.id ? 'primary.main' : 'divider',
                  bgcolor:
                    selectedFormat?.id === format.id ? 'primary.50' : 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.light',
                  },
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="start" justifyContent="space-between">
                    <Box
                      flex={1}
                      onClick={() => handleSelectFormat(format)}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        {getFormatIcon(format.format)}
                        <Typography variant="subtitle2">{format.name}</Typography>
                        {pinnedFormatId === format.id && (
                          <PushPinIcon fontSize="small" color="primary" />
                        )}
                      </Box>
                      {format.description && (
                        <Typography variant="body2" color="text.secondary" mb={0.5}>
                          {format.description}
                        </Typography>
                      )}
                      <Chip
                        label={format.format.toUpperCase()}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinFormat(format.id);
                        }}
                        title={pinnedFormatId === format.id ? 'Открепить' : 'Закрепить по умолчанию'}
                      >
                        {pinnedFormatId === format.id ? (
                          <PushPinIcon fontSize="small" />
                        ) : (
                          <PushPinOutlinedIcon fontSize="small" />
                        )}
                      </IconButton>

                      {format.id.startsWith('custom_') && (
                        <>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditFormat(format);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFormat(format.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {isEditing && (
        <FormatEditor
          format={selectedFormat || undefined}
          onSave={handleSaveFormat}
          onCancel={() => {
            setIsEditing(false);
            setSelectedFormat(null);
          }}
        />
      )}
    </>
  );
}
