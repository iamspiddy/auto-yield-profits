// Global type declarations for Smartsupp
declare global {
  interface Window {
    smartsupp?: {
      (action: string, ...args: any[]): void;
      _: any[];
    };
    _smartsupp?: {
      key: string;
    };
  }
}

export {};
