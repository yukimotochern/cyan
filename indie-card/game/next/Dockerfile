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

RUN pnpm nx run indie-card-game-next:build:production --verbose

FROM ${BASE_IMAGE}

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY --from=Build /app/dist/indie-card/game/next/package.json /app/dist/indie-card/game/next/package.json
COPY --from=Build /app/dist/indie-card/game/next/pnpm-lock.yaml /app/dist/indie-card/game/next/pnpm-lock.yaml

WORKDIR /app/dist/indie-card/game/next

RUN pnpm install --frozen-lockfile

COPY --from=Build /app/dist/indie-card/game/next /app/dist/indie-card/game/next

CMD [ "pnpm", "start" ]
