import Doppler from '@dopplerhq/node-sdk';
import * as pulumi from '@pulumi/pulumi';
import { z } from 'zod';

import { logger } from '../utils/logger.js';

export const nonEmptyString = z.string().min(1);

const envSteps = [
  'buildTime',
  'runTime',
  'infra',
] as const satisfies readonly string[];

type EnvSteps = (typeof envSteps)[number];

export type EnvDef = Record<
  string,
  {
    schema: z.ZodTypeAny;
    isSecret: boolean;
    steps: EnvSteps[];
  }
>;

export type FilterOption = {
  isSecret?: boolean;
  steps?: EnvSteps[];
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
  Steps extends EnvSteps[] | undefined,
  Def extends EnvDef,
> = Steps extends EnvSteps[]
  ? {
      [key in keyof Def as Def[key]['steps'][number] &
        Steps[number] extends never
        ? never
        : key]: Def[key];
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
  dopplerToken,
}: {
  appName: string;
  serviceName: string;
  envName: string;
  dopplerToken: string;
}) => {
  const doppler = new Doppler({
    accessToken: dopplerToken,
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
    FilterStep<FilterOption extends Option ? undefined : Option['steps'], Def>
  >
> => {
  const isSecret = filter?.isSecret;
  const steps = filter?.steps;
  const secretNames: string[] = [];
  const filteredSchema = Object.entries<EnvDef[string]>(
    def,
  ).reduce<z.ZodTypeAny>((pre, [key, val]) => {
    const matchSecret = isSecret == null || val.isSecret === isSecret;
    const matchPrefix = steps && val.steps.some((step) => steps.includes(step));
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
  }, z.object({}));

  const parsedData = filteredSchema.parse(data);
  secretNames.forEach((name) => {
    parsedData[name] = pulumi.secret(parsedData[name]);
  });

  return parsedData;
};

export const mapEnvToK8sEnv = <Data>(
  env: Record<string, Data>,
): {
  name: string;
  value: Data;
}[] =>
  Object.entries<Data>(env).map(([key, value]) => ({
    name: key,
    value,
  }));
