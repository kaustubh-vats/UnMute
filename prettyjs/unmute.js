let muteBtn;
let surround = [];
const SURROUNDS_VALS = ['left', 'right', 'top', 'bottom'];
const cssUrl = document.currentScript.getAttribute("data-cssurl");
let isEnabledAutoTimer = document.currentScript.getAttribute("data-autoTimer") === 'true';
let isEnabledUnmuteOnSpace = document.currentScript.getAttribute("data-spaceShortcut") === 'true';
const isEnabledDarkTheme = document.currentScript.getAttribute("data-darkTheme") === 'true';
const url = location.hostname;
let isFoundElseWhere = false;
let isMicUnmutedByShortcut = false;
let timerInstance;
let timerContainerInstance = null;
const FOUND_MESSAGE = 'UNMUTE_FOUND';
const UPDATE_XY_MESSAGE = 'UNMUTE_UPDATE_TIMER_X';
const UPDATE_THEME_MESSAGE = 'UNMUTE_UPDATE_TIMER_THEME';
const UPDATE_UNMUTE_ON_SPACE_MESSAGE = 'UNMUTE_UPDATE_TIMER_UNMUTE_ON_SPACE';
const UPDATE_AUTO_RECORD_MESSAGE = 'UNMUTE_UPDATE_TIMER_AUTO_RECORD';

const removeUnmuteListenerOnSpace = () => {    
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keyup', onKeyUp, true);
}

const attachUnmuteListenerOnSpace = () => {
    removeUnmuteListenerOnSpace();
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
}

const onChangeAutoRecord = (value) => {
    if(value && !isEnabledAutoTimer){
        sendMessage({
            message: UPDATE_AUTO_RECORD_MESSAGE,
            value: true
        });
        isEnabledAutoTimer = true;
    } else if(!value && isEnabledAutoTimer) {

        sendMessage({
            message: UPDATE_AUTO_RECORD_MESSAGE,
            value: false
        });
        isEnabledAutoTimer = false;
    }
    return;
}

const onChangeSpaceMute = (value) => {
    if(value && !isEnabledUnmuteOnSpace) {
        attachUnmuteListenerOnSpace();
        sendMessage({
            message: UPDATE_UNMUTE_ON_SPACE_MESSAGE,
            value: true
        });
        isEnabledUnmuteOnSpace = true;
    } else if(!value && isEnabledUnmuteOnSpace) {
        removeUnmuteListenerOnSpace();
        sendMessage({
            message: UPDATE_UNMUTE_ON_SPACE_MESSAGE,
            value: false
        });
        isEnabledUnmuteOnSpace = false;
    }
    return;
}

const onChangeDarkTheme = (value) => {
    if(!timerContainerInstance){
        retturn;
    }
    if(value && !timerContainerInstance.classList.contains('timer-dark')) {
        timerContainerInstance.classList.add('timer-dark');
        sendMessage({
            message: UPDATE_THEME_MESSAGE,
            value: true
        });
    } else if(!value && timerContainerInstance.classList.contains('timer-dark')) {
        timerContainerInstance.classList.remove('timer-dark');
        sendMessage({
            message: UPDATE_THEME_MESSAGE,
            value: false
        });
    }
    return;
}

const menuItems = [
    {
        label: 'Auto record time on unmute',
        default: isEnabledAutoTimer === true,
        onChange: onChangeAutoRecord
    },
    {
        label: 'Use space bar to unmute',
        default: isEnabledUnmuteOnSpace === true,
        onChange: onChangeSpaceMute
    },
    {
        label: 'Dark theme',
        default: isEnabledDarkTheme === true,
        onChange: onChangeDarkTheme
    }
];

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
const unMuteMic = () => {
    if (isMicDisabled()) {
        muteBtn.blur();
        muteBtn.click();
        isMicUnmutedByShortcut = true;
    }
}
const muteMic = () => {
    if (!isMicDisabled() && isMicUnmutedByShortcut) {
        muteBtn.click();
        isMicUnmutedByShortcut = false;
        muteBtn.focus();
    }
}
const getColorClass = () => {
    return isMicDisabled() ? 'muted' : 'unmuted';
}
const getAltClass = (currClass) => {
    return currClass === 'unmuted' ? 'muted' : 'unmuted';
}
const changeMode = () => {
    if (ifMuteBtnExist() && surround.length === 8) {
        
        const newClass = getColorClass();
        const altClass = getAltClass(newClass);

        surround.forEach(border => {
            const classList = border.classList;
            if (classList.contains(altClass)) {
                classList.remove(altClass);
                classList.add(newClass);
            }
        })
        
        if(isEnabledAutoTimer && timerInstance){
            timerInstance.handleAutoTimer(newClass);
        }
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
    if (container) {
        const averageAmplitude = audioData.reduce((sum, value) => sum + value, 0) / audioData.length;
        container.style.setProperty('--audio-freq', Math.round(averageAmplitude * 100) + 'px');
    }
}

function animate(analyser, container) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const normSamples = [...dataArray].map(e => e / 128)
    updateDiv(normSamples, container);
    if (container && container.isConnected) {
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

const onKeyDown = (e) => {
    if (e.key === ' ') {
        unMuteMic(e);
    }
}

const onKeyUp = (e) => {
    if (e.key === ' ') {
        muteMic(e);
    }
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
        if(isEnabledUnmuteOnSpace) {
            attachUnmuteListenerOnSpace();
        }
    }
    shadowRoot.appendChild(container);
    checkIfAudioIsPresent(container);
    link.onload = () => {
        timerInstance = new Timer(getPrevX(), getPrevY(), container);
        timerContainerInstance = timerInstance.createTimer();
        container.appendChild(timerContainerInstance);
    }
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
    constructor(x, y, container) {
        this.x = x ?? 50;
        this.y = y ?? 50;
        this.minutesElement;
        this.secondsElement;
        this.minutes = 0;
        this.seconds = 0;
        this.timerInterval;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.controlButton = undefined;
        this.isAutoRecording = false;
        this.menuUpdateTimeout = null;
        this.container = container;
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
        startBtn.title = 'Pause / Resume Timer';
        this.controlButton = startBtn;

        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetBtn';
        resetBtn.title = 'Reset Timer';
        resetBtn.className = 'resetIcon';

        const timerWrapper = document.createElement('div');
        timerWrapper.setAttribute('class', 'timer-wrapper');

        const menuContainer =  document.createElement('div');
        menuContainer.setAttribute('class', 'menu-container');

        let firstInput = null;
        let lastInput = null;

        menuItems.forEach((menuItem) => {
            const menuItemContainer = document.createElement('div');
            menuItemContainer.setAttribute('class', 'menu-item');

            const menuLabel = document.createElement('div');
            menuLabel.textContent = menuItem.label;

            const menuCheckbox = document.createElement('input');
            menuCheckbox.setAttribute('class', 'menu-checkbox');
            menuCheckbox.setAttribute('type', 'checkbox');
            menuCheckbox.addEventListener('change', (e)=>{
                menuItem.onChange(e.target.checked);
            })
            menuCheckbox.checked = menuItem.default;

            if(!firstInput) {
                firstInput = menuCheckbox;
            }
            lastInput = menuCheckbox;

            menuItemContainer.appendChild(menuLabel);
            menuItemContainer.appendChild(menuCheckbox);
            menuContainer.appendChild(menuItemContainer);
        });

        const timerFlexContainer = document.createElement('div');
        timerFlexContainer.setAttribute('class', 'timer-flex-container');

        timerFlexContainer.appendChild(startBtn);
        timerFlexContainer.appendChild(timer);
        timerFlexContainer.appendChild(resetBtn);
        timerWrapper.appendChild(timerFlexContainer);
        timerWrapper.appendChild(menuContainer);
        timerContainer.appendChild(timerWrapper);

        timerContainer.setAttribute('draggable', 'true');
        timerContainer.setAttribute('tabindex', '0');
        timerContainer.setAttribute('aria-label', 'click to toggle menu list');
        timerContainer.classList.add('menu-top');
        timerContainer.addEventListener('dragstart', dragStart.bind(this));
        timerContainer.addEventListener('dragend', dragEnd.bind(this));
        timerContainer.addEventListener('click', clickHandler);
        timerContainer.addEventListener('keydown', (e) => {
            if(e.key == 'Enter') {
                clickHandler(e);
            }
        })

        if(isEnabledDarkTheme) {
            timerContainer.classList.add('timer-dark');
        }
        function clickHandler(event) {
            const source = event?.target;
            if(source && 
                (menuContainer && (menuContainer === source || menuContainer.contains(source))) || 
                (startBtn && (startBtn === source || startBtn.contains(source))) ||
                (resetBtn && (resetBtn === source || resetBtn.contains(source)))
            ) {
                return;
            }
            timerContainer.classList.toggle('expanded-menu');
            if(timerContainer.classList.contains('expanded-menu')){
                firstInput.focus();
                lastInput.addEventListener('keydown', (e)=>{
                    if(e.key === 'Tab' && !e.shiftKey) {
                        timerContainer.focus();
                        e.preventDefault();
                    }
                });
                timerContainer.setAttribute('aria-label', 'click to toggle menu list, menu list open');
            } else {
                timerContainer.setAttribute('aria-label', 'click to toggle menu list, menu list closed');
            }
        }

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
            const currX = event.clientX;
            const currY = event.clientY;
            let calcX = currX - this.dragStartX;
            let calcY = currY - this.dragStartY;
            this.setTimerXAndY(timerContainer, calcX, calcY, menuContainer, this.menuUpdateTimeout, this);
            this.updateScriptAndExtension(calcX, calcY);
        }

        startBtn.addEventListener('click', (function (e) {
            if (!this.timerInterval) {
                this.timerInterval = setInterval(this.updateTimer.bind(this), 1000);
                startBtn.className = 'play';
                this.isAutoRecording = false;
            } else {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                startBtn.className = 'resume';
            }
            e.stopPropagation();
        }).bind(this));

        resetBtn.addEventListener('click', (function (e) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.minutes = 0;
            this.seconds = 0;
            this.updateTimerDisplay();
            startBtn.className = 'resume';
            e.stopPropagation();
        }).bind(this));

        const hiddenDiv = document.createElement('div');
        hiddenDiv.setAttribute('class', 'hidden-div');
        hiddenDiv.appendChild(timerContainer);
        this.container.appendChild(hiddenDiv);
        this.setTimerXAndY(timerContainer, this.x, this.y, menuContainer, this.menuUpdateTimeout, this);
        timerContainer.remove();
        hiddenDiv.remove();
        window.addEventListener('resize', (() => {
            this.setTimerXAndY(timerContainer, this.x, this.y, menuContainer, this.menuUpdateTimeout, this);
        }).bind(this));
        return timerContainer;
    }

    handleAutoTimer(state) {
        if (state === 'unmuted' && !this.timerInterval) {
            this.timerInterval = setInterval(this.updateTimer.bind(this), 1000);
            if(this.controlButton) {
                this.controlButton.className = 'play';
            }
            this.isAutoRecording = true;
        } else if(state === 'muted' && this.timerInterval && this.isAutoRecording) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            if(this.controlButton) {
                this.controlButton.className = 'resume';
            }
            this.isAutoRecording = false;
        }
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

    setTimerXAndY(timerContainer, x, y, menuContainer, menuUpdateTimeout, context) {
        const rect = timerContainer.getBoundingClientRect();
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x > document.documentElement.clientWidth - rect.width) x = document.documentElement.clientWidth - rect.width;
        if (y > document.documentElement.clientHeight - rect.height) y = document.documentElement.clientHeight - rect.height;

        context.x = x;
        context.y = y;

        timerContainer.style.setProperty('--timer-x', `${x}px`);
        timerContainer.style.setProperty('--timer-y', `${y}px`);

        if(menuUpdateTimeout) {
            clearTimeout(menuUpdateTimeout);
            menuUpdateTimeout = null;
        }

        menuUpdateTimeout = setTimeout(()=>{
            const rect = menuContainer.getBoundingClientRect();
            let pos = timerContainer.classList.contains('menu-bottom') ? 'bottom' : 'top';
            if (rect.y < 0) pos = 'bottom';
            if (rect.y + rect.height > document.body.clientHeight) pos = 'top';
            if(pos === 'top' && !timerContainer.classList.contains('menu-top')) {
                if(timerContainer.classList.contains('menu-bottom')) {
                    timerContainer.classList.remove('menu-bottom');
                }
                timerContainer.classList.add('menu-top');
            } else if(pos === 'bottom' && !timerContainer.classList.contains('menu-bottom')) {
                if(timerContainer.classList.contains('menu-top')) {
                    timerContainer.classList.remove('menu-top');
                }
                timerContainer.classList.add('menu-bottom');
            }
            clearTimeout(menuUpdateTimeout);
            menuUpdateTimeout = null;
        }, 100);
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