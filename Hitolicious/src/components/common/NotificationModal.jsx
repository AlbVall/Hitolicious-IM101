import React, { useEffect } from 'react';

const NotificationModal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info', // 'success', 'error', 'warning', 'info'
  autoClose = true,
  autoCloseDelay = 2500 
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          iconColor: 'text-black',
          titleColor: 'text-black',
          messageColor: 'text-gray-600'
        };
      case 'error':
        return {
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          iconColor: 'text-black',
          titleColor: 'text-black',
          messageColor: 'text-gray-600'
        };
      case 'warning':
        return {
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          iconColor: 'text-black',
          titleColor: 'text-black',
          messageColor: 'text-gray-600'
        };
      default:
        return {
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconColor: 'text-black',
          titleColor: 'text-black',
          messageColor: 'text-gray-600'
        };
    }
  };

  const styles = getTypeStyles();

  const handleBackdropClick = (e) => {
    // Only close if clicking the backdrop, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black bg-opacity-30 cursor-pointer"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-sm w-full transform transition-all duration-300 ease-out scale-100 cursor-default">
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="flex items-start space-x-3 pr-6">
            {/* Icon */}
            <div className={`${styles.iconColor} flex-shrink-0 mt-0.5`}>
              {styles.icon}
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`text-base font-semibold ${styles.titleColor} mb-1`}>
                  {title}
                </h3>
              )}
              <p className={`text-base ${styles.messageColor} leading-relaxed`}>
                {message}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;