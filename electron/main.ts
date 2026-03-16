import { app, BrowserWindow, ipcMain, dialog, clipboard } from 'electron'
import path from 'path'
import fs from 'fs'

const KINDLE_PATH = '/Volumes/Kindle/documents/My Clippings.txt'

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return win
}

// IPC handlers
ipcMain.handle('show-open-dialog', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('show-save-dialog', async (_, filename: string) => {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: filename,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  })
  return result.canceled ? null : (result.filePath ?? null)
})

ipcMain.handle('read-file', async (_, filePath: string) => {
  if (!filePath.endsWith('.txt')) {
    throw new Error('Only .txt files can be read')
  }
  return fs.promises.readFile(filePath, 'utf-8')
})

ipcMain.handle('save-file', async (_, filePath: string, content: string) => {
  await fs.promises.writeFile(filePath, content, 'utf-8')
})

ipcMain.handle('write-clipboard', async (_, text: string) => {
  clipboard.writeText(text)
})

// Kindle auto-detection: watch /Volumes for mount events
function watchForKindle(win: BrowserWindow) {
  if (process.platform !== 'darwin') return
  if (!fs.existsSync('/Volumes')) return

  let kindleWatcher: fs.FSWatcher | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const checkKindle = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (fs.existsSync(KINDLE_PATH)) {
        win.webContents.send('kindle-connected', KINDLE_PATH)
      }
    }, 500)
  }

  try {
    kindleWatcher = fs.watch('/Volumes', () => {
      checkKindle()
    })
  } catch {
    // /Volumes watching may not be supported on all systems
  }

  // Check once on startup
  checkKindle()

  win.on('close', () => kindleWatcher?.close())
}

app.whenReady().then(() => {
  const win = createWindow()
  watchForKindle(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWin = createWindow()
      watchForKindle(newWin)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
