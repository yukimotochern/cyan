import { z } from 'zod';
import { imageOutput } from '@cyan/utils-infra';

export const stackOutputSchema = z
  .object({
    'tw-erp-db-jobs': imageOutput,
    'tw-erp-punch-fastify': imageOutput,
    'tw-erp-scraper': imageOutput,
  })
  .partial();
