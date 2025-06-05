import * as fs from 'fs';
import * as path from 'path';


export const userDataPath = 'budgetConfig'
export const configFilePath = path.resolve(userDataPath, 'config.encrypt');
export const accountMapFilePath = path.resolve(userDataPath, 'accountMap.json');


/**
 * Checks if a folder exists relative to the current working directory; if not, creates it.
 * @param relativeFolderPath The relative path of the folder to check and create.
 */
export function checkAndCreateFolder(relativeFolderPath: string): void {
    // Get the current working directory
    const workingDir = process.cwd();

    // Create the full path to the folder
    const folderPath = path.join(workingDir, relativeFolderPath);

    // Check if the folder exists
    fs.access(folderPath, fs.constants.F_OK, (missingFolderErr) => {
        if (missingFolderErr) {
            // Folder does not exist, so create it
            fs.mkdir(folderPath, { recursive: true }, (folderCreationErr) => {
                if (folderCreationErr) {
                    console.error(`Error creating folder '${relativeFolderPath}':`, folderCreationErr);
                } else {
                    console.log(`Folder '${relativeFolderPath}' created successfully`);
                }
            });
        } else {
            console.log(`Folder '${relativeFolderPath}' already exists`);
        }
    });
}
