import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseGitLsFilesCommand from './parseGitLsFilesCommand.js';

console.log('Loaded `git ls-files`');
export default await drainAsyncGenerator(parseGitLsFilesCommand());
