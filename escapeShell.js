// Note that this is probably incorrect and Node doesn't ship an API for this
// because "this seems like a userland thing hurr durr" ugh
// See https://github.com/nodejs/node/issues/34840
export default function escapeShell(/** @type {string | undefined} */ string) {
  if (!string) {
    return '""';
  }

  return '"' + string?.replace(/(["'$`\\])/g, '\\$1') + '"';
}
