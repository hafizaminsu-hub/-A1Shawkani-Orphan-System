#!/data/data/com.termux/files/usr/bin/bash

echo "======================================"
echo "   إنشاء مشروع AlShawkani"
echo "======================================"

termux-setup-storage

BASE="$HOME/storage/shared/AlShawkani"

mkdir -p "$BASE"

cd "$BASE" || exit

echo "إنشاء المجلدات..."

mkdir -p \
assets/images \
assets/icons \
assets/fonts \
css \
js \
pages \
database \
uploads/photos \
uploads/documents \
reports \
backups \
temp \
logs

echo "إنشاء الملفات..."

touch \
README.md \
package.json \
.gitignore \
server.js

touch \
database/schema.sql \
database/db.js \
database/data.db

touch \
css/style.css \
css/rtl.css \
css/dashboard.css \
css/forms.css \
css/tables.css

touch \
js/app.js \
js/login.js \
js/dashboard.js \
js/orphans.js \
js/orphan-form.js \
js/families.js \
js/sponsorships.js \
js/aid.js \
js/clothing.js \
js/documents.js \
js/reports.js \
js/users.js \
js/settings.js \
js/backups.js \
js/logs.js \
js/notifications.js

touch \
pages/login.html \
pages/dashboard.html \
pages/orphans.html \
pages/orphan-form.html \
pages/families.html \
pages/sponsorships.html \
pages/aid.html \
pages/clothing.html \
pages/documents.html \
pages/reports.html \
pages/users.html \
pages/settings.html \
pages/backups.html \
pages/logs.html \
pages/notifications.html \
pages/orphan-print.html

echo ""
echo "======================================"
echo "تم إنشاء المشروع بنجاح"
echo "الموقع:"
echo "$BASE"
echo "======================================"

find "$BASE"