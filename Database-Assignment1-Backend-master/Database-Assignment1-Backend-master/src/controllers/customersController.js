const customersService = require("../services/customersService");

async function getAll(req, res, next) {
    try {
        const customers = await customersService.getAll({
            role: req.user.role,
            profileId: req.user.userId,
            userId: req.user.userId,
            customerId: req.user.customerId
        });
        res.json({ success: true, customers });
    } catch (e) { next(e); }
}

async function getByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        const customer = await customersService.getByProfileId(profileId);
        if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
        res.json({ success: true, customer });
    } catch (e) { next(e); }
}

async function create(req, res, next) {
    try {
        const created = await customersService.create(req.body, req.user?.userId || null, req.user);
        if (!created) {
            return res.status(500).json({ success: false, message: "Customer creation failed" });
        }
        return res.status(201).json({ success: true, message: "Customer created", customer: created });
    } catch (e) { next(e); }
}

async function updateByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        const updated = await customersService.updateByProfileId(
            profileId,
            req.body,
            req.user?.profileId || null,
            req.user?.role || "Customer"
        );
        res.json({ success: true, message: "Customer updated", customer: updated });
    } catch (e) { next(e); }
}

async function removeByProfileId(req, res, next) {
    try {
        const profileId = parseInt(req.params.profileId, 10);
        await customersService.removeByProfileId(profileId, req.user?.profileId || null);
        res.json({ success: true, message: "Customer deleted" });
    } catch (e) { next(e); }
}

module.exports = {
    getAll,
    getByProfileId,
    create,
    updateByProfileId,
    removeByProfileId,
};
