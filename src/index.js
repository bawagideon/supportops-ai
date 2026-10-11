/**
 * SupportOps AI — Human-Governed AI Support Desk Engine
 * Ticket classification, sentiment analysis, policy retrieval, confidence scoring,
 * human-in-the-loop review gating, and audit trail logging.
 */

class SupportOpsEngine {
  constructor(options = {}) {
    this.confidenceThreshold = options.confidenceThreshold || 85.0;
    this.policies = new Map([
      ["BILLING", "REFUND_MATRIX_V4: 100% refund eligible within 14 days. Duplicate debits reversed within 24-48 hours."],
      ["INFRASTRUCTURE", "SLA_TIER1_PROTOCOL: High severity latency spikes require pool expansion to 1,500 threads and status page alert."],
      ["COMPLIANCE", "SOC2_AUDIT_SOP: Cryptographically signed audit packages downloadable from Admin portal CC6.1."]
    ]);
    this.auditLogs = [];
    this.customerUsage = new Map();
  }

  classifyTicket(ticket) {
    if (!ticket || !ticket.body) {
      throw new Error("Valid ticket with body is required");
    }

    const text = (ticket.subject + " " + ticket.body).toLowerCase();

    let category = "GENERAL_INQUIRY";
    let priority = "P3_NORMAL";
    let sentimentScore = 0.0;
    let confidence = 80.0;

    if (text.includes("charge") || text.includes("refund") || text.includes("invoice") || text.includes("debit")) {
      category = "BILLING";
      priority = text.includes("double") || text.includes("urgent") ? "P1_CRITICAL" : "P2_HIGH";
      sentimentScore = -0.85;
      confidence = 92.5;
    } else if (text.includes("timeout") || text.includes("504") || text.includes("database") || text.includes("outage")) {
      category = "INFRASTRUCTURE";
      priority = "P1_CRITICAL";
      sentimentScore = -0.50;
      confidence = 88.0;
    } else if (text.includes("soc 2") || text.includes("gdpr") || text.includes("audit") || text.includes("compliance")) {
      category = "COMPLIANCE";
      priority = "P2_HIGH";
      sentimentScore = 0.10;
      confidence = 96.0;
    }

    const matchedPolicy = this.policies.get(category) || "STANDARD_TERMS_V1";
    const requiresHumanReview = confidence < this.confidenceThreshold;

    const triageRecord = {
      ticketId: ticket.id || "TCK-" + Math.floor(Math.random() * 9000 + 1000),
      category,
      priority,
      sentimentScore,
      confidence,
      matchedPolicy,
      requiresHumanReview,
      status: requiresHumanReview ? "PENDING_HUMAN_REVIEW" : "AUTO_DISPATCH_READY",
      createdAt: new Date().toISOString()
    };

    this._logAudit("AI_TRIAGE", `Classified ticket ${triageRecord.ticketId} as ${category} (${confidence}% confidence)`);
    return triageRecord;
  }

  generateDraftResponse(ticket, triageRecord) {
    const policy = triageRecord.matchedPolicy;
    let draft = "";

    if (triageRecord.category === "BILLING") {
      draft = `Hello,\n\nI reviewed your billing inquiry. Under ${policy.split(":")[0]}, duplicate authorizations are eligible for instant reversal within 24-48 business hours. Your account remains in good standing.\n\nBest regards,\nSupportOps Automation`;
    } else if (triageRecord.category === "INFRASTRUCTURE") {
      draft = `Hello Team,\n\nOur engineering telemetry responded to the infrastructure alert per ${policy.split(":")[0]}. Thread pools have been expanded and error rates are under control.\n\nBest regards,\nSite Reliability Operations`;
    } else {
      draft = `Hello,\n\nPer ${policy.split(":")[0]}, you can download verified compliance documentation directly from the Admin settings portal.\n\nBest regards,\nCompliance Support`;
    }

    return {
      ticketId: triageRecord.ticketId,
      draft,
      governingPolicy: policy,
      eligibleForAutoDispatch: !triageRecord.requiresHumanReview
    };
  }

  approveAndDispatch(ticketId, supervisorId = "supervisor_1", plan = "free") {
    this._checkAndIncrementUsage(supervisorId, plan);
    this._logAudit("HUMAN_SUPERVISOR", `Approved and dispatched ticket ${ticketId} by ${supervisorId}`);
    return {
      ticketId,
      dispatched: true,
      approvedBy: supervisorId,
      dispatchedAt: new Date().toISOString()
    };
  }

  escalateToSeniorTier(ticketId, reason) {
    this._logAudit("AGENT_GOVERNOR", `Escalated ticket ${ticketId} to Tier 3 human engineers. Reason: ${reason}`);
    return {
      ticketId,
      escalated: true,
      queue: "TIER_3_SENIOR",
      reason
    };
  }

  _checkAndIncrementUsage(userId, plan) {
    const limits = { free: 15, growth: 5000, enterprise: 50000 };
    const maxQuota = limits[plan] || 15;
    const current = this.customerUsage.get(userId) || 0;

    if (current >= maxQuota) {
      const err = new Error(`ENTITLEMENT_EXHAUSTED: ${plan} ticket quota of ${maxQuota} reached`);
      err.code = "PAYWALL_TRIGGERED";
      throw err;
    }
    this.customerUsage.set(userId, current + 1);
  }

  _logAudit(actor, action) {
    this.auditLogs.push({
      timestamp: new Date().toISOString(),
      actor,
      action
    });
  }

  getAuditLogs() {
    return [...this.auditLogs];
  }
}

module.exports = { SupportOpsEngine };
