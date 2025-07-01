import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessing } from '../../contexts/ProcessingContext';

const NotificationSystem = () => {
  const { notifications, removeNotification } = useProcessing();
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    if (notification.fileId) {
      if (notification.type === 'success') {
        // navigate(`/summaries?refresh=${Date.now()}`);
      } else {
        navigate(`/processing/${notification.fileId}`);
      }
    }
    removeNotification(notification.id);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '🎉';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColors = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            rounded-lg border p-4 shadow-lg cursor-pointer transform transition-all duration-300 ease-in-out
            hover:scale-105 hover:shadow-xl
            ${getNotificationColors(notification.type)}
            animate-slide-in-right
          `}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-semibold mb-1">
                {notification.title}
              </h4>
              <p className="text-sm opacity-90">
                {notification.message}
              </p>
              {notification.fileId && (
                <p className="text-xs opacity-75 mt-1">
                  Click to view details
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
