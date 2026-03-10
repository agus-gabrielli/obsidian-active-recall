/**
 * Mock implementations of Obsidian classes needed by generation.ts
 * Used by Jest via moduleNameMapper: { '^obsidian$': '<rootDir>/src/__mocks__/obsidian.ts' }
 */

export class TFile {
  basename: string;
  extension: string;
  path: string;

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
