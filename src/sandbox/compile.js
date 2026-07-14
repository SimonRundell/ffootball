import * as Babel from '@babel/standalone';
import { PREAMBLE } from './preamble.js';

/**
 * Strips lines that would fail inside the sandbox's non-module
 * `new Function` evaluation: `import` statements (the real objects are
 * injected into scope instead) and the `export default` keyword pair
 * (the function declaration itself is kept, since it is returned by
 * name at the end of the sandbox bootstrap).
 *
 * @param {string} source
 * @returns {string}
 */
function stripModuleSyntax(source) {
  return source
    .split('\n')
    .filter((line) => !/^\s*import\s/.test(line))
    .join('\n')
    .replace(/export\s+default\s+/g, '');
}

/**
 * Compiles the student's JSX (with the read-only preamble prepended)
 * into plain JS ready to run inside the sandbox iframe.
 *
 * @param {string} studentCode The editable body of DataDisplay.jsx.
 * @returns {{ code: string } | { error: string }} Compiled code, or a
 *   syntax error message with a line number when compilation fails.
 */
export function compileStudentCode(studentCode) {
  const combined = stripModuleSyntax(PREAMBLE + studentCode);

  try {
    const { code } = Babel.transform(combined, {
      presets: [['react', { runtime: 'classic' }]],
    });
    return { code: `${code}\nreturn DataDisplay;` };
  } catch (err) {
    const line = err.loc ? ` (line ${err.loc.line})` : '';
    return { error: `${err.message}${line}` };
  }
}
