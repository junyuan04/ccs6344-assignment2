const tariffsService = require("../services/tariffsService");

async function getAll(req, res, next) {
    try {
        // Customers should only see active tariffs, staff and admins see all
        const includeInactive = req.user?.role !== "Customer";
        const tariffs = await tariffsService.getAll(includeInactive);
        res.json({ success: true, tariffs });
    } catch (e) { next(e); }
}

async function getById(req, res, next) {
    try {
        const tariffId = parseInt(req.params.tariffId, 10);
        const tariff = await tariffsService.getById(tariffId);
        if (!tariff) return res.status(404).json({ success: false, message: "Tariff not found" });
        res.json({ success: true, tariff });
    } catch (e) { next(e); }
}

async function create(req, res, next) {
    try {
        const created = await tariffsService.create(req.body, req.user?.profileId || null);
        res.status(201).json({ success: true, message: "Tariff created", tariff: created });
    } catch (e) { next(e); }
}

async function update(req, res, next) {
    try {
        const tariffId = parseInt(req.params.tariffId, 10);
        const updated = await tariffsService.update(tariffId, req.body, req.user?.profileId || null);
        res.json({ success: true, message: "Tariff updated", tariff: updated });
    } catch (e) { next(e); }
}

module.exports = { getAll, getById, create, update };
