"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUpdatedManga = exports.isLastPage = exports.parseTags = exports.parseViewMore = exports.parseSearch = exports.generateSearch = void 0;
const entities = require("entities");
function convertTime(timeAgo) {
    let time;
    let trimmed = Number((/\d*/.exec(timeAgo) ?? [])[0]);
    trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
    if (timeAgo.includes('Giây') || timeAgo.includes('secs')) {
        time = new Date(Date.now() - trimmed * 1000); // => mili giây (1000 ms = 1s)
    }
    else if (timeAgo.includes('Phút')) {
        time = new Date(Date.now() - trimmed * 60000);
    }
    else if (timeAgo.includes('Giờ')) {
        time = new Date(Date.now() - trimmed * 3600000);
    }
    else if (timeAgo.includes('Ngày')) {
        time = new Date(Date.now() - trimmed * 86400000);
    }
    else if (timeAgo.includes('Năm')) {
        time = new Date(Date.now() - trimmed * 31556952000);
    }
    else {
        if (timeAgo.includes(":")) {
            let split = timeAgo.split(' ');
            let H = split[0]; //vd => 21:08
            let D = split[1]; //vd => 25/08 
            let fixD = D?.split('/');
            let finalD = fixD?.[1] + '/' + fixD?.[0] + '/' + new Date().getFullYear();
            time = new Date(finalD + ' ' + H);
        }
        else {
            let split = timeAgo.split('/'); //vd => 05/12/18
            time = new Date(split[1] + '/' + split[0] + '/' + '20' + split[2]);
        }
    }
    return time;
}
const generateSearch = (query) => {
    let keyword = query.title ?? "";
    return encodeURI(keyword);
};
exports.generateSearch = generateSearch;
const parseSearch = ($) => {
    const mangas = [];
    for (let manga of $('li', '.list-stories').toArray()) {
        let title = $(`h3.title-book > a`, manga).text().trim();
        let subtitle = $(`.episode-book > a`, manga).text().trim();
        let image = $(`a > img`, manga).attr("src") ?? "";
        let id = $(`a`, manga).attr("href")?.split("/").pop() ?? title;
        if (!id || !title)
            continue;
        mangas.push(App.createPartialSourceManga({
            mangaId: encodeURIComponent(id),
            image: !image ? "https://i.imgur.com/GYUxEX8.png" : image,
            title,
            subtitle
        }));
    }
    return mangas;
};
exports.parseSearch = parseSearch;
const parseViewMore = ($) => {
    const manga = [];
    const collectedIds = [];
    for (let obj of $('li', '.list-stories').toArray()) {
        let title = $(`h3.title-book > a`, obj).text().trim();
        let subtitle = $(`.episode-book > a`, obj).text().trim();
        let image = $(`a > img`, obj).attr("src") ?? "";
        let id = $(`a`, obj).attr("href")?.split("/").pop() ?? title;
        if (!id || !title)
            continue;
        if (!collectedIds.includes(id)) {
            manga.push(App.createPartialSourceManga({
                mangaId: encodeURIComponent(id),
                image: image ?? "",
                title: decodeHTMLEntity(title),
                subtitle
            }));
            collectedIds.push(id);
        }
    }
    return manga;
};
exports.parseViewMore = parseViewMore;
const parseTags = ($) => {
    const arrayTags = [];
    for (const obj of $("li", "ul").toArray()) {
        const label = ($("a", obj).text().trim());
        const id = $('a', obj).attr('href') ?? "";
        if (id == "")
            continue;
        arrayTags.push({
            id: id,
            label: label,
        });
    }
    const tagSections = [App.createTagSection({ id: '0', label: 'Thể Loại', tags: arrayTags.map(x => App.createTag(x)) })];
    return tagSections;
};
exports.parseTags = parseTags;
const isLastPage = ($) => {
    let isLast = false;
    const pages = [];
    for (const page of $("li", "ul.pagination-list").toArray()) {
        const p = Number($('a', page).text().trim());
        if (isNaN(p))
            continue;
        pages.push(p);
    }
    const lastPage = Math.max(...pages);
    const currentPage = Number($("li > a.is-current").text().trim());
    if (currentPage >= lastPage)
        isLast = true;
    return isLast;
};
exports.isLastPage = isLastPage;
const decodeHTMLEntity = (str) => {
    return entities.decodeHTML(str);
};
function parseUpdatedManga($, time, ids) {
    const returnObject = {
        'ids': []
    };
    const updateManga = [];
    for (let manga of $('li', '.latest').toArray()) {
        const id = $(`a`, manga).attr("href")?.split("/").pop();
        const time = convertTime($('span.time-ago', manga).text().trim());
        updateManga.push(({
            id: id,
            time: time
        }));
    }
    for (const elem of updateManga) {
        if (ids.includes(elem.id) && time < new Date(elem.time))
            returnObject.ids.push(elem.id);
    }
    return returnObject;
}
exports.parseUpdatedManga = parseUpdatedManga;
//# sourceMappingURL=TruyenQQParser.js.map