/*
 * English word-based cloze. Mirrors the Chinese cloze but blanks whole words.
 * Difficulty controls how many consecutive words are blanked.
 * Returns { before, answer, after } where before + [blank] + after is the prompt.
 */
(function () {
  "use strict";

  // very common words we avoid blanking on "easy" (too trivial)
  var STOP = {};
  ("the a an of to and in on at is are was were be been for with that this " +
   "his her him you your we our they them it its he she i my me as so but or not")
    .split(" ").forEach(function (w) { STOP[w] = true; });

  function words(text) {
    return (text || "").trim().split(/\s+/).filter(Boolean);
  }

  function bare(w) {
    return w.replace(/[^A-Za-z']/g, "").toLowerCase();
  }

  function seedPick(seed, count) {
    var x = (seed * 2654435761) % 2147483647;
    if (x < 0) x += 2147483647;
    return count > 0 ? x % count : 0;
  }

  function build(ws, start, end) {
    return {
      before: ws.slice(0, start).join(" "),
      answer: ws.slice(start, end + 1).join(" "),
      after: ws.slice(end + 1).join(" ")
    };
  }

  function makeCloze(text, seed, difficulty) {
    difficulty = difficulty || "medium";
    var ws = words(text);
    var n = ws.length;
    if (n === 0) return { before: "", answer: "", after: "" };
    if (n === 1) return { before: "", answer: ws[0], after: "" };

    if (difficulty === "easy") {
      // one content word (>=4 letters, not a stop word) chosen by seed
      var content = [];
      for (var i = 0; i < n; i++) {
        var b = bare(ws[i]);
        if (b.length >= 4 && !STOP[b]) content.push(i);
      }
      if (content.length === 0) {
        for (var k = 0; k < n; k++) if (!STOP[bare(ws[k])]) content.push(k);
      }
      if (content.length === 0) content = ws.map(function (_, idx) { return idx; });
      var pickE = content[seedPick(seed, content.length)];
      return build(ws, pickE, pickE);
    }

    var span = difficulty === "hard"
      ? Math.max(3, Math.round(n * 0.6))
      : Math.min(n, Math.max(2, Math.round(n * 0.25))); // medium ~25%, 2–4 words
    if (difficulty === "medium") span = Math.min(span, 4);
    if (span > n) span = n;

    var maxStart = n - span;
    var start = maxStart > 0 ? seedPick(seed, maxStart + 1) : 0;
    return build(ws, start, start + span - 1);
  }

  function normalize(s) {
    return (s || "").toLowerCase().replace(/[^a-z']+/g, " ").trim().replace(/\s+/g, " ");
  }

  function isCorrect(input, answer) {
    return normalize(input) === normalize(answer);
  }

  function blankCount(answer) {
    return words(answer).length;
  }

  window.ClozeEn = {
    make: makeCloze,
    isCorrect: isCorrect,
    normalize: normalize,
    blankCount: blankCount
  };
})();
