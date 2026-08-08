FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npx ng build --configuration production

FROM nginx:alpine

COPY --from=build /app/dist/guardpoint-manager/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080

ENV PORT=8080

CMD ["/bin/sh", "-c", "BACKEND_URL=${BACKEND_URL%/}; if [ -z \"$BACKEND_URL\" ]; then echo 'ERROR: BACKEND_URL environment variable is not set' >&2; exit 1; fi; envsubst '$BACKEND_URL $PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
