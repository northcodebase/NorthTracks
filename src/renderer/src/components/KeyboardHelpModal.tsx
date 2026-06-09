import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { key: 'Space',  action: 'Play / Pause' },
  { key: '→',      action: 'Seek forward 10s' },
  { key: '←',      action: 'Seek backward 10s' },
  { key: '↑',      action: 'Volume up' },
  { key: '↓',      action: 'Volume down' },
  { key: 'N',      action: 'Next track' },
  { key: 'P',      action: 'Previous track' },
  { key: 'M',      action: 'Mute / Unmute' },
  { key: 'L',      action: 'Like / Unlike track' },
  { key: '?',      action: 'Show this help' },
];

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="keyboard-help-overlay" onClick={onClose}>
      <div className="keyboard-help-modal fade-in" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Keyboard Shortcuts</h2>
          <button 
            onClick={onClose} 
            className="eq-close-btn" 
            title="Close Shortcuts"
            style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
        <div>
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-row">
              <span className="shortcut-action">{shortcut.action}</span>
              <kbd className="key-badge">{shortcut.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
