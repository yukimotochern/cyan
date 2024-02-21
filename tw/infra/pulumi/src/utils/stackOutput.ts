import { z } from 'zod';
import { imageOutputInfo } from '@cyan/utils-infra';

export const stackOutputSchema = z.object({
  imageOutputInfo: z.optional(
    z.object({
      secret: z.boolean(),
      value: imageOutputInfo,
    }),
  ),
});
