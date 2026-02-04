const billsService = require("../services/billsService");

function makeCtx(req) {
  return {
    role: req.user?.role ?? null,
    profileId: req.user?.userId ?? null,
    customerId: req.user?.customerId ?? null,
  };
}

async function getAll(req, res, next) {
  try {
    const bills = await billsService.getAll(makeCtx(req));
    res.json({ success: true, bills });
  } catch (e) { next(e); }
}

async function getMy(req, res, next) {
  try {
    const bills = await billsService.getMyBills(req.user.userId, makeCtx(req));
    res.json({ success: true, bills });
  } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try {
    const billId = parseInt(req.params.billId, 10);
    const bill = await billsService.getById(billId, makeCtx(req));
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });

    // Customers can only access their own bills
    if (req.user.role === "Customer" && bill.customerProfileId !== req.user.userId) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }

    res.json({ success: true, bill });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const bill = await billsService.create(req.body, req.user.userId || null, makeCtx(req));
    res.status(201).json({ success: true, message: "Bill created", bill });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const billId = parseInt(req.params.billId, 10);
    const bill = await billsService.update(billId, req.body, req.user.userId || null, makeCtx(req));
    res.json({ success: true, message: "Bill updated", bill });
  } catch (e) { next(e); }
}

module.exports = { getAll, getMy, getById, create, update };
