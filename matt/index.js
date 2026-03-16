#!/usr/bin/env node
/**
 * Matt (Content Planner Agent) — Orchestrator
 * DORMANT by default. Set DORMANT_MODE = false to activate.
 */

const DORMANT_MODE = true;

async function main() {
  if (DORMANT_MODE) {
    console.log('Matt is dormant. Set DORMANT_MODE=false in index.js to activate.');
    process.exit(0);
  }

  const [{ mine }, { classify }, { writeBriefs }, { publish }] = await Promise.all([
    import('./skills/content-miner.js'),
    import('./skills/content-planner-classifier.js'),
    import('./skills/content-brief-writer.js'),
    import('./skills/content-calendar-publisher.js')
  ]);

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const maxCandidatesIdx = args.indexOf('--max-candidates');
  const maxCandidates = maxCandidatesIdx !== -1 ? Number(args[maxCandidatesIdx + 1]) : null;

  const maxApprovedIdx = args.indexOf('--max-approved');
  const maxApproved = maxApprovedIdx !== -1 ? Number(args[maxApprovedIdx + 1]) : null;

  const sprintIdx = args.indexOf('--sprint');
  const sprintName = sprintIdx !== -1 && args[sprintIdx + 1]
    ? args[sprintIdx + 1]
    : new Date().toISOString().split('T')[0];

  console.log(`\n🚀 Matt — Sprint: ${sprintName}${dryRun ? ' (DRY RUN)' : ''}\n`);

  console.log('📡 Step 1/4: Mining content sources...');
  let candidates = await mine();
  if (maxCandidates && Number.isFinite(maxCandidates) && maxCandidates > 0) {
    candidates = candidates.slice(0, maxCandidates);
  }
  console.log(`   Found ${candidates.length} candidate ideas\n`);

  if (candidates.length === 0) {
    console.log('No candidates found. Exiting.');
    process.exit(0);
  }

  console.log('🧠 Step 2/4: Classifying and scoring ideas...');
  let { approved, rejected } = await classify(candidates);
  if (maxApproved && Number.isFinite(maxApproved) && maxApproved > 0) {
    approved = approved.slice(0, maxApproved);
  }
  console.log(`   Approved: ${approved.length}, Rejected: ${rejected.length}\n`);

  if (rejected.length > 0) {
    console.log('   Rejected ideas:');
    rejected.forEach((r) => {
      console.log(`   ❌ "${r.rawText.slice(0, 60)}..." — ${r.rejectionReason}`);
    });
    console.log('');
  }

  if (approved.length === 0) {
    console.log('No ideas passed the filter. Exiting.');
    process.exit(0);
  }

  console.log('✍️  Step 3/4: Writing content briefs (Opus)...');
  const briefs = await writeBriefs(approved);
  console.log(`   Generated ${briefs.length} briefs\n`);

  if (dryRun) {
    console.log('🏁 DRY RUN — Skipping publish. Briefs:');
    briefs.forEach((b) => {
      console.log(`\n--- ${b.title} ---`);
      console.log(`Pillar: ${b.pillar} | Format: ${b.format} | Priority: ${b.priority}`);
      console.log(`Hook: ${b.hook}`);
      console.log(`Story: ${b.sellOutline.story.slice(0, 100)}...`);
      console.log(`Proof: ${b.proofPoints.join(', ')}`);
    });
  } else {
    console.log('📤 Step 4/4: Publishing to Notion + Slack...');
    await publish(briefs, sprintName);
    console.log('   Published! ✅\n');
  }

  console.log(`\n🏁 Matt complete. Sprint "${sprintName}" — ${briefs.length} briefs.`);
}

main().catch((err) => {
  console.error('❌ Matt failed:', err);
  process.exit(1);
});
