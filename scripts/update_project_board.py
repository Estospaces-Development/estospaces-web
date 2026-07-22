#!/usr/bin/env python3
"""Add all open issues 168-315 to the Estospaces project board with 'QA Testing' status."""
import subprocess
import json
import sys
import time
import os

REPO = "Estospaces-Development/web-app"
PROJECT_ID = "PVT_kwDODiN4lM4BP7T6"

# Known project field/option IDs from previous sessions
STATUS_FIELD_ID = "PVTSSF_lADODiN4lM4BP7T6zg-MZE0"
QA_TESTING_OPTION_ID = "3772cc16"
DONE_OPTION_ID = "47fc9ee4"

ISSUES = [
    {"number": 168, "title": "Password visibility toggle shows wrong icon in login form"},
    {"number": 169, "title": "Manager verification banner doesn't show correct state"},
    {"number": 170, "title": "Property listing images not loading from media service"},
    {"number": 171, "title": "Dashboard KPI cards show stale data after navigation"},
    {"number": 172, "title": "Registration form shows 'Unknown' for split name when first/last name empty"},
    {"number": 173, "title": "Admin panel property search returns no results"},
    {"number": 174, "title": "Toast notifications not clearing after timeout"},
    {"number": 175, "title": "Mobile navigation hamburger menu not closing on selection"},
    {"number": 176, "title": "Property detail page loading spinner never resolves"},
    {"number": 177, "title": "User profile edit form doesn't persist changes"},
    {"number": 178, "title": "Booking calendar shows wrong month on initial load"},
    {"number": 179, "title": "Search filter dropdown closes when clicking inside"},
    {"number": 180, "title": "Admin user table pagination shows wrong page count"},
    {"number": 181, "title": "Support chat messages appear in wrong order"},
    {"number": 182, "title": "Property comparison feature missing image carousel"},
    {"number": 183, "title": "Fast Track status badge color doesn't match state"},
    {"number": 184, "title": "Email verification link expired message not user-friendly"},
    {"number": 185, "title": "Dashboard sidebar doesn't collapse on mobile"},
    {"number": 186, "title": "Property map pins cluster incorrectly at zoom levels"},
    {"number": 187, "title": "Broker request form missing required field validation"},
    {"number": 188, "title": "Notification badge count doesn't decrement on read"},
    {"number": 189, "title": "Admin analytics chart labels cut off on small screens"},
    {"number": 190, "title": "User onboarding step indicator shows wrong progress"},
    {"number": 191, "title": "Property favorites list not syncing across tabs"},
    {"number": 192, "title": "Payment method form doesn't validate card expiry"},
    {"number": 193, "title": "Manager property upload fails with large images"},
    {"number": 194, "title": "Search autocomplete suggestions not appearing"},
    {"number": 195, "title": "Admin bulk action checkbox state not persisting"},
    {"number": 196, "title": "User dashboard recent activity shows duplicates"},
    {"number": 197, "title": "Property detail tabs not scrolling on mobile"},
    {"number": 198, "title": "Login redirect loses intended page after auth"},
    {"number": 199, "title": "Broker commission display shows wrong currency"},
    {"number": 200, "title": "Support ticket priority dropdown missing options"},
    {"number": 201, "title": "Property listing draft auto-save not working"},
    {"number": 202, "title": "Admin role assignment dropdown shows deleted roles"},
    {"number": 203, "title": "User password reset form accepts weak passwords"},
    {"number": 204, "title": "Manager dashboard date filter ignores timezone"},
    {"number": 205, "title": "Property image upload shows wrong preview"},
    {"number": 206, "title": "Notification email links point to wrong environment"},
    {"number": 207, "title": "Search results page missing sort by price option"},
    {"number": 208, "title": "Admin export CSV includes deleted records"},
    {"number": 209, "title": "User avatar upload crops image incorrectly"},
    {"number": 210, "title": "Broker profile page missing verification badge"},
    {"number": 211, "title": "Fast Track application form step indicator broken"},
    {"number": 212, "title": "Property comparison share link not generating"},
    {"number": 213, "title": "Dashboard loading skeleton not matching final layout"},
    {"number": 214, "title": "Admin audit log missing property deletion events"},
    {"number": 215, "title": "User saved search notifications not firing"},
    {"number": 216, "title": "Manager approval workflow email not sending"},
    {"number": 217, "title": "Property amenities filter not matching correctly"},
    {"number": 218, "title": "Support agent assignment not updating in real-time"},
    {"number": 219, "title": "Mobile property card layout broken on landscape"},
    {"number": 220, "title": "Admin two-factor auth setup flow incomplete"},
    {"number": 221, "title": "User email preferences page missing options"},
    {"number": 222, "title": "Broker lead count not updating after conversion"},
    {"number": 223, "title": "Property video tour player controls not working"},
    {"number": 224, "title": "Search radius filter not applying to results"},
    {"number": 225, "title": "Admin system health page showing stale metrics"},
    {"number": 226, "title": "User referral code display missing from profile"},
    {"number": 227, "title": "Manager bulk property upload fails silently"},
    {"number": 228, "title": "Property floor plan image not loading"},
    {"number": 229, "title": "Support satisfaction survey not showing after chat"},
    {"number": 230, "title": "Login with Google button not working on Safari"},
    {"number": 231, "title": "Admin feature flag management page missing controls"},
    {"number": 232, "title": "User document upload size limit not enforced"},
    {"number": 233, "title": "Broker calendar sync not showing bookings"},
    {"number": 234, "title": "Property neighborhood info section missing data"},
    {"number": 235, "title": "Fast Track document upload progress not showing"},
    {"number": 236, "title": "Search result map not centering on user location"},
    {"number": 237, "title": "Admin session management page missing revoke button"},
    {"number": 238, "title": "User saved properties count not updating"},
    {"number": 239, "title": "Manager property statistics chart not rendering"},
    {"number": 240, "title": "Property virtual tour link not opening in new tab"},
    {"number": 241, "title": "Support ticket status not updating after reply"},
    {"number": 242, "title": "Mobile filter drawer animation is janky"},
    {"number": 243, "title": "Support transcript message sender role is empty for current user"},
    {"number": 244, "title": "Admin notification template editor not saving"},
    {"number": 245, "title": "User subscription plan display incorrect"},
    {"number": 246, "title": "Broker commission report generation hangs"},
    {"number": 247, "title": "Property listing status toggle not persisting"},
    {"number": 248, "title": "Search saved searches count not updating"},
    {"number": 249, "title": "Admin user impersonation session not logging out"},
    {"number": 250, "title": "User notification settings page not loading"},
    {"number": 251, "title": "Manager occupancy rate calculation incorrect"},
    {"number": 252, "title": "Property agent contact form not sending"},
    {"number": 253, "title": "Support attachment upload not working"},
    {"number": 254, "title": "Mobile property detail page CTA button hidden"},
    {"number": 255, "title": "Admin error log page not paginating"},
    {"number": 256, "title": "User account deletion confirmation missing"},
    {"number": 257, "title": "Broker listing visibility toggle not working"},
    {"number": 258, "title": "Property EMI calculator showing wrong values"},
    {"number": 259, "title": "Search filter chips not clearing properly"},
    {"number": 260, "title": "Admin email queue showing stale count"},
    {"number": 261, "title": "User profile completion progress bar inaccurate"},
    {"number": 262, "title": "Manager revenue chart showing wrong period"},
    {"number": 263, "title": "Property brochure download not working"},
    {"number": 264, "title": "Support auto-assignment not routing correctly"},
    {"number": 265, "title": "Mobile search bar not sticky on scroll"},
    {"number": 266, "title": "Admin data migration status page missing"},
    {"number": 267, "title": "User credit card form not validating CVV"},
    {"number": 268, "title": "Broker profile image not showing on listings"},
    {"number": 269, "title": "Property street view integration not loading"},
    {"number": 270, "title": "Search map bounds filter not working"},
    {"number": 271, "title": "Admin SMS template variables not replacing"},
    {"number": 272, "title": "User login history not showing correct IP"},
    {"number": 273, "title": "Manager maintenance request queue not updating"},
    {"number": 274, "title": "Property legal document upload failing"},
    {"number": 275, "title": "Support canned responses not inserting"},
    {"number": 276, "title": "Mobile bottom nav active state wrong"},
    {"number": 277, "title": "Admin RBAC permission matrix not rendering"},
    {"number": 278, "title": "User OTP input auto-focus not working"},
    {"number": 279, "title": "Registration form allows names with only emojis"},
    {"number": 280, "title": "Broker lead assignment not notifying broker"},
    {"number": 281, "title": "Property walkthrough video not buffering"},
    {"number": 282, "title": "Search geolocation permission prompt not showing"},
    {"number": 283, "title": "Admin service health check endpoint missing"},
    {"number": 284, "title": "User order history page not loading"},
    {"number": 285, "title": "Manager document signing flow broken"},
    {"number": 286, "title": "Property nearby amenities distance wrong"},
    {"number": 287, "title": "Support CSAT score not recording"},
    {"number": 288, "title": "Mobile property card swipe action broken"},
    {"number": 289, "title": "Admin CSV export encoding issues"},
    {"number": 290, "title": "Registration error message shows raw backend error"},
    {"number": 291, "title": "Broker property listing count not updating"},
    {"number": 292, "title": "Property price history chart not rendering"},
    {"number": 293, "title": "Search filter sidebar not collapsing on mobile"},
    {"number": 294, "title": "Admin webhook configuration page missing"},
    {"number": 295, "title": "User subscription renewal not notifying"},
    {"number": 296, "title": "Manager tenant screening report not generating"},
    {"number": 297, "title": "Property inspection scheduling not working"},
    {"number": 298, "title": "Support ticket merge functionality broken"},
    {"number": 299, "title": "Mobile dashboard widgets not resizing"},
    {"number": 300, "title": "Admin API rate limit configuration page missing"},
    {"number": 301, "title": "User document viewer not opening PDFs"},
    {"number": 302, "title": "Broker commission split display incorrect"},
    {"number": 303, "title": "Property tenant review section not loading"},
    {"number": 304, "title": "Admin platform analytics shows count including stale data"},
    {"number": 305, "title": "Property images not resolving from core service API"},
    {"number": 306, "title": "Search suggestion dropdown not keyboard accessible"},
    {"number": 307, "title": "Admin user merge tool not working"},
    {"number": 308, "title": "Admin dashboard layout has unwanted gap between sections"},
    {"number": 309, "title": "User referral tracking not attributing correctly"},
    {"number": 310, "title": "Manager property photo grid not lazy loading"},
    {"number": 311, "title": "Property comparison print view broken"},
    {"number": 312, "title": "Support canned response categories not loading"},
    {"number": 313, "title": "Mobile search results infinite scroll broken"},
    {"number": 314, "title": "Admin backup download not working"},
    {"number": 315, "title": "User onboarding progress not persisting across sessions"},
]


def run_gh_api(endpoint, method="POST", extra_args=None):
    """Run a gh api command and return parsed JSON."""
    args = ["gh", "api", endpoint, "-X", method]
    if extra_args:
        args.extend(extra_args)
    result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        return None, result.stderr
    try:
        return json.loads(result.stdout), None
    except json.JSONDecodeError:
        return None, result.stdout[:500]


def get_issue_node_id(issue_number):
    """Get the GraphQL node ID for an issue."""
    query = f'''query {{
        repository(owner: "Estospaces-Development", name: "web-app") {{
            issue(number: {issue_number}) {{ id }}
        }}
    }}'''
    result, err = run_gh_api("graphql", "POST", ["-f", f"query={query}"])
    if result and "data" in result:
        issue = result["data"]["repository"]["issue"]
        if issue:
            return issue["id"]
    return None


def add_to_project(node_id):
    """Add an issue to the project board."""
    mutation = f'''mutation {{
        addProjectV2ItemById(input: {{projectId: "{PROJECT_ID}", contentId: "{node_id}"}}) {{
            item {{ id }}
        }}
    }}'''
    result, err = run_gh_api("graphql", "POST", ["-f", f"query={mutation}"])
    if result and "data" in result:
        item = result["data"].get("addProjectV2ItemById", {}).get("item")
        if item:
            return item["id"]
    return None


def set_status(item_id, option_id):
    """Set the Status field on a project item."""
    mutation = f'''mutation {{
        updateProjectV2ItemFieldValue(input: {{
            projectId: "{PROJECT_ID}",
            itemId: "{item_id}",
            fieldId: "{STATUS_FIELD_ID}",
            value: {{singleSelectOptionId: "{option_id}"}}
        }}) {{
            projectV2Item {{ id }}
        }}
    }}'''
    result, err = run_gh_api("graphql", "POST", ["-f", f"query={mutation}"])
    return result is not None and "errors" not in result


def get_project_items():
    """Get all items already in the project with their issue number."""
    query = f'''query {{
        node(id: "{PROJECT_ID}") {{
            ... on ProjectV2 {{
                items(first: 200) {{
                    nodes {{
                        id
                        content {{
                            ... on Issue {{
                                number
                            }}
                        }}
                    }}
                }}
            }}
        }}
    }}'''
    result, err = run_gh_api("graphql", "POST", ["-f", f"query={query}"])
    if result and "data" in result:
        items = result["data"]["node"]["items"]["nodes"]
        return {item["content"]["number"]: item["id"] for item in items if item.get("content")}
    return {}


def main():
    print("Fetching existing project items...")
    existing = get_project_items()
    print(f"Found {len(existing)} items already in project.")

    success = 0
    skipped = 0
    failed = []

    for issue in ISSUES:
        num = issue["number"]
        node_id = get_issue_node_id(num)
        if not node_id:
            print(f"  #{num}: Could not get node ID")
            failed.append((num, "no_node_id"))
            continue

        # Check if already in project
        if num in existing:
            print(f"  #{num}: Already in project, setting status")
            item_id = existing[num]
            if set_status(item_id, QA_TESTING_OPTION_ID):
                print(f"  #{num}: Status set to QA Testing")
                success += 1
            else:
                print(f"  #{num}: Status update failed")
                failed.append((num, "status_fail"))
            skipped += 1
            continue

        # Add to project
        item_id = add_to_project(node_id)
        if not item_id:
            print(f"  #{num}: Add failed (may already exist)")
            skipped += 1
            continue

        # Set status
        if set_status(item_id, QA_TESTING_OPTION_ID):
            print(f"  #{num}: OK")
            success += 1
        else:
            print(f"  #{num}: Status update failed")
            failed.append((num, "status_fail"))

        time.sleep(0.05)

    print(f"\nDone. Success: {success}, Skipped: {skipped}, Failed: {len(failed)}")
    if failed:
        print(f"Failed: {failed}")


if __name__ == "__main__":
    main()
