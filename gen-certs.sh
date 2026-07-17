#!/usr/bin/env bash
# Генерация локального CA и серверного сертификата для HTTPS в домашней сети.
# Использование:  bash gen-certs.sh 192.168.1.14
# (передай свой Wi-Fi IP; по умолчанию 192.168.1.14)
set -e
export MSYS_NO_PATHCONV=1  # не давать Git Bash превращать /CN=.. в путь Windows
IP="${1:-192.168.1.14}"
DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$DIR"
cd "$DIR"

echo "IP для сертификата: $IP"

# 1) Корневой CA (10 лет) — его нужно один раз установить на телефон
if [ ! -f rootCA.key ]; then
  openssl genrsa -out rootCA.key 2048
  openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 \
    -subj "/CN=PlantAssist Local CA/O=PlantAssist" -out rootCA.crt
  echo "Создан корневой CA: rootCA.crt"
fi

# 2) Серверный ключ
openssl genrsa -out server.key 2048

# 3) Конфиг с SAN (IP + localhost)
cat > server.ext <<EOF
subjectAltName = @alt_names
extendedKeyUsage = serverAuth
[alt_names]
IP.1 = $IP
IP.2 = 127.0.0.1
DNS.1 = localhost
EOF

# 4) CSR + подпись корневым CA (397 дней — лимит браузеров)
openssl req -new -key server.key -subj "/CN=$IP/O=PlantAssist" -out server.csr
openssl x509 -req -in server.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial \
  -out server.crt -days 397 -sha256 -extfile server.ext

rm -f server.csr server.ext
echo ""
echo "Готово. server.crt + server.key созданы в certs/"
echo "На телефон перенеси и установи: certs/rootCA.crt"
