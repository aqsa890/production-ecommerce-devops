import React from 'react';

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="toast" id="toast">
      {message}
    </div>
  );
}
