'use client';

import { useState, useEffect, useRef } from 'react';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import CloudIcon from '@mui/icons-material/Cloud';
import AirIcon from '@mui/icons-material/Air';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';

interface WeatherData {
  location: string;
  temperature: string;
  feels_like: string;
  description: string;
  humidity: string;
  wind_speed: string;
}

interface AirQualityData {
  location: string;
  air_quality_index: number;
  air_quality_description: string;
  components: Record<string, string>;
}

interface Notification {
  id: string;
  reminderId: string;
  timestamp: string;
  city: string;
  weather?: WeatherData;
  airQuality?: AirQualityData;
  summary: string;
}

const REMINDER_SERVER_URL = process.env.NEXT_PUBLIC_REMINDER_SERVER_URL || 'http://localhost:3002';

// Toast notification type
interface Toast {
  id: string;
  notification: Notification;
  visible: boolean;
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Remove toast after delay
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Show toast notification
  const showToast = (notification: Notification) => {
    const toast: Toast = {
      id: notification.id,
      notification,
      visible: true,
    };

    setToasts(prev => [...prev, toast]);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      removeToast(notification.id);
    }, 10000);
  };

  // Connect to SSE on mount
  useEffect(() => {
    const connectSSE = () => {
      try {
        const eventSource = new EventSource(`${REMINDER_SERVER_URL}/notifications`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[Notifications] Connected to reminder server');
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Skip connection message
            if (data.type === 'connected') {
              return;
            }

            // Add new notification
            const notification = data as Notification;
            setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
            setUnreadCount(prev => prev + 1);

            // Show toast on page
            showToast(notification);

            // Play sound or show browser notification
            if (Notification.permission === 'granted') {
              new window.Notification(`Погода: ${notification.city}`, {
                body: notification.summary,
                icon: '/favicon.ico',
              });
            }
          } catch (error) {
            console.error('[Notifications] Error parsing message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[Notifications] SSE error:', error);
          setIsConnected(false);
          eventSource.close();

          // Reconnect after 5 seconds
          setTimeout(connectSSE, 5000);
        };
      } catch (error) {
        console.error('[Notifications] Failed to connect:', error);
        setIsConnected(false);
      }
    };

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleClear = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getAqiColor = (aqi: number) => {
    switch (aqi) {
      case 1: return 'text-green-500';
      case 2: return 'text-lime-500';
      case 3: return 'text-yellow-500';
      case 4: return 'text-orange-500';
      case 5: return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Notification Button */}
      <IconButton
        onClick={handleToggle}
        color="inherit"
        size="small"
        className={`transition-all duration-200 hover:scale-110 ${
          isConnected ? '' : 'opacity-50'
        }`}
        title={isConnected ? 'Уведомления' : 'Нет подключения к серверу напоминаний'}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
        >
          {unreadCount > 0 ? (
            <NotificationsActiveIcon className="animate-pulse" />
          ) : (
            <NotificationsIcon />
          )}
        </Badge>
      </IconButton>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="font-medium">Уведомления</span>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Очистить
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <NotificationsIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Нет уведомлений</p>
                <p className="text-xs mt-1">
                  {isConnected
                    ? 'Создайте напоминание через чат'
                    : 'Запустите mcp-reminder-server'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 hover:bg-muted/50 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{notification.city}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>

                    {/* Weather */}
                    {notification.weather && (
                      <div className="flex items-start gap-2 mb-2">
                        <CloudIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          <div className="font-medium">
                            {notification.weather.temperature}
                            <span className="text-muted-foreground ml-1">
                              (ощущается {notification.weather.feels_like})
                            </span>
                          </div>
                          <div className="text-muted-foreground capitalize">
                            {notification.weather.description}
                          </div>
                          <div className="text-muted-foreground">
                            Влажность: {notification.weather.humidity},
                            Ветер: {notification.weather.wind_speed}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Air Quality */}
                    {notification.airQuality && (
                      <div className="flex items-start gap-2">
                        <AirIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getAqiColor(notification.airQuality.air_quality_index)}`} />
                        <div className="text-xs">
                          <div className={`font-medium ${getAqiColor(notification.airQuality.air_quality_index)}`}>
                            AQI: {notification.airQuality.air_quality_index} — {notification.airQuality.air_quality_description}
                          </div>
                          {notification.airQuality.components.pm2_5 && (
                            <div className="text-muted-foreground">
                              PM2.5: {notification.airQuality.components.pm2_5.split(' ')[0]} μg/m³
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isConnected && (
            <div className="px-4 py-2 border-t border-border bg-red-500/10 text-xs text-red-500">
              Нет подключения к серверу напоминаний
            </div>
          )}
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-background border border-border rounded-xl shadow-2xl p-4 animate-in slide-in-from-right-5 duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CloudIcon className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">{toast.notification.city}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Weather */}
            {toast.notification.weather && (
              <div className="text-xs mb-2">
                <div className="font-medium">
                  {toast.notification.weather.temperature}
                  <span className="text-muted-foreground ml-1">
                    ({toast.notification.weather.description})
                  </span>
                </div>
              </div>
            )}

            {/* Air Quality */}
            {toast.notification.airQuality && (
              <div className={`text-xs ${getAqiColor(toast.notification.airQuality.air_quality_index)}`}>
                <AirIcon className="w-3 h-3 inline mr-1" />
                AQI: {toast.notification.airQuality.air_quality_index} — {toast.notification.airQuality.air_quality_description}
              </div>
            )}

            {/* Time */}
            <div className="text-[10px] text-muted-foreground mt-2">
              {formatTime(toast.notification.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
