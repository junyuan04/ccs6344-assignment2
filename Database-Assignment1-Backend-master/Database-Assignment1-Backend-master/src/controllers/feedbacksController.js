const feedbacksService = require("../services/feedbacksService");

// Helper to validate status
function isValidStatus(s) {
    return ["Open", "InProgress", "Resolved", "Closed"].includes(s);
}

// Build RLS context from JWT payload
function makeCtx(req) {
    return {
        role: req.user?.role ?? null,
        profileId: req.user?.userId ?? null,
        customerId: req.user?.customerId ?? null,
    };
}

// Create new feedback (Customer)
exports.create = async (req, res) => {
    try {
        const { rating, content } = req.body;

        if (!content || String(content).trim() === "") {
            return res.status(400).json({ success: false, message: "content is required" });
        }
        if (rating !== undefined && rating !== null) {
            const n = Number(rating);
            if (!Number.isInteger(n) || n < 1 || n > 5) {
                return res.status(400).json({ success: false, message: "rating must be 1-5" });
            }
        }

        const fb = await feedbacksService.createFeedback(
            {
                profileId: req.user.userId,
                rating: rating ?? null,
                content,
            },
            makeCtx(req)
        );

        res.status(201).json({ success: true, message: "Feedback created", feedback: fb });
    } catch (err) {
        res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

// List my feedbacks (Customer)
exports.myList = async (req, res) => {
    try {
        const items = await feedbacksService.listMyFeedbacks(
            { profileId: req.user.userId },
            makeCtx(req)
        );
        res.json({ success: true, feedbacks: items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// List all feedbacks (Staff/Admin only)
exports.listAll = async (req, res) => {
    try {
        const items = await feedbacksService.listAllFeedbacks(makeCtx(req));
        res.json({ success: true, feedbacks: items });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get one feedback by id
exports.getOne = async (req, res) => {
    try {
        const feedbackId = Number(req.params.id);
        if (!Number.isInteger(feedbackId)) {
            return res.status(400).json({ success: false, message: "Invalid feedback id" });
        }

        // Customers can only access their own feedbacks
        if (req.user.role === "Customer") {
            const ok = await feedbacksService.assertCustomerOwnsFeedback(
                { profileId: req.user.userId, feedbackId },
                makeCtx(req)
            );
            if (!ok) {
                return res.status(403).json({ message: "Access denied. Insufficient permissions." });
            }
        }

        const data = await feedbacksService.getFeedbackWithReplies({ feedbackId }, makeCtx(req));
        if (!data) return res.status(404).json({ success: false, message: "Feedback not found" });

        res.json({ success: true, feedback: data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update feedback status (Staff/Admin only)
exports.updateStatus = async (req, res) => {
    try {
        const feedbackId = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(feedbackId)) {
            return res.status(400).json({ success: false, message: "Invalid feedback id" });
        }
        if (!isValidStatus(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const updated = await feedbacksService.updateFeedbackStatus(
            { feedbackId, status, actorProfileId: req.user.userId },
            makeCtx(req)
        );
        if (!updated) return res.status(404).json({ success: false, message: "Feedback not found" });

        res.json({ success: true, message: "Status updated", feedback: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add reply to feedback (Staff/Admin only)
exports.reply = async (req, res) => {
    try {
        const feedbackId = Number(req.params.id);
        const { content } = req.body;

        if (!Number.isInteger(feedbackId)) {
            return res.status(400).json({ success: false, message: "Invalid feedback id" });
        }
        if (!content || String(content).trim() === "") {
            return res.status(400).json({ success: false, message: "content is required" });
        }

        // Check feedback exists (with ctx)
        const exists = await feedbacksService.getFeedbackWithReplies({ feedbackId }, makeCtx(req));
        if (!exists) return res.status(404).json({ success: false, message: "Feedback not found" });

        const reply = await feedbacksService.addReply(
            {
                feedbackId,
                profileId: req.user.userId, // Staff/Admin Profile_ID
                content,
            },
            makeCtx(req)
        );

        res.status(201).json({ success: true, message: "Reply added", reply });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
