ARG BASE_IMAGE=node:20.11.1
FROM ${BASE_IMAGE} AS Build

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm nx run tw-erp-scraper:build:production --verbose

FROM ${BASE_IMAGE}
COPY --from=Build /app/dist/tw/erp/scraper /app/dist/tw/erp/scraper

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app/dist/tw/erp/scraper

RUN pnpm install --frozen-lockfile

CMD [ "pnpm", "start" ]
