type Playlist = {
  id: string;
  title: string;
  seconds: number;
};

const timeEl = document.getElementById("time")!;
const addBtn = document.getElementById("add-playlist")!;
const statusEl = document.getElementById("status")!;
const endSessionBtn = document.getElementById("end-session")!;

function format(seconds: number): string {
  seconds = Math.floor(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

const sessionContainer = document.getElementById("playlists")!;
const allTimeContainer = document.getElementById("all-time")!;

function playlistUrl(id: string) {
  return `https://www.youtube.com/playlist?list=${id}`;
}

function renderPlaylists(
  container: HTMLElement,
  playlists: Playlist[]
) {
  container.innerHTML = "";

  if (playlists.length === 0) {
    container.textContent = "—";
    return;
  }

  playlists.forEach(p => {
    // const div = document.createElement("div");
    // div.className = "playlist";
    // div.innerHTML = `
    //   <div>${p.title}</div>
    //   <div class="time">${format(p.seconds)}</div>
    // `;
    // container.appendChild(div);

    const div = document.createElement("div");
    div.className = "playlist";

    const link = document.createElement("a");
    link.textContent = p.title;
    link.href = playlistUrl(p.id);
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    link.style.cursor = "pointer";
    link.style.textDecoration = "underline";

    const time = document.createElement("div");
    time.className = "time";
    time.textContent = format(p.seconds);

    div.appendChild(link);
    div.appendChild(time);
    container.appendChild(div);
  });
}


// Initial load
chrome.storage.local.get(
  {
    playlists: [] as Playlist[],
    allTimePlaylists: [] as Playlist[]
  },
  data => {
    renderPlaylists(sessionContainer, data.playlists);
    renderPlaylists(allTimeContainer, data.allTimePlaylists);
  }
);

// Live updates
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "PLAYLIST_UPDATED") {
    chrome.storage.local.get(
      {
        playlists: [] as Playlist[],
        allTimePlaylists: [] as Playlist[]
      },
      data => {
        renderPlaylists(sessionContainer, data.playlists);
        renderPlaylists(allTimeContainer, data.allTimePlaylists);
      }
    );
  }
});


// Add playlist button
addBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.url || !tab?.id) {
    statusEl.textContent = "No active tab";
    return;
  }

  const url = new URL(tab.url);
  const playlistId = url.searchParams.get("list");

  if (!playlistId) {
    statusEl.textContent = "No playlist detected";
    return;
  }

  // Execute script in the page to get playlist title
  const [{ result: title }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const title = document.querySelector(
        'ytd-playlist-panel-renderer yt-formatted-string.title'
      )?.getAttribute('title');

      return title || "Untitled playlist";
    }
  });

  chrome.storage.local.get({ playlists: [] as Playlist[] }, data => {
    const playlists = data.playlists;

    const exists = playlists.some((p: Playlist) => p.id === playlistId);
    if (exists) {
      statusEl.textContent = "Playlist already added";
      return;
    }

    // new playlist
    playlists.push({
      id: playlistId,
      title,
      seconds: 0
    });

    chrome.storage.local.set({ playlists }, () => {
      statusEl.textContent = `Added: ${title}`;
    });
  });

});

endSessionBtn.addEventListener("click", () => {
  chrome.storage.local.get(
    {
      playlists: [] as Playlist[],
      allTimePlaylists: [] as Playlist[]
    },
    data => {
      const session = data.playlists;
      const allTime = data.allTimePlaylists;

      for (const p of session) {
        if (p.seconds <= 0) continue;

        let all = allTime.find((x:Playlist) => x.id === p.id);

        if (!all) {
          all = {
            id: p.id,
            title: p.title,
            seconds: 0
          };
          allTime.push(all);
        }

        all.seconds += p.seconds;
        p.seconds = 0; // reset session time
      }

      chrome.storage.local.set(
        {
          playlists: session,
          allTimePlaylists: allTime
        },
        () => {
          // render(session); // refresh UI
          renderPlaylists(sessionContainer, session);
          renderPlaylists(allTimeContainer, allTime);
        }
      );
    }
  );
});