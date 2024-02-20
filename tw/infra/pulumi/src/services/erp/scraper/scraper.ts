import * as pulumi from '@pulumi/pulumi';
import * as docker from '@pulumi/docker';
import { infraEnv } from '../../../env/env';

const { GITHUB_REGISTRY, GITHUB_SECRET, GITHUB_USERNAME } = infraEnv;

export const setupScraperCronJob = ({
  kubProvider,
}: {
  kubProvider?: pulumi.ProviderResource;
}) => {
  /* Image */
  const scraperImageRegistry = `${GITHUB_REGISTRY}/`;
  /* CronJob */
};
