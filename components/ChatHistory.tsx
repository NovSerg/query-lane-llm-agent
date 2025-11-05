'use client';

import { useState, useEffect } from 'react';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Chat, getAllChats, deleteChat, renameChat, createChat } from '@/lib/chat-storage';

interface ChatHistoryProps {
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatHistory({ currentChatId, onSelectChat, onNewChat }: ChatHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChatForMenu, setSelectedChatForMenu] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const loadChats = () => {
    setChats(getAllChats());
  };

  useEffect(() => {
    loadChats();
  }, [currentChatId]); // Обновляем при изменении текущего чата

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, chatId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedChatForMenu(chatId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedChatForMenu(null);
  };

  const handleRenameClick = () => {
    const chat = chats.find(c => c.id === selectedChatForMenu);
    if (chat) {
      setNewTitle(chat.title);
      setRenameDialogOpen(true);
    }
    handleCloseMenu();
  };

  const handleRename = () => {
    if (selectedChatForMenu && newTitle.trim()) {
      renameChat(selectedChatForMenu, newTitle.trim());
      loadChats();
      setRenameDialogOpen(false);
      setNewTitle('');
    }
  };

  const handleDelete = () => {
    if (selectedChatForMenu) {
      if (confirm('Вы уверены, что хотите удалить этот чат?')) {
        deleteChat(selectedChatForMenu);
        loadChats();

        // Если удалили текущий чат, создаём новый
        if (selectedChatForMenu === currentChatId) {
          onNewChat();
        }
      }
    }
    handleCloseMenu();
  };

  const handleNewChat = () => {
    onNewChat();
    setIsOpen(false);
  };

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
    setIsOpen(false);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Сегодня';
    } else if (diffDays === 1) {
      return 'Вчера';
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <IconButton
        onClick={() => setIsOpen(true)}
        color="inherit"
        size="small"
        sx={{
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: 2,
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: 'background.paper',
          },
        }}
      >
        {/* Header */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          p={2}
          borderBottom={1}
          borderColor="divider"
        >
          <Typography variant="h6" fontWeight={600}>
            Чаты
          </Typography>
          <IconButton size="small" onClick={() => setIsOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* New Chat Button */}
        <Box p={2}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleNewChat}
          >
            Новый чат
          </Button>
        </Box>

        <Divider />

        {/* Chats List */}
        <List sx={{ flex: 1, overflow: 'auto', py: 0 }}>
          {chats.length === 0 ? (
            <Box p={3} textAlign="center">
              <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Нет сохранённых чатов
              </Typography>
            </Box>
          ) : (
            chats.map((chat) => (
              <ListItem
                key={chat.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => handleOpenMenu(e, chat.id)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                }
                sx={{
                  bgcolor: currentChatId === chat.id ? 'action.selected' : 'transparent',
                }}
              >
                <ListItemButton
                  onClick={() => handleSelectChat(chat.id)}
                  sx={{ pr: 6 }}
                >
                  <ListItemText
                    primary={chat.title}
                    secondary={formatDate(chat.updatedAt)}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontSize: '0.875rem',
                      fontWeight: currentChatId === chat.id ? 600 : 400,
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Drawer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleRenameClick}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Переименовать
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Переименовать чат</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Название чата"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRename();
              }
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleRename} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
