/*
 * 主逻辑（中英双语共用）：用户名 / 当天日期 / 按主题每天一节 / 进度保存。
 * 语言由页面里的 window.APP_LANG ('zh' | 'en') 决定。
 * 内部分类键统一用中文 canonical（v.section / v.category），显示时再本地化。
 */
(function () {
  "use strict";

  var LANG = (window.APP_LANG === "en") ? "en" : "zh";
  // 单语页面用各自的键；合并页(心有千千节)用固定键 window.APP_STORE_KEY，切换语言进度共享
  var STORE_KEY = window.APP_STORE_KEY || (LANG === "en" ? "dailyMannaApp" : "bibleMemoApp");
  var VERSES = window.VERSES || [];
  var CLOZE = LANG === "en" ? window.ClozeEn : window.Cloze;

  // ---------- 文案 ----------
  var STRINGS = {
    zh: {
      progress: function (i, n) { return "第 " + i + " / " + n + " 节"; },
      topicOpt: function (n) { return "（" + n + "节）"; },
      verseRef: function (v) { return v.reference + "　·　第 " + v.number + " 处"; },
      topicDone: "（本主题已完成）",
      ok: "✓ 答对了！",
      no: "✗ 再试试，或看提示。",
      hint: function (a, n) { return "提示：第一个字是「" + a + "」，共 " + n + " 个字。"; },
      answer: function (a) { return "答案：" + a; },
      todayDone: "今日已完成 ✓",
      todayPending: "今日待完成 — 答对今天的填空题即可打卡",
      calDone: "（已答对）", calChecked: "（已打开）",
      noData: "未能加载经文数据（data/verses.js）。请先运行 extract_verses.py。",
      blankChar: "□"
    },
    en: {
      progress: function (i, n) { return "Verse " + i + " of " + n; },
      topicOpt: function (n) { return " (" + n + ")"; },
      verseRef: function (v) { return v.refEn + "  ·  #" + v.number; },
      topicDone: "(Topic complete)",
      ok: "✓ Correct!",
      no: "✗ Try again, or use a hint.",
      hint: function (a, n) { return "Hint: starts with “" + a + "”, " + n + " word(s)."; },
      answer: function (a) { return "Answer: " + a; },
      todayDone: "Done today ✓",
      todayPending: "Not done yet — answer today's blank to check in.",
      calDone: " (correct)", calChecked: " (opened)",
      noData: "Could not load verse data (data/verses.js). Run extract_verses.py first.",
      blankChar: "_"
    }
  };
  var STR = STRINGS[LANG];

  // 合并页（心有千千节）里需要随语言切换的“静态”界面文字，按 data-i18n 键索引
  var STATIC = {
    reader: { zh: "背经者：", en: "Reader:" },
    switchTopic: { zh: "切换主题", en: "Switch topic" },
    switchUser: { zh: "换用户", en: "Switch user" },
    welcome: { zh: "欢迎", en: "Welcome" },
    welcomeDesc: { zh: "输入你的名字开始。应用会记住从今天起你的背经进度。",
      en: "Enter your name to begin. The app remembers your progress from today on." },
    namePh: { zh: "请输入用户名", en: "Enter your name" },
    start: { zh: "开始", en: "Start" },
    chooseTopic: { zh: "选择背诵主题", en: "Choose a topic" },
    chooseDesc: { zh: "从下面任选一个主题，之后每天为你显示其中一节经文。",
      en: "Pick a topic below; each day one of its verses will be shown." },
    startTopic: { zh: "就背这个", en: "Start this topic" },
    clozeTitle: { zh: "填空练习", en: "Fill in the blank" },
    difficulty: { zh: "难度", en: "Difficulty" },
    diffEasy: { zh: "简单", en: "Easy" },
    diffMedium: { zh: "中等", en: "Medium" },
    diffHard: { zh: "困难", en: "Hard" },
    clozePh: { zh: "在此填入空格处的内容", en: "Type the missing word(s)" },
    check: { zh: "检查", en: "Check" },
    hintBtn: { zh: "提示", en: "Hint" },
    revealBtn: { zh: "显示答案", en: "Show answer" },
    doneBanner: { zh: "🎉 你已背到本主题的最后一节。可点上方「切换主题」继续。",
      en: "🎉 You've reached the last verse of this topic. Tap “Switch topic” above to continue." },
    statsTitle: { zh: "打卡统计", en: "Check-in stats" },
    statStreak: { zh: "连续打卡（天）", en: "Current streak (days)" },
    statLongest: { zh: "最长连续（天）", en: "Longest streak (days)" },
    statTotal: { zh: "累计打卡（天）", en: "Days checked in" },
    statCorrect: { zh: "累计答对（节）", en: "Verses correct" },
    last14: { zh: "最近 14 天", en: "Last 14 days" },
    foot: { zh: "经文取自《1000处极重要的经节》。数据离线保存在本机浏览器中。",
      en: "Verses from “1000 Vital Verses.” Data is stored offline in this browser." }
  };

  function applyStaticI18n() {
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute("data-i18n");
      if (STATIC[k]) nodes[i].textContent = STATIC[k][LANG];
    }
    var phs = document.querySelectorAll("[data-i18n-ph]");
    for (var j = 0; j < phs.length; j++) {
      var pk = phs[j].getAttribute("data-i18n-ph");
      if (STATIC[pk]) phs[j].setAttribute("placeholder", STATIC[pk][LANG]);
    }
  }

  function updateLangToggle() {
    var btn = el("langToggle");
    if (btn) btn.textContent = LANG === "en" ? "中文" : "English";
  }

  // 合并页：运行时切换语言（进度共享，仅显示语言与填空语言改变）
  function setLang(lang) {
    LANG = (lang === "en") ? "en" : "zh";
    STR = STRINGS[LANG];
    CLOZE = LANG === "en" ? window.ClozeEn : window.Cloze;
    document.documentElement.lang = LANG === "en" ? "en" : "zh-CN";
    try { localStorage.setItem(STORE_KEY + "_lang", LANG); } catch (e) {}
    applyStaticI18n();
    updateLangToggle();
    renderTopicPicker();
    render();
  }

  function catName(c) { return LANG === "en" ? (CAT_EN[c] || c) : c; }
  function secName(s) { return LANG === "en" ? (SEC_EN[s] || s) : s; }
  var CAT_EN = {}, SEC_EN = {};

  // ---------- 存储 ----------
  function loadStore() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && typeof s === "object") { s.users = s.users || {}; return s; }
    } catch (e) {}
    return { users: {}, lastUser: "" };
  }
  function saveStore(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

  // ---------- 日期 ----------
  function todayStr(d) {
    d = d || new Date();
    var m = ("0" + (d.getMonth() + 1)).slice(-2);
    var day = ("0" + d.getDate()).slice(-2);
    return d.getFullYear() + "-" + m + "-" + day;
  }
  function prettyDate(d) {
    d = d || new Date();
    if (LANG === "en") {
      return d.toLocaleDateString("en-US",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
    var wd = ["日", "一", "二", "三", "四", "五", "六"];
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() +
      "日　星期" + wd[d.getDay()];
  }
  function daysBetween(a, b) {
    var pa = a.split("-"), pb = b.split("-");
    return Math.round((Date.UTC(+pb[0], pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], pa[1] - 1, +pa[2])) / 86400000);
  }
  function addDays(s, n) {
    var p = s.split("-");
    var d = new Date(Date.UTC(+p[0], p[1] - 1, +p[2]));
    d.setUTCDate(d.getUTCDate() + n);
    var m = ("0" + (d.getUTCMonth() + 1)).slice(-2);
    var day = ("0" + d.getUTCDate()).slice(-2);
    return d.getUTCFullYear() + "-" + m + "-" + day;
  }

  // ---------- 主题（分类，键用中文 canonical）----------
  var SECTIONS = [];        // [{key, cats:[catKey...]}]
  var VERSES_BY_CAT = {};   // catKey -> [verse...]
  (function buildTopics() {
    var seenSec = {}, seenCat = {};
    VERSES.forEach(function (v) {
      var sec = v.section || "其他", cat = v.category || sec;
      CAT_EN[cat] = v.categoryEn || cat;
      SEC_EN[sec] = v.sectionEn || sec;
      if (!seenSec[sec]) { seenSec[sec] = { key: sec, cats: [] }; SECTIONS.push(seenSec[sec]); }
      if (!seenCat[cat]) { seenCat[cat] = true; seenSec[sec].cats.push(cat); VERSES_BY_CAT[cat] = []; }
      VERSES_BY_CAT[cat].push(v);
    });
  })();

  // ---------- 状态 ----------
  var store = loadStore();
  var currentUser = "";

  function getUser(name) {
    if (!store.users[name]) {
      store.users[name] = { startDate: todayStr(), currentTopic: "", topics: {} };
    }
    var u = store.users[name];
    if (!u.difficulty) u.difficulty = "medium";
    if (!u.stats) u.stats = { days: {}, totalCorrect: 0 };
    if (!u.stats.days) u.stats.days = {};
    if (typeof u.stats.totalCorrect !== "number") u.stats.totalCorrect = 0;
    return u;
  }

  function markCheckin(u) {
    var t = todayStr();
    if (!u.stats.days[t]) { u.stats.days[t] = { done: false }; saveStore(store); }
  }

  function recordCorrect(u) {
    var t = todayStr();
    if (!u.stats.days[t]) u.stats.days[t] = { done: false };
    if (!u.stats.days[t].done) {
      u.stats.days[t].done = true;
      u.stats.totalCorrect += 1;
      saveStore(store);
      renderStats(u);
    }
  }

  function computeStreaks(days) {
    var keys = Object.keys(days);
    if (!keys.length) return { current: 0, longest: 0, total: 0 };
    var set = {};
    keys.forEach(function (k) { set[k] = true; });
    var longest = 0;
    keys.forEach(function (k) {
      if (!set[addDays(k, -1)]) {
        var len = 1, cur = k;
        while (set[addDays(cur, 1)]) { cur = addDays(cur, 1); len++; }
        if (len > longest) longest = len;
      }
    });
    var today = todayStr();
    var end = set[today] ? today : (set[addDays(today, -1)] ? addDays(today, -1) : null);
    var current = 0;
    if (end) { var c = end; while (set[c]) { current++; c = addDays(c, -1); } }
    return { current: current, longest: longest, total: keys.length };
  }

  function maybeAdvance(u) {
    var cat = u.currentTopic;
    if (!cat) return;
    var t = u.topics[cat] || (u.topics[cat] = { progressIndex: 0, lastAdvanceDate: todayStr() });
    var today = todayStr();
    if (t.lastAdvanceDate !== today) {
      if (daysBetween(t.lastAdvanceDate, today) > 0) t.progressIndex += 1;
      t.lastAdvanceDate = today;
    }
    var max = (VERSES_BY_CAT[cat] || []).length - 1;
    if (t.progressIndex > max) t.progressIndex = max;
    if (t.progressIndex < 0) t.progressIndex = 0;
    saveStore(store);
  }

  // ---------- DOM ----------
  function el(id) { return document.getElementById(id); }
  function show(node, on) { if (node) node.style.display = on ? "" : "none"; }
  function setText(id, text) { var e = el(id); if (e) e.textContent = text; }

  function render() {
    setText("today", prettyDate());
    var hasUser = !!currentUser;
    var u = hasUser ? getUser(currentUser) : null;
    var hasTopic = hasUser && u.currentTopic;

    show(el("loginCard"), !hasUser);
    show(el("topicCard"), hasUser && !hasTopic);
    show(el("studyCard"), !!hasTopic);
    show(el("userBar"), hasUser);
    if (hasUser) setText("userName", currentUser);
    if (hasTopic) { maybeAdvance(u); renderStudy(u); }
  }

  function renderTopicPicker() {
    var sel = el("topicSelect");
    sel.innerHTML = "";
    SECTIONS.forEach(function (sec) {
      var og = document.createElement("optgroup");
      og.label = secName(sec.key);
      sec.cats.forEach(function (cat) {
        var o = document.createElement("option");
        o.value = cat;
        o.textContent = catName(cat) + STR.topicOpt(VERSES_BY_CAT[cat].length);
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  }

  function renderStudy(u) {
    var cat = u.currentTopic;
    var list = VERSES_BY_CAT[cat] || [];
    var t = u.topics[cat];
    var idx = t.progressIndex;
    var v = list[idx];

    setText("topicLabel", catName(cat));
    setText("progressLabel", STR.progress(idx + 1, list.length));
    markCheckin(u);
    el("difficultySelect").value = u.difficulty;

    if (!v) { setText("verseRef", STR.topicDone); return; }

    setText("verseRef", STR.verseRef(v));
    var mainEl = el("verseMain");
    if (mainEl) mainEl.className = LANG === "en" ? "verse-main-en" : "verse-zh";
    setText("verseMain", LANG === "en" ? v.enClean : v.zh);
    var sub = LANG === "en" ? "" : v.en;
    setText("verseSub", sub); show(el("verseSub"), !!sub);
    var note = LANG === "en" ? "" : (v.note || "");
    setText("verseNote", note); show(el("verseNote"), !!note);

    buildClozeUI(u, v);
    renderStats(u);
    show(el("doneBanner"), idx >= list.length - 1 && t.lastAdvanceDate);
  }

  function renderStats(u) {
    var s = computeStreaks(u.stats.days);
    setText("statStreak", s.current);
    setText("statLongest", s.longest);
    setText("statTotal", s.total);
    setText("statCorrect", u.stats.totalCorrect);

    var today = todayStr();
    var done = u.stats.days[today] && u.stats.days[today].done;
    setText("todayStatus", done ? STR.todayDone : STR.todayPending);
    el("todayStatus").className = "today-status " + (done ? "ok" : "pending");

    var cal = el("calendar");
    cal.innerHTML = "";
    for (var i = 13; i >= 0; i--) {
      var d = addDays(today, -i);
      var rec = u.stats.days[d];
      var cell = document.createElement("div");
      cell.className = "cal-cell" + (rec ? (rec.done ? " done" : " checked") : "") + (d === today ? " today" : "");
      cell.title = d + (rec ? (rec.done ? STR.calDone : STR.calChecked) : "");
      cell.textContent = +d.split("-")[2];
      cal.appendChild(cell);
    }
  }

  // ---------- 填空题 ----------
  function buildClozeUI(u, v) {
    var text = LANG === "en" ? v.enClean : v.zhClean;
    var c = CLOZE.make(text, v.number, u.difficulty);
    setText("clozeBefore", c.before ? (LANG === "en" ? c.before + " " : c.before) : "");
    setText("clozeAfter", c.after ? (LANG === "en" ? " " + c.after : c.after) : "");

    var blank = el("clozeBlank");
    blank.textContent = blankPlaceholder(c.answer);
    blank.classList.remove("revealed");

    var input = el("clozeInput");
    input.value = "";
    var fb = el("clozeFeedback");
    fb.textContent = ""; fb.className = "feedback";

    el("btnCheck").onclick = function () {
      if (CLOZE.isCorrect(input.value, c.answer)) {
        fb.textContent = STR.ok; fb.className = "feedback ok";
        blank.textContent = c.answer; blank.classList.add("revealed");
        recordCorrect(u);
      } else {
        fb.textContent = STR.no; fb.className = "feedback no";
      }
    };
    el("btnHint").onclick = function () {
      if (LANG === "en") {
        var w = c.answer.split(/\s+/);
        fb.textContent = STR.hint(w[0], w.length);
      } else {
        fb.textContent = STR.hint(c.answer[0], c.answer.length);
      }
      fb.className = "feedback hint";
    };
    el("btnReveal").onclick = function () {
      blank.textContent = c.answer; blank.classList.add("revealed");
      fb.textContent = STR.answer(c.answer); fb.className = "feedback hint";
    };
    input.onkeydown = function (e) { if (e.key === "Enter") el("btnCheck").onclick(); };
  }

  function blankPlaceholder(answer) {
    if (LANG === "en") {
      var n = answer.split(/\s+/).filter(Boolean).length || 1;
      var parts = [];
      for (var i = 0; i < n; i++) parts.push("_____");
      return parts.join(" ");
    }
    return "□".repeat(Math.max(1, answer.length));
  }

  // ---------- 事件 ----------
  function bind() {
    el("btnStart").onclick = function () {
      var name = el("nameInput").value.trim();
      if (!name) { el("nameInput").focus(); return; }
      currentUser = name;
      store.lastUser = name;
      getUser(name);
      saveStore(store);
      renderTopicPicker();
      render();
    };
    el("nameInput").onkeydown = function (e) { if (e.key === "Enter") el("btnStart").onclick(); };

    el("btnChooseTopic").onclick = function () {
      var cat = el("topicSelect").value;
      var u = getUser(currentUser);
      u.currentTopic = cat;
      if (!u.topics[cat]) u.topics[cat] = { progressIndex: 0, lastAdvanceDate: todayStr() };
      saveStore(store);
      render();
    };

    el("btnSwitchTopic").onclick = function () {
      var u = getUser(currentUser);
      u.currentTopic = "";
      saveStore(store);
      renderTopicPicker();
      render();
    };

    el("btnSwitchUser").onclick = function () {
      currentUser = "";
      render();
      el("nameInput").value = "";
      el("nameInput").focus();
    };

    el("difficultySelect").onchange = function () {
      var u = getUser(currentUser);
      u.difficulty = el("difficultySelect").value;
      saveStore(store);
      renderStudy(u);
    };
  }

  function init() {
    if (!VERSES.length) {
      document.body.innerHTML = "<p style='padding:2rem'>" + STR.noData + "</p>";
      return;
    }
    bind();
    if (store.lastUser && store.users[store.lastUser]) el("nameInput").value = store.lastUser;

    var toggle = el("langToggle");
    if (toggle) {
      // 合并页：支持一键切换中/英
      toggle.onclick = function () { setLang(LANG === "en" ? "zh" : "en"); };
      var saved = null;
      try { saved = localStorage.getItem(STORE_KEY + "_lang"); } catch (e) {}
      setLang(saved || LANG); // 内部完成 applyStaticI18n + 渲染
    } else {
      renderTopicPicker();
      render();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
