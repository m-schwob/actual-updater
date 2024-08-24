// import { mkdirSync } from 'fs';
import * as path from 'path';
// import electron from './electron';

// export const App: Electron.App = electron.app;

// TODO
// if (process.env.NODE_ENV !== 'production') {
//   const localUserData = path.resolve('userData');
//   mkdirSync(localUserData, { recursive: true });
//   App.setPath('userData', localUserData);
// }

export const userDataPath = 'temp' // TODO App.getPath('userData');
export const configFilePath = path.resolve(userDataPath, 'config.encrypt');
export const accountMapFilePath = path.resolve(userDataPath, 'accountMap.json');
