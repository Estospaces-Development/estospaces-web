#!/usr/bin/env python3
import subprocess, json, tempfile, os

all_items = []
after = None
while True:
    body = {
        "query": "query($after: String) { organization(login: \"Estospaces-Development\") { projectV2(number: 5) { items(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { id content { ... on Issue { number } } fieldValueByName(name: \"Status\") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }",
        "variables": {"after": after} if after else {}
    }
    tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8')
    tmp.write(json.dumps(body))
    tmp.close()
    r = subprocess.run(['gh', 'api', 'graphql', '--input', tmp.name], capture_output=True, text=True)
    data = json.loads(r.stdout)
    items = data['data']['organization']['projectV2']['items']
    all_items.extend(items['nodes'])
    if not items['pageInfo']['hasNextPage']:
        break
    after = items['pageInfo']['endCursor']
    os.unlink(tmp.name)

print(f"Total items on board: {len(all_items)}")

statuses = {}
qa_testing_issues = []
for item in all_items:
    val = item.get('fieldValueByName')
    s = val.get('name') if val else 'None'
    statuses[s] = statuses.get(s, 0) + 1
    if s == 'QA Testing':
        c = item.get('content')
        if c:
            qa_testing_issues.append(c.get('number'))

print("Status distribution:")
for s, c in sorted(statuses.items(), key=lambda x: -x[1]):
    print(f"  {s}: {c}")

print(f"\nQA Testing issue count: {len(qa_testing_issues)}")
print(f"QA Testing issue numbers (sorted): {sorted(qa_testing_issues)}")

# Compare with expected
import json
with open('/tmp/open_issues_168_plus.json') as f:
    expected = json.load(f)
expected_closed = sorted([i['number'] for i in expected if i.get('state') == 'CLOSED'])
print(f"\nExpected closed tickets (from JSON): {len(expected_closed)}")
print(f"First few: {expected_closed[:5]}, Last few: {expected_closed[-5:]}")

actual = set(qa_testing_issues)
exp = set(expected_closed)
missing = exp - actual
extra = actual - exp
print(f"\nMissing from QA Testing: {sorted(missing)[:20]}")
print(f"Extra in QA Testing (not in expected): {sorted(extra)[:20]}")