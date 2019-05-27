// @flow

import 'cmn/lib/extension-polyfill'

function uninit() {
    removeStyleSheet();
    removeInstallClickHandlers(document.body);
    unwatchAddingInstallHandlers();
}

function init() {
    addStyleSheet();
    addInstallClickHandlers(document.body);
    watchForAddingInstallHandlers();
}

init();

function addStyleSheet() {
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('id', 'foxified-style')
    styleSheet.textContent = `
        div[role=button][aria-label*="CHROME"],
        div[role=button][aria-label*="Chrome"]
        {
            background-color: rgb(124, 191, 54);
            background-image: linear-gradient(to bottom, rgb(124, 191, 54), rgb(101, 173, 40));
            border-color:rgb(78, 155, 25);
        }

        div[role=button][aria-label*="CHROME"] .webstore-test-button-label,
        div[role=button][aria-label*="Chrome"] .webstore-test-button-label
        {
            font-size: 0;
        }

        div[role=button][aria-label*="CHROME"] .webstore-test-button-label::before,
        div[role=button][aria-label*="Chrome"] .webstore-test-button-label::before
        {
            display: flex;
            content: "Add To Firefox";
            justify-content: center;
            align-items: center;
            font-size: 14px;
        }

        /* targeting download div */
        body > div:last-of-type > div:nth-of-type(2),
        /* alt target download div */
        .h-Yb-wa.Yb-wa
        {
            display: none;
        }
    `;

    document.documentElement.insertBefore(styleSheet, document.documentElement.firstChild);
}

function removeStyleSheet() {
	const styleSheet = document.getElementById('foxified-style');
	if (styleSheet) styleSheet.parentNode.removeChild(styleSheet);
}

/**
 * If return is truthy, the return value is returned.
 *
 */
function parentNodeUntil(node, maxDepth, predicate) {
    let curNode = node;
    let rez;
    let depth = 0;
    while (!rez && depth++ < maxDepth) {
        rez = predicate(curNode);
        if (!rez) curNode = curNode.parentNode;
    }
    return rez;
}

function handleInstall(e) {
    e.preventDefault();
    e.stopPropagation();

    // start figure out id
    // Thanks to @Rob--W the id is accurately obtained: "It is the first 32 characters of the public key's sha256 hash, with the 0-9a-f replaced with a-p"
    const extidPatt = /[^a-p]([a-p]{32})[^a-p]/i;
    const extid = parentNodeUntil(e.target, 100, node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const [, extid] = extidPatt.exec(node.innerHTML) || [];
            console.log('extid:', extid);
            return extid;
        }
    });

    if (!extid) alert('Chrome Store Foxified enecountered an error. Failed to figure out extension ID.')
    else extension.runtime.sendMessage({
        action: 'request-add',
        kind: 'cws',
        extid
    });
}

function addInstallClickHandlers(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const buttons = [
            ...node.querySelectorAll('div[role=button][aria-label*="Chrome"]'),
            ...node.querySelectorAll('div[role=button][aria-label*="CHROME"]')
        ];

        for (const button of buttons) {
            button.addEventListener('click', handleInstall, true);
        }
    }
}

function removeInstallClickHandlers(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const buttons = [
            ...node.querySelectorAll('div[role=button][aria-label*="Chrome"]'),
            ...node.querySelectorAll('div[role=button][aria-label*="CHROME"]')
        ];

        for (const button of buttons) {
            button.removeEventListener('click', handleInstall, true);
        }
    }
}

let gObserver;
function watchForAddingInstallHandlers() {
    gObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    addInstallClickHandlers(node);
                }
            }
        }
    });

    gObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function unwatchAddingInstallHandlers() {
    gObserver.disconnect();
}
