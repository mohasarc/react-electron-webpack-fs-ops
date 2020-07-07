'use strict'
/////////// FS dependencies //////////////
const fs = require('fs');
const { COPYFILE_EXCL } = fs.constants; // Used to prevent overriding the destination file
const { fileURLToPath } = require('url');
const util = require('util');
const { execFile } = require('child_process');

/////////////////////////// Import dependencies /////////////////////////////
const { app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const url = require('url')// Add React extension for development
const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer')
const {COPY, CUT, RENAME, DELETE, NOTIFY} = require('../src/utils/constants');

const { removeListener } = require('process')
// const {copy, cut, rename, remove} = require ('./fsOperations');

////////////////////////////// FUNCTIONS ////////////////////////////////////

function copy (filePath, directoryName) {
  console.log('copy calleeed');
  var argsArray = [filePath, directoryName]; // Both the path of file to be copied, and destination folder
  console.log('args', argsArray);
  var fileName = argsArray[0].split(path.sep).slice(-1).pop();

// By using COPYFILE_EXCL, the operation will fail if destination.txt exists.
  try {
      fs.copyFileSync(argsArray[0], path.join(argsArray[1], fileName), COPYFILE_EXCL);
      console.log('copied');
      return "copied successfully"
  } catch (err) {
      if (err) {
          // Could not copy because destination already exists
          if (err.code == 'EEXIST'){
              // let response = readlineSync.question('The file already exists, do you want to override it?');
              // if (response == 'yes'){
              //     // destination.txt will be created or overwritten by default.
              //     fs.copyFile(argsArray[0], path.join(argsArray[1], fileName), err => {
              //         if (err) throw err;

              //         console.log(`${argsArray[0]} was copied to ${path.join(argsArray[1], fileName)}`);
              //     });
              // }
              console.log('found same name');
              return "the item already exists in the destination directory";
          } else {
              // Any other error
              console.log(err);
              return err;
          }
      }
  }
}

function cut (filePath, directoryName) {
  var argsArray = [filePath, directoryName]; // Both the path of file to be copied, and destination folder
  var fileName = argsArray[0].split(path.sep).slice(-1).pop();

  // Check if the destination file exists
  try {
      if(fs.existsSync(path.join(argsArray[1], fileName))) {
          return "There is a file with the same name in the destination directory";
          // The file exists don't perform the cut
      } else {
          // The file doesn't exist already, perfome the cut
          try{
              fs.renameSync(argsArray[0], path.join(argsArray[1], fileName));
              return 'Moved successfully';
          }
          catch (err) {
              if (err) 
                  return err;
          }
      }
  } catch (err) {
      return err;
  }
}

function remove (filePath) {
  try {
      fs.unlinkSync(filePath); 
      return 'successfully deleted';
  } catch (err) {
      if (err) {
          return err;
      }
  }
}

function rename (filePath, newName) {
  var argsArray = [filePath, newName]; // Both the path of file to be copied, and destination folder
  var folderPath = argsArray[0].substr(0, argsArray[0].lastIndexOf(path.sep));

  // Check if the destination file exists
  try {
      if(fs.existsSync(path.join(argsArray[1], argsArray[1]))) {
          return "There is a file with the same name in the destination directory";
          // The file exists don't perform the cut
      } else {
          // The file doesn't exist already, perfome the cut
          try{
              fs.renameSync(argsArray[0], path.join(folderPath, argsArray[1]));
              return 'Renamed successfully';
          }
          catch (err) {
              if (err) 
                  return err;
          }
      }
  } catch (err) {
      return err;
  }
}

///////////////////////// Creating the window ///////////////////////////////

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
// Keep a reference for dev mode
let dev = false
// Determine the mode (dev or production)
if (process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath)) {
  dev = true
}
// Temporary fix for broken high-dpi scale factor on Windows (125% scaling)
// info: https://github.com/electron/electron/issues/9691
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('high-dpi-support', 'true')
  app.commandLine.appendSwitch('force-device-scale-factor', '1')
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024, // width of the window
    height: 768, // height of the window
    show: false, // don't show until window is ready
    webPreferences: {
      nodeIntegration: true
    }
  })  
  // and load the index.html of the app.
  let indexPath  

  // Determine the correct index.html file
  // (created by webpack) to load in dev and production
  if (dev && process.argv.indexOf('--noDevServer') === -1) {
    indexPath = url.format({
      protocol: 'http:',
      host: 'localhost:8080',
      pathname: 'index.html',
      slashes: true
    })
  } else {
    indexPath = url.format({
      protocol: 'file:',
      pathname: path.join(__dirname, 'dist', 'index.html'),
      slashes: true
    })
  }  
  
  // Load the index.html
  mainWindow.loadURL(indexPath)  
  // Don't show the app window until it is ready and loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()    
    // Open the DevTools automatically if developing
    if (dev) {
      installExtension(REACT_DEVELOPER_TOOLS)
        .catch(err => console.log('Error loading React DevTools: ', err))
      mainWindow.webContents.openDevTools()
    }
  })  
  
  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

////////////////////// Back-end Front-end comunication //////////////////////

ipcMain.on(COPY, (event, arg) => {
  console.log('Recieved 001', arg);
  mainWindow.send(NOTIFY, copy(arg.text1, arg.text2));
});

ipcMain.on(CUT, (event, arg) => {
  console.log('Recieved 002', arg);
  mainWindow.send(NOTIFY, cut(arg.text1, arg.text2));
});

ipcMain.on(RENAME, (event, arg) => {
  console.log('Recieved 003', arg);
  mainWindow.send(NOTIFY, rename(arg.text1, arg.text2));
});

ipcMain.on(DELETE, (event, arg) => {
  console.log('Recieved 004', arg);
  mainWindow.send(NOTIFY, remove(arg.text1, arg.text2));
});