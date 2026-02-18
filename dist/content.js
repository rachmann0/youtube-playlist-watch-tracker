"use strict";
let video = null;
let lastTime = 0;
let lastTick = 0;
let ticking = false;
function getPlaylistId() {
    const url = new URL(location.href);
    return url.searchParams.get("list");
}
function isAdPlaying() {
    // return document.body.classList.contains("ad-showing");
    return !!document.querySelector(".ad-showing");
}
function attachVideo() {
    video = document.querySelector("video");
    lastTime = video?.currentTime ?? 0;
}
function tick() {
    if (!video || video.paused || video.ended)
        return;
    if (isAdPlaying()) {
        lastTime = video.currentTime; // prevent jump after ad
        return;
    }
    const delta = video.currentTime - lastTime;
    lastTime = video.currentTime;
    if (delta > 0 && delta < 2) {
        const playlistId = getPlaylistId();
        if (!playlistId)
            return;
        chrome.runtime.sendMessage({
            type: "WATCH_TIME",
            playlistId,
            seconds: delta
        });
    }
}
// YouTube SPA navigation detection
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(attachVideo, 1000);
    }
}).observe(document, { childList: true, subtree: true });
attachVideo();
setInterval(tick, 1000);
