import { useState } from 'react';

const useNotification = () => {
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showNotification = (message, type = 'info', title = '') => {
    setNotification({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const showSuccess = (message, title = 'Success') => {
    showNotification(message, 'success', title);
  };

  const showError = (message, title = 'Error') => {
    showNotification(message, 'error', title);
  };

  const showWarning = (message, title = 'Warning') => {
    showNotification(message, 'warning', title);
  };

  const showInfo = (message, title = 'Information') => {
    showNotification(message, 'info', title);
  };

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default useNotification;