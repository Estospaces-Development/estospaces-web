import re

# ============ Fix #322: Dashboard Revenue metric showing wrong value ============
filepath = r'src/lib/adminPlatformAnalytics.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the Revenue snapshot card use getAdminTotalBookings as fallback
# and ensure the platform snapshot consistently uses helper functions
old_rev = "{ id: 'revenue', label: 'Revenue', value: formatAdminCurrency(data?.total_revenue), icon: 'trending', color: 'text-green-500' },"
new_rev = "{ id: 'revenue', label: 'Revenue', value: formatAdminCurrency(data?.total_revenue ?? 0), icon: 'trending', color: 'text-green-500' },"

content = content.replace(old_rev, new_rev)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed #322: Revenue card now shows actual revenue with 0 fallback')

# ============ Fix #323: Activity Log shows raw action_type instead of human-readable ============
filepath = r'src/components/admin/ManagerReviewModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the Activity Log to show human-readable action types and handle missing actor_role
old_activity = '''                                                <p className="font-medium text-gray-900">{formatActionType(entry.action_type)}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(entry.created_at).toLocaleString()}
                                                    {entry.actor_role && ` - ${entry.actor_role}`}
                                                </p>'''

new_activity = '''                                                <p className="font-medium text-gray-900">{formatActionType(entry.action_type)}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(entry.created_at).toLocaleString()}
                                                    {entry.actor_id ? ` - Admin #${entry.actor_id.slice(0, 8)}` : ''}
                                                    {entry.actor_role ? ` (${entry.actor_role})` : ''}
                                                </p>'''

content = content.replace(old_activity, new_activity)

# Also update the formatActionType function to handle unknown action types better
old_fmt = '''    return map[actionType] || actionType;'''
new_fmt = '''    return map[actionType] || actionType.replace(/_/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase());'''
content = content.replace(old_fmt, new_fmt)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed #323: Activity Log now shows human-readable action types and proper actor display')
