const { test, describe } = require('node:test');
const assert = require('node:assert');
const { SupportOpsEngine } = require('../src/index.js');

describe('SupportOps AI Engine Tests', () => {
  const engine = new SupportOpsEngine({ confidenceThreshold: 85.0 });

  test('classifies billing tickets and calculates hostile sentiment', () => {
    const ticket = {
      id: 'TCK-201',
      subject: 'Double charged $10,000 on renewal',
      body: 'We just saw two separate debit charges hit our card within 4 minutes. Reverse this now!'
    };
    const triage = engine.classifyTicket(ticket);
    assert.strictEqual(triage.category, 'BILLING');
    assert.strictEqual(triage.priority, 'P1_CRITICAL');
    assert.ok(triage.sentimentScore < -0.5);
    assert.ok(triage.confidence >= 85.0);
    assert.strictEqual(triage.requiresHumanReview, false);
  });

  test('triggers human review requirement when confidence is below threshold', () => {
    const lowConfEngine = new SupportOpsEngine({ confidenceThreshold: 95.0 });
    const ticket = {
      id: 'TCK-202',
      subject: 'Question about database latency',
      body: 'Our connection pool timed out earlier.'
    };
    const triage = lowConfEngine.classifyTicket(ticket);
    assert.strictEqual(triage.requiresHumanReview, true);
    assert.strictEqual(triage.status, 'PENDING_HUMAN_REVIEW');
  });

  test('generates response draft with governing policy citation', () => {
    const ticket = { id: 'TCK-203', subject: 'SOC 2 report request', body: 'Where is our annual audit PDF?' };
    const triage = engine.classifyTicket(ticket);
    const res = engine.generateDraftResponse(ticket, triage);
    assert.ok(res.draft.includes('SOC2_AUDIT_SOP'));
    assert.strictEqual(res.eligibleForAutoDispatch, true);
  });

  test('logs supervisor approvals and audit trails immutably', () => {
    engine.approveAndDispatch('TCK-203', 'lead_agent_mark', 'free');
    const logs = engine.getAuditLogs();
    assert.ok(logs.some(l => l.actor === 'HUMAN_SUPERVISOR' && l.action.includes('TCK-203')));
  });

  test('enforces quota paywall for free plan upon exhaustion', () => {
    const userId = 'free_support_team';
    for (let i = 0; i < 15; i++) {
      engine.approveAndDispatch(`TCK-TEST-${i}`, userId, 'free');
    }
    assert.throws(() => {
      engine.approveAndDispatch('TCK-TEST-OVERFLOW', userId, 'free');
    }, { code: 'PAYWALL_TRIGGERED' });
  });
});
