"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruyenQQ = exports.TruyenQQInfo = void 0;
const types_1 = require("@paperback/types");
const TruyenQQParser_1 = require("./TruyenQQParser");
const cheerio_1 = require("cheerio");
const DOMAIN = "https://truyenqqto.com";
const method = "GET";
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
exports.TruyenQQInfo = {
    version: "3.0.1",
    name: "TruyenQQ",
    icon: "icon.png",
    author: "Cerberose",
    description: "Extension that pulls manga from TruyenQQ",
    websiteBaseURL: `${DOMAIN}`,
    contentRating: types_1.ContentRating.MATURE,
    intents: types_1.SourceIntents.MANGA_CHAPTERS | types_1.SourceIntents.HOMEPAGE_SECTIONS | types_1.SourceIntents.CLOUDFLARE_BYPASS_REQUIRED | types_1.SourceIntents.SETTINGS_UI
};
class TruyenQQ {
    constructor() {
        this.requestManager = App.createRequestManager({
            requestsPerSecond: 2,
            requestTimeout: 20000,
            interceptor: {
                interceptRequest: async (request) => {
                    request.headers = {
                        ...(request.headers ?? {}),
                        ...{
                            referer: `${DOMAIN}/`,
                            'user-agent': await this.requestManager.getDefaultUserAgent() || userAgent,
                        },
                    };
                    return request;
                },
                interceptResponse: async (response) => {
                    return response;
                },
            },
        });
    }
    getMangaShareUrl(mangaId) {
        return `${DOMAIN}/truyen-tranh/${mangaId}`;
    }
    async getMangaDetails(mangaId) {
        const url = `${DOMAIN}/truyen-tranh/${mangaId}`;
        const request = App.createRequest({
            url: url,
            method: "GET",
        });
        const data = await this.requestManager.schedule(request, 1);
        let $ = (0, cheerio_1.load)(data?.data || "");
        let tags = [];
        let creator = [];
        let status = ""; //completed, 1 = Ongoing
        let desc = $(".story-detail-info").text();
        for (const t of $("a", ".list01").toArray()) {
            const genre = $(t).text().trim();
            const id = $(t).attr("href") ?? genre;
            tags.push(App.createTag({ label: genre, id }));
        }
        for (const c of $("a", ".txt > p:nth-of-type(1)").toArray()) {
            const name = $(c).text().trim();
            creator.push(name);
        }
        status = $(".txt > p:nth-of-type(2)")
            .text();
        const image = $(".left > img").attr("src") ?? "";
        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                author: creator.join(", "),
                artist: creator.join(", "),
                desc: desc === "" ? "Không có mô tả" : desc,
                titles: [$(".center > h1").text().trim()],
                image: image,
                status,
                rating: parseFloat($('span[itemprop="ratingValue"]').text()),
                hentai: false,
                tags: [App.createTagSection({ label: "genres", tags: tags, id: "0" })],
            })
        });
    }
    async getChapters(mangaId) {
        const request = App.createRequest({
            url: `${DOMAIN}/truyen-tranh/${mangaId}`,
            method,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = (0, cheerio_1.load)(response?.data || "");
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
            chapters.push(App.createChapter({
                id: $(".col-md-10.col-sm-10.col-xs-8 > a", obj)
                    .attr("href")
                    ?.split("/")
                    .pop() || "",
                chapNum: parseFloat($(".col-md-10.col-sm-10.col-xs-8 > a", obj).text().split(" ")?.[1] || "0"),
                name: $(".col-md-10.col-sm-10.col-xs-8 > a", obj).text(),
                langCode: "vi",
                time,
            }));
        }
        return chapters;
    }
    async getChapterDetails(mangaId, chapterId) {
        const request = App.createRequest({
            url: `${DOMAIN}/truyen-tranh/${chapterId}`,
            method,
        });
        const response = await this.requestManager.schedule(request, 1);
        let $ = (0, cheerio_1.load)(response?.data || "");
        const pages = [];
        for (let obj of $(".page-chapter > img").toArray()) {
            if (!obj.attribs["src"])
                continue;
            let link = obj.attribs["src"];
            pages.push(link);
        }
        const chapterDetails = App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
        });
        return chapterDetails;
    }
    async getHomePageSections(sectionCallback) {
        let featured = App.createHomeSection({
            id: "featured",
            title: "Truyện Đề Cử",
            type: types_1.HomeSectionType.featured,
            containsMoreItems: false,
        });
        let hot = App.createHomeSection({
            id: "hot",
            title: "Truyện Yêu Thích",
            type: types_1.HomeSectionType.featured,
            containsMoreItems: true,
        });
        let newAdded = App.createHomeSection({
            id: "new_added",
            title: "Truyện Mới",
            type: types_1.HomeSectionType.featured,
            containsMoreItems: true,
        });
        //Load empty sections
        sectionCallback(featured);
        sectionCallback(hot);
        sectionCallback(newAdded);
        ///Get the section data
        //Featured
        let url = `${DOMAIN}`;
        let request = App.createRequest({
            url: url,
            method: "GET",
        });
        let cc = [];
        let data = await this.requestManager.schedule(request, 1);
        let $ = (0, cheerio_1.load)(data?.data || "");
        for (let manga of $("li").toArray()) {
            let title = $(`.book_name h3`, manga).text().trim();
            let subtitle = $(`.last_chapter`, manga).text().trim();
            let image = $(`.book_avatar img`, manga).attr("src") ?? "";
            let id = $(`a`, manga).attr("href")?.split("/").pop() ?? title;
            // if (!id || !title) continue;
            cc.push(App.createPartialSourceManga({
                mangaId: id,
                image: !image
                    ? "https://i.imgur.com/GYUxEX8.png"
                    : image.replace("290x191", "583x386"),
                title,
                subtitle,
            }));
        }
        featured.items = cc;
        sectionCallback(featured);
        //Hot
        url = `${DOMAIN}/truyen-yeu-thich.html`;
        request = App.createRequest({
            url: url,
            method: "GET",
        });
        let popular = [];
        data = await this.requestManager.schedule(request, 1);
        $ = (0, cheerio_1.load)(data?.data || "");
        for (let manga of $("ul.list_grid li").toArray().splice(0, 20)) {
            let title = $(`.book_name h3`, manga).text().trim();
            let subtitle = $(`.last_chapter`, manga).text().trim();
            let image = $(`.book_avatar img`, manga).attr("src") ?? "";
            let id = $(`a`, manga).attr("href")?.split("/").pop() ?? title;
            // if (!id || !title) continue;
            popular.push(App.createPartialSourceManga({
                mangaId: id,
                image: !image ? "https://i.imgur.com/GYUxEX8.png" : image,
                title,
                subtitle,
            }));
        }
        hot.items = popular;
        sectionCallback(hot);
        //New Added
        url = `${DOMAIN}/truyen-tranh-moi.html`;
        request = App.createRequest({
            url: url,
            method: "GET",
        });
        let newAddItems = [];
        data = await this.requestManager.schedule(request, 1);
        $ = (0, cheerio_1.load)(data?.data || "");
        for (let manga of $("ul.list_grid li").toArray().splice(0, 20)) {
            let title = $(`.book_name h3`, manga).text().trim();
            let subtitle = $(`.last_chapter`, manga).text().trim();
            let image = $(`.book_avatar img`, manga).attr("src") ?? "";
            let id = $(`a`, manga).attr("href")?.split("/").pop() ?? title;
            // if (!id || !subtitle) continue;
            newAddItems.push(App.createPartialSourceManga({
                mangaId: id,
                image: !image ? "https://i.imgur.com/GYUxEX8.png" : image,
                title,
                subtitle,
            }));
        }
        newAdded.items = newAddItems;
        sectionCallback(newAdded);
    }
    async getViewMoreItems(homepageSectionId, metadata) {
        let page = metadata?.page ?? 1;
        let param = "";
        let url = "";
        switch (homepageSectionId) {
            case "new_updated":
                url = `${DOMAIN}/truyen-moi-cap-nhat/trang-${page}.html`;
                break;
            case "new_added":
                url = `${DOMAIN}/truyen-tranh-moi/trang-${page}.html`;
                break;
            case "hot":
                url = `${DOMAIN}/truyen-yeu-thich/trang-${page}.html`;
                break;
            default:
                return Promise.resolve(App.createPagedResults({ results: [] }));
        }
        const request = App.createRequest({
            url,
            method,
            param,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = (0, cheerio_1.load)(response?.data || "");
        const manga = (0, TruyenQQParser_1.parseViewMore)($);
        metadata = !(0, TruyenQQParser_1.isLastPage)($) ? { page: page + 1 } : undefined;
        return App.createPagedResults({
            results: manga,
            metadata,
        });
    }
    async getSearchResults(query, metadata) {
        let page = metadata?.page ?? 1;
        const search = {
            category: "",
            country: "0",
            status: "-1",
            minchapter: "0",
            sort: "0",
        };
        const tags = query.includedTags?.map((tag) => tag.id) ?? [];
        const category = [];
        tags.map((value) => {
            if (value.indexOf(".") === -1) {
                category.push(value);
            }
            else {
                switch (value.split(".")[0]) {
                    case "minchapter":
                        search.minchapter = value.split(".")[1] || "";
                        break;
                    case "country":
                        search.country = value.split(".")[1] || "";
                        break;
                    case "sort":
                        search.sort = value.split(".")[1] || "";
                        break;
                    case "status":
                        search.status = value.split(".")[1] || "";
                        break;
                }
            }
        });
        search.category = (category ?? []).join(",");
        const request = App.createRequest({
            url: query.title
                ? `${DOMAIN}/tim-kiem/trang-${page}.html`
                : `${DOMAIN}/tim-kiem-nang-cao/trang-${page}.html`,
            method: "GET",
            param: encodeURI(`?q=${query.title ?? ""}&category=${search.category}&country=${search.country}&status=${search.status}&minchapter=${search.minchapter}&sort=${search.sort}`),
        });
        const data = await this.requestManager.schedule(request, 1);
        let $ = (0, cheerio_1.load)(data?.data || "");
        const tiles = (0, TruyenQQParser_1.parseSearch)($);
        metadata = !(0, TruyenQQParser_1.isLastPage)($) ? { page: page + 1 } : undefined;
        return App.createPagedResults({
            results: tiles,
            metadata,
        });
    }
    async getSearchTags() {
        const url = `${DOMAIN}/tim-kiem-nang-cao.html`;
        const request = App.createRequest({
            url: url,
            method: "GET",
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = (0, cheerio_1.load)(response?.data || "");
        const arrayTags = [];
        const arrayTags2 = [];
        const arrayTags3 = [];
        const arrayTags4 = [];
        const arrayTags5 = [];
        //the loai
        for (const tag of $("div.genre-item", "div.col-sm-10").toArray()) {
            const label = $(tag).text().trim();
            const id = $("span", tag).attr("data-id") ?? label;
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
            App.createTagSection({
                id: "0",
                label: "Thể Loại Truyện",
                tags: arrayTags.map((x) => App.createTag(x)),
            }),
            App.createTagSection({
                id: "1",
                label: "Quốc Gia (Chỉ chọn 1)",
                tags: arrayTags2.map((x) => App.createTag(x)),
            }),
            App.createTagSection({
                id: "2",
                label: "Tình Trạng (Chỉ chọn 1)",
                tags: arrayTags3.map((x) => App.createTag(x)),
            }),
            App.createTagSection({
                id: "3",
                label: "Số Lượng Chương (Chỉ chọn 1)",
                tags: arrayTags4.map((x) => App.createTag(x)),
            }),
            App.createTagSection({
                id: "4",
                label: "Sắp xếp (Chỉ chọn 1)",
                tags: arrayTags5.map((x) => App.createTag(x)),
            }),
        ];
        return tagSections;
    }
    CloudFlareError(status) {
        if (status == 503) {
            throw new Error("CLOUDFLARE BYPASS ERROR:\nPlease go to Settings > Sources > <The name of this source> and press Cloudflare Bypass");
        }
    }
}
exports.TruyenQQ = TruyenQQ;
//# sourceMappingURL=TruyenQQ.js.map