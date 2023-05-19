import runCommand from './runCommand.js';

export default async function* parseGitLsFilesCommand() {
  const text = await runCommand('git ls-files --stage');
  const lines = text.split('\n');
  for (const line of lines) {
    const [mode, _hash, stageAndpath] = line.split(' ');
    if (mode !== '160000') {
      continue;
    }

    const [stage, path] = stageAndpath.split('\t');

    if (stage !== '0') {
      throw new Error(`Unexpected stage: ${JSON.stringify(stage)}`);
    }

    yield path;
  }
}
