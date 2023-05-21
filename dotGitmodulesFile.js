import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseDotGitmodulesFile from './parseDotGitmodulesFile.js';

export default await drainAsyncGenerator(parseDotGitmodulesFile());
