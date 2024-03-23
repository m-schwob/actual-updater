import * as keytar from 'keytar';

const serviceName = 'test'; // APP_NAME; TODO
const accountName = 'crypto';

export async function loadSALT() {
  return keytar.getPassword(serviceName, accountName);
}

export async function saveSALT(newSALT: string) {
  return keytar.setPassword(serviceName, accountName, newSALT);
}

export async function saveIntoAccount(account:any, password:any) {
  return keytar.setPassword(serviceName, account, password);
}

export async function getFromAccount(account:any) {
  return keytar.getPassword(serviceName, account); 
}
