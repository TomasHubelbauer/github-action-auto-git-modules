import fs from 'fs';

export default async function* parseDotGitConfigFile() {
  /** @type {string} */
  let text;

  try {
    text = await fs.promises.readFile('.git/config', 'utf-8');
  }
  catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EACCES') {
      return;
    }

    throw error;
  }

  /** @type {{ name: string; entries: { [key: string]: string; } }} */
  let section;

  /** @type {{ name: string; entries: { [key: string]: string; } }[]} */
  const sections = [];

  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      if (section) {
        sections.push(section);
      }

      section = { entries: {} };
      section.name = line.slice('['.length, -']'.length);
    }
    else if (line.startsWith('\t') && line.includes(' = ')) {
      const index = line.indexOf(' = ');
      const key = line.slice('\t'.length, index);
      const value = line.slice(index + ' = '.length);
      section.entries[key] = value;
    }
    else if (line === '') {
      continue;
    }
    else {
      throw new Error(`Unexpected line in .git/config: ${line}`);
    }
  }

  if (section) {
    sections.push(section);
  }

  for (const section of sections) {
    if (section.name.startsWith('submodule "') && section.name.endsWith('"')) {
      const name = section.name.slice('submodule "'.length, -'"'.length);
      const url = section.entries.url;
      const active = section.entries.active === 'true';
      if (section.entries.active !== 'true' && section.entries.active !== 'false') {
        throw new Error(`Unexpected value for active in .git/config: ${section.entries.active}`);
      }

      yield { name, url, active };
    }
  }
}
