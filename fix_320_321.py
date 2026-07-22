import re

filepath = r'src/pages/admin/verifications/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix #320: Archive managers should be excluded from main list view
# Add filteredManagers to exclude archived ones when not showing archived
old_filter = '''const filteredManagers = managers.filter(m => {'''
new_filter = '''const filteredManagers = managers.filter(m => {
    // Exclude archived managers from the main view (they are shown in the Archived tab)
    if (showArchived) return true;
    const archivedStatuses = ['archived', 'archived_rejected', 'archived_approved', 'archived_pending'];
    if (archivedStatuses.includes(m.verification_status)) return false;
    return true;'''
content = content.replace(old_filter, new_filter)

# Fix #321: Grid mode should render cards in grid layout
old_grid = '''<div className="grid grid-cols-1 gap-6">'''
new_grid = '''<div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'grid grid-cols-1 gap-6'}>'''
content = content.replace(old_grid, new_grid)

# Also update the card classes for grid mode
old_card = '''className={`group p-8 rounded-[2rem] bg-gray-50/50 dark:bg-gray-900/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl`}'''
new_card = '''className={`group p-8 rounded-[2rem] bg-gray-50/50 dark:bg-gray-900/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all ${viewMode === 'grid' ? 'flex flex-col' : 'flex flex-col md:flex-row md:items-center justify-between'} gap-6 hover:shadow-xl`}'''
content = content.replace(old_card, new_card)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed #320: Archived managers excluded from main list')
print('Fixed #321: Grid mode renders cards in multi-column grid')
