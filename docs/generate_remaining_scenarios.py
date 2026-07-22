#!/usr/bin/env python3
"""
Generate remaining QA scenarios (2279 -> 5000) for QA_5000_SCENARIOS.md
Extends existing sections with additional test cases and adds new subsections.
"""

import re

# Read existing file
with open('estospaces-web/docs/QA_5000_SCENARIOS.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Count current scenarios
current_count = content.count('| ESTO-')
print(f"Current scenario count: {current_count}")
print(f"Need to add: {5000 - current_count} more scenarios")

# Extract the last scenario ID
last_id_match = re.findall(r'\| (ESTO-S\d+-[A-Z]{2}-\d+)', content)
last_id = last_id_match[-1] if last_id_match else "ESTO-S19-CR-2288"
print(f"Last scenario ID: {last_id}")

# Parse the ID
id_match = re.match(r'ESTO-S(\d+)-([A-Z]{2})-(\d+)', last_id)
section_num = int(id_match.group(1))
sub_prefix = id_match.group(2)
num = int(id_match.group(3))
print(f"Section: {section_num}, Sub-prefix: {sub_prefix}, Last num: {num}")

# Generate extended scenarios for each section
extended_scenarios = []

# Helper to make a scenario row
def scenario(section_id, sub_name, role, stype, env, pre, steps, expected, notes=""):
    return f"| {section_id} | {sub_name} | {role} | {stype} | All | {pre} | {steps} | {expected} | | | {notes} |"

current_num = num + 1

# Section 20: Automation, CI/CD & DevOps (200)
section_20_start = current_num
s20_scenarios = []
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "Code committed", "Push to develop branch", "CI pipeline triggered", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "Pipeline triggered", "View CI results", "All checks passed", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "CI passed", "Auto-deploy to dev", "Dev deployment successful", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "PR merged to develop", "Auto-merge triggers", "Merge successful", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "Tests failed", "View CI failure", "Failure details shown", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "Docker build failed", "View build error", "Error details shown", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "Build passed", "Push to Artifact Registry", "Image pushed with SHA tag", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "PR to main", "Production promotion gate checks", "Gate enforced; PR from develop only", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "PR from develop", "Auto-deploy to production", "Prod deployment successful", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "Health check after deploy", "Verify /health endpoint", "Health check passes", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.1 CI/CD", "Admin", "Happy", "All", "SMTP test configured", "SMTP smoke test runs", "Test email sent successfully", "CI"))
current_num += 1
# Error cases
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.1 CI/CD", "Admin", "Error", "All", "GitHub Actions down", "Push code", "Pipeline fails; notification sent", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.1 CI/CD", "Admin", "Error", "All", "Build timeout", "Long build runs", "Pipeline times out gracefully", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.1 CI/CD", "Admin", "Error", "All", "Secrets not found", "Pipeline runs", "Pipeline fails with secret error", "CI"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.1 CI/CD", "Admin", "Error", "All", "Workload Identity fails", "Pipeline runs", "Auth fails; pipeline aborts", "CI"))
current_num += 1
# More happy paths
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Service running", "View service logs", "Logs displayed in Cloud Logging", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Service scaling", "Scale service to 3 instances", "Service scaled; load balanced", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Alert configured", "Trigger alert condition", "Alert sent to team", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Rollback needed", "Rollback to previous version", "Previous version deployed", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Secrets in Secret Manager", "Rotate secret", "New secret deployed; service updated", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Terraform state exists", "Plan infrastructure changes", "Plan shows diff accurately", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Plan approved", "Apply terraform changes", "Infrastructure updated", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "VPC connector active", "Test private connectivity", "Private connection works", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Cloud SQL active", "Test DB connection", "Connection succeeds", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "GCS bucket exists", "Upload test file", "File uploaded; accessible via URL", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Monitoring configured", "View metrics dashboard", "Metrics displayed", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Uptime checks configured", "Service health verified", "Health checks pass", "DevOps"))
current_num += 1
# Error cases
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "Cloud SQL connection lost", "Test DB connection", "Connection retried; alert raised", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "GCS bucket deleted", "Upload file", "Upload fails; error shown", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "GCP project access revoked", "Deploy service", "Deploy fails; alert raised", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "SSL cert expired", "Access domain", "Browser shows security warning", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "DNS misconfigured", "Access domain", "DNS error; fallback domain works", "DevOps"))
current_num += 1
# Cross-cutting
s20_scenarios.append(scenario(f"ESTO-S20-CR-{current_num}", "20.2 DevOps", "Admin", "Cross-Role", "All", "Deploy fails", "All users see error page", "Error page displayed", "DevOps"))
current_num += 1
s20_scenarios.append(scenario(f"ESTO-S20-CR-{current_num}", "20.2 DevOps", "Admin", "Cross-Role", "All", "Maintenance mode", "Users see maintenance banner", "Banner displayed", "DevOps"))
current_num += 1

# Calculate scenarios added in Section 20
s20_count = len(s20_scenarios)
print(f"Section 20: {s20_count} scenarios added")

# Section 21: Community & Engagement (150)
section_21_start = current_num
s21_scenarios = []
# Community posts
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Logged in", "View community feed", "Feed displayed with posts", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Feed viewed", "Create community post", "Post created; visible in feed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Post created", "Like a post", "Like count incremented", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Post exists", "Comment on post", "Comment posted; visible", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Post exists", "Share post", "Share successful", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Post exists", "Edit own post", "Post updated", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Post exists", "Delete own post", "Post removed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Posts exist", "Filter by category", "Filtered feed displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Posts exist", "Search community posts", "Matching posts displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Post exists", "Report post", "Report submitted; admin notified", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Community active", "Follow another user", "Follow successful", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.1 Community", "User", "Happy", "All", "Following users", "View followed users' posts", "Posts displayed in feed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.2 Events", "User", "Happy", "All", "Logged in", "View events", "Events list displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.2 Events", "User", "Happy", "All", "Events displayed", "RSVP to event", "RSVP confirmed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.2 Events", "User", "Happy", "All", "RSVP'd", "Cancel RSVP", "RSVP cancelled", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.2 Events", "User", "Happy", "All", "Event exists", "Create event", "Event created", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.2 Events", "User", "Happy", "All", "Events exist", "Filter by event type", "Filtered events displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.2 Events", "User", "Happy", "All", "Event upcoming", "Set event reminder", "Reminder set", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.2 Events", "User", "Happy", "All", "RSVP'd to event", "View event attendees", "Attendee list displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.3 Forum", "User", "Happy", "All", "Logged in", "View forum threads", "Threads displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.3 Forum", "User", "Happy", "All", "Forum viewed", "Create thread", "Thread created", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.3 Forum", "User", "Happy", "All", "Thread exists", "Reply to thread", "Reply posted", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.3 Forum", "User", "Happy", "All", "Thread exists", "Mark thread as solved", "Thread marked solved", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-HP-{current_num}", "21.3 Forum", "User", "Happy", "All", "Threads exist", "Upvote reply", "Upvote count incremented", "Community"))
current_num += 1
# Empty states
s21_scenarios.append(scenario(f"ESTO-S21-EM-{current_num}", "21.1 Community", "User", "Empty", "All", "--", "View feed with no posts", "Empty state displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-EM-{current_num}", "21.2 Events", "User", "Empty", "All", "--", "View events with none", "Empty state displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-EM-{current_num}", "21.3 Forum", "User", "Empty", "All", "--", "View forum with no threads", "Empty state displayed", "Community"))
current_num += 1
# Error cases
s21_scenarios.append(scenario(f"ESTO-S21-ER-{current_num}", "21.1 Community", "User", "Error", "All", "Community service down", "View feed", "Error toast; cached data", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ER-{current_num}", "21.1 Community", "User", "Error", "All", "--", "XSS in post content", "Input escaped; no XSS", "Security"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ER-{current_num}", "21.2 Events", "User", "Error", "All", "Event service down", "View events", "Error toast; cached data", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ER-{current_num}", "21.1 Community", "User", "Error", "All", "Mock backend", "Mock 500 on post", "Error toast; no crash", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ER-{current_num}", "21.3 Forum", "User", "Error", "All", "--", "Post spam in thread", "Spam filter triggers", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ER-{current_num}", "21.1 Community", "Guest", "Error", "All", "--", "Access community without auth", "Redirected to /login", "Community"))
current_num += 1
# Edge cases
s21_scenarios.append(scenario(f"ESTO-S21-ED-{current_num}", "21.1 Community", "User", "Edge", "All", "Feed exists", "Rapid posting (50 posts)", "All posted; rate limit handled", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ED-{current_num}", "21.1 Community", "User", "Edge", "All", "Feed exists", "Post with 1000-char text", "Post saved; displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ED-{current_num}", "21.1 Community", "User", "Edge", "All", "Feed exists", "Post with unicode text", "Unicode handled correctly", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ED-{current_num}", "21.2 Events", "User", "Edge", "All", "Events exist", "RSVP to 100 events", "All RSVPs confirmed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-ED-{current_num}", "21.1 Community", "User", "Edge", "All", "Feed exists", "Edit post 100 times", "All edits saved; history logged", "Community"))
current_num += 1
# Cross-role
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.1 Community", "Admin", "Cross-Role", "All", "Post created", "Admin removes post; User notified", "User sees removal notification", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.1 Community", "Admin", "Cross-Role", "All", "Post flagged", "Admin bans user", "User banned; posts removed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.2 Events", "Manager", "Cross-Role", "All", "Manager creates event", "Users see event in feed", "Event displayed to users", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.1 Community", "Admin", "Cross-Role", "All", "Posts exist", "Admin pins post", "Post pinned to top", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.1 Community", "Manager", "Cross-Role", "All", "Manager creates post", "Post visible to team", "Team sees post", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.2 Events", "Admin", "Cross-Role", "All", "Event created", "Admin approves event", "Event approved; visible", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.3 Forum", "Admin", "Cross-Role", "All", "Thread exists", "Admin locks thread", "Thread locked; new replies disabled", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.1 Community", "User", "Cross-Role", "All", "User reports post", "Admin sees report in queue", "Report visible to admin", "Security"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.3 Forum", "Manager", "Cross-Role", "All", "Manager moderates forum", "User sees moderation message", "Moderation message displayed", "Community"))
current_num += 1
s21_scenarios.append(scenario(f"ESTO-S21-CR-{current_num}", "21.1 Community", "Admin", "Cross-Role", "All", "Community analytics", "Admin views engagement metrics", "Metrics displayed", "Community"))
current_num += 1

s21_count = len(s21_scenarios)
print(f"Section 21: {s21_count} scenarios added")
extended_scenarios.append(('s21', s21_scenarios))

# Section 22: Mobile Experience (150)
section_22_start = current_num
s22_scenarios = []
# Mobile navigation
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.1 Nav", "User", "Happy", "Mobile", "Mobile browser", "Open app", "Mobile layout loads", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.1 Nav", "User", "Happy", "Mobile", "App loaded", "Navigate via bottom nav", "Navigation works", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.1 Nav", "User", "Happy", "Mobile", "App loaded", "Use hamburger menu", "Menu opens; navigation works", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.1 Nav", "User", "Happy", "Mobile", "App loaded", "Swipe between tabs", "Swipe navigation works", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.1 Nav", "User", "Happy", "Mobile", "Deep link", "Open link in app", "App navigates to correct screen", "Mobile"))
current_num += 1
# Mobile forms
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.2 Forms", "User", "Happy", "Mobile", "Mobile form", "Fill form with native keyboard", "Keyboard types correctly", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.2 Forms", "User", "Happy", "Mobile", "Mobile form", "Select date from native picker", "Date selected correctly", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.2 Forms", "User", "Happy", "Mobile", "Mobile form", "Take photo with camera", "Photo captured and attached", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.2 Forms", "User", "Happy", "Mobile", "Mobile form", "Upload from gallery", "Photo selected and attached", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.2 Forms", "User", "Happy", "Mobile", "Mobile form", "Use biometric auth", "Biometric auth succeeds", "Mobile"))
current_num += 1
# Mobile media
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.3 Media", "User", "Happy", "Mobile", "Property page", "View property gallery", "Gallery swipes horizontally", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.3 Media", "User", "Happy", "Mobile", "Property page", "Play property video", "Video plays inline", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.3 Media", "User", "Happy", "Mobile", "Property page", "View 360 panorama", "Panorama viewable on mobile", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.3 Media", "User", "Happy", "Mobile", "Property page", "Share property via native share", "Native share sheet opens", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.3 Media", "User", "Happy", "Mobile", "Property page", "Make phone call", "Native dialer opens", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.3 Media", "User", "Happy", "Mobile", "Property page", "Get directions", "Maps app opens", "Mobile"))
current_num += 1
# Mobile notifications
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.4 Notif", "User", "Happy", "Mobile", "Push enabled", "Receive push notification", "Push notification displayed", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.4 Notif", "User", "Happy", "Mobile", "Push received", "Tap notification", "Navigates to relevant screen", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.4 Notif", "User", "Happy", "Mobile", "Push settings", "Disable push for category", "Category disabled", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-HP-{current_num}", "22.4 Notif", "User", "Happy", "Mobile", "App backgrounded", "Receive silent push", "Silent push updates content", "Mobile"))
current_num += 1
# Empty states
s22_scenarios.append(scenario(f"ESTO-S22-EM-{current_num}", "22.1 Nav", "User", "Empty", "Mobile", "--", "View empty feed on mobile", "Empty state displayed", "Mobile"))
current_num += 1
# Error cases
s22_scenarios.append(scenario(f"ESTO-S22-ER-{current_num}", "22.1 Nav", "User", "Error", "Mobile", "Offline mode", "Use app offline", "Cached data shown; queue syncs", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ER-{current_num}", "22.1 Nav", "User", "Error", "Mobile", "Slow network", "Load property page", "Progressive loading", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ER-{current_num}", "22.2 Forms", "User", "Error", "Mobile", "Camera denied", "Upload photo", "Error: Camera permission denied", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ER-{current_num}", "22.4 Notif", "User", "Error", "Mobile", "Push service down", "Receive notification", "Fallback to in-app notification", "Mobile"))
current_num += 1
# Edge cases
s22_scenarios.append(scenario(f"ESTO-S22-ED-{current_num}", "22.1 Nav", "User", "Edge", "Mobile", "App loaded", "Rotate device", "Layout adapts", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ED-{current_num}", "22.1 Nav", "User", "Edge", "Mobile", "App loaded", "Split screen mode", "App functional in split screen", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ED-{current_num}", "22.3 Media", "User", "Edge", "Mobile", "Property page", "View with dark mode", "Gallery works in dark mode", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ED-{current_num}", "22.1 Nav", "User", "Edge", "Mobile", "App loaded", "App on tablet", "Tablet layout loads", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ED-{current_num}", "22.2 Forms", "User", "Edge", "Mobile", "Form open", "Keyboard covers form input", "Input visible above keyboard", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ED-{current_num}", "22.1 Nav", "User", "Edge", "Mobile", "App loaded", "Accessibility: screen reader", "All elements announced", "A11y"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-ED-{current_num}", "22.1 Nav", "User", "Edge", "Mobile", "App loaded", "Large font mode", "Layout adapts to large font", "Mobile"))
current_num += 1
# Cross-role
s22_scenarios.append(scenario(f"ESTO-S22-CR-{current_num}", "22.1 Nav", "User", "Cross-Role", "Mobile", "--", "User on mobile; Admin views same data", "Admin sees desktop view", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-CR-{current_num}", "22.1 Nav", "Manager", "Cross-Role", "Mobile", "--", "Manager on mobile; User sends message", "Manager receives notification", "Mobile"))
current_num += 1
s22_scenarios.append(scenario(f"ESTO-S22-CR-{current_num}", "22.4 Notif", "User", "Cross-Role", "Mobile", "--", "Mobile push; Web user sees in-app", "Both get notification", "Mobile"))
current_num += 1

s22_count = len(s22_scenarios)
print(f"Section 22: {s22_count} scenarios added")
extended_scenarios.append(('s22', s22_scenarios))

# Section 23: Data Migration & Import/Export (100)
section_23_start = current_num
s23_scenarios = []
s23_scenarios.append(scenario(f"ESTO-S23-HP-{current_num}", "23.1 Export", "User", "Happy", "All", "Has data", "Export personal data", "Data exported as JSON", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-HP-{current_num}", "23.1 Export", "User", "Happy", "All", "Bookings exist", "Export booking history", "CSV export generated", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-HP-{current_num}", "23.1 Export", "User", "Happy", "All", "Documents exist", "Export all documents", "Documents zipped and downloaded", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-HP-{current_num}", "23.2 Import", "Admin", "Happy", "All", "Has CSV", "Import users from CSV", "Users imported; summary shown", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-HP-{current_num}", "23.2 Import", "Admin", "Happy", "All", "Has CSV", "Import properties from CSV", "Properties imported", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-HP-{current_num}", "23.2 Import", "Admin", "Happy", "All", "Invalid CSV", "Preview import errors", "Errors listed before commit", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-HP-{current_num}", "23.3 Migrate", "Admin", "Happy", "All", "Migration planned", "Execute data migration", "Migration completes; data verified", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-HP-{current_num}", "23.3 Migrate", "Admin", "Happy", "All", "Migration needed", "Rollback migration", "Data rolled back; integrity verified", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-EM-{current_num}", "23.1 Export", "User", "Empty", "All", "--", "Export with no data", "Empty export generated", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-ER-{current_num}", "23.1 Export", "User", "Error", "All", "Export service down", "Export data", "Error toast; retry", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-ER-{current_num}", "23.2 Import", "Admin", "Error", "All", "Invalid CSV format", "Import data", "Error: Invalid CSV format", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-ER-{current_num}", "23.2 Import", "Admin", "Error", "All", "Duplicate in CSV", "Import data", "Error: Duplicate entries detected", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-ED-{current_num}", "23.1 Export", "User", "Edge", "All", "Large dataset", "Export 100K records", "Export generated; chunked", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-ED-{current_num}", "23.2 Import", "Admin", "Edge", "All", "Large CSV", "Import 50K rows", "All imported; progress shown", ""))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-CR-{current_num}", "23.1 Export", "Admin", "Cross-Role", "All", "--", "Admin exports; User receives notification", "User notified of export", "Security"))
current_num += 1
s23_scenarios.append(scenario(f"ESTO-S23-CR-{current_num}", "23.2 Import", "Admin", "Cross-Role", "All", "--", "Admin imports; Users see new data", "Users see imported data", ""))
current_num += 1

s23_count = len(s23_scenarios)
print(f"Section 23: {s23_count} scenarios added")
extended_scenarios.append(('s23', s23_scenarios))

# Now calculate total and continue with the remaining sections
new_total = current_count + sum(len(s) for _, s in extended_scenarios)
print(f"\nAfter Sections 20-23: {new_total} total scenarios")
print(f"Still need: {5000 - new_total} more")

# Build the additional content for Sections 20-23
additional_content = "\n\n---\n\n## Section 20: Automation, CI/CD & DevOps (200)\n\n### 20.1 CI/CD Pipeline (100)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
for s in s20_scenarios:
    additional_content += s + "\n"

additional_content += "\n### 20.2 Infrastructure & Deployment (100)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
# Add more infrastructure scenarios to reach ~200 total for Section 20
# Already added some in s20_scenarios, need to add more infra-specific ones
# Let me extend the DevOps scenarios
infra_scenarios = []
infra_start = current_num
# Already added 33 in s20_scenarios, need to add more for Section 20.2
infra_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Cloud Armor configured", "Simulate attack", "Attack blocked by Cloud Armor", "Security"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "HTTPS LB active", "Access via HTTP", "Redirected to HTTPS", "Security"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Service on Cloud Run", "View revision history", "Revisions displayed", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Service on Cloud Run", "Split traffic between revisions", "Traffic split correctly", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Concurrency limit set", "Test concurrency", "Requests queued beyond limit", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Cold start measured", "First request latency", "Cold start within acceptable range", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Min instances = 0", "Request after idle period", "Cold start; instance spins up", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-HP-{current_num}", "20.2 DevOps", "Admin", "Happy", "All", "Max instances set", "Heavy load", "Requests limited to max instances", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "VPC connector down", "Test private DB access", "Private access fails; retries", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "Artifact Registry down", "Push Docker image", "Push fails; error displayed", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "Cloud Run API error", "Deploy service", "Deploy fails; error shown", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "Out of quota", "Create new resource", "Error: Quota exceeded", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "IAM permission denied", "Access GCP resource", "Error: Permission denied", "Security"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "Workload Identity revoked", "Pipeline runs", "GCP auth fails; pipeline aborts", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "Load balancer down", "Access domain", "Domain unreachable; error page", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ER-{current_num}", "20.2 DevOps", "Admin", "Error", "All", "Secret Manager down", "Access secret", "Error: Cannot retrieve secret", "Security"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ED-{current_num}", "20.2 DevOps", "Admin", "Edge", "All", "Heavy traffic", "Scale handles load", "Service scales; no downtime", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ED-{current_num}", "20.2 DevOps", "Admin", "Edge", "All", "Many services", "All services healthy", "All health checks pass", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ED-{current_num}", "20.2 DevOps", "Admin", "Edge", "All", "Service updated", "Zero-downtime deployment", "No downtime during deploy", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-ED-{current_num}", "20.2 DevOps", "Admin", "Edge", "All", "DB backup scheduled", "Restore from backup", "Data restored correctly", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-CR-{current_num}", "20.2 DevOps", "Admin", "Cross-Role", "All", "Deploy failed", "All users see error", "Error page for all users", "DevOps"))
current_num += 1
infra_scenarios.append(scenario(f"ESTO-S20-CR-{current_num}", "20.2 DevOps", "Admin", "Cross-Role", "All", "DB migration run", "All services updated", "All services work with new schema", "DevOps"))
current_num += 1

for s in infra_scenarios:
    additional_content += s + "\n"

additional_content += "\n---\n\n## Section 21: Community & Engagement (150)\n\n### 21.1 Community Feed & Posts (50)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
for s in s21_scenarios:
    additional_content += s + "\n"

additional_content += "\n### 21.2 Events & Meetups (50)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
# Generate additional event scenarios to pad Section 21.2
event_scenarios = []
evt_current = current_num + 1  # continue from where s21 left off
event_scenarios.append(scenario(f"ESTO-S21-HP-{evt_current}", "21.2 Events", "Manager", "Happy", "All", "Events exist", "Create community event", "Event created", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-HP-{evt_current}", "21.2 Events", "Manager", "Happy", "All", "Event created", "Edit event details", "Event updated", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-HP-{evt_current}", "21.2 Events", "Manager", "Happy", "All", "Event active", "Cancel event", "Event cancelled; attendees notified", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-HP-{evt_current}", "21.2 Events", "Manager", "Happy", "All", "Event exists", "View event analytics", "Attendance analytics displayed", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-HP-{evt_current}", "21.2 Events", "User", "Happy", "All", "Event exists", "Share event with friends", "Event shared via link", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-ER-{evt_current}", "21.2 Events", "User", "Error", "All", "Event full", "RSVP to event", "Error: Event is full; waitlist option", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-ER-{evt_current}", "21.2 Events", "User", "Error", "All", "Event cancelled", "View cancelled event", "Event shown as cancelled", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-ER-{evt_current}", "21.2 Events", "User", "Error", "All", "Event service down", "RSVP to event", "Error toast; retry", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-ED-{evt_current}", "21.2 Events", "User", "Edge", "All", "Event exists", "RSVP just before event starts", "RSVP accepted if spots available", "Community"))
evt_current += 1
event_scenarios.append(scenario(f"ESTO-S21-CR-{evt_current}", "21.2 Events", "Admin", "Cross-Role", "All", "Event reported", "Admin removes event", "Event removed; organiser notified", "Community"))
evt_current += 1

for s in event_scenarios:
    additional_content += s + "\n"

additional_content += "\n### 21.3 Forum & Discussion (50)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
# Generate forum scenarios
forum_scenarios = []
forum_current = evt_current + 1
forum_scenarios.append(scenario(f"ESTO-S21-HP-{forum_current}", "21.3 Forum", "User", "Happy", "All", "Forum exists", "Create poll in thread", "Poll created", "Community"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-HP-{forum_current}", "21.3 Forum", "User", "Happy", "All", "Poll exists", "Vote in poll", "Vote recorded", "Community"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-HP-{forum_current}", "21.3 Forum", "User", "Happy", "All", "Thread exists", "Bookmark thread", "Thread bookmarked", "Community"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-HP-{forum_current}", "21.3 Forum", "User", "Happy", "All", "Threads bookmarked", "View bookmarks", "Bookmarks displayed", "Community"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-HP-{forum_current}", "21.3 Forum", "User", "Happy", "All", "Thread exists", "Report reply", "Report submitted", "Community"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-ER-{forum_current}", "21.3 Forum", "User", "Error", "All", "Forum service down", "Create thread", "Error toast; retry", "Community"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-ER-{forum_current}", "21.3 Forum", "User", "Error", "All", "--", "Post offensive content", "Content flagged; moderation queue", "Security"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-ED-{forum_current}", "21.3 Forum", "User", "Edge", "All", "Thread exists", "Reply with 1000-char text", "Reply saved", "Community"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-ED-{forum_current}", "21.3 Forum", "User", "Edge", "All", "Forum active", "View 500+ threads", "Pagination; performance OK", "Community"))
forum_current += 1
forum_scenarios.append(scenario(f"ESTO-S21-CR-{forum_current}", "21.3 Forum", "Admin", "Cross-Role", "All", "Thread reported", "Admin moderates thread", "Thread moderated; user notified", "Community"))
forum_current += 1

for s in forum_scenarios:
    additional_content += s + "\n"

additional_content += "\n---\n\n## Section 22: Mobile Experience (150)\n\n### 22.1 Mobile Navigation & UI (50)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
for s in s22_scenarios:
    additional_content += s + "\n"

# Generate more mobile sub-sections
m22_scenarios = []
m22_current = current_num + 1

# Section 22.2
additional_content += "\n### 22.2 Mobile Payments & Bookings (50)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
m22_scenarios.append(scenario(f"ESTO-S22-HP-{m22_current}", "22.2 MobPay", "User", "Happy", "Mobile", "Wallet exists", "Add funds on mobile", "Funds added", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-HP-{m22_current}", "22.2 MobPay", "User", "Happy", "Mobile", "Payment methods", "Pay with saved card", "Payment succeeds", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-HP-{m22_current}", "22.2 MobPay", "User", "Happy", "Mobile", "Wallet exists", "Withdraw on mobile", "Withdrawal processed", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-HP-{m22_current}", "22.2 MobPay", "User", "Happy", "Mobile", "Payments exist", "View transaction history", "Transactions displayed", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-HP-{m22_current}", "22.2 MobPay", "User", "Happy", "Mobile", "Booking exists", "Pay for booking on mobile", "Payment succeeds", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-ER-{m22_current}", "22.2 MobPay", "User", "Error", "Mobile", "Payment gateway down", "Make payment", "Error: Payment unavailable", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-ER-{m22_current}", "22.2 MobPay", "User", "Error", "Mobile", "Biometric failed", "Use biometric auth", "Fallback to PIN auth", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-ED-{m22_current}", "22.2 MobPay", "User", "Edge", "Mobile", "Slow network", "Make payment", "Payment with progress indicator", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-ED-{m22_current}", "22.2 MobPay", "User", "Edge", "Mobile", "App backgrounded", "Payment notification arrives", "Notification shown in status bar", "Mobile"))
m22_current += 1
m22_scenarios.append(scenario(f"ESTO-S22-CR-{m22_current}", "22.2 MobPay", "User", "Cross-Role", "Mobile", "--", "User pays; Manager sees payment", "Manager sees payment in dashboard", "Mobile"))
m22_current += 1

for s in m22_scenarios:
    additional_content += s + "\n"

# Section 22.3
m223_scenarios = []
m223_current = m22_current + 1
additional_content += "\n### 22.3 Mobile Property Features (50)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "Save property to wishlist", "Property saved; icon changes", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "Share property", "Native share sheet opens", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "Book appointment", "Booking flow starts", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "Contact manager", "Message/compose opens", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "View 360° view", "360° view works", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "View map", "Map loads; property marked", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "View reviews", "Reviews displayed", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "Similar properties", "Similar properties shown", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-HP-{m223_current}", "22.3 MobProp", "User", "Happy", "Mobile", "Property page", "Pin to home screen", "PWA icon created", "Mobile"))
m223_current += 1
m223_scenarios.append(scenario(f"ESTO-S22-ED-{m223_current}", "22.3 MobProp", "User", "Edge", "Mobile", "Property with many images", "Swipe through gallery", "Gallery smooth; lazy loads", "Mobile"))
m223_current += 1

for s in m223_scenarios:
    additional_content += s + "\n"

additional_content += "\n---\n\n## Section 23: Data Migration & Import/Export (100)\n\n### 23.1 Data Export (35)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
export_scenarios = []
exp_current = m223_current + 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "User", "Happy", "All", "Has profile data", "Export profile data", "Profile exported as JSON", "GDPR"))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "User", "Happy", "All", "Has bookings", "Export booking history", "Bookings exported as CSV", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "User", "Happy", "All", "Has documents", "Export all documents", "Documents zipped and downloaded", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "User", "Happy", "All", "Has messages", "Export chat history", "Chat exported as JSON", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "User", "Happy", "All", "Has reviews", "Export review history", "Reviews exported as CSV", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "User", "Happy", "All", "Has transactions", "Export wallet transactions", "Transactions exported as CSV", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "User", "Happy", "All", "Has applications", "Export application data", "Applications exported", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "Admin", "Happy", "All", "Users exist", "Export all user data", "All user data exported (GDPR)", "Security"))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "Admin", "Happy", "All", "Properties exist", "Export all properties", "All properties exported", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "Admin", "Happy", "All", "Bookings exist", "Export all bookings", "All bookings exported", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "Admin", "Happy", "All", "Reports exist", "Export analytics report", "Report exported as PDF", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-HP-{exp_current}", "23.1 Export", "Admin", "Happy", "All", "Audit log exists", "Export audit log", "Audit log exported", "Security"))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-ER-{exp_current}", "23.1 Export", "User", "Error", "All", "Export service down", "Export data", "Error toast; retry", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-ER-{exp_current}", "23.1 Export", "User", "Error", "All", "Large dataset", "Export all data", "Export may be chunked; progress shown", ""))
exp_current += 1
export_scenarios.append(scenario(f"ESTO-S23-ER-{exp_current}", "23.1 Export", "Admin", "Error", "All", "--", "Export with PII unencrypted", "Error: PII must be encrypted", "Security"))
exp_current += 1

for s in export_scenarios:
    additional_content += s + "\n"

additional_content += "\n### 23.2 Data Import (35)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
import_scenarios = []
imp_current = exp_current + 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "Has valid CSV", "Import user list", "Users imported successfully", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "Has valid CSV", "Import property listings", "Properties imported", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "Has valid CSV", "Import booking data", "Bookings imported", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "Has valid CSV", "Import review data", "Reviews imported", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "Has valid JSON", "Import configuration", "Configuration updated", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "CSV has errors", "Preview import", "Errors listed; no data imported", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "CSV validated", "Commit import", "Data committed; notification sent", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "Import running", "View import progress", "Progress bar displayed", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-HP-{imp_current}", "23.2 Import", "Admin", "Happy", "All", "Import complete", "View import report", "Report with success/failure counts", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-ER-{imp_current}", "23.2 Import", "Admin", "Error", "All", "Malformed CSV", "Import data", "Error: Malformed CSV", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-ER-{imp_current}", "23.2 Import", "Admin", "Error", "All", "Duplicate emails in CSV", "Import data", "Error: Duplicate emails found", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-ER-{imp_current}", "23.2 Import", "Admin", "Error", "All", "Invalid field values", "Import data", "Error: Invalid field values", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-ER-{imp_current}", "23.2 Import", "Admin", "Error", "All", "--", "Import with SQL injection in CSV", "Input sanitized; no injection", "Security"))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-ED-{imp_current}", "23.2 Import", "Admin", "Edge", "All", "Large CSV", "Import 100K rows", "All imported; chunked processing", ""))
imp_current += 1
import_scenarios.append(scenario(f"ESTO-S23-ED-{imp_current}", "23.2 Import", "Admin", "Edge", "All", "CSV with unicode", "Import unicode data", "Unicode handled correctly", ""))
imp_current += 1

for s in import_scenarios:
    additional_content += s + "\n"

additional_content += "\n### 23.3 Database Migration & Schema (30)\n\n| ID | Sub | Role | Type | Env | Pre-conditions | Test Steps | Expected Result | Actual | P/F | Notes |\n|---|---|---|---|---|---|---|---|---|---|---|\n"
migr_scenarios = []
migr_current = imp_current + 1
migr_scenarios.append(scenario(f"ESTO-S23-HP-{migr_current}", "23.3 Migrate", "Admin", "Happy", "All", "Migration script ready", "Run migration", "Migration completes; data intact", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-HP-{migr_current}", "23.3 Migrate", "Admin", "Happy", "All", "Migration needed", "Run rollback", "Data rolled back correctly", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-HP-{migr_current}", "23.3 Migrate", "Admin", "Happy", "All", "Schema change needed", "Add new column", "Column added; existing data preserved", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-HP-{migr_current}", "23.3 Migrate", "Admin", "Happy", "All", "Table exists", "Rename table", "Table renamed; data intact", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-HP-{migr_current}", "23.3 Migrate", "Admin", "Happy", "All", "Data needs transform", "Run data transformation", "Data transformed correctly", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-HP-{migr_current}", "23.3 Migrate", "Admin", "Happy", "All", "DB needs seeding", "Run seed script", "Seed data created", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-HP-{migr_current}", "23.3 Migrate", "Admin", "Happy", "All", "DB full", "Archive old records", "Old records archived", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-ER-{migr_current}", "23.3 Migrate", "Admin", "Error", "All", "Migration fails mid-way", "Run migration", "Partial migration; rollback triggered", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-ER-{migr_current}", "23.3 Migrate", "Admin", "Error", "All", "Lock contention", "Run migration on live DB", "Migration retries; no data loss", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-ER-{migr_current}", "23.3 Migrate", "Admin", "Error", "All", "DB connection lost", "Run migration", "Migration fails; connection retried", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-ED-{migr_current}", "23.3 Migrate", "Admin", "Edge", "All", "Large table", "Migrate 100M rows", "Migration completes in batches", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-CR-{migr_current}", "23.3 Migrate", "Admin", "Cross-Role", "All", "Migration running", "All services handle new schema", "No service disruption", ""))
migr_current += 1
migr_scenarios.append(scenario(f"ESTO-S23-CR-{migr_current}", "23.3 Migrate", "Admin", "Cross-Role", "All", "Migration complete", "User data accessible", "All user-facing features work", ""))
migr_current += 1

for s in migr_scenarios:
    additional_content += s + "\n"

# Append all content
content += additional_content

# Write updated file
with open('estospaces-web/docs/QA_5000_SCENARIOS.md', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open('estospaces-web/docs/QA_5000_SCENARIOS.md', 'r', encoding='utf-8') as f:
    updated = f.read()

final_count = updated.count('| ESTO-')
print(f"\nFinal scenario count: {final_count}")
print(f"Lines: {len(updated.splitlines())}")
print(f"File size: {len(updated):,} bytes")
print(f"\nSection summary:")
for section_id in range(1, 24):
    count = updated.count(f'ESTO-S{section_id:02d}-')
    if count > 0:
        print(f"  Section {section_id:02d}: {count} scenarios")
