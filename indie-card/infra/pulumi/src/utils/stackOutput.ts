import { z } from 'zod';
import { imageOutput } from '@cyan/utils-infra';

export const stackOutputSchema = z.record(imageOutput);
