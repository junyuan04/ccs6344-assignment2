const { sql, query, queryWithRlsContext } = require("../config/db");
const auditService = require("./auditService");

// Audit log helper
async function auditSafe(payload) {
    try { await auditService.logAction(payload); }
    catch (err) { console.warn("Audit log failed:", err.message); }
}

async function getCustomerIdByProfileId(profileId, ctx) {
    if (ctx?.customerId && ctx?.role === "Customer") return ctx.customerId;

    const r = await queryWithRlsContext(
        `SELECT Customer_ID AS customerId FROM ebs.Customer WHERE Profile_ID = @pid`,
        [{ name: "pid", type: sql.Int, value: profileId }],
        ctx
    );

    return r.recordset[0]?.customerId || null;
}

async function createFeedback({ profileId, rating, content }, ctx) {
    const customerId = await getCustomerIdByProfileId(profileId, ctx);
    if (!customerId) {
        const err = new Error("Customer record not found for this profile");
        err.statusCode = 404;
        throw err;
    }

    const r = await queryWithRlsContext(
        `
    INSERT INTO ebs.Feedback (Customer_ID, Rating, Content, Status)
    OUTPUT
      INSERTED.Feedback_ID AS feedbackId,
      INSERTED.Customer_ID AS customerId,
      INSERTED.Rating AS rating,
      INSERTED.Content AS content,
      INSERTED.Status AS status,
      INSERTED.Created_At AS createdAt
    VALUES (@cid, @rating, @content, N'Open');
    `,
        [
            { name: "cid", type: sql.Int, value: customerId },
            { name: "rating", type: sql.Int, value: rating ?? null },
            { name: "content", type: sql.NVarChar(sql.MAX), value: content },
        ],
        ctx
    );

    const row = r.recordset[0];

    await auditSafe({
        profileId,
        targetRecordId: String(row.Feedback_ID ?? row.feedbackId),
        actionType: "INSERT",
        targetTable: "ebs.Feedback",
        actionDetail: { rating: row.Rating ?? row.rating, hasContent: true }
    });

    return row;
}

async function listMyFeedbacks({ profileId }, ctx) {
    const customerId = await getCustomerIdByProfileId(profileId, ctx);
    if (!customerId) return [];

    const r = await queryWithRlsContext(
        `
    SELECT
      Feedback_ID AS feedbackId,
      Rating AS rating,
      Content AS content,
      Status AS status,
      Created_At AS createdAt
    FROM ebs.Feedback
    WHERE Customer_ID = @cid
    ORDER BY Feedback_ID DESC;
    `,
        [{ name: "cid", type: sql.Int, value: customerId }],
        ctx
    );

    return r.recordset;
}

async function listAllFeedbacks(ctx) {
    const r = await queryWithRlsContext(
        `
    SELECT
      f.Feedback_ID AS feedbackId,
      f.Rating AS rating,
      f.Content AS content,
      f.Status AS status,
      f.Created_At AS createdAt,
      c.Customer_ID AS customerId,
      p.Profile_ID AS customerProfileId,
      p.Profile_Name AS customerName,
      p.Profile_Email AS customerEmail
    FROM ebs.Feedback f
    LEFT JOIN ebs.Customer c ON c.Customer_ID = f.Customer_ID
    LEFT JOIN ebs.Profile p ON p.Profile_ID = c.Profile_ID
    ORDER BY f.Feedback_ID DESC;
    `,
        [],
        ctx
    );

    return r.recordset;
}

async function getFeedbackWithReplies({ feedbackId }, ctx) {
    const fb = await queryWithRlsContext(
        `
    SELECT
      f.Feedback_ID AS feedbackId,
      f.Customer_ID AS customerId,
      f.Rating AS rating,
      f.Content AS content,
      f.Status AS status,
      f.Created_At AS createdAt
    FROM ebs.Feedback f
    WHERE f.Feedback_ID = @fid;
    `,
        [{ name: "fid", type: sql.Int, value: feedbackId }],
        ctx
    );

    const feedback = fb.recordset[0];
    if (!feedback) return null;

    const rp = await queryWithRlsContext(
        `
    SELECT
      r.Reply_ID AS replyId,
      r.Feedback_ID AS feedbackId,
      r.Profile_ID AS profileId,
      p.Profile_Name AS replierName,
      p.Profile_Type AS replierRole,
      r.Content AS content,
      r.Created_At AS createdAt
    FROM ebs.FeedbackReply r
    LEFT JOIN ebs.Profile p ON p.Profile_ID = r.Profile_ID
    WHERE r.Feedback_ID = @fid
    ORDER BY r.Reply_ID ASC;
    `,
        [{ name: "fid", type: sql.Int, value: feedbackId }],
        ctx
    );

    return { ...feedback, replies: rp.recordset };
}

async function assertCustomerOwnsFeedback({ profileId, feedbackId }, ctx) {
    const customerId = await getCustomerIdByProfileId(profileId, ctx);
    if (!customerId) return false;

    const r = await queryWithRlsContext(
        `SELECT 1 AS ok FROM ebs.Feedback WHERE Feedback_ID = @fid AND Customer_ID = @cid;`,
        [
            { name: "fid", type: sql.Int, value: feedbackId },
            { name: "cid", type: sql.Int, value: customerId },
        ],
        ctx
    );

    return !!r.recordset[0];
}

async function updateFeedbackStatus({ feedbackId, status, actorProfileId = null }, ctx) {
    const r = await queryWithRlsContext(
        `
    UPDATE ebs.Feedback
    SET Status = @status
    WHERE Feedback_ID = @fid;

    SELECT Feedback_ID AS feedbackId, Status AS status
    FROM ebs.Feedback
    WHERE Feedback_ID = @fid;
    `,
        [
            { name: "fid", type: sql.Int, value: feedbackId },
            { name: "status", type: sql.NVarChar(20), value: status },
        ],
        ctx
    );

    const updated = r.recordset[0] || null;

    if (updated) {
        await auditSafe({
            profileId: actorProfileId,
            targetRecordId: String(feedbackId),
            actionType: "UPDATE",
            targetTable: "ebs.Feedback",
            actionDetail: { feedbackId, status }
        });
    }

    return updated;
}

async function addReply({ feedbackId, profileId, content }, ctx) {
    const r = await queryWithRlsContext(
        `
    INSERT INTO ebs.FeedbackReply (Feedback_ID, Profile_ID, Content)
    VALUES (@fid, @pid, @content);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS replyId;
    `,
        [
            { name: "fid", type: sql.Int, value: feedbackId },
            { name: "pid", type: sql.Int, value: profileId },
            { name: "content", type: sql.NVarChar(sql.MAX), value: content },
        ],
        ctx
    );

    const replyId = r.recordset?.[0]?.replyId;
    if (replyId == null) {
        const e = new Error("Insert reply failed: no replyId returned");
        e.statusCode = 500;
        throw e;
    }

    const rr = await queryWithRlsContext(
        `
    SELECT
      r.Reply_ID AS replyId,
      r.Feedback_ID AS feedbackId,
      r.Profile_ID AS profileId,
      p.Profile_Name AS replierName,
      p.Profile_Type AS replierRole,
      r.Content AS content,
      r.Created_At AS createdAt
    FROM ebs.FeedbackReply r
    LEFT JOIN ebs.Profile p ON p.Profile_ID = r.Profile_ID
    WHERE r.Reply_ID = @rid;
    `,
        [{ name: "rid", type: sql.Int, value: replyId }],
        ctx
    );

    const row = rr.recordset[0] || { replyId, feedbackId, profileId, content };

    await auditSafe({
        profileId,
        targetRecordId: String(replyId),
        actionType: "INSERT",
        targetTable: "ebs.FeedbackReply",
        actionDetail: { feedbackId, replyId }
    });

    return row;
}

module.exports = {
    createFeedback,
    listMyFeedbacks,
    listAllFeedbacks,
    getFeedbackWithReplies,
    assertCustomerOwnsFeedback,
    updateFeedbackStatus,
    addReply,
};
