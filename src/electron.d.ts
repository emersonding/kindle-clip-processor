interface ElectronAPI {
  showOpenDialog(): Promise<string | null>
  showSaveDialog(filename: string): Promise<string | null>
  readFile(filePath: string): Promise<string>
  saveFile(filePath: string, content: string): Promise<void>
  writeClipboard(text: string): Promise<void>
  onKindleConnected(callback: (filePath: string) => void): void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
