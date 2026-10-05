import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  return (
    <div className="lol-modal-overlay" onClick={onClose}>
      <div className={`lol-modal lol-modal--${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="lol-modal-header">
          <h2>{title}</h2>
          <button className="lol-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="lol-modal-body">{children}</div>
      </div>
    </div>
  );
};
