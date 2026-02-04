const staffsService = require("../services/staffsService");

async function getAll(req, res, next) {
    try {
        const staffs = await staffsService.getAll();
        res.json({ success: true, staffs });
    } catch (e) { next(e); }
}

async function getByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        const staff = await staffsService.getByProfileId(profileId);
        if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });
        res.json({ success: true, staff });
    } catch (e) { next(e); }
}

async function create(req, res, next) {
    try {
        const created = await staffsService.create(req.body, req.user?.profileId || null);
        res.status(201).json({ success: true, message: "Staff created", staff: created });
    } catch (e) { next(e); }
}

async function updateByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        const updated = await staffsService.updateByProfileId(
            profileId,
            req.body,
            req.user?.profileId || null,
            req.user?.role || "Staff"
        );
        res.json({ success: true, message: "Staff updated", staff: updated });
    } catch (e) { next(e); }
}

async function removeByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        await staffsService.removeByProfileId(profileId, req.user?.profileId || null);
        res.json({ success: true, message: "Staff deleted" });
    } catch (e) { next(e); }
}

module.exports = {
    getAll,
    getByProfileId,
    create,
    updateByProfileId,
    removeByProfileId,
};
