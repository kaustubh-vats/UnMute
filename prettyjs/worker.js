let muteBtn;
let surround = [];
const SURROUNDS_VALS = ['left', 'right', 'top', 'bottom'];
const cssUrl = document.currentScript.getAttribute("data-cssurl");
const url = location.hostname;
let isFoundElseWhere = false;
const FOUND_MESSAGE = 'UNMUTE_FOUND';
const UPDATE_XY_MESSAGE = 'UNMUTE_UPDATE_TIMER_X';

const getAttributeToListen = () => {
    if (url.includes("meet.google")) {
        return "data-is-muted";
    } else if (url.includes("zoom")) {
        return "aria-label";
    }
}

const getBtnSelector = () => {
    if (url.includes("meet.google")) {
        return "[aria-label~='microphone']";
    } else if (url.includes("zoom")) {
        return ".join-audio-container__btn";
    }
}

const ifMuteBtnExist = () => {
    return muteBtn != null;
}
const isMicDisabled = () => {
    if (ifMuteBtnExist()) {
        if (url.includes("meet.google")) {
            return muteBtn.getAttribute("data-is-muted") == "true";
        } else if (url.includes("zoom")) {
            const ariaLabel = muteBtn.getAttribute("aria-label").toLowerCase();
            return ariaLabel.includes("join audio") || ariaLabel.includes("unmute")
        }
    }
    return false;
}
const getColorClass = () => {
    return isMicDisabled() ? 'muted' : 'unmuted';
}
const getAltClass = (currClass) => {
    return currClass === 'unmuted' ? 'muted' : 'unmuted';
}
const changeMode = () => {
    if (ifMuteBtnExist() && surround.length === 8) {
        surround.forEach(border => {
            const classList = border.classList;
            const newClass = getColorClass();
            const altClass = getAltClass(newClass);
            if (classList.contains(altClass)) {
                classList.remove(altClass);
                classList.add(newClass);
            }
        })
    }
}
const dettachSurroundIfExist = () => {
    surround.forEach(border => {
        border.remove();
    });
}
const getBasicSurround = () => {
    const border = document.createElement('div');
    border.setAttribute('class', `border ${getColorClass()}`);
    return border;
}
const removeSurround = () => {
    dettachSurroundIfExist();
    surround = [];
}
const getCSSUrl = () => {
    return cssUrl || document.querySelector("#unmute__script").getAttribute("data-cssurl")
}
const getPrevX = () => {
    const prevX = document.querySelector("#unmute__script").getAttribute("data-timerx");
    if (prevX === "undefined") {
        return null;
    }
    return prevX;
}
const getPrevY = () => {
    const prevY = document.querySelector("#unmute__script").getAttribute("data-timery");
    if (prevY === "undefined") {
        return null;
    }
    return prevY;
}
const removeWrapper = () => {
    const wrapper = document.querySelector('unmute-glass');
    if (wrapper) {
        wrapper.remove();
    }
}

function updateDiv(audioData, container) {
    if(container) {
        const averageAmplitude = audioData.reduce((sum, value) => sum + value, 0) / audioData.length;
        container.style.setProperty('--audio-freq', Math.round(averageAmplitude * 100) + 'px');
    }
}

function animate(analyser, container) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const normSamples = [...dataArray].map(e => e/128)
    updateDiv(normSamples, container);
    if(container && container.isConnected) {
        requestAnimationFrame(() => animate(analyser, container));
    }
}

const attachAudioAnimation = (container) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            const audioContext = new AudioContext();
            const microphone = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            microphone.connect(analyser);
            animate(analyser, container);
        })
        .catch(function (error) {
            console.debug('Error accessing microphone:', error);
        });
}

const checkIfAudioIsPresent = (container) => {
        navigator.permissions.query({ name: 'microphone' })
            .then(function (permissionStatus) {
                if (permissionStatus.state === 'granted') {
                    attachAudioAnimation(container);
                }
            })
            .catch(function (error) {
                console.debug('Error checking microphone permissions:', error);
            });
}

const createSurround = () => {
    removeWrapper();
    const wrapper = document.createElement('unmute-glass');
    const shadowRoot = wrapper.attachShadow({ mode: "closed" });
    const container = document.createElement('div');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = getCSSUrl();
    shadowRoot.appendChild(link);
    container.setAttribute('class', 'unmute__container');
    if (ifMuteBtnExist()) {
        removeSurround();
        SURROUNDS_VALS.forEach((clsName) => {
            const border = getBasicSurround();
            border.classList.add(clsName);
            const borderOpacited = border.cloneNode();
            borderOpacited.classList.add('opacited');
            container.appendChild(border);
            container.appendChild(borderOpacited);
            surround.push(border);
            surround.push(borderOpacited)
        });
    }
    const timer = new Timer(getPrevX(), getPrevY());
    const timerContainer = timer.createTimer();
    container.appendChild(timerContainer);
    shadowRoot.appendChild(container);
    checkIfAudioIsPresent(container);
    document.body.appendChild(wrapper);
}

const init = () => {
    muteBtn = document.querySelector(getBtnSelector());
    if (muteBtn) {
        createSurround();
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === getAttributeToListen()) {
                    changeMode();
                }
            });
        });
        const config = { attributes: true, attributeFilter: [getAttributeToListen()] };
        observer.observe(muteBtn, config);
    } else {
        removeSurround();
    }
}

window.addEventListener('message', (event) => {
    try {
        const data = JSON.parse(event.data);
        if (data.message === FOUND_MESSAGE) {
            if (event.source !== window) {
                isFoundElseWhere = data.value;
            }
        }
    } catch (e) { }
})

const sendMessageForIsFound = (isFound) => {
    const payload = {
        message: FOUND_MESSAGE,
        value: isFound
    }
    sendMessage(payload);
}

const sendMessage = (payload) => {
    window.postMessage(JSON.stringify(payload), "*");
    window.top.postMessage(JSON.stringify(payload), "*");
}

const handleMessage = (currBtn) => {
    if (!currBtn && muteBtn) {
        sendMessageForIsFound(false);
    } else if (currBtn) {
        sendMessageForIsFound(true);
    }
}

const domObserver = new MutationObserver(() => {
    if (isFoundElseWhere || (muteBtn && muteBtn.isConnected)) {
        return;
    }
    const currBtn = document.querySelector(getBtnSelector());
    handleMessage(currBtn);
    if (currBtn !== muteBtn) {
        init();
    }
})

class Timer {
    constructor(x, y) {
        this.x = x ?? 50;
        this.y = y ?? 50;
        this.minutesElement;
        this.secondsElement;
        this.minutes = 0;
        this.seconds = 0;
        this.timerInterval;
        this.dragStartX = 0;
        this.dragStartY = 0;
    }

    createTimer = () => {
        const timerContainer = document.createElement('div');
        timerContainer.classList.add('timer-container');

        const timer = document.createElement('div');
        timer.classList.add('timer');

        this.minutesElement = document.createElement('span');
        this.minutesElement.id = 'minutes';
        this.minutesElement.textContent = '00';

        const separator = document.createTextNode(':');

        this.secondsElement = document.createElement('span');
        this.secondsElement.id = 'seconds';
        this.secondsElement.textContent = '00';

        timer.appendChild(this.minutesElement);
        timer.appendChild(separator);
        timer.appendChild(this.secondsElement);

        const controls = document.createElement('div');
        controls.classList.add('controls');

        const startBtn = document.createElement('button');
        startBtn.id = 'startBtn';
        startBtn.className = 'resume';

        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetBtn';
        resetBtn.className = 'resetIcon';

        timerContainer.appendChild(startBtn);
        timerContainer.appendChild(timer);
        timerContainer.appendChild(resetBtn);

        timerContainer.setAttribute('draggable', 'true');
        timerContainer.addEventListener('dragstart', dragStart.bind(this));
        timerContainer.addEventListener('dragend', dragEnd.bind(this));

        function dragStart(event) {
            event.dataTransfer.setData('text/plain', event.target.id);
            event.dataTransfer.dropEffect = 'move';
            const currX = event.clientX;
            const currY = event.clientY;
            const rect = timerContainer.getBoundingClientRect();
            this.dragStartX = currX - rect.x;
            this.dragStartY = currY - rect.y;
        }

        function dragEnd(event) {
            const rect = timerContainer.getBoundingClientRect();
            const currX = event.clientX;
            const currY = event.clientY;
            let calcX = currX - this.dragStartX;
            let calcY = currY - this.dragStartY;
            if (calcX < 0) calcX = 0;
            if (calcY < 0) calcY = 0;
            if (calcX > document.documentElement.clientWidth - rect.width) calcX = document.documentElement.clientWidth - rect.width;
            if (calcY > document.documentElement.clientHeight - rect.height) calcY = document.documentElement.clientHeight - rect.height;
            this.setTimerXAndY(timerContainer, calcX, calcY);
            this.updateScriptAndExtension(calcX, calcY);
        }

        startBtn.addEventListener('click', (function () {
            if (!this.timerInterval) {
                this.timerInterval = setInterval(this.updateTimer.bind(this), 1000);
                startBtn.className = 'play';
            } else {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                startBtn.className = 'resume';
            }
        }).bind(this));

        resetBtn.addEventListener('click', (function () {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.minutes = 0;
            this.seconds = 0;
            this.updateTimerDisplay();
            startBtn.className = 'resume';
        }).bind(this));

        this.setTimerXAndY(timerContainer, this.x, this.y);
        return timerContainer;
    }

    updateScriptAndExtension(x, y) {
        const unmuteScript = document.querySelector("#unmute__script");
        if (unmuteScript) {
            unmuteScript.setAttribute("data-timerx", x);
            unmuteScript.setAttribute("data-timery", y);
        }
        sendMessage({
            message: UPDATE_XY_MESSAGE,
            value: {
                x: x,
                y: y
            }
        })
    }

    setTimerXAndY(timerContainer, x, y) {
        timerContainer.style.setProperty('--timer-x', `${x}px`);
        timerContainer.style.setProperty('--timer-y', `${y}px`);
    }

    updateTimer() {
        this.seconds++;
        if (this.seconds === 60) {
            this.minutes++;
            this.seconds = 0;
        }
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        if (this.minutesElement && this.secondsElement) {
            this.minutesElement.textContent = this.padZero(this.minutes);
            this.secondsElement.textContent = this.padZero(this.seconds);
        }
    }

    padZero(value) {
        return value < 10 ? `0${value}` : value;
    }
}

window.customElements.define(
    "unmute-glass",
    class extends HTMLElement {
        constructor() {
            super();
        }
    }
);

domObserver.observe(document.body, { subtree: true, childList: true });
init();