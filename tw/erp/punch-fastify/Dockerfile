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

RUN pnpm nx run tw-erp-punch-fastify:build:production --verbose

FROM ${BASE_IMAGE}

RUN timedatectl set-timezone Asia/Taipei

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

COPY --from=Build /app/dist/tw/erp/punch-fastify/package.json /app/dist/tw/erp/punch-fastify/package.json
COPY --from=Build /app/dist/tw/erp/punch-fastify/pnpm-lock.yaml /app/dist/tw/erp/punch-fastify/pnpm-lock.yaml


WORKDIR /app/dist/tw/erp/punch-fastify

RUN pnpm install --frozen-lockfile

COPY --from=Build /app/dist/tw/erp/punch-fastify /app/dist/tw/erp/punch-fastify

CMD [ "node", "main.js" ]
