// Works out a post's reading time from its length: about 220 words a minute, rounded up, at least 1 minute.
// ka-cms writes the result into "readtime" every time you save. The build uses it too when a post has no readtime.
const WPM = 220;
function readtime(body) {
  const text = String(body || '')
    .replace(/```[\s\S]*?```/g, ' ')          // code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')    // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // links: keep the words
    .replace(/[#>*_`~|-]/g, ' ');             // markdown symbols
  const words = text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
  return Math.max(1, Math.ceil(words / WPM)) + ' min read';
}
module.exports = { readtime, WPM };
