/**
 * Mock implementations of Obsidian classes needed by generation.ts
 * Used by Jest via moduleNameMapper: { '^obsidian$': '<rootDir>/src/__mocks__/obsidian.ts' }
 */

export class TFile {
  basename: string;
  extension: string;
  path: string;
  stat = { mtime: Date.now() };

  constructor(path: string, extension = 'md') {
    this.path = path;
    this.extension = extension;
    const parts = path.split('/');
    const filename = parts[parts.length - 1] ?? '';
    this.basename = filename.endsWith(`.${extension}`)
      ? filename.slice(0, -(extension.length + 1))
      : filename;
  }
}

export class TFolder {
  children: (TFile | TFolder)[];
  path: string;

  constructor(path: string, children: (TFile | TFolder)[] = []) {
    this.path = path;
    this.children = children;
  }
}

export class Notice {
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}

export const requestUrl = jest.fn().mockResolvedValue({
  status: 200,
  json: {
    choices: [
      {
        message: { content: '' },
        finish_reason: 'stop',
      },
    ],
  },
});

export class WorkspaceLeaf {
  view: unknown = null;
  async setViewState(_state: { type: string; active: boolean }): Promise<void> {}
}

export class MenuItem {
  _title = '';
  _icon = '';
  _callback: () => void = () => {};
  setTitle(title: string): this { this._title = title; return this; }
  setIcon(icon: string): this { this._icon = icon; return this; }
  onClick(cb: () => void): this { this._callback = cb; return this; }
}

export class Menu {
  private items: Array<{ title: string; icon: string; callback: () => void }> = [];
  addItem(cb: (item: MenuItem) => void): this {
    const item = new MenuItem();
    cb(item);
    this.items.push({ title: item._title, icon: item._icon, callback: item._callback });
    return this;
  }
  getItems() { return this.items; }
}

/**
 * Factory function for creating a mock Obsidian App.
 * Not an Obsidian export - internal test helper.
 */
export function createMockApp() {
  return {
    vault: {
      getAbstractFileByPath: jest.fn().mockReturnValue(null),
      read: jest.fn().mockResolvedValue(''),
      create: jest.fn().mockImplementation((path: string, content: string) => {
        return Promise.resolve(new TFile(path));
      }),
      modify: jest.fn().mockResolvedValue(undefined),
      getAllFolders: jest.fn().mockReturnValue([]),
    },
    workspace: {
      getLeavesOfType: jest.fn().mockReturnValue([]),
      getRightLeaf: jest.fn(),
      revealLeaf: jest.fn().mockResolvedValue(undefined),
    },
  };
}

/**
 * Factory function for creating a mock status bar item.
 * Not an Obsidian export - internal test helper.
 */
export function createMockStatusBarItem() {
  return {
    setText: jest.fn(),
  };
}

/**
 * Factory function for creating a mock WorkspaceLeaf.
 * Not an Obsidian export - internal test helper.
 */
export function createMockWorkspaceLeaf() {
  const leaf = new WorkspaceLeaf();
  return leaf;
}
