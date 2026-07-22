#!/usr/bin/env python3
import subprocess, json, time, os, tempfile

os.environ["PYTHONIOENCODING"] = "utf-8"

PROJECT_ID = "PVT_kwDODiN4lM4BP7T6"
STATUS_FIELD_ID = "PVTSSF_lADODiN4lM4BP7T6zg-MZE0"
IN_TESTING_OPTION_ID = "3772cc16"
OWNER = "Estospaces-Development"
PROJECT_NUM = 5

def gh_graphql(query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}})
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8')
    tmp.write(body)
    tmp.close()
    try:
        r = subprocess.run(["gh", "api", "graphql", "--input", tmp.name],
            capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            return None, r.stderr[:200]
        try:
            return json.loads(r.stdout), None
        except:
            return None, f"JSON: {r.stdout[:200]}"
    finally:
        os.unlink(tmp.name)

with open("/tmp/open_issues_168_plus.json", encoding="utf-8") as f:
    all_issues = json.load(f)

closed_issues = [i for i in all_issues if i.get("state") == "CLOSED"]
print(f"Total: {len(all_issues)}, Closed: {len(closed_issues)}")
issue_numbers = [i["number"] for i in closed_issues]

# Step 1: Fetch node IDs
print("\n=== Fetching node IDs ===")
node_ids = {}
batch_size = 50

for i in range(0, len(issue_numbers), batch_size):
    batch = issue_numbers[i:i+batch_size]
    fields = "\n".join(
        f'  iss{i}: repository(owner:"{OWNER}", name:"web-app") {{ issue(number:{n}) {{ id number }} }}'
        for i, n in enumerate(batch)
    )
    query = "query {" + fields + " }"
    data, err = gh_graphql(query)
    if err or not data:
        print(f"  Error: {str(err or data)[:200]}")
        continue

    repo_data = data.get("data", {})
    for key, val in repo_data.items():
        if isinstance(val, dict) and "issue" in val:
            inner = val["issue"]
            if inner and "id" in inner:
                node_ids[inner["number"]] = inner["id"]

    print(f"  Fetched {min(i+batch_size, len(issue_numbers))}/{len(issue_numbers)}...")
    time.sleep(0.5)

print(f"  Got {len(node_ids)} node IDs")

# Step 2: Add to project
print("\n=== Adding to project board ===")
ADD_MUTATION = """mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    item { id }
  }
}"""

added = 0
for issue in closed_issues:
    num = issue["number"]
    node_id = node_ids.get(num)
    if not node_id:
        continue
    data, _ = gh_graphql(ADD_MUTATION, {"projectId": PROJECT_ID, "contentId": node_id})
    if data and "data" in data and data["data"].get("addProjectV2ItemById"):
        added += 1
        if added % 20 == 0:
            print(f"  Added {added}...")
    time.sleep(0.1)

print(f"  Added: {added}")

# Step 3: Query project items
print("\n=== Fetching project items ===")
PROJECT_QUERY = """query($owner: String!, $number: Int!, $after: String) {
  organization(login: $owner) {
    projectV2(number: $number) {
      items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on Issue { number }
          }
        }
      }
    }
  }
}"""

all_items = {}
after = None
while True:
    variables = {"owner": OWNER, "number": PROJECT_NUM}
    if after:
        variables["after"] = after
    data, err = gh_graphql(PROJECT_QUERY, variables)
    if err or not data:
        print(f"  Error: {str(err or data)[:200]}")
        break
    proj = data.get("data", {}).get("organization", {}).get("projectV2", {})
    items = proj.get("items", {})
    for node in items.get("nodes", []):
        content = node.get("content", {})
        issue_num = content.get("number") if content else None
        if node.get("id") and issue_num:
            all_items[issue_num] = node["id"]
    page_info = items.get("pageInfo", {})
    if not page_info.get("hasNextPage"):
        break
    after = page_info.get("endCursor")
    time.sleep(0.2)

print(f"  Found {len(all_items)} project items")

num_to_item_id = {n: all_items[n] for n in issue_numbers if n in all_items}
print(f"  Mapped {len(num_to_item_id)} tickets to items")

# Step 4: Set Status = In Testing
print("\n=== Setting Status = In Testing ===")
STATUS_MUTATION = """mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String) {
  updateProjectV2ItemFieldValue(
    input: {projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
            value: {singleSelectOptionId: $optionId}}
  ) { projectV2Item { id } }
}"""

ok = 0
fail = 0
for issue in closed_issues:
    num = issue["number"]
    item_id = num_to_item_id.get(num)
    if not item_id:
        fail += 1
        continue
    data, _ = gh_graphql(STATUS_MUTATION, {
        "projectId": PROJECT_ID, "itemId": item_id,
        "fieldId": STATUS_FIELD_ID, "optionId": IN_TESTING_OPTION_ID
    })
    if data and "data" in data:
        ok += 1
        if ok % 20 == 0:
            print(f"  Updated {ok}...")
    else:
        fail += 1
        if fail <= 3:
            print(f"  ERROR #{num}: {str(data)[:100]}")
    time.sleep(0.1)

print(f"\n=== Summary ===")
print(f"  Success: {ok}/{len(closed_issues)}")
print(f"  Failed: {fail}")
