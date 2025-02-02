import { SearchRequest, TagSection, MangaUpdates, PartialSourceManga } from "@paperback/types";
export interface UpdatedManga {
    ids: string[];
    loadMore: boolean;
}
export declare const generateSearch: (query: SearchRequest) => string;
export declare const parseSearch: ($: any) => PartialSourceManga[];
export declare const parseViewMore: ($: any) => PartialSourceManga[];
export declare const parseTags: ($: any) => TagSection[];
export declare const isLastPage: ($: any) => boolean;
export declare function parseUpdatedManga($: any, time: Date, ids: string[]): MangaUpdates;
//# sourceMappingURL=TruyenQQParser.d.ts.map