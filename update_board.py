#!/usr/bin/env python3
"""Set Status=In Testing for all open tickets on the GitHub Project board using GraphQL."""
import subprocess, json, time, sys, os

os.environ["PYTHONIOENCODING"] = "utf-8"

PROJECT_ID = "PVT_kwDODiN4lM4BJ2Fm"
STATUS_FIELD_ID = "PVTSSF_lADODiN4lM4BJ2Fmzg543XU"
IN_TESTING_OPTION_ID = "820566f9"
OWNER = "Estospaces-Development"
PROJECT_NUM = 5


def gh_graphql(query, variables=None):
    body = json.dumps({"query": query, "variables": variables})
    r = subprocess.run(
        ["gh", "api", "graphql", "-H", "Content-Type: application/json", "-f", f"query={body}"],
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    if r.returncode != 0:
        return None, r.stderr
    try:
        data = json.loads(r.stdout)
        return data, None
    except:
        return None, f"JSON parse error: {r.stdout[:200]}"


with open("/tmp/open_issues_168_plus.json", encoding="utf-8") as f:
    all_issues = json.load(f)

open_issues = [i for i in all_issues if i.get("state") == "OPEN"]
print(f"Total: {len(all_issues)}, Open: {len(open_issues)}")
issue_numbers = [i["number"] for i in open_issues]

print("\n=== Fetching node IDs ===")
node_ids = {}
batch_size = 50

for i in range(0, len(issue_numbers), batch_size):
    batch = issue_numbers[i:i+batch_size]
    fields = "\n".join(
        f'  issue{i}: repository(owner:"{OWNER}", name:"web-app") {{ issue(number:{n}) {{ id number }} }}'
        for i, n in enumerate(batch)
    )
    query = "query {" + fields + " }"

    data, err = gh_graphql(query)
    if err or not data:
        print(f"  Error: {str(err or data)[:200]}")
        continue

    repo_data = data.get("data", {}).get("repository", {})
    for key, val in repo_data.items():
        if val and "id" in val:
            node_ids[val["number"]] = val["id"]

    print(f"  Fetched {min(i+batch_size, len(issue_numbers))}/{len(issue_numbers)} IDs...")
    time.sleep(0.5)

print(f"  Got {len(node_ids)} node IDs")

print("\n=== Adding tickets to project board ===")
ADD_MUTATION = """
mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    item { id }
  }
}
"""

added = 0
for issue in open_issues:
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

print("\n=== Fetching project items ===")
PROJECT_QUERY = """
query($owner: String!, $number: Int!, $after: String) {
  organization(login: $owner) {
    projectV2(number: $number) {
      id
      items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on Issue {
              number
            }
          }
        }
      }
    }
  }
}
"""

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
        item_id = node.get("id")
        content = node.get("content", {})
        issue_num = content.get("number") if content else None
        if item_id and issue_num:
            all_items[issue_num] = item_id

    page_info = items.get("pageInfo", {})
    if not page_info.get("hasNextPage"):
        break
    after = page_info.get("endCursor")
    time.sleep(0.1)

print(f"  Found {len(all_items)} project items")

num_to_item_id = {n: all_items[n] for n in issue_numbers if n in all_items}
print(f"  Mapped {len(num_to_item_id)} open tickets to items")

print("\n=== Setting Status = In Testing ===")

STATUS_MUTATION = """
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String) {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optionId }
    }
  ) {
    projectV2Item {
      id
    }
  }
}
"""

ok = 0
fail = 0
for issue in open_issues:
    num = issue["number"]
    item_id = num_to_item_id.get(num)
    if not item_id:
        fail += 1
        continue

    data, _ = gh_graphql(STATUS_MUTATION, {
        "projectId": PROJECT_ID,
        "itemId": item_id,
        "fieldId": STATUS_FIELD_ID,
        "optionId": IN_TESTING_OPTION_ID
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
print(f"  Success: {ok}/{len(open_issues)}")
print(f"  Failed: {fail}")

with open("/tmp/project_board_results.json", "w", encoding="utf-8") as f:
    json.dump({"ok": ok, "fail": fail, "total": len(open_issues)}, f)
