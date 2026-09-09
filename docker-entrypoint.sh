#!/bin/sh
# Konteyner root olarak başlar, veri dizinini hazırlar, sonra ayrıcalığı
# 'node' kullanıcısına bırakır.
#
# Neden gerekli: /app/data'ya bir Docker volume bağlandığında dizin root
# sahipliğiyle gelir. Doğrudan `USER node` yazsaydık istatistik ve KVKK/5651
# erişim kayıtları sessizce yazılamaz hâle gelirdi (stats.js tüm fs hatalarını
# yutuyor). Burada önce chown yapıp sonra düşüyoruz; mevcut volume'lar dahil
# her durumda yazılabilir kalır.
set -e

DIZIN="${DATA_DIR:-/app/data}"
mkdir -p "$DIZIN"
chown -R node:node "$DIZIN" 2>/dev/null || true

exec su-exec node "$@"
