FROM node:24.14.0-alpine

WORKDIR /app

COPY package*.json ./

COPY backend ./backend

COPY public ./public

RUN npm install 


EXPOSE 5001

CMD ["node", "backend/server.js"]
