import React from 'react';

export default function Box({ children }) {
  return (
    <div style={{ border: '1px solid red', padding: '8px' }}>
      box!
      {children}
    </div>
  );
}
