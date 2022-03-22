// ==UserScript==
// @name         Humble Bundle Keys & Entitlements to CSV
// @namespace    Heasley.humblebundlecsv
// @version      1.0
// @description  Extract Humble Bundle Keys & Entitlements to CSV and add links to Keys and Entitlements page
// @author       Heasley
// @match        https://www.humblebundle.com/home/keys*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=humblebundle.com
// @grant        GM_xmlhttpRequest
// @connect      api.steampowered.com
// @license      MIT
// ==/UserScript==
var csv = "Platform,Game/Software,URL\n";
const steamapp_url = "https://store.steampowered.com/app/";

const xtmlHttp = (options) => {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            timeout: 3000,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            ...options,
            onload: resolve,
            onabort: reject,
            ontimeout: reject,
            onerror: reject,
        });
    })
};

const sanitize = (str) => {
    if (str) {
        return str
        .replace(/[\u{2122}\u{00AE}\n]/gu, "")
        .replaceAll(",","")
        .trim()
        .toLowerCase()
    } else {
     return null;
    }
};

const fetchSteamApps = async () => {
    const apps = {};
    try {
        const r = await xtmlHttp({
            url: "https://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json",
            method: "GET",
            timeout: 5000,
        });
        const { applist } = JSON.parse(r.responseText);
        applist?.apps?.forEach(({ name, appid }) => {
            apps[sanitize(name)] = appid;
        });
    } catch (error) {
        console.error(error);
    }
    return apps;
};


const apps = await fetchSteamApps();

const unredeemedKeysTableObserver = new MutationObserver(function(mutations) {
  if ($('table.unredeemed-keys-table').length) {
    $('table.unredeemed-keys-table > tbody > tr:not(.key-manager-choice-row)').each(function(el) {
        let game = $(this).find('td.game-name > h4');
        gameToSteam(game);
    });
  }
});
unredeemedKeysTableObserver.observe(document, {attributes: false, childList: true, characterData: false, subtree:true});


(function() {
    'use strict';
    $('h1:contains(Keys & Entitlements)').after('<button id="to-csv">Humble to CSV</button>');
})();

function gameToSteam(game) {
    let name = game.attr('title');
    let appid;
    if ((appid = apps[sanitize(name)])) {
        game.wrap(`<a href="${steamapp_url}${appid}/" style="text-decoration:underline;" target="_blank" rel="noopener" title="Visit Steam Store" class="steamurl">`);
    }
}

function humbleToCSV() {
    $('table.unredeemed-keys-table > tbody > tr:not(.key-manager-choice-row)').each(function(el) {
        let platform = $(this).find('td.platform > i').attr('title');
        let name = $(this).find('td.game-name h4').attr('title');
        let appid;
        let url = ((appid = apps[sanitize(name)]) ? steamapp_url+appid+"/" : "N/A");
        csv += '"' + platform + '","' + name + '","' + url + '"\n';
    });

    if ($('div.pagination-holder > div.pagination').first().children('div:last-child').length) {
        let nextpage = $('div.pagination-holder > div.pagination').first().children('div:last-child');
        if (nextpage.find('i.hb-chevron-right').length) {
            //there should be another page, so we click the next page button and continue
            nextpage.click();
            humbleToCSV();
        }
    }
}

$('#to-csv').click(function() {
    humbleToCSV();
    //no more pages, time to export to file
    let csvData = new Blob([csv], { type: 'text/csv' });
    var csvUrl = URL.createObjectURL(csvData);
    window.open(csvUrl);
    //reset csv variable
    csv = "Platform,Game/Software,URL\n";
});
