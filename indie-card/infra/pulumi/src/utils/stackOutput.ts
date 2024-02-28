import { z } from 'zod';
import { imageOutput } from '@cyan/utils-infra';

export const stackOutputSchema = z
  .object({
    'indie-card-game-db-jobs': imageOutput,
    'indie-card-game-next': imageOutput,
  })
  .partial();
