# TAKBIS Reader - üretim imajı (Dokploy uyumlu)
FROM node:22-alpine

# su-exec: entrypoint'te root'tan 'node' kullanıcısına düşmek için
RUN apk add --no-cache su-exec

# Çalışma dizini
WORKDIR /app

# Önce bağımlılık manifestleri (katman önbelleği için)
COPY package.json package-lock.json ./

# Yalnızca üretim bağımlılıkları.
# `npm ci` kullanıyoruz: package-lock.json'a BİREBİR uyar, böylece build
# tekrarlanabilir olur (`npm install` kilit dosyasını güncelleyip sessizce
# farklı sürüm kurabiliyordu).
RUN npm ci --omit=dev && npm cache clean --force

# Uygulama kaynakları
COPY src ./src
COPY public ./public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# İstatistik/erişim kaydı dizini — volume bağlanmasa da var olsun
RUN mkdir -p /app/data && chown -R node:node /app/data

# Sunucu portu (server.js process.env.PORT || 3000 dinler)
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Sağlık kontrolü — /healthz ziyaret istatistiklerine SAYILMAZ
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 || exit 1

# Entrypoint veri dizinini hazırlayıp root olmayan 'node' kullanıcısına düşer
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
