import { Chapter, ChapterDetails, HomeSection, SearchRequest, PagedResults, SourceInfo, TagSection, ChapterProviding, SearchResultsProviding, HomePageSectionsProviding, SourceManga } from "@paperback/types";
export declare const TruyenQQInfo: SourceInfo;
export declare class TruyenQQ implements ChapterProviding, SearchResultsProviding, HomePageSectionsProviding {
    getMangaShareUrl(mangaId: string): string;
    requestManager: import("@paperback/types").RequestManager;
    getMangaDetails(mangaId: string): Promise<SourceManga>;
    getChapters(mangaId: string): Promise<Chapter[]>;
    getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails>;
    getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void>;
    getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults>;
    getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults>;
    getSearchTags(): Promise<TagSection[]>;
    CloudFlareError(status: any): void;
}
//# sourceMappingURL=TruyenQQ.d.ts.map