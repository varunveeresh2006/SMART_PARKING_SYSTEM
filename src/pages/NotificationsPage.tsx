import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';

import Skeleton from '@mui/material/Skeleton';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import { useNotifications } from '../context/NotificationContext';
import type { NotificationType } from '../lib/supabase';
import { format } from 'date-fns';

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  info: { icon: <InfoIcon />, color: '#42a5f5', bg: 'rgba(66,165,245,0.12)' },
  warning: { icon: <WarningAmberIcon />, color: '#ffa726', bg: 'rgba(255,167,38,0.12)' },
  penalty: { icon: <ErrorIcon />, color: '#ef5350', bg: 'rgba(239,83,80,0.12)' },
  success: { icon: <CheckCircleIcon />, color: '#66bb6a', bg: 'rgba(102,187,106,0.12)' },
  alert: { icon: <WarningAmberIcon />, color: '#ff7043', bg: 'rgba(255,112,67,0.12)' },
};

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
        {unreadCount > 0 && (
          <Button
            variant="outlined" size="small" startIcon={<DoneAllIcon />}
            onClick={markAllAsRead}
            sx={{ borderColor: 'rgba(100,181,246,0.3)' }}
          >
            Mark All Read
          </Button>
        )}
      </Box>

      {loading ? (
        [...Array(5)].map((_, i) => <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />)
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              No notifications yet
            </Typography>
          </CardContent>
        </Card>
      ) : (
        notifications.map((notif) => {
          const tc = TYPE_CONFIG[notif.type];
          return (
            <Card
              key={notif.id}
              sx={{
                mb: 1.5,
                opacity: notif.is_read ? 0.65 : 1,
                border: notif.is_read ? '1px solid rgba(100,181,246,0.06)' : '1px solid rgba(100,181,246,0.15)',
                transition: 'all 0.2s',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                    bgcolor: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: tc.color,
                  }}>
                    {tc.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.25 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {notif.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0, ml: 1 }}>
                        {!notif.is_read && (
                          <RadioButtonCheckedIcon sx={{ fontSize: 12, color: 'primary.light' }} />
                        )}
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                          {format(new Date(notif.created_at), 'dd/MM hh:mm a')}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                      {notif.message}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip
                        label={notif.type.toUpperCase()}
                        size="small"
                        sx={{ bgcolor: tc.bg, color: tc.color, fontWeight: 700, height: 20, fontSize: '0.6rem' }}
                      />
                      {!notif.is_read && (
                        <Button
                          size="small" variant="text"
                          startIcon={<TaskAltIcon sx={{ fontSize: 14 }} />}
                          onClick={() => markAsRead(notif.id)}
                          sx={{ py: 0, minHeight: 20, fontSize: '0.7rem', color: 'text.secondary' }}
                        >
                          Mark Read
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}
    </Box>
  );
}
