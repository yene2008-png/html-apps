/*
 * 中文填空题生成。
 * 思路：把经文按标点切成子句，用经节编号作种子“确定性地”挑一个子句挖空，
 * 这样同一节每天得到同样的题目，便于复习。
 * 返回 { before, answer, after }：before + [空格] + after 即题面，answer 为正确答案。
 */
(function () {
  "use strict";

  // 句内/句末标点，作为切分点（保留，便于显示）
  var PUNCT = "，。；、！？：…—（）()「」《》‘’“”";

  function isPunct(ch) {
    return PUNCT.indexOf(ch) >= 0;
  }

  // 把文本切成 [{text, punct:bool}] 的片段：标点单独成段，便于重新拼接
  function tokenize(text) {
    var segs = [];
    var buf = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (isPunct(ch)) {
        if (buf) { segs.push({ text: buf, punct: false }); buf = ""; }
        segs.push({ text: ch, punct: true });
      } else {
        buf += ch;
      }
    }
    if (buf) segs.push({ text: buf, punct: false });
    return segs;
  }

  // 简单确定性散列（由编号生成稳定的“随机”下标）
  function seedPick(seed, count) {
    var x = (seed * 2654435761) % 2147483647;
    if (x < 0) x += 2147483647;
    return count > 0 ? x % count : 0;
  }

  // 由起止片段下标（含）构造 {before, answer, after}
  function build(segs, startSeg, endSeg) {
    var before = "", answer = "", after = "";
    for (var j = 0; j < segs.length; j++) {
      if (j < startSeg) before += segs[j].text;
      else if (j <= endSeg) answer += segs[j].text;
      else after += segs[j].text;
    }
    return { before: before, answer: answer, after: after };
  }

  // difficulty: "easy" | "medium" | "hard"
  function makeCloze(text, seed, difficulty) {
    difficulty = difficulty || "medium";
    text = (text || "").trim();
    var segs = tokenize(text);

    // 候选：非标点、长度 >= 2 的子句
    var candidates = [];
    var totalChars = 0;
    for (var i = 0; i < segs.length; i++) {
      if (!segs[i].punct) {
        totalChars += segs[i].text.length;
        if (segs[i].text.length >= 2) candidates.push(i);
      }
    }

    // 若没有合适子句（极短经文），就按难度挖中间一段字符
    if (candidates.length === 0) {
      var clean = segs.map(function (s) { return s.text; }).join("");
      var n = clean.length;
      if (n <= 2) return { before: "", answer: clean, after: "" };
      var frac = difficulty === "easy" ? 0.3 : difficulty === "hard" ? 0.65 : 0.45;
      var blankLen = Math.max(1, Math.round(n * frac));
      var start = Math.floor((n - blankLen) / 2);
      return {
        before: clean.slice(0, start),
        answer: clean.slice(start, start + blankLen),
        after: clean.slice(start + blankLen)
      };
    }

    if (difficulty === "easy") {
      // 简单：挖最短的子句（要回忆的字最少）
      var pickE = candidates[0];
      for (var a = 1; a < candidates.length; a++) {
        if (segs[candidates[a]].text.length < segs[pickE].text.length) pickE = candidates[a];
      }
      return build(segs, pickE, pickE);
    }

    var start0 = candidates[seedPick(seed, candidates.length)];

    if (difficulty === "hard") {
      // 困难：以某子句为锚，挖一段覆盖约 65% 字数的连续区间（可跨多个子句）
      var target = Math.max(segs[start0].text.length, Math.round(totalChars * 0.65));
      var got = segs[start0].punct ? 0 : segs[start0].text.length;
      var start = start0, end = start0;
      // 先向后扩
      while (got < target && end + 1 < segs.length) {
        end++;
        if (!segs[end].punct) got += segs[end].text.length;
      }
      // 仍不足则向前扩
      while (got < target && start > 0) {
        start--;
        if (!segs[start].punct) got += segs[start].text.length;
      }
      // 修掉两端的标点，让空格停在文字上
      while (start < end && segs[start].punct) start++;
      while (end > start && segs[end].punct) end--;
      return build(segs, start, end);
    }

    // 中等：挖一个完整子句
    return build(segs, start0, start0);
  }

  // 比对：只保留汉字/字母/数字，忽略空白、标点及 []【】〔〕 等特殊符号
  // （恢复本经文里 [ ] 表示补足的字，作答时可不输入这些符号也算对）
  function normalizeAnswer(s) {
    return (s || "").replace(/[^0-9A-Za-z〇㐀-鿿豈-﫿]/g, "");
  }

  function isCorrect(input, answer) {
    return normalizeAnswer(input) === normalizeAnswer(answer);
  }

  window.Cloze = {
    make: makeCloze,
    isCorrect: isCorrect,
    normalize: normalizeAnswer
  };
})();
