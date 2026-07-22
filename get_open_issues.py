import subprocess, json

result = subprocess.run(
    ["gh", "issue", "list", "--repo", "Estospaces-Development/web-app",
     "--state", "open", "--limit", "200", "--json", "number,title,labels,state"],
    capture_output=True, text=True
)
issues = json.loads(result.stdout)
print(f"Found {len(issues)} open issues")
for i in issues:
    labels = [l["name"] for l in i.get("labels", [])]
    print(f"  #{i['number']}: {i['title']} [{', '.join(labels)}]")

with open("C:/Users/jeevi/Estospaces/esto-app-projects/estospaces-web/open_issues.json", "w") as f:
    json.dump(issues, f, indent=2)
print(f"\nSaved to open_issues.json")
