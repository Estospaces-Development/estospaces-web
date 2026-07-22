import re

filepath = r'src/pages/admin/dashboard/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix #318: Quarterly Goals should use active listings instead of total_properties
old = "{` ${data?.total_properties || 0} `}verified properties,"
new = "{` ${getAdminActiveListings(data)} `}active listings,"

# Also need to remove unused getAdminTotalProperties import
import_block = "import { buildAdminDashboardSnapshot, getAdminTotalProperties, getAdminActiveListings, type AdminAnalyticsIconKey } from '@/lib/adminPlatformAnalytics';"
new_import = "import { buildAdminDashboardSnapshot, getAdminActiveListings, type AdminAnalyticsIconKey } from '@/lib/adminPlatformAnalytics';"

content = content.replace(old, new)
content = content.replace(import_block, new_import)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed #318: Quarterly Goals now uses active listings count')
print('Fixed #304: Removed unused getAdminTotalProperties import')
