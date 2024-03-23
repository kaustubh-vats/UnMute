const SCRIPT_ID = "unmute__script";

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['timerCoords'], function(data) {
        createScript(data.timerCoords);
    })
})
const getKey = (url) => {
    if(url.includes("meet.google")) {
        return "meet";
    } else {
        return "zoom";
    }
}
const getData = (data, key) => {
    if(!data) {
        return undefined;
    }
    return data[key];
}
const getOrDefault = (key, data) => {
    return getData(data, getKey(key)) || getData(data, "default");
}

window.addEventListener("message", (e) => {
    try {
        const data = JSON.parse(e.data);
        if(data.message === 'UNMUTE_UPDATE_TIMER_X') {
            chrome.storage.local.get(['timerCoords'], function(prev) {
                const payload = prev || { timerCoords: {} };
                if(!payload.timerCoords) {
                    payload.timerCoords = {}
                }
                payload.timerCoords[getKey(location.hostname)] = data.value;
                payload.timerCoords["default"] = data.value;
                chrome.storage.local.set(payload, function() {
                    // do nothing
                });
            })
        } else if(data.message === 'UNMUTE_UPDATE_TIMER_THEME') {
            chrome.storage.local.set({'darkTheme': data.value === true}, function() {
            });
        } else if(data.message === 'UNMUTE_UPDATE_TIMER_UNMUTE_ON_SPACE') {
            chrome.storage.local.set({'spaceShortcut': data.value === true}, function() {
            });

        } else if(data.message === 'UNMUTE_UPDATE_TIMER_AUTO_RECORD') {
            chrome.storage.local.set({'autoTimer': data.value === true}, function() {
            });
        }
    } catch(e) {}
})

const getScript = () => {
    return document.querySelector("#"+SCRIPT_ID);
}

const removeScript = () => {
    const script = getScript();
    if(script) {
        script.remove();
    }
}

const createScript = (data, darkTheme, autoTimer, spaceShortcut) => {
    if(getScript()) {
        return;
    }
    const filteredData = getOrDefault(location.hostname, data);
    const cssUrl = chrome.runtime.getURL('css/styles.css');
    const script = document.createElement('script');
    script.setAttribute('data-cssurl', cssUrl);
    script.setAttribute('id', SCRIPT_ID);
    script.setAttribute('src', chrome.runtime.getURL('js/unmute.js'));
    script.setAttribute('data-timerx', filteredData?.x);
    script.setAttribute('data-timery', filteredData?.y);
    script.setAttribute('data-autoTimer', autoTimer === true);
    script.setAttribute('data-spaceShortcut', spaceShortcut === true);
    script.setAttribute('data-darkTheme', darkTheme === true);
    document.body.appendChild(script);
}

try {
    chrome.storage.local.get(['timerCoords', 'darkTheme', 'autoTimer', 'spaceShortcut'], function(data) {
        createScript(data.timerCoords, data.darkTheme, data.autoTimer, data.spaceShortcut);
    })
} catch (e) { }