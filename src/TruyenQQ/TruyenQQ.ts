import {
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  PagedResults,
  SourceInfo,
  TagSection,
  ContentRating,
  Tag,
  HomeSectionType,
  Request,
  Response,
  ChapterProviding,
  SearchResultsProviding,
  HomePageSectionsProviding,
  SourceManga,
  PartialSourceManga,
  SourceIntents
} from "@paperback/types";
import {
  parseSearch,
  isLastPage,
  parseViewMore,
} from "./TruyenQQParser";
import { load } from 'cheerio';

const DOMAIN = "https://truyenqqto.com";
const method = "GET";
const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export const TruyenQQInfo: SourceInfo = {
  version: "3.0.1",
  name: "TruyenQQ",
  icon: "icon.png",
  author: "Cerberose",
  description: "Extension that pulls manga from TruyenQQ",
  websiteBaseURL: `${DOMAIN}`,
  contentRating: ContentRating.MATURE,
  intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED | SourceIntents.SETTINGS_UI
};

export class TruyenQQ implements ChapterProviding, SearchResultsProviding, HomePageSectionsProviding {
  getMangaShareUrl(mangaId: string): string {
    return `${DOMAIN}/truyen-tranh/${mangaId}`;
  }

  requestManager = App.createRequestManager({
    requestsPerSecond: 5,
    requestTimeout: 20000,
    interceptor: {
      interceptRequest: async (request: Request): Promise<Request> => {
        request.headers = {
          ...(request.headers ?? {}),
          ...{
            referer: `${DOMAIN}/`,
            'user-agent': await this.requestManager.getDefaultUserAgent() || userAgent,
          },
        };

        return request;
      },

      interceptResponse: async (response: Response): Promise<Response> => {
        return response;
      },
    },
  });


  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const url = `${DOMAIN}/truyen-tranh/${mangaId}`;
    const request = App.createRequest({
      url: url,
      method: "GET",
    });
    const data = await this.requestManager.schedule(request, 1);
    let $ = load(data?.data || "");
    let tags: Tag[] = [];
    let creator: string[] = [];
    let status = ""; //completed, 1 = Ongoing
    let desc = $(".story-detail-info").text();
    for (const t of $("a", ".list01").toArray()) {
      const genre = $(t).text().trim();
      const id = $(t).attr("href") ?? genre;
      tags.push(App.createTag({ label: genre, id }));
    }
    for (const c of $("a", ".org > p:nth-of-type(1)").toArray()) {
      const name = $(c).text().trim();
      creator.push(name);
    }
    status = $(".org > p:nth-of-type(2)")
      .text()

    const image = $(".book_info img").attr("src") ?? "";
    return App.createSourceManga({
      id: mangaId,
      mangaInfo: App.createMangaInfo({
        author: creator.join(", "),
        artist: creator.join(", "),
        desc: desc === "" ? "Không có mô tả" : desc,
        titles: [$(".book_info h1").text().trim()],
        image,
        status,
        rating: parseFloat($('span[itemprop="ratingValue"]').text()),
        hentai: false,
        tags: [App.createTagSection({ label: "genres", tags: tags, id: "0" })],
      })
    });
  }
  async getChapters(mangaId: string): Promise<Chapter[]> {
    const request = App.createRequest({
      url: `${DOMAIN}/truyen-tranh/${mangaId}`,
      method,
    });

    const response = await this.requestManager.schedule(request, 1);
    const $ = load(response?.data || "");
    const chapters: Chapter[] = [];
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
      chapters.push(
        App.createChapter({
          id: $(".col-md-10.col-sm-10.col-xs-8 > a", obj)
            .attr("href")
            ?.split("/")
            .pop() || "",
          chapNum: parseFloat(
            $(".col-md-10.col-sm-10.col-xs-8 > a", obj).text().split(" ")?.[1] || "0"
          ),
          name: $(".col-md-10.col-sm-10.col-xs-8 > a", obj).text(),
          langCode: "vi",
          time,
        })
      );
    }

    return chapters;
  }

  async getChapterDetails(
    mangaId: string,
    chapterId: string
  ): Promise<ChapterDetails> {
    const request = App.createRequest({
      url: `${DOMAIN}/truyen-tranh/${chapterId}`,
      method,
    });

    const response = await this.requestManager.schedule(request, 1);
    let $ = load(response?.data || "");
    const pages: string[] = [];
    for (let obj  of $(".page-chapter > img").toArray()) {
      if (!obj.attribs["src"]) continue;
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

  async getHomePageSections(
    sectionCallback: (section: HomeSection) => void
  ): Promise<void> {
    let featured: HomeSection = App.createHomeSection({
      id: "featured",
      title: "Truyện Đề Cử",
      type: HomeSectionType.featured,
      containsMoreItems: false,
    });
    let hot: HomeSection = App.createHomeSection({
      id: "hot",
      title: "Truyện Yêu Thích",
      type: HomeSectionType.featured,
      containsMoreItems: true,
    });
    let newAdded: HomeSection = App.createHomeSection({
      id: "new_added",
      title: "Truyện Mới",
      type: HomeSectionType.featured,
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
    let cc: PartialSourceManga[] = [];
    let data = await this.requestManager.schedule(request, 1);
    let $ = load(data?.data || "");
    
    for (let manga of $("li").toArray()) {
      let title = $(`.book_name h3`, manga).text().trim();
      let subtitle = $(`.last_chapter`, manga).text().trim();
      let image = $(`.book_avatar img`, manga).attr("src") ?? "";
      let id = $(`a`, manga).attr("href")?.split("/").pop() ?? title;
      // if (!id || !title) continue;
      cc.push(
        App.createPartialSourceManga({
          mangaId: id,
          image: !image
            ? "https://i.imgur.com/GYUxEX8.png"
            : image.replace("290x191", "583x386"),
          title,
          subtitle,
        })
      );
    }
    featured.items = cc;
    sectionCallback(featured);

    //Hot
    url = `${DOMAIN}/truyen-yeu-thich.html`;
    request = App.createRequest({
      url: url,
      method: "GET",
    });
    let popular: PartialSourceManga[] = [];
    data = await this.requestManager.schedule(request, 1);
    $ = load(data?.data || "");
    for (let manga of $("ul.list_grid li").toArray().splice(0, 20)) {
      let title = $(`.book_name h3`, manga).text().trim();
      let subtitle = $(`.last_chapter`, manga).text().trim();
      let image = $(`.book_avatar img`, manga).attr("src") ?? "";
      let id = $(`a`, manga).attr("href")?.split("/").pop() ?? title;
      // if (!id || !title) continue;
      popular.push(
        App.createPartialSourceManga({
          mangaId: id,  
          image: !image ? "https://i.imgur.com/GYUxEX8.png" : image,
          title,
          subtitle,
        })
      );
    }
    hot.items = popular;
    sectionCallback(hot);

    //New Added
    url = `${DOMAIN}/truyen-tranh-moi.html`;
    request = App.createRequest({
      url: url,
      method: "GET",
    });
    let newAddItems: PartialSourceManga[] = [];
    data = await this.requestManager.schedule(request, 1);
    $ = load(data?.data || "");
    for (let manga of $("ul.list_grid li").toArray().splice(0, 20)) {
      let title = $(`.book_name h3`, manga).text().trim();
      let subtitle = $(`.last_chapter`, manga).text().trim();
      let image = $(`.book_avatar img`, manga).attr("src") ?? "";
      let id = $(`a`, manga).attr("href")?.split("/").pop() ?? title;
      // if (!id || !subtitle) continue;
      newAddItems.push(
        App.createPartialSourceManga({
          mangaId: id,
          image: !image ? "https://i.imgur.com/GYUxEX8.png" : image,
          title,
          subtitle,
        })
      );
    }
    newAdded.items = newAddItems;
    sectionCallback(newAdded);
  }

  async getViewMoreItems(
    homepageSectionId: string,
    metadata: any
  ): Promise<PagedResults> {
    let page: number = metadata?.page ?? 1;
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
    const $ = load(response?.data || "");

    const manga = parseViewMore($);
    metadata = !isLastPage($) ? { page: page + 1 } : undefined;
    return App.createPagedResults({
      results: manga,
      metadata,
    });
  }

  async getSearchResults(
    query: SearchRequest,
    metadata: any
  ): Promise<PagedResults> {
    let page = metadata?.page ?? 1;

    const search = {
      category: "",
      country: "0",
      status: "-1",
      minchapter: "0",
      sort: "0",
    };

    const tags = query.includedTags?.map((tag) => tag.id) ?? [];
    const category: string[] = [];
    tags.map((value) => {
      if (value.indexOf(".") === -1) {
        category.push(value);
      } else {
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
      param: encodeURI(
        `?q=${query.title ?? ""}&category=${search.category}&country=${
          search.country
        }&status=${search.status}&minchapter=${search.minchapter}&sort=${
          search.sort
        }`
      ),
    });

    const data = await this.requestManager.schedule(request, 1);
    let $ = load(data?.data || "");
    const tiles = parseSearch($);

    metadata = !isLastPage($) ? { page: page + 1 } : undefined;

    return App.createPagedResults({
      results: tiles,
      metadata,
    });
  }

  async getSearchTags(): Promise<TagSection[]> {
    const url = `${DOMAIN}/tim-kiem-nang-cao.html`;
    const request = App.createRequest({
      url: url,
      method: "GET",
    });

    const response = await this.requestManager.schedule(request, 1);
    const $ = load(response?.data || "");
    const arrayTags: Tag[] = [];
    const arrayTags2: Tag[] = [];
    const arrayTags3: Tag[] = [];
    const arrayTags4: Tag[] = [];
    const arrayTags5: Tag[] = [];
    //the loai
    for (const tag of $("div.genre-item", "div.col-sm-10").toArray()) {
      const label = $(tag).text().trim();
      const id = $("span", tag).attr("data-id") ?? label;
      if (!id || !label) continue;
      arrayTags.push({ id: id, label: label });
    }
    //quoc gia
    for (const tag of $("option", "select#country").toArray()) {
      const label = $(tag).text().trim();
      const id = "country." + $(tag).attr("value");
      if (!id || !label) continue;
      arrayTags2.push({ id: id, label: label });
    }
    //tinh trang
    for (const tag of $("option", "select#status").toArray()) {
      const label = $(tag).text().trim();
      const id = "status." + $(tag).attr("value");
      if (!id || !label) continue;
      arrayTags3.push({ id: id, label: label });
    }
    //so luong chuong
    for (const tag of $("option", "select#minchapter").toArray()) {
      const label = $(tag).text().trim();
      const id = "minchapter." + $(tag).attr("value");
      if (!id || !label) continue;
      arrayTags4.push({ id: id, label: label });
    }
    //sap xep
    for (const tag of $("option", "select#sort").toArray()) {
      const label = $(tag).text().trim();
      const id = "sort." + $(tag).attr("value");
      if (!id || !label) continue;
      arrayTags5.push({ id: id, label: label });
    }

    const tagSections: TagSection[] = [
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

  CloudFlareError(status: any) {
    if (status == 503) {
      throw new Error(
        "CLOUDFLARE BYPASS ERROR:\nPlease go to Settings > Sources > <The name of this source> and press Cloudflare Bypass"
      );
    }
  }
}
