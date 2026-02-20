// Google help sections data — keybind reference for the help window

export function getGoogleHelpSections() {
  return [
    {
      name: 'Google Search',
      keybinds: [
        { keys: ['j', '\u2193'], description: 'Navigate down' },
        { keys: ['k', '\u2191'], description: 'Navigate up' },
        { keys: ['gg'], description: 'Go to top' },
        { keys: ['G'], description: 'Go to bottom' },
        { keys: ['Enter'], description: 'Open result' },
        { keys: ['Ctrl+f'], description: 'Next page' },
        { keys: ['Ctrl+b'], description: 'Previous page' },
        { keys: ['go'], description: 'Google search (same query)' },
        { keys: ['gi'], description: 'Image search' },
        { keys: ['yy'], description: 'Copy URL' },
        { keys: ['i'], description: 'Open search' },
        { keys: ['/'], description: 'Open local filter' },
        { keys: [':'], description: 'Open command palette' },
      ],
    },
    {
      name: 'Universal',
      keybinds: [
        { keys: ['Esc'], description: 'Close current overlay' },
        { keys: [':help'], description: 'Show this help window' },
        { keys: [':settings'], description: 'Open settings' },
        { keys: [':colorscheme'], description: 'Change colorscheme' },
        { keys: [':set guifont='], description: 'Change font' },
        { keys: [':q'], description: 'Exit focus mode' },
      ],
    },
  ];
}
