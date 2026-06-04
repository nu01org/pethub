# docker build --no-cache --progress=plain -f pethub-web.Containerfile -t pethub-web:latest . 
# docker inspect pethub-web:latest
# docker run -ti --rm -p 3000:3000 -e DATABASE_URL=$DATABASE_URL --name pethub-web pethub-web:latest
# docker tag pethub-web:latest $REGISTRY_USERNAME/pethub-web:latest
# docker push $REGISTRY_USERNAME/pethub-web:latest

# BUILD STAGE

FROM "node:latest" AS build-stage


## Copy source code
RUN echo "BUILD"
WORKDIR "/tmp/src"
COPY . .

# Build
RUN make

# RUNTIME STAGE
FROM "node:slim"
RUN mkdir -p "/opt/pethub-web"
COPY --from=build-stage "/tmp/src/pethub-web/package.json" "/opt/pethub-web/package.json"
COPY --from=build-stage "/tmp/src/pethub-web/package-lock.json" "/opt/pethub-web/package-lock.json"
COPY --from=build-stage "/tmp/src/pethub-web/build" "/opt/pethub-web/build"
COPY --from=build-stage "/tmp/src/pethub-web/node_modules" "/opt/pethub-web/node_modules"

WORKDIR "/opt/pethub-web"
EXPOSE 3000
ENTRYPOINT ["node", "build"]
