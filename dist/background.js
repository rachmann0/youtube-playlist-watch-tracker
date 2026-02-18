"use strict";
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "WATCH_TIME")
        return;
    // chrome.storage.local.get({ totalSeconds: 0 }, data => {
    //   const totalSeconds = data.totalSeconds + msg.seconds;
    //   chrome.storage.local.set({ totalSeconds }, () => {
    //     chrome.runtime.sendMessage({
    //       type: "TOTAL_UPDATED",
    //       totalSeconds
    //     }).catch(()=>{});
    //   });
    // });
    chrome.storage.local.get({ playlists: [] }, data => {
        const playlists = data.playlists;
        const playlist = playlists.find((p) => p.id === msg.playlistId);
        if (!playlist)
            return; // ignore non-added playlists
        playlist.seconds += msg.seconds;
        chrome.storage.local.set({ playlists }, () => {
            chrome.runtime.sendMessage({
                type: "PLAYLIST_UPDATED",
                playlistId: playlist.id,
                seconds: playlist.seconds
            }).catch(() => {
                //updated but popup closed
            });
        });
    });
});
