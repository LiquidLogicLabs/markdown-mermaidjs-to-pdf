const yaml = require('js-yaml');

const OPEN_DELIMITER = /^-{3}(\r?\n|$)/;
const CLOSE_DELIMITERS = new Set(['---', '...']);

/**
 * Parse YAML front matter from the start of a markdown string.
 *
 * Drop-in replacement for the subset of `gray-matter` this project used:
 * returns `{ data, content }` where `data` is the parsed front matter object
 * (empty object when none is present) and `content` is the markdown with the
 * front matter block stripped.
 *
 * @param {string} input - Raw markdown content.
 * @returns {{ data: object, content: string }}
 */
function parseFrontMatter(input) {
  const content = String(input);

  // Front matter must be the very first thing in the file.
  if (!OPEN_DELIMITER.test(content)) {
    return { data: {}, content };
  }

  const lines = content.split(/\r?\n/);
  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (CLOSE_DELIMITERS.has(lines[i])) {
      closeIndex = i;
      break;
    }
  }

  // No closing delimiter: not valid front matter, leave content untouched.
  if (closeIndex === -1) {
    return { data: {}, content };
  }

  const yamlBlock = lines.slice(1, closeIndex).join('\n');
  const body = lines.slice(closeIndex + 1).join('\n').replace(/^\r?\n/, '');

  let data = {};
  if (yamlBlock.trim()) {
    const parsed = yaml.load(yamlBlock);
    if (parsed && typeof parsed === 'object') {
      data = parsed;
    }
  }

  return { data, content: body };
}

module.exports = parseFrontMatter;
