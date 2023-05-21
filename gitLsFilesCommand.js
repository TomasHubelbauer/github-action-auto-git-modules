import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseGitLsFilesCommand from './parseGitLsFilesCommand.js';

export default await drainAsyncGenerator(parseGitLsFilesCommand());
