importScripts(
    'miscapis/RTAinit.js',
    'miscapis/safe-buffer.js',
    'miscapis/bencode.js',
    'miscapis/functions.js',
    'miscapis/config.js',
    'miscapis/base64.js',
    'webuiapis/VuzeSwingUI.js',
    'webuiapis/TorrentfluxWebUI.js',
    'webuiapis/TransmissionWebUI.js',
    'webuiapis/uTorrentWebUI.js',
    'webuiapis/ruTorrentWebUI.js',
    'webuiapis/VuzeHTMLUI.js',
    'webuiapis/VuzeRemoteUI.js',
    'webuiapis/BuffaloWebUI.js',
    'webuiapis/qBittorrentWebUI.js',
    'webuiapis/qBittorrentWebUI-v2.js',
    'webuiapis/QnapDownloadStation.js',
    'webuiapis/DelugeWebUI.js',
    'webuiapis/pyrtWebUI.js',
    'webuiapis/TixatiWebUI.js',
    'webuiapis/HadoukenWebUI.js',
    'webuiapis/nodejsrtorrentWebUI.js',
    'webuiapis/SynologyWebUI.js',
    'webuiapis/floodWebUI.js',
    'webuiapis/flood-jesecWebUI.js',
    'webuiapis/tTorrentWebUI.js',
    'webuiapis/rtorrentXmlRpc.js',
    'webuiapis/elementumWebUi.js'
);

///////////////////////////////////////////////////////
// TAKE CARE OF EXTENSION SETTINGS. VIRGIN/OLD INSTALL?
///////////////////////////////////////////////////////

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["servers"], (result) => {
        if (!result.servers) {
            const servers = [];
            servers.push({
                "name": "PRIMARY SERVER",
                "host": "127.0.0.1",
                "port": 6883,
                "hostsecure": "",
                "login": "login",
                "password": "password",
                "client": "Vuze SwingUI"
            });
            chrome.storage.local.set({
                "servers": servers,
                "linksfoundindicator": "true",
                "showpopups": "true",
                "popupduration": "2000",
                "catchfromcontextmenu": "true",
                "catchfrompage": "true",
                "linkmatches": "([\\]\\[]|\\b|\\.)\\.torrent\\b([^\\-]|$)~torrents\\.php\\?action=download"
            }, () => {
                RTA.constructContextMenu();
            });
        } else {
            RTA.constructContextMenu();
        }
    });
});

//////////////////////////////////////////////////////
// REGISTER CONTEXT (RIGHT-CLICK) MENU ITEMS FOR LINKS
//////////////////////////////////////////////////////
RTA.constructContextMenu();

////////////////////
// GRAB FROM NEW TAB
////////////////////
chrome.tabs.onCreated.addListener(function (tab) {
    chrome.storage.local.get(["servers", "catchfromnewtab", "linkmatches"], (result) => {
        const server = result.servers[0]; // primary server
        if (result.catchfromnewtab != "true") return;
        const res = result.linkmatches.split('~');
        for (const mkey in res) {
            if (tab.url.match(new RegExp(res[mkey], "g"))) {
                RTA.getTorrent(server, tab.url);
                break;
            }
        }
    });
});



/////////////////////////////////////////////////////
// OVERWRITE THE CLICK-EVENT OF LINKS WE WANT TO GRAB
/////////////////////////////////////////////////////
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "addTorrent") {
        chrome.storage.local.get(["servers"], (result) => {
            let server = result.servers[0]; // primary server
            if (request.server) {
                server = request.server;
            }
            RTA.getTorrent(server, request.url, request.label, request.dir, request.referer);
        });
    } else if (request.action === "getStorageData") {
        chrome.storage.local.get(null, (items) => {
            sendResponse(items);
        });
        return true; // Indicates that the response is sent asynchronously
    } else if (request.action === "setStorageData") {
        chrome.storage.local.set(request.data, () => {
            sendResponse({});
        });
        return true; // Indicates that the response is sent asynchronously
    } else if (request.action === "pageActionToggle") {
        chrome.action.setIcon({ path: { "16": "icons/BitTorrent16.png", "48": "icons/BitTorrent48.png", "128": "icons/BitTorrent128.png" }, tabId: sender.tab.id });
    } else if (request.action === "constructContextMenu") {
        RTA.constructContextMenu();
    } else if (request.action === "registerRefererListeners") {
        registerReferrerHeaderListeners();
    }
});

///////////////////////////////////////////////////////////////////
// CATCH WEBUI REQUESTS WHOSE CSRF PROTECTION WE NEED TO CIRCUMVENT
///////////////////////////////////////////////////////////////////
async function registerReferrerHeaderListeners() {
    const { servers } = await chrome.storage.local.get(["servers"]);
    if (!servers) return;

    const rules = servers.map((server, index) => {
        const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/";
        return {
            id: index + 1,
            priority: 1,
            action: {
                type: "modifyHeaders",
                requestHeaders: [
                    { header: "Referer", operation: "set", value: url },
                    { header: "Origin", operation: "set", value: url }
                ]
            },
            condition: { urlFilter: url + "*", resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"] }
        };
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(r => r.id),
        addRules: rules
    });
}

registerReferrerHeaderListeners();

/////////////////////////////////////////////////////
// CATCH TORRENT LINKS AND ALTER THEIR REFERER/ORIGIN
/////////////////////////////////////////////////////
async function registerTorrentLinkListener(url, referer) {
    const rule = {
        id: 100, // A unique ID for the rule
        priority: 2,
        action: {
            type: "modifyHeaders",
            requestHeaders: [
                { header: "Referer", operation: "set", value: referer || url },
                { header: "Origin", operation: "set", value: referer || url }
            ]
        },
        condition: { urlFilter: url, resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"] }
    };

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [100],
        addRules: [rule]
    });
}




/////////////////////////////////////////////////////////
// register browser action for opening a tab to the webui
/////////////////////////////////////////////////////////
chrome.action.onClicked.addListener(async (tab) => {
    const { servers } = await chrome.storage.local.get(["servers"]);
    if (servers && servers.length > 0) {
        const server = servers[0];
        const relativePath = server.ruTorrentrelativepath || server.utorrentrelativepath || server.delugerelativepath || server.rtorrentxmlrpcrelativepath || "/";
        const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + relativePath;
        chrome.tabs.create({ url: url });
    }
});
