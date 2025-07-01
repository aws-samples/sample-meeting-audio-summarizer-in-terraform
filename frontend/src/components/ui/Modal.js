import React, { useEffect } from 'react';
// Remove unused Button import
// import Button from './Button';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actions, 
  size = 'default',
  titleClassName = '',
  headerContent = null
}) => {
  // Close modal on escape key press
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    
    // Prevent body scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Define size classes
  const sizeClasses = {
    small: 'max-w-sm',
    default: 'max-w-lg',
    large: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-7xl'
  };

  const modalSizeClass = sizeClasses[size] || sizeClasses.default;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full flex items-center justify-center">
      {/* Background overlay with blur */}
      <div 
        className="fixed inset-0 transition-opacity duration-300 ease-in-out bg-gray-900 bg-opacity-75 backdrop-blur-sm" 
        aria-hidden="true"
        onClick={onClose}
      ></div>
      
      <div className={`relative w-full ${modalSizeClass} max-h-full`}>
        {/* Modal content */}
        <div 
          className="relative bg-white rounded-lg shadow-sm dark:bg-gray-700"
          style={{
            animation: 'modalFadeIn 0.3s ease-out forwards'
          }}
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-headline"
        >
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200 dark:border-gray-600">
            {headerContent ? (
              headerContent
            ) : (
              <>
                <h3 className={`text-xl font-medium text-gray-900 dark:text-white ${titleClassName}`} id="modal-headline">
                  {title}
                </h3>
                {actions?.subtitle && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {actions.subtitle}
                  </p>
                )}
              </>
            )}
          </div>
          
          {/* Modal body */}
          <div className="p-4 space-y-4">
            {children}
          </div>
          
          {/* Modal footer - only render if actions are provided */}
          {actions && actions.buttons && (
            <div className="flex items-center p-4 border-t border-gray-200 rounded-b dark:border-gray-600">
              {actions.buttons}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
