ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org
FROM denoland/deno:2.9.6 AS build
WORKDIR /app
COPY deno.json deno.lock ./
COPY src ./src
COPY web ./web
ARG NPM_CONFIG_REGISTRY
RUN deno cache --frozen src/main.ts web/app.ts web/redirect.ts && deno task build:web

FROM denoland/deno:2.9.6
ARG NPM_CONFIG_REGISTRY
ENV NPM_CONFIG_REGISTRY=$NPM_CONFIG_REGISTRY
WORKDIR /app
COPY --from=build --chown=deno:deno /deno-dir /deno-dir
COPY --from=build --chown=deno:deno /app /app
USER deno
ENV PORT=8080
EXPOSE 8080
CMD ["run", "--cached-only", "--frozen", "--allow-net", "--allow-env", "--allow-sys=osRelease", "--allow-read=/app,/deno-dir", "src/main.ts"]
