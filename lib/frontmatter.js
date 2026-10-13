// Reads and writes the small "front matter" header at the top of each content file.
//
//   ---
//   title: "my post"
//   date: 2026-09-20
//   ---
//   The body of the post, written in Markdown.
//
const yaml = require('js-yaml');

function parse(text) {
  text = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text.trim() };
  let data = {};
  try {
    data = yaml.load(m[1], { schema: yaml.JSON_SCHEMA }) || {};
  } catch (e) {
    // JSON_SCHEMA keeps dates as plain text, which is what we want
    data = {};
  }
  return { data, body: m[2].trim() };
}

function stringify(data, body) {
  const clean = {};
  Object.keys(data).forEach((k) => {
    const v = data[k];
    if (v === undefined || v === null || v === '') return;
    clean[k] = v;
  });
  const head = yaml.dump(clean, { lineWidth: -1, noRefs: true, quotingType: '"' }).trimEnd();
  return '---\n' + head + '\n---\n' + (body ? '\n' + body.trim() + '\n' : '');
}

module.exports = { parse, stringify };
