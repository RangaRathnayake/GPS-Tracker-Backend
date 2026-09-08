FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node package.json server.js ./

USER node

ENV HOST=0.0.0.0 \
    PORT=5013 \
    NODE_ENV=production

EXPOSE 5013/tcp

CMD ["node", "server.js"]
