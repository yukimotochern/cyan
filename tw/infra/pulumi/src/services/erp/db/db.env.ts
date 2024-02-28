import {
  parseEnv,
  getDopplerEnv,
  EnvDef,
  nonEmptyString,
} from '../../../env/helpers';

import { service } from '../shared/erp.env';

export const component = service.component('db');

const rawEnv = await getDopplerEnv({
  naming: component,
});

const envDef = {
  // Infra
  POSTGRES_DB: {
    schema: nonEmptyString,
    isSecret: false,
    steps: ['infra'],
  },
  POSTGRES_USER: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['infra'],
  },
  POSTGRES_PASSWORD: {
    schema: nonEmptyString,
    isSecret: true,
    steps: ['infra'],
  },
} satisfies EnvDef;

export const erpDbEnv = parseEnv({
  data: rawEnv,
  def: envDef,
});
