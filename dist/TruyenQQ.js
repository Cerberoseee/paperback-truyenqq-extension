"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruyenQQ = exports.TruyenQQInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const TruyenQQParser_1 = require("./TruyenQQParser");
const DOMAIN = "https://truyenqqto.com/";
const method = "GET";
const userAgentRandomizer = "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit / 602.1.50(KHTML, like Gecko) CriOS / 56.0.2924.75 Mobile / 14E5239e Safari / 602.1";
exports.TruyenQQInfo = {
    version: "3.0.1",
    name: "TruyenQQ",
    icon: "icon.png",
    author: "Huynhzip3",
    authorWebsite: "https://github.com/huynh12345678",
    description: "Extension that pulls manga from TruyenQQ",
    websiteBaseURL: `${DOMAIN}`,
    contentRating: paperback_extensions_common_1.ContentRating.MATURE,
    sourceTags: [
        {
            text: "Recommended",
            type: paperback_extensions_common_1.TagType.BLUE,
        },
        {
            text: "Notifications",
            type: paperback_extensions_common_1.TagType.GREEN,
        },
    ],
};
class TruyenQQ extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = createRequestManager({
            requestsPerSecond: 5,
            requestTimeout: 20000,
            interceptor: {
                interceptRequest: (request) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    request.headers = Object.assign(Object.assign({}, ((_a = request.headers) !== null && _a !== void 0 ? _a : {})), {
                        referer: DOMAIN,
                    });
                    return request;
                }),
                interceptResponse: (response) => __awaiter(this, void 0, void 0, function* () {
                    return response;
                }),
            },
        });
    }
    getMangaShareUrl(mangaId) {
        return `${DOMAIN}truyen-tranh/${mangaId}`;
    }
    getMangaDetails(mangaId) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${DOMAIN}truyen-tranh/${mangaId}`;
            const request = createRequestObject({
                url: url,
                method: "GET",
            });
            const data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            let tags = [];
            let creator = [];
            let status = 1; //completed, 1 = Ongoing
            let desc = $(".story-detail-info").text();
            for (const t of $("a", ".list01").toArray()) {
                const genre = $(t).text().trim();
                const id = (_a = $(t).attr("href")) !== null && _a !== void 0 ? _a : genre;
                tags.push(createTag({ label: genre, id }));
            }
            for (const c of $("a", ".txt > p:nth-of-type(1)").toArray()) {
                const name = $(c).text().trim();
                creator.push(name);
            }
            status = $(".txt > p:nth-of-type(2)")
                .text()
                .toLowerCase()
                .includes("đang cập nhật")
                ? 1
                : 0;
            const image = (_b = $(".left > img").attr("src")) !== null && _b !== void 0 ? _b : "";
            return createManga({
                id: mangaId,
                author: creator.join(", "),
                artist: creator.join(", "),
                desc: desc === "" ? "Không có mô tả" : desc,
                titles: [$(".center > h1").text().trim()],
                image: image,
                status,
                // rating: parseFloat($('span[itemprop="ratingValue"]').text()),
                hentai: false,
                tags: [createTagSection({ label: "genres", tags: tags, id: "0" })],
            });
        });
    }
    getChapters(mangaId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${DOMAIN}truyen-tranh/${mangaId}`,
                method,
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const chapters = [];
            for (const obj of $(".works-chapter-list > .works-chapter-item")
                .toArray()
                .reverse()) {
                const timeStr = $(".col-md-2.col-sm-2.col-xs-4", obj)
                    .text()
                    .trim()
                    .split(/\//); //mm/dd/yyyy
                const time = new Date([timeStr[1], timeStr[0], timeStr[2]].join("/"));
                // time.setDate(time.getDate() + 1);
                // const time = new Date("09/18/2021");
                chapters.push(createChapter({
                    id: (_a = $(".col-md-10.col-sm-10.col-xs-8 > a", obj)
                        .attr("href")) === null || _a === void 0 ? void 0 : _a.split("/").pop(),
                    chapNum: parseFloat($(".col-md-10.col-sm-10.col-xs-8 > a", obj).text().split(" ")[1]),
                    name: $(".col-md-10.col-sm-10.col-xs-8 > a", obj).text(),
                    mangaId: mangaId,
                    langCode: paperback_extensions_common_1.LanguageCode.VIETNAMESE,
                    time,
                }));
            }
            return chapters;
        });
    }
    getChapterDetails(mangaId, chapterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: `${DOMAIN}truyen-tranh/${chapterId}`,
                method,
            });
            const response = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(response.data);
            const pages = [];
            for (let obj of $(".story-see-content > img").toArray()) {
                if (!obj.attribs["src"])
                    continue;
                let link = obj.attribs["src"];
                pages.push(link);
            }
            const chapterDetails = createChapterDetails({
                id: chapterId,
                mangaId: mangaId,
                pages: pages,
                longStrip: false,
            });
            return chapterDetails;
        });
    }
    getHomePageSections(sectionCallback) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        return __awaiter(this, void 0, void 0, function* () {
            let featured = createHomeSection({
                id: "featured",
                title: "Truyện Đề Cử",
                type: paperback_extensions_common_1.HomeSectionType.featured,
            });
            let hot = createHomeSection({
                id: "hot",
                title: "Truyện Yêu Thích",
                view_more: true,
            });
            let newUpdated = createHomeSection({
                id: "new_updated",
                title: "Truyện Vừa Cập Nhật",
                view_more: true,
            });
            let newAdded = createHomeSection({
                id: "new_added",
                title: "Truyện Mới",
                view_more: true,
            });
            let boy = createHomeSection({
                id: "boy",
                title: "Truyện Con Trai",
                view_more: true,
            });
            let girl = createHomeSection({
                id: "girl",
                title: "Truyện Con Gái",
                view_more: true,
            });
            //Load empty sections
            sectionCallback(featured);
            sectionCallback(hot);
            sectionCallback(newUpdated);
            sectionCallback(newAdded);
            sectionCallback(boy);
            sectionCallback(girl);
            ///Get the section data
            //Featured
            let url = `${DOMAIN}`;
            let request = createRequestObject({
                url: url,
                method: "GET",
            });
            let cc = [];
            let data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            for (let manga of $("div.is-child", ".container").toArray()) {
                let title = $(`.captions > h3`, manga).text().trim();
                let subtitle = $(`.chapter`, manga).text().trim();
                let image = (_a = $(`img.cover`, manga).attr("src")) !== null && _a !== void 0 ? _a : "";
                let id = (_c = (_b = $(`a`, manga).attr("href")) === null || _b === void 0 ? void 0 : _b.split("/").pop()) !== null && _c !== void 0 ? _c : title;
                // if (!id || !title) continue;
                cc.push(createMangaTile({
                    id: id.split("-chap")[0] + ".html",
                    image: !image
                        ? "https://i.imgur.com/GYUxEX8.png"
                        : image.replace("290x191", "583x386"),
                    title: createIconText({ text: title }),
                    subtitleText: createIconText({ text: subtitle }),
                }));
            }
            featured.items = cc;
            sectionCallback(featured);
            //Hot
            url = `${DOMAIN}truyen-yeu-thich.html`;
            request = createRequestObject({
                url: url,
                method: "GET",
            });
            let popular = [];
            data = yield this.requestManager.schedule(request, 1);
            $ = this.cheerio.load(data.data);
            for (let manga of $("li", ".list-stories").toArray().splice(0, 20)) {
                let title = $(`h3.title-book > a`, manga).text().trim();
                let subtitle = $(`.episode-book > a`, manga).text().trim();
                let image = (_d = $(`a > img`, manga).attr("src")) !== null && _d !== void 0 ? _d : "";
                let id = (_f = (_e = $(`.story-item > a`, manga).attr("href")) === null || _e === void 0 ? void 0 : _e.split("/").pop()) !== null && _f !== void 0 ? _f : title;
                // if (!id || !title) continue;
                popular.push(createMangaTile({
                    id: id,
                    image: !image ? "https://i.imgur.com/GYUxEX8.png" : image,
                    title: createIconText({ text: title }),
                    subtitleText: createIconText({ text: subtitle }),
                }));
            }
            hot.items = popular;
            sectionCallback(hot);
            //New Updates
            url = `${DOMAIN}#`;
            request = createRequestObject({
                url: url,
                method: "GET",
            });
            let newUpdatedItems = [];
            data = yield this.requestManager.schedule(request, 1);
            $ = this.cheerio.load(data.data);
            for (let obj of $("li", ".latest").toArray().splice(0, 20)) {
                let title = $(`h3.title-book > a`, obj).text().trim();
                let subtitle = $(`.episode-book > a`, obj).text().trim();
                let image = (_g = $(`a > img`, obj).attr("src")) !== null && _g !== void 0 ? _g : "";
                let id = (_j = (_h = $(`a`, obj).attr("href")) === null || _h === void 0 ? void 0 : _h.split("/").pop()) !== null && _j !== void 0 ? _j : title;
                // if (!id || !subtitle) continue;
                newUpdatedItems.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({
                        text: title,
                    }),
                    subtitleText: createIconText({
                        text: subtitle,
                    }),
                }));
            }
            newUpdated.items = newUpdatedItems;
            sectionCallback(newUpdated);
            //New Added
            url = `${DOMAIN}truyen-tranh-moi.html`;
            request = createRequestObject({
                url: url,
                method: "GET",
            });
            let newAddItems = [];
            data = yield this.requestManager.schedule(request, 1);
            $ = this.cheerio.load(data.data);
            for (let manga of $("li", ".list-stories").toArray().splice(0, 20)) {
                let title = $(`h3.title-book > a`, manga).text().trim();
                let subtitle = $(`.episode-book > a`, manga).text().trim();
                let image = (_k = $(`a > img`, manga).attr("src")) !== null && _k !== void 0 ? _k : "";
                let id = (_m = (_l = $(`a`, manga).attr("href")) === null || _l === void 0 ? void 0 : _l.split("/").pop()) !== null && _m !== void 0 ? _m : title;
                // if (!id || !subtitle) continue;
                newAddItems.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({
                        text: title,
                    }),
                    subtitleText: createIconText({
                        text: subtitle,
                    }),
                }));
            }
            newAdded.items = newAddItems;
            sectionCallback(newAdded);
            //Boy
            url = `${DOMAIN}truyen-con-trai.html`;
            request = createRequestObject({
                url: url,
                method: "GET",
            });
            let boyItems = [];
            data = yield this.requestManager.schedule(request, 1);
            $ = this.cheerio.load(data.data);
            for (let manga of $("li", ".list-stories").toArray().splice(0, 12)) {
                let title = $(`h3.title-book > a`, manga).text().trim();
                let subtitle = $(`.episode-book > a`, manga).text().trim();
                let image = (_o = $(`a > img`, manga).attr("src")) !== null && _o !== void 0 ? _o : "";
                let id = (_q = (_p = $(`a`, manga).attr("href")) === null || _p === void 0 ? void 0 : _p.split("/").pop()) !== null && _q !== void 0 ? _q : title;
                // if (!id || !subtitle) continue;
                boyItems.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({
                        text: title,
                    }),
                    subtitleText: createIconText({
                        text: subtitle,
                    }),
                }));
            }
            boy.items = boyItems;
            sectionCallback(boy);
            //Girl
            url = `${DOMAIN}truyen-con-gai.html`;
            request = createRequestObject({
                url: url,
                method: "GET",
            });
            let girlItems = [];
            data = yield this.requestManager.schedule(request, 1);
            $ = this.cheerio.load(data.data);
            for (let manga of $("li", ".list-stories").toArray().splice(0, 12)) {
                let title = $(`h3.title-book > a`, manga).text().trim();
                let subtitle = $(`.episode-book > a`, manga).text().trim();
                let image = (_r = $(`a > img`, manga).attr("src")) !== null && _r !== void 0 ? _r : "";
                let id = (_t = (_s = $(`a`, manga).attr("href")) === null || _s === void 0 ? void 0 : _s.split("/").pop()) !== null && _t !== void 0 ? _t : title;
                // if (!id || !subtitle) continue;
                girlItems.push(createMangaTile({
                    id: id,
                    image: image,
                    title: createIconText({
                        text: title,
                    }),
                    subtitleText: createIconText({
                        text: subtitle,
                    }),
                }));
            }
            girl.items = girlItems;
            sectionCallback(girl);
        });
    }
    getViewMoreItems(homepageSectionId, metadata) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            let param = "";
            let url = "";
            switch (homepageSectionId) {
                case "new_updated":
                    url = `${DOMAIN}truyen-moi-cap-nhat/trang-${page}.html`;
                    break;
                case "new_added":
                    url = `${DOMAIN}truyen-tranh-moi/trang-${page}.html`;
                    break;
                case "hot":
                    url = `${DOMAIN}truyen-yeu-thich/trang-${page}.html`;
                    break;
                case "boy":
                    url = `${DOMAIN}truyen-con-trai/trang-${page}.html`;
                    break;
                case "girl":
                    url = `${DOMAIN}truyen-con-gai/trang-${page}.html`;
                    break;
                default:
                    return Promise.resolve(createPagedResults({ results: [] }));
            }
            const request = createRequestObject({
                url,
                method,
                param,
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const manga = TruyenQQParser_1.parseViewMore($);
            metadata = !TruyenQQParser_1.isLastPage($) ? { page: page + 1 } : undefined;
            return createPagedResults({
                results: manga,
                metadata,
            });
        });
    }
    getSearchResults(query, metadata) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            let page = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.page) !== null && _a !== void 0 ? _a : 1;
            const search = {
                category: "",
                country: "0",
                status: "-1",
                minchapter: "0",
                sort: "0",
            };
            const tags = (_c = (_b = query.includedTags) === null || _b === void 0 ? void 0 : _b.map((tag) => tag.id)) !== null && _c !== void 0 ? _c : [];
            const category = [];
            tags.map((value) => {
                if (value.indexOf(".") === -1) {
                    category.push(value);
                }
                else {
                    switch (value.split(".")[0]) {
                        case "minchapter":
                            search.minchapter = value.split(".")[1];
                            break;
                        case "country":
                            search.country = value.split(".")[1];
                            break;
                        case "sort":
                            search.sort = value.split(".")[1];
                            break;
                        case "status":
                            search.status = value.split(".")[1];
                            break;
                    }
                }
            });
            search.category = (category !== null && category !== void 0 ? category : []).join(",");
            const request = createRequestObject({
                url: query.title
                    ? `${DOMAIN}tim-kiem/trang-${page}.html`
                    : `${DOMAIN}tim-kiem-nang-cao/trang-${page}.html`,
                method: "GET",
                param: encodeURI(`?q=${(_d = query.title) !== null && _d !== void 0 ? _d : ""}&category=${search.category}&country=${search.country}&status=${search.status}&minchapter=${search.minchapter}&sort=${search.sort}`),
            });
            const data = yield this.requestManager.schedule(request, 1);
            let $ = this.cheerio.load(data.data);
            const tiles = TruyenQQParser_1.parseSearch($);
            metadata = !TruyenQQParser_1.isLastPage($) ? { page: page + 1 } : undefined;
            return createPagedResults({
                results: tiles,
                metadata,
            });
        });
    }
    getSearchTags() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const url = `${DOMAIN}tim-kiem-nang-cao.html`;
            const request = createRequestObject({
                url: url,
                method: "GET",
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const arrayTags = [];
            const arrayTags2 = [];
            const arrayTags3 = [];
            const arrayTags4 = [];
            const arrayTags5 = [];
            //the loai
            for (const tag of $("div.genre-item", "div.col-sm-10").toArray()) {
                const label = $(tag).text().trim();
                const id = (_a = $("span", tag).attr("data-id")) !== null && _a !== void 0 ? _a : label;
                if (!id || !label)
                    continue;
                arrayTags.push({ id: id, label: label });
            }
            //quoc gia
            for (const tag of $("option", "select#country").toArray()) {
                const label = $(tag).text().trim();
                const id = "country." + $(tag).attr("value");
                if (!id || !label)
                    continue;
                arrayTags2.push({ id: id, label: label });
            }
            //tinh trang
            for (const tag of $("option", "select#status").toArray()) {
                const label = $(tag).text().trim();
                const id = "status." + $(tag).attr("value");
                if (!id || !label)
                    continue;
                arrayTags3.push({ id: id, label: label });
            }
            //so luong chuong
            for (const tag of $("option", "select#minchapter").toArray()) {
                const label = $(tag).text().trim();
                const id = "minchapter." + $(tag).attr("value");
                if (!id || !label)
                    continue;
                arrayTags4.push({ id: id, label: label });
            }
            //sap xep
            for (const tag of $("option", "select#sort").toArray()) {
                const label = $(tag).text().trim();
                const id = "sort." + $(tag).attr("value");
                if (!id || !label)
                    continue;
                arrayTags5.push({ id: id, label: label });
            }
            const tagSections = [
                createTagSection({
                    id: "0",
                    label: "Thể Loại Truyện",
                    tags: arrayTags.map((x) => createTag(x)),
                }),
                createTagSection({
                    id: "1",
                    label: "Quốc Gia (Chỉ chọn 1)",
                    tags: arrayTags2.map((x) => createTag(x)),
                }),
                createTagSection({
                    id: "2",
                    label: "Tình Trạng (Chỉ chọn 1)",
                    tags: arrayTags3.map((x) => createTag(x)),
                }),
                createTagSection({
                    id: "3",
                    label: "Số Lượng Chương (Chỉ chọn 1)",
                    tags: arrayTags4.map((x) => createTag(x)),
                }),
                createTagSection({
                    id: "4",
                    label: "Sắp xếp (Chỉ chọn 1)",
                    tags: arrayTags5.map((x) => createTag(x)),
                }),
            ];
            return tagSections;
        });
    }
    filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = createRequestObject({
                url: DOMAIN,
                method: "GET",
            });
            const response = yield this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            const returnObject = TruyenQQParser_1.parseUpdatedManga($, time, ids);
            mangaUpdatesFoundCallback(createMangaUpdates(returnObject));
        });
    }
    constructHeaders(headers, refererPath) {
        headers = headers !== null && headers !== void 0 ? headers : {};
        headers["user-agent"] = userAgentRandomizer;
        headers["referer"] = DOMAIN;
        return headers;
    }
    getCloudflareBypassRequest() {
        return createRequestObject({
            url: DOMAIN,
            method: "GET",
            headers: this.constructHeaders(),
        });
    }
    CloudFlareError(status) {
        if (status == 503) {
            throw new Error("CLOUDFLARE BYPASS ERROR:\nPlease go to Settings > Sources > <The name of this source> and press Cloudflare Bypass");
        }
    }
}
exports.TruyenQQ = TruyenQQ;
