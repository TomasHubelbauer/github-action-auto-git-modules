import fs from 'fs';

export default async function* parseDotGitmodulesFile() {
  /** @type {string} */
  let text;

  try {
    text = await fs.promises.readFile('.gitmodules', 'utf-8');
  }
  catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      return;
    }

    throw error;
  }

  /** @type {string} */
  let name;

  /** @type {string} */
  let path;

  /** @type {string} */
  let url;

  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('[submodule "') && line.endsWith('"]')) {
      name = line.slice('[submodule "'.length, -'"]'.length);
    }
    else if (line.startsWith('\tpath = ')) {
      path = line.slice('\tpath = '.length);
    }
    else if (line.startsWith('\turl = ')) {
      url = line.slice('\turl = '.length);
    }
    else if (line === '') {
      if (name === undefined && path === undefined && url === undefined) {
        return;
      }

      yield { name, path, url };
    }
  }
}
