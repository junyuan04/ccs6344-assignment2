const auditService = require("../services/auditService");

async function listAuditLogs(req, res, next) {
    try {
        const { table, action, profileId, from, to, keyword, page, limit } = req.query;

        const result = await auditService.listAuditLogs({
            table,
            action,
            profileId,
            from,
            to,
            keyword,
            page,
            limit,
        });

        return res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function getAuditLog(req, res, next) {
    try {
        const { id } = req.params;
        const log = await auditService.getAuditLogById(id);

        if (!log) {
            return res.status(404).json({ success: false, message: "Audit log not found" });
        }
        return res.json({ success: true, log });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listAuditLogs,
    getAuditLog,
};
