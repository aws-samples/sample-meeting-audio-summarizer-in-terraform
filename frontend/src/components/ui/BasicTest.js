import React from 'react';

const BasicTest = () => {
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'blue',
        color: 'white',
        padding: '16px',
        borderRadius: '8px',
        zIndex: 9999
      }}
    >
      <h3>🔵 Basic Test (No Context)</h3>
      <p>This should always show</p>
    </div>
  );
};

export default BasicTest;
