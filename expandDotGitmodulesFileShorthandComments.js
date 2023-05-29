import fs from 'fs';

const text = await fs.promises.readFile('.gitmodules', 'utf8');
const lines = text.split('\n');
for (const line of lines.splice(0)) {
  if (line.startsWith('#+')) {
    const url = line.slice('#+'.length).trim();
    const name = url.startsWith('./') || url.startsWith('../')
      ? url.slice(url.lastIndexOf('/') + 1)
      : new URL(url).pathname.split('/').pop();

    console.log(`Expanding submodule ${name} (${url}) form a shorthand comment`);
    await fs.promises.appendFile('.git/commit-message.txt', `Expanded submodule ${name} (${url}) form a shorthand comment.\n`);
    lines.push(`[submodule "${name}"]`);
    lines.push(`\tpath = ${name}`);
    lines.push(`\turl = ${url}`);
    continue;
  }

  lines.push(line);
}

await fs.promises.writeFile('.gitmodules', lines.join('\n'));
