
import type { App } from '../../types';
import { showMessage } from '../../core/view';
import { COLORSCHEMES, FONTS, fontToKey, loadSettings, saveSettings, getTheme } from '../../core/settings';
import { applyTheme, applyFont } from '../../core/layout';
import { openHelpWindow } from '../../core/help-window';
import { getGoogleHelpSections } from './help-sections';

export function getGoogleCommands(app: App): any[] {
  const commands = [];
  commands.push({
    type: 'command',
    label: 'Show keybind help',
    icon: '?',
    action: () => { openHelpWindow(getGoogleHelpSections()); },
    keys: ':help',
  });
  commands.push({
    type: 'command',
    label: 'Settings',
    icon: '⚙',
    action: () => app?.openSettings?.(),
    keys: ':settings',
  });

  // --- Colorscheme command (visible entry that opens colorscheme picker) ---
  commands.push({
    type: 'command',
    label: 'Change colorscheme',
    icon: '\uD83C\uDFA8',
    action: () => app?.typeCommand?.(':colorscheme '),
    keys: ':colorscheme',
  });

  // --- Colorscheme commands (hidden, shown when typing ':colo ') ---
  commands.push({ group: 'Colorscheme' });
  for (const name of Object.keys(COLORSCHEMES)) {
    commands.push({
      type: 'command',
      label: name,
      icon: '\uD83C\uDFA8',
      hidden: true,
      action: () => {
        const settings = loadSettings();
        settings.colorscheme = name;
        saveSettings(settings);
        applyTheme(getTheme(name));
        showMessage(`Colorscheme: ${name}`);
      },
      keys: `:colo ${name}`,
    });
  }

  // --- Font command (visible entry that opens font picker) ---
  commands.push({
    type: 'command',
    label: 'Change font',
    icon: '\uD83D\uDD24',
    action: () => app?.typeCommand?.(':set guifont='),
    keys: ':set guifont',
  });

  // --- Font commands ---
  commands.push({ group: 'Font' });
  for (const font of FONTS) {
    const key = fontToKey(font);
    commands.push({
      type: 'command',
      label: font,
      icon: '\uD83D\uDD24',
      hidden: true,
      action: () => {
        const settings = loadSettings();
        settings.font = font;
        saveSettings(settings);
        applyFont(font);
        showMessage(`Font: ${font}`);
      },
      keys: `:set guifont=${key}`,
    });
  }
  return commands;
}
