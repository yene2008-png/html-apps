const CACHE = "manna-20260530231019";
const ASSETS = ["./", "index.html", "dujing.html", "icons/zh-180.png", "icons/zh-192.png", "icons/zh-512.png", "icons/zh-512m.png", "icons/zh.svg", "manifest-zh.json", "dailymanna.html", "icons/en-180.png", "icons/en-192.png", "icons/en-512.png", "icons/en-512m.png", "icons/en.svg", "manifest-en.json", "qianqianjie.html", "icons/bi-180.png", "icons/bi-192.png", "icons/bi-512.png", "icons/bi-512m.png", "icons/bi.svg", "manifest-bi.json", "css/style.css", "js/cloze.js", "js/cloze-en.js", "js/app.js", "data/verses.js"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (resp) {
      if (resp && resp.status === 200 && resp.type === "basic") {
        var cp = resp.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
      }
      return resp;
    }).catch(function () { return caches.match("index.html"); });
  }));
});
