'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Typography,
  Box,
  Tabs,
  Tab,
  FormHelperText,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import { Agent, OutputFormat, ValidationMode } from '@/lib/types';
import { agentStorage } from '@/lib/agent-storage';
import { AVAILABLE_MODELS } from '@/server/schema';

interface AgentEditorProps {
  open: boolean;
  onClose: () => void;
  agent: Agent | null;
  onSave: (agent: Agent) => void;
}

function AgentEditor({ open, onClose, agent, onSave }: AgentEditorProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState<Partial<Agent>>({
    name: '',
    description: '',
    model: 'glm-4.5-flash',
    provider: 'zai',
    systemPrompt: '',
    parameters: {
      temperature: 0.7,
      max_tokens: 2000,
    },
    formatConfig: {
      format: 'text',
      systemPrompt: '',
      validationMode: 'lenient',
    },
  });

  useEffect(() => {
    if (agent) {
      setFormData(agent);
    } else {
      setFormData({
        name: '',
        description: '',
        model: 'glm-4.5-flash',
        provider: 'zai',
        systemPrompt: '',
        parameters: {
          temperature: 0.7,
          max_tokens: 2000,
        },
        formatConfig: {
          format: 'text',
          systemPrompt: '',
          validationMode: 'lenient',
        },
      });
    }
  }, [agent, open]);

  const handleSave = () => {
    if (!formData.name || !formData.systemPrompt) {
      alert('Заполните обязательные поля: имя и системный промпт');
      return;
    }

    if (agent) {
      // Update existing
      agentStorage.update(agent.id, formData);
      const updated = agentStorage.getById(agent.id)!;
      onSave(updated);
    } else {
      // Create new
      const newAgent = agentStorage.save(formData as Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>);
      onSave(newAgent);
    }

    onClose();
  };

  const getProviderFromModel = (modelId: string): 'zai' | 'openrouter' => {
    if (
      modelId.includes('claude') ||
      modelId.includes('anthropic') ||
      modelId.includes('openai') ||
      modelId.includes('gpt') ||
      modelId.includes('/')
    ) {
      return 'openrouter';
    }
    return 'zai';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isFullscreen}
      PaperProps={{
        sx: {
          minHeight: '600px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {agent ? 'Редактировать агента' : 'Создать агента'}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => setIsFullscreen(!isFullscreen)}
            size="small"
            title={isFullscreen ? 'Выход из полноэкранного режима' : 'Полноэкранный режим'}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab label="Основное" />
          <Tab label="Параметры LLM" />
          <Tab label="Формат вывода" />
        </Tabs>

        {/* Tab 0: Basic Settings */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Название агента"
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />

            <TextField
              label="Описание"
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={isFullscreen ? 3 : 2}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Модель</InputLabel>
              <Select
                value={formData.model || 'glm-4.5-flash'}
                label="Модель"
                onChange={e => {
                  const model = e.target.value;
                  const provider = getProviderFromModel(model);
                  setFormData({ ...formData, model, provider });
                }}
              >
                {AVAILABLE_MODELS.map(model => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Провайдер: {formData.provider === 'zai' ? 'Z.AI' : 'OpenRouter'}
              </FormHelperText>
            </FormControl>

            <TextField
              label="Системный промпт"
              value={formData.systemPrompt || ''}
              onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
              multiline
              rows={isFullscreen ? 25 : 6}
              required
              fullWidth
              helperText="Основная инструкция для агента, определяющая его поведение"
            />
          </Box>
        )}

        {/* Tab 1: LLM Parameters */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography gutterBottom>
                Temperature: {formData.parameters?.temperature ?? 0.7}
              </Typography>
              <Slider
                value={formData.parameters?.temperature ?? 0.7}
                onChange={(_, value) =>
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, temperature: value as number },
                  })
                }
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 1, label: '1' },
                  { value: 2, label: '2' },
                ]}
              />
              <FormHelperText>
                Контролирует случайность. Низкие значения = более детерминированные ответы.
              </FormHelperText>
            </Box>

            <TextField
              label="Max Tokens"
              type="number"
              value={formData.parameters?.max_tokens ?? 2000}
              onChange={e =>
                setFormData({
                  ...formData,
                  parameters: {
                    ...formData.parameters,
                    max_tokens: parseInt(e.target.value) || 2000,
                  },
                })
              }
              helperText="Максимальное количество токенов в ответе"
              fullWidth
            />

            <Box>
              <Typography gutterBottom>
                Top P: {formData.parameters?.top_p ?? 1.0}
              </Typography>
              <Slider
                value={formData.parameters?.top_p ?? 1.0}
                onChange={(_, value) =>
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, top_p: value as number },
                  })
                }
                min={0}
                max={1}
                step={0.05}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.5, label: '0.5' },
                  { value: 1, label: '1' },
                ]}
              />
              <FormHelperText>
                Nucleus sampling. Альтернативный способ контроля случайности.
              </FormHelperText>
            </Box>

            <TextField
              label="Top K"
              type="number"
              value={formData.parameters?.top_k ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  parameters: {
                    ...formData.parameters,
                    top_k: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })
              }
              helperText="Ограничивает выбор топ-K токенов (опционально)"
              fullWidth
            />

            <Box>
              <Typography gutterBottom>
                Frequency Penalty: {formData.parameters?.frequency_penalty ?? 0}
              </Typography>
              <Slider
                value={formData.parameters?.frequency_penalty ?? 0}
                onChange={(_, value) =>
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, frequency_penalty: value as number },
                  })
                }
                min={-2}
                max={2}
                step={0.1}
                marks={[
                  { value: -2, label: '-2' },
                  { value: 0, label: '0' },
                  { value: 2, label: '2' },
                ]}
              />
              <FormHelperText>Штраф за частые токены</FormHelperText>
            </Box>

            <Box>
              <Typography gutterBottom>
                Presence Penalty: {formData.parameters?.presence_penalty ?? 0}
              </Typography>
              <Slider
                value={formData.parameters?.presence_penalty ?? 0}
                onChange={(_, value) =>
                  setFormData({
                    ...formData,
                    parameters: { ...formData.parameters, presence_penalty: value as number },
                  })
                }
                min={-2}
                max={2}
                step={0.1}
                marks={[
                  { value: -2, label: '-2' },
                  { value: 0, label: '0' },
                  { value: 2, label: '2' },
                ]}
              />
              <FormHelperText>Штраф за уже присутствующие токены</FormHelperText>
            </Box>

            <TextField
              label="Seed"
              type="number"
              value={formData.parameters?.seed ?? ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  parameters: {
                    ...formData.parameters,
                    seed: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })
              }
              helperText="Для воспроизводимых результатов (опционально)"
              fullWidth
            />
          </Box>
        )}

        {/* Tab 2: Output Format */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Формат вывода</FormLabel>
              <RadioGroup
                value={formData.formatConfig?.format || 'text'}
                onChange={e =>
                  setFormData({
                    ...formData,
                    formatConfig: {
                      ...formData.formatConfig!,
                      format: e.target.value as OutputFormat,
                    },
                  })
                }
              >
                <FormControlLabel value="text" control={<Radio />} label="Текст" />
                <FormControlLabel value="json" control={<Radio />} label="JSON" />
                <FormControlLabel value="xml" control={<Radio />} label="XML" />
                <FormControlLabel value="custom" control={<Radio />} label="Свой формат" />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Промпт для формата"
              value={formData.formatConfig?.systemPrompt || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  formatConfig: {
                    ...formData.formatConfig!,
                    systemPrompt: e.target.value,
                  },
                })
              }
              multiline
              rows={isFullscreen ? 15 : 4}
              fullWidth
              helperText="Инструкции по форматированию ответа (добавляется к системному промпту)"
            />

            <TextField
              label="Пример формата"
              value={formData.formatConfig?.exampleFormat || ''}
              onChange={e =>
                setFormData({
                  ...formData,
                  formatConfig: {
                    ...formData.formatConfig!,
                    exampleFormat: e.target.value,
                  },
                })
              }
              multiline
              rows={isFullscreen ? 15 : 4}
              fullWidth
              helperText="Пример ожидаемого формата ответа (опционально)"
            />

            <FormControl fullWidth>
              <InputLabel>Режим валидации</InputLabel>
              <Select
                value={formData.formatConfig?.validationMode || 'lenient'}
                label="Режим валидации"
                onChange={e =>
                  setFormData({
                    ...formData,
                    formatConfig: {
                      ...formData.formatConfig!,
                      validationMode: e.target.value as ValidationMode,
                    },
                  })
                }
              >
                <MenuItem value="strict">Строгий</MenuItem>
                <MenuItem value="lenient">Мягкий</MenuItem>
                <MenuItem value="fallback">С откатом</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={handleSave} variant="contained">
          {agent ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface AgentManagerProps {
  activeAgent: Agent | null;
  onAgentChange: (agent: Agent) => void;
}

export function AgentManager({ activeAgent, onAgentChange }: AgentManagerProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = () => {
    const all = agentStorage.getAll();
    setAgents(all);

    // If no active agent, set first one
    if (!activeAgent && all.length > 0) {
      onAgentChange(all[0]);
      agentStorage.setActiveAgent(all[0].id);
    }
  };

  const handleCreate = () => {
    setEditingAgent(null);
    setEditorOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setEditorOpen(true);
  };

  const handleSave = (agent: Agent) => {
    loadAgents();
    // If this was the active agent, update it
    if (activeAgent?.id === agent.id) {
      onAgentChange(agent);
    }
  };

  const handleDelete = (agent: Agent) => {
    if (confirm(`Удалить агента "${agent.name}"?`)) {
      agentStorage.delete(agent.id);
      loadAgents();

      // If deleted agent was active, switch to first available
      if (activeAgent?.id === agent.id) {
        const remaining = agentStorage.getAll();
        if (remaining.length > 0) {
          onAgentChange(remaining[0]);
          agentStorage.setActiveAgent(remaining[0].id);
        }
      }
    }
  };

  const handleDuplicate = (agent: Agent) => {
    const duplicate = agentStorage.duplicate(agent.id);
    if (duplicate) {
      loadAgents();
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    onAgentChange(agent);
    agentStorage.setActiveAgent(agent.id);
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={activeAgent?.id || ''}
            onChange={e => {
              const agent = agents.find(a => a.id === e.target.value);
              if (agent) handleSelectAgent(agent);
            }}
            displayEmpty
            startAdornment={<SettingsIcon sx={{ mr: 1, fontSize: 20 }} />}
          >
            {agents.map(agent => (
              <MenuItem key={agent.id} value={agent.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{agent.name}</span>
                  {agent.isPinned && <Chip label="★" size="small" />}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button size="small" variant="outlined" onClick={handleCreate}>
          + Создать
        </Button>

        {activeAgent && (
          <>
            <Button size="small" variant="outlined" onClick={() => handleEdit(activeAgent)}>
              Настроить
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleDuplicate(activeAgent)}
            >
              Дублировать
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleDelete(activeAgent)}
              disabled={agents.length === 1}
            >
              Удалить
            </Button>
          </>
        )}
      </Box>

      <AgentEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        agent={editingAgent}
        onSave={handleSave}
      />
    </>
  );
}
