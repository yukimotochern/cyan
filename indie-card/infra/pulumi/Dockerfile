# This file is generated by Nx.
#
# Build the docker image with `npx nx docker-build indie-card-infra`.
# Tip: Modify "docker-build" options in project.json to change docker build args.
#
# Run the container with `docker run -p 3000:3000 -t indie-card-infra`.
FROM docker.io/node:lts-alpine

ENV HOST=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system indie-card-infra && \
          adduser --system -G indie-card-infra indie-card-infra

COPY dist/indie-card/infra indie-card-infra
RUN chown -R indie-card-infra:indie-card-infra .

# You can remove this install step if you build with `--bundle` option.
# The bundled output will include external dependencies.
RUN npm --prefix indie-card-infra --omit=dev -f install

CMD [ "node", "indie-card-infra" ]
