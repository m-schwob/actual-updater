import * as path from 'path';


export const userDataPath = 'budgetConfig'
export const configFilePath = path.resolve(userDataPath, 'config.encrypt');
export const accountMapFilePath = path.resolve(userDataPath, 'accountMap.json');
