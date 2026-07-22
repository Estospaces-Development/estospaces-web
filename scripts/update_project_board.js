#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

const REPO = 'Estospaces-Development/web-app';
const OWNER = 'Estospaces-Development';
const PROJECT_ID = 'PVT_kwDODiN4lM4BP7T6';
const STATUS_FIELD_ID = 'PVTSSF_lADODiN4lM4BP7T6zg-MZE0';
const QA_TESTING_OPTION_ID = '3772cc16';

function ghRequest(body, token) {
  const data = JSON.stringify(body);
  const opts = {
    hostname: 'api.github.com',
    path: '/graphql',
    method: 'POST',
    headers: {
      'User-Agent': 'estospaces-board-update',
      'Accept': 'application/vnd.github+json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getToken() {
  let token = process.env.GITHUB_TOKEN;
  if (!token) {
    try {
      const { execSync } = require('child_process');
      token = execSync('gh auth token', { encoding: 'utf8' }).trim();
    } catch (e) {
      console.error('No GitHub token. Set GITHUB_TOKEN or run gh auth login.');
      process.exit(1);
    }
  }
  return token;
}

async function main() {
  const token = await getToken();
  const issues = JSON.parse(fs.readFileSync('/tmp/open_issues_168_plus.json', 'utf8'));
  console.log(`Processing ${issues.length} issues...`);

  let added = 0, skipped = 0, failed = 0;
  for (const issue of issues) {
    try {
      // Resolve issue number to global node ID
      const nodeQuery = `query($owner: String!, $repo: String!) { repository(owner: $owner, name: $repo) { issue(number: ${issue.number}) { id } } }`;
      const nodeResult = await ghRequest({ query: nodeQuery, variables: { owner: OWNER, repo: 'web-app' } }, token);
      if (nodeResult.data.errors || !nodeResult.data.data?.repository?.issue?.id) {
        console.error(`\n  #${issue.number}: could not resolve node ID: ${JSON.stringify(nodeResult.data.errors || nodeResult.data).slice(0,80)}`);
        failed++;
        continue;
      }
      const nodeId = nodeResult.data.data.repository.issue.id;

      // Add issue to project
      const addResult = await ghRequest({
        query: `mutation($input: AddProjectV2ItemByIdInput!) { addProjectV2ItemById(input: $input) { item { id } } }`,
        variables: { input: { projectId: PROJECT_ID, contentId: nodeId } },
      }, token);

      if (addResult.data.errors) {
        if (addResult.data.errors[0]?.message?.includes('already')) {
          skipped++;
          continue;
        }
        console.error(`\n  #${issue.number}: add failed: ${addResult.data.errors[0].message.slice(0, 80)}`);
        failed++;
        continue;
      }

      const itemId = addResult.data.data?.addProjectV2ItemById?.item?.id;
      if (!itemId) {
        skipped++;
        continue;
      }

      // Update status to QA Testing
      const statusResult = await ghRequest({
        query: `mutation($input: UpdateProjectV2ItemFieldValueInput!) { updateProjectV2ItemFieldValue(input: $input) { projectV2Item { id } } }`,
        variables: {
          input: {
            projectId: PROJECT_ID,
            itemId: itemId,
            fieldId: STATUS_FIELD_ID,
            value: { singleSelectOptionId: QA_TESTING_OPTION_ID },
          },
        },
      }, token);

      if (statusResult.data.errors) {
        console.error(`\n  #${issue.number}: status: ${statusResult.data.errors[0].message.slice(0, 80)}`);
        failed++;
      } else {
        added++;
        process.stdout.write(`.`);
      }
    } catch (e) {
      console.error(`\n  #${issue.number}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\nDone: ${added} added, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
