// Global type declarations for JivoChat
declare global {
  interface Window {
    jivo_open?: () => void;
    jivo_close?: () => void;
    jivo_hide?: () => void;
    jivo_show?: () => void;
  }
}

export {};
