# TAKBIS Reader - üretim imajı (Dokploy uyumlu)
FROM node:22-alpine

# Çalışma dizini
WORKDIR /app

# Önce bağımlılık manifestleri (katman önbelleği için)
COPY package*.json ./

# Yalnızca üretim bağımlılıkları
RUN npm install --omit=dev && npm cache clean --force

# Uygulama kaynakları
COPY src ./src
COPY public ./public

# Sunucu portu (server.js process.env.PORT || 3000 dinler)
ENV PORT=3000
EXPOSE 3000

# Sağlık kontrolü (Dokploy/anlık izleme için)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "src/server.js"]
