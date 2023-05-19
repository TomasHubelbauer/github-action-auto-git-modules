import child_process from 'child_process';
import util from 'util';

const exec = util.promisify(child_process.exec);

/**
 * 
 * @param {string} command The command to execute
 * @param {'stdout' | 'stderr' | 'stdio'} stream The stream to check and return
 * @returns 
 */
export default async function runCommand(command, stream = 'stdout') {
  /** @type {string} */
  let stdout;

  /** @type {string} */
  let stderr;

  try {
    const streams = await exec(command);
    stdout = streams.stdout;
    stderr = streams.stderr;
  }
  catch ({ code, killed, signal, stdout, stderr }) {
    throw new Error(`'${command}' exited with a non-zero exit code ${code}${killed ? ` due to being killed by ${signal}` : ''}.\n\nStandard output:\n${stdout}\n\nStandard error:\n${stderr}`);
  }

  /** @type {string} */
  let stdpos;

  /** @type {string} */
  let stdneg;

  switch (stream) {
    case 'stdout': {
      stdpos = stdout;
      stdneg = stderr;
      break;
    }
    case 'stderr': {
      stdpos = stderr;
      stdneg = stdout;
      break;
    }
    case 'stdio': {
      stdpos = stdout + '\n' + stderr;
      stdneg = '';
      break;
    }
    default: {
      throw new Error(`Invalid stream '${stream}'`);
    }
  }

  if (stdneg) {
    throw new Error(`'${command}' exited with code zero with non-empty standard ${stream}.\n\nStandard output:\n${stdout}\n\nStandard error:\n${stderr}`);
  }

  return stdpos;
}
