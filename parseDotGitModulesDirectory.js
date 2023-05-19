import fs from 'fs';

export default async function* parseDotGitModulesDirectory() {
  try {
    for (const path of await fs.promises.readdir('.git/modules')) {
      yield path;
    }
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'EACCES') {
      return;
    }

    throw error;
  }
}
