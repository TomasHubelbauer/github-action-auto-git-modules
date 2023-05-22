import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseDotGitmodulesFile from './parseDotGitmodulesFile.js';

console.log('Loaded .gitmodules');
export default await drainAsyncGenerator(parseDotGitmodulesFile());
