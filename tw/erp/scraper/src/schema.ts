import { z } from 'zod';

export const searchItemsDataSchema = z.object({
  items: z.array(
    z.object({
      item_basic: z.object({
        shopid: z.number(),
        itemid: z.number(),
        liked_count: z.optional(z.any()),
        view_count: z.optional(z.any()),
        sold: z.optional(z.number()),
        name: z.string(),
        historical_sold: z.optional(z.any()),
        cmt_count: z.optional(z.any()),
        item_rating: z.object({
          rating_star: z.optional(z.number()),
          rating_count: z.array(z.any()),
        }),
      }),
    }),
  ),
});

export interface SearchItemsDataCollector {
  shouldContinue: boolean;
  data: z.infer<typeof searchItemsDataSchema>[];
  scrapedPageCount: number;
}

export const keywordsSchema = z.array(
  z.object({
    name: z.string(),
  }),
);

export const zenRowsSchema = z.object({
  xhr: z.array(
    z.object({
      url: z.string(),
      body: z.string(),
    }),
  ),
});
