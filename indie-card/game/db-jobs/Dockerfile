ARG BASE_IMAGE=node:20.11.1
FROM ${BASE_IMAGE} AS Build

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml

# The Nx cache for production build is broken, use cache when it is fixed
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm nx run indie-card-game-db-jobs:build:production --verbose

FROM ${BASE_IMAGE}
COPY --from=Build /app/dist/indie-card/game/db-jobs /app/dist/indie-card/game/db-jobs

WORKDIR /app/dist/indie-card/game/db-jobs

CMD [ "node", "main.js" ]
