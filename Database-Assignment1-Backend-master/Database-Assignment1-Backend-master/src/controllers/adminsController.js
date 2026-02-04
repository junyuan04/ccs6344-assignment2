const adminsService = require("../services/adminsService");

async function getAll(req, res, next) {
    try {
        const admins = await adminsService.getAll();
        res.json({ success: true, admins });
    } catch (e) { next(e); }
}

async function getByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        const admin = await adminsService.getByProfileId(profileId);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
        res.json({ success: true, admin });
    } catch (e) { next(e); }
}

async function create(req, res, next) {
    try {
        const created = await adminsService.create(req.body, req.user?.profileId || null);
        res.status(201).json({ success: true, message: "Admin created", admin: created });
    } catch (e) { next(e); }
}

async function updateByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        const updated = await adminsService.updateByProfileId(
            profileId,
            req.body,
            req.user?.profileId || null
        );
        res.json({ success: true, message: "Admin updated", admin: updated });
    } catch (e) { next(e); }
}

async function removeByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        await adminsService.removeByProfileId(profileId, req.user?.profileId || null);
        res.json({ success: true, message: "Admin deleted" });
    } catch (e) { next(e); }
}

module.exports = {
    getAll,
    getByProfileId,
    create,
    updateByProfileId,
    removeByProfileId,
};
