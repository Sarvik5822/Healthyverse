import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useUserContext } from '../context/UserContext';
import AuthStack from './AuthStack';
import MainStack from '../navigation/MainStack';
import LoadingSpinner from '../shared/feedback/LoadingSpinner';
import { connectSocket, disconnectSocket } from '../services/socket';

const AppNavigator = () => {
  const { isLoading, isAuthenticated, userProfile } = useUserContext();

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket().then((socket) => {
        if (socket) {
          // Pass user ID for proper room joining instead of empty string
          const userId = userProfile?._id || userProfile?.id || '';
          socket.emit('join', userId);
          socket.on('new_notification', () => {
            // Handled via NotificationContext
          });
          socket.on('remove_notification', () => {
            // Handled via NotificationContext
          });
        }
      });
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, userProfile?._id, userProfile?.id]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;