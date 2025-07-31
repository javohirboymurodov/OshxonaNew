# Node.js rasmini tanlash
FROM node:18-alpine

# Ishchi katalogni yaratish
WORKDIR /usr/src/app

# Package files ni nusxalash
COPY package*.json ./

# Dependencies o'rnatish
RUN npm ci --only=production && npm cache clean --force

# Dastur kodini nusxalash
COPY . .

# Kerakli kataloglarni yaratish
RUN mkdir -p logs uploads backups stats temp

# Port ochish
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/healthcheck.js || exit 1

# Non-root user yaratish
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Fayllar uchun ruxsat berish
RUN chown -R nodeuser:nodejs /usr/src/app
USER nodeuser

# Dasturni ishga tushirish
CMD ["node", "index.js"]