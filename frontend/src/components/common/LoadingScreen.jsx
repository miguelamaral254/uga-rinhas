import React from 'react';

export const LoadingScreen = ({ label = 'Carregando' }) => (
  <div className="lol-loading-screen">
    <div className="lol-loading-sprite" />
    <p className="lol-loading-label">
      {label}
      <span className="lol-loading-dots">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </p>
  </div>
);
