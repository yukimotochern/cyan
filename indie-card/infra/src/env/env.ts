import path from 'node:path';
import * as pulumi from '@pulumi/pulumi';
import { z } from 'zod';
import { config } from 'dotenv';
import Doppler from '@dopplerhq/node-sdk';
import { logger } from '../utils/logger';
import { randomUUID } from 'node:crypto';

export const stack = pulumi.getStack();
export const appName = 'indie-card';
const pulumiConfig = new pulumi.Config();
export const version = pulumiConfig.get('VERSION') || `local-${randomUUID()}`;

const envSchema = z.object({
  // DOPPLER
  DOPPLER_TOKEN: z.string().min(1),
});

let parsedEnv: z.infer<typeof envSchema>;

const rawEnv = envSchema.safeParse(process.env);
if (rawEnv.success) {
  parsedEnv = rawEnv.data;
} else {
  // Load local env if not already valid
  const envPath = path.resolve(process.cwd(), '.env.local');
  logger.info(`Use env at ${envPath}`);
  config({
    path: envPath,
  });
  try {
    parsedEnv = envSchema.parse(process.env);
  } catch (err) {
    logger.error(
      {
        err,
      },
      `No env found either from docker env or ${envPath}.`,
    );
    process.exit(1);
  }
}

export const env = parsedEnv;

type EnvStepPrefixesRule = {
  prefixes: readonly string[];
  step: string;
};

const envStepPrefixesRules = [
  {
    prefixes: ['BUILD_TIME', 'NEXT_PUBLIC'],
    step: 'buildTime',
  },
  {
    prefixes: ['RUN_TIME'],
    step: 'runTime',
  },
  {
    prefixes: ['INFRA'],
    step: 'infra',
  },
] as const satisfies readonly EnvStepPrefixesRule[];

type EnvStepPrefixesRules = (typeof envStepPrefixesRules)[number];
type EnvPrefixes = EnvStepPrefixesRules['prefixes'][number];
type EnvFilterSteps = EnvStepPrefixesRules['step'];

type EnvName = `${EnvPrefixes}_${string}`;

export type EnvDef = Record<
  EnvName,
  {
    schema: z.ZodTypeAny;
    isSecret: boolean;
  }
>;

export type FilterOption = {
  isSecret?: boolean;
  step?: EnvFilterSteps;
};

export type FilterSecret<
  IsSecret extends boolean | undefined,
  Def extends EnvDef,
> = IsSecret extends boolean
  ? {
      [key in keyof Def as Def[key] extends {
        isSecret: IsSecret;
      }
        ? key
        : never]: Def[key];
    }
  : Def;

export type FilterStep<
  Step extends EnvFilterSteps | undefined,
  Def extends EnvDef,
> = Step extends EnvFilterSteps
  ? {
      [key in keyof Def as Extract<
        key,
        `${(EnvStepPrefixesRules & {
          step: Step;
        })['prefixes'][number]}${string}`
      >]: Def[key];
    }
  : Def;

export type MappedToInferredSchemaType<Def extends EnvDef> = {
  [key in keyof Def]: Def[key] extends {
    schema: z.ZodTypeAny;
    isSecret: boolean;
  }
    ? Def[key]['isSecret'] extends true
      ? pulumi.Output<z.infer<Def[key]['schema']>>
      : z.infer<Def[key]['schema']>
    : never;
};

export const getDopplerEnv = async ({
  appName,
  serviceName,
  envName,
}: {
  appName: string;
  serviceName: string;
  envName: string;
}) => {
  const doppler = new Doppler({
    accessToken: '',
  });
  try {
    const data = await doppler.secrets.download(
      `${appName}-${serviceName}`,
      envName,
    );
    return data;
  } catch (err) {
    logger.error(
      { err, appName, serviceName, envName },
      'Unable to retrieve doppler env.',
    );
    process.exit(1);
  }
};

export const parseEnv = <Def extends EnvDef, Option extends FilterOption>({
  def,
  data,
  filter,
}: {
  def: Readonly<Def>;
  filter?: Option;
  data: unknown;
}): MappedToInferredSchemaType<
  FilterSecret<
    FilterOption extends Option ? undefined : Option['isSecret'],
    FilterStep<FilterOption extends Option ? undefined : Option['step'], Def>
  >
> => {
  const isSecret = filter?.isSecret;
  const step = filter?.step;
  const secretNames: string[] = [];
  const filteredSchema = Object.entries(def).reduce<z.ZodTypeAny>(
    (pre, [key, val]) => {
      const matchSecret = isSecret == null || val.isSecret === isSecret;

      const prefixes = envStepPrefixesRules
        .filter((p) => p.step === step)
        .reduce<string[]>((pre, cur) => pre.concat(cur.prefixes), []);
      const matchPrefix =
        prefixes.length === 0 || prefixes.some((p) => key.startsWith(p));

      if (matchSecret || matchPrefix) {
        if (val.isSecret === true) {
          secretNames.push(key);
        }
        return pre.and(
          z.object({
            [key]: val.schema,
          }),
        );
      }
      return pre;
    },
    z.object({}),
  );

  const parsedData = filteredSchema.parse(data);
  secretNames.forEach((name) => {
    parsedData[name] = pulumi.secret(parsedData[name]);
  });

  return parsedData;
};
