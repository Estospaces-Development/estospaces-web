import subprocess, json, sys

REPO = "Estospaces-Development/estospaces-web"
PROJECT_ID = "PVT_kwDODiN4lM4BP7T6"
STATUS_FIELD_ID = "PVTSSF_lADODiN4lM4BP7T6zg-MZE0"
QA_TESTING_OPTION_ID = "f75ad539"

# Fetch all project items
result = subprocess.run(
    ["gh", "project", "item-list", "1", "--owner", "Estospaces-Development",
     "--limit", "200", "--format", "json"],
    capture_output=True, text=True, check=True, encoding='utf-8'
)
data = json.loads(result.stdout)
items = data.get("items", [])

# Filter to tickets 168-315
tickets_168_315 = []
for item in items:
    title = item.get("content", {}).get("title", "")
    number = item.get("content", {}).get("number", 0)
    if number and 168 <= number <= 315:
        tickets_168_315.append({
            "number": number,
            "title": title,
            "id": item.get("id", ""),
            "status": item.get("status", "")
        })

tickets_168_315.sort(key=lambda x: x["number"])

print(f"Found {len(tickets_168_315)} tickets in range #168-#315")
print(f"All already in 'QA Testing' status: {all(t['status'] == 'In Testing' for t in tickets_168_315)}")

# Save to file
with open("/tmp/open_issues_168_315.json", "w") as f:
    json.dump(tickets_168_315, f, indent=2)
print("Saved to /tmp/open_issues_168_315.json")
