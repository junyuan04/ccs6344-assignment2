const profilesService = require("../services/profilesService");

async function getAll(req, res, next) {
    try {
        const profiles = await profilesService.getAll();
        res.json({ success: true, profiles });
    } catch (err) {
        next(err);
    }
}

async function getById(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const profile = await profilesService.getById(id);
        if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });
        res.json({ success: true, profile });
    } catch (err) {
        next(err);
    }
}

async function create(req, res, next) {
    try {
        const created = await profilesService.create(req.body, req.user?.userId || null);
        res.status(201).json({ success: true, message: "Profile created", profile: created });
    } catch (err) {
        next(err);
    }
}

async function update(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const updated = await profilesService.update(id, req.body, req.user?.userId || null);
        res.json({ success: true, message: "Profile updated", profile: updated });
    } catch (err) {
        next(err);
    }
}

async function remove(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        await profilesService.remove(id);
        res.json({ success: true, message: "Profile deleted" });
    } catch (err) {
        next(err);
    }
}

module.exports = { getAll, getById, create, update, remove };
