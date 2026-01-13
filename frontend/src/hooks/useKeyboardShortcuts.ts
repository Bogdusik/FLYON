'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

// Predefined shortcuts for common actions
export function useAppShortcuts() {
  const router = useRouter();

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => {
        // Open search (placeholder)
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Open search',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => {
        router.push('/drones');
        setTimeout(() => {
          const addButton = document.querySelector('[data-action="add-drone"]') as HTMLButtonElement;
          if (addButton) {
            addButton.click();
          }
        }, 100);
      },
      description: 'Add new drone',
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals
        const modals = document.querySelectorAll('[data-modal]');
        modals.forEach(modal => {
          if ((modal as HTMLElement).style.display !== 'none') {
            (modal as HTMLElement).click();
          }
        });
      },
      description: 'Close modal',
    },
  ]);
}
