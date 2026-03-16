import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  showOpenDialog: (): Promise<string | null> =>
    ipcRenderer.invoke('show-open-dialog'),

  showSaveDialog: (filename: string): Promise<string | null> =>
    ipcRenderer.invoke('show-save-dialog', filename),

  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('read-file', filePath),

  saveFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('save-file', filePath, content),

  writeClipboard: (text: string): Promise<void> =>
    ipcRenderer.invoke('write-clipboard', text),

  onKindleConnected: (callback: (filePath: string) => void): void => {
    ipcRenderer.on('kindle-connected', (_event, filePath: string) => callback(filePath))
  },
})
