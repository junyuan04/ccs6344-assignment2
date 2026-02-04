const { sql, getPool, queryWithRlsContext } = require("../config/db");

const VALID_STATUS = ["UNPAID", "PAID", "OVERDUE", "CANCELLED"];
const auditService = require("./auditService");

// Audit log helper
async function auditSafe(payload) {
    try { await auditService.logAction(payload); }
    catch (err) { console.warn("Audit log failed:", err.message); }
}

async function getCustomerIdByProfileId(profileId, ctx) {
    const r = await queryWithRlsContext(
        `
    SELECT Customer_ID AS customerId
    FROM ebs.Customer
    WHERE Profile_ID = @pid
    `,
        [{ name: "pid", type: sql.Int, value: profileId }],
        ctx
    );
    return r.recordset[0]?.customerId || null;
}

async function getTariffRate(tariffId) {
    const pool = await getPool();
    const r = await pool.request()
        .input("tid", sql.Int, tariffId)
        .query(`
      SELECT Rate_Per_kWh AS ratePerKwh, Is_Active AS isActive
      FROM ebs.Tariff
      WHERE Tariff_ID = @tid
    `);
    return r.recordset[0] || null;
}

// Helper to round to 2 decimal places
function round2(n) {
    return Math.round(Number(n) * 100) / 100;
}

async function getAll(ctx) {
    const r = await queryWithRlsContext(`
    SELECT
      b.Bill_ID AS billId,
      b.Customer_ID AS customerId,
      c.Profile_ID AS customerProfileId,
      p.Profile_Name AS customerName,
      p.Profile_Email AS customerEmail,
      b.Tariff_ID AS tariffId,
      b.Bill_Period_Start AS periodStart,
      b.Bill_Period_End AS periodEnd,
      b.Due_Date AS dueDate,
      b.UsageKWh AS usageKWh,
      b.Amount AS amount,
      b.Bill_Status AS status
    FROM ebs.ElectricBill b
    LEFT JOIN ebs.Customer c ON c.Customer_ID = b.Customer_ID
    LEFT JOIN ebs.Profile p ON p.Profile_ID = c.Profile_ID
    ORDER BY b.Bill_ID DESC
  `, [], ctx);

    return r.recordset;
}

async function getMyBills(profileId, ctx) {
    const customerId = await getCustomerIdByProfileId(profileId, ctx);
    if (!customerId) return [];

    const r = await queryWithRlsContext(`
    SELECT
      b.Bill_ID AS billId,
      b.Customer_ID AS customerId,
      b.Tariff_ID AS tariffId,
      b.Bill_Period_Start AS periodStart,
      b.Bill_Period_End AS periodEnd,
      b.Due_Date AS dueDate,
      b.UsageKWh AS usageKWh,
      b.Amount AS amount,
      b.Bill_Status AS status
    FROM ebs.ElectricBill b
    WHERE b.Customer_ID = @cid
    ORDER BY b.Bill_ID DESC
  `, [{ name: "cid", type: sql.Int, value: customerId }], ctx);

    return r.recordset;
}

async function getById(billId, ctx) {
    const r = await queryWithRlsContext(`
    SELECT
      b.Bill_ID AS billId,
      b.Customer_ID AS customerId,
      c.Profile_ID AS customerProfileId,
      p.Profile_Name AS customerName,
      p.Profile_Email AS customerEmail,
      b.Tariff_ID AS tariffId,
      b.Bill_Period_Start AS periodStart,
      b.Bill_Period_End AS periodEnd,
      b.Due_Date AS dueDate,
      b.UsageKWh AS usageKWh,
      b.Amount AS amount,
      b.Bill_Status AS status
    FROM ebs.ElectricBill b
    LEFT JOIN ebs.Customer c ON c.Customer_ID = b.Customer_ID
    LEFT JOIN ebs.Profile p ON p.Profile_ID = c.Profile_ID
    WHERE b.Bill_ID = @id
  `, [{ name: "id", type: sql.Int, value: billId }], ctx);

    return r.recordset[0] || null;
}

// Staff/Admin create bill
async function create(payload, createdByProfileId = null, ctx) {
    const {
        customerId,
        customerProfileId,
        tariffId,
        billPeriodStart,
        billPeriodEnd,
        dueDate,
        usageKWh
    } = payload;

    if (!tariffId || !billPeriodStart || !billPeriodEnd || !dueDate || usageKWh == null) {
        const e = new Error("tariffId, billPeriodStart, billPeriodEnd, dueDate, usageKWh are required");
        e.statusCode = 400;
        throw e;
    }

    let cid = customerId || null;
    if (!cid && customerProfileId) {
        cid = await getCustomerIdByProfileId(Number(customerProfileId), ctx);
    }
    if (!cid) {
        const e = new Error("Customer not found (customerId/customerProfileId invalid)");
        e.statusCode = 404;
        throw e;
    }

    const t = await getTariffRate(Number(tariffId));
    // Validate tariff
    if (!t) {
        const e = new Error("Tariff not found");
        e.statusCode = 404;
        throw e;
    }
    // Validate tariff is active
    if (!t.isActive) {
        const e = new Error("Tariff is not active");
        e.statusCode = 400;
        throw e;
    }

    // Calculate amount
    const amount = round2(Number(usageKWh) * Number(t.ratePerKwh));

    const r = await queryWithRlsContext(
        `
    INSERT INTO ebs.ElectricBill
      (Customer_ID, Tariff_ID, Bill_Period_Start, Bill_Period_End, Due_Date, UsageKWh, Amount, Bill_Status)
    VALUES
      (@cid, @tid, @ps, @pe, @due, @usage, @amt, N'UNPAID');

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Bill_ID;
    `,
        [
            { name: "cid", type: sql.Int, value: cid },
            { name: "tid", type: sql.Int, value: Number(tariffId) },
            { name: "ps", type: sql.Date, value: new Date(billPeriodStart) },
            { name: "pe", type: sql.Date, value: new Date(billPeriodEnd) },
            { name: "due", type: sql.Date, value: new Date(dueDate) },
            { name: "usage", type: sql.Decimal(10, 2), value: Number(usageKWh) },
            { name: "amt", type: sql.Decimal(12, 2), value: amount },
        ],
        ctx
    );

    const billId = r.recordset?.[0]?.Bill_ID;
    if (billId == null) {
        const e = new Error("Insert bill failed: no Bill_ID returned");
        e.statusCode = 500;
        throw e;
    }
    const createdBill = await getById(billId, ctx);

    await auditSafe({
        profileId: createdByProfileId,
        targetRecordId: String(billId ?? "UNKNOWN_BILL"),
        actionType: "INSERT",
        targetTable: "ebs.ElectricBill",
        actionDetail: { billId }
    });

    return createdBill;
}

// Staff/Admin update bill (recalc amount if tariff/usage changed)
async function update(billId, payload, updaterProfileId = null, ctx) {
    const current = await getById(billId, ctx);
    if (!current) {
        const e = new Error("Bill not found");
        e.statusCode = 404;
        throw e;
    }

    const {
        tariffId,
        billPeriodStart,
        billPeriodEnd,
        dueDate,
        usageKWh,
        status
    } = payload;

    if (status && !VALID_STATUS.includes(status)) {
        const e = new Error(`Invalid status. Must be: ${VALID_STATUS.join(", ")}`);
        e.statusCode = 400;
        throw e;
    }

    let newTariffId = tariffId != null ? Number(tariffId) : current.tariffId;
    let newUsage = usageKWh != null ? Number(usageKWh) : current.usageKWh;

    // Recalculate amount if tariffId or usageKWh changed
    let newAmount = current.amount;
    if (tariffId != null || usageKWh != null) {
        const t = await getTariffRate(newTariffId);
        if (!t) {
            const e = new Error("Tariff not found");
            e.statusCode = 404;
            throw e;
        }
        newAmount = round2(newUsage * Number(t.ratePerKwh));
    }

    await queryWithRlsContext(
        `
    UPDATE ebs.ElectricBill
    SET Tariff_ID = COALESCE(@tid, Tariff_ID),
        Bill_Period_Start = COALESCE(@ps, Bill_Period_Start),
        Bill_Period_End = COALESCE(@pe, Bill_Period_End),
        Due_Date = COALESCE(@due, Due_Date),
        UsageKWh = COALESCE(@usage, UsageKWh),
        Amount = COALESCE(@amt, Amount),
        Bill_Status = COALESCE(@st, Bill_Status)
    WHERE Bill_ID = @id
    `,
        [
            { name: "id", type: sql.Int, value: billId },
            { name: "tid", type: sql.Int, value: tariffId != null ? newTariffId : null },
            { name: "ps", type: sql.Date, value: billPeriodStart ? new Date(billPeriodStart) : null },
            { name: "pe", type: sql.Date, value: billPeriodEnd ? new Date(billPeriodEnd) : null },
            { name: "due", type: sql.Date, value: dueDate ? new Date(dueDate) : null },
            { name: "usage", type: sql.Decimal(10, 2), value: usageKWh != null ? newUsage : null },
            { name: "amt", type: sql.Decimal(12, 2), value: (tariffId != null || usageKWh != null) ? newAmount : null },
            { name: "st", type: sql.NVarChar(20), value: status ?? null },
        ],
        ctx
    );

    const updatedBill = await getById(billId, ctx);

    const changedFields = Object.keys(payload || {}).filter(k => payload[k] !== undefined);

    await auditSafe({
        profileId: updaterProfileId,
        targetRecordId: String(billId),
        actionType: "UPDATE",
        targetTable: "ebs.ElectricBill",
        actionDetail: { billId, fields: changedFields }
    });

    return updatedBill;
}

module.exports = {
    getAll,
    getMyBills,
    getById,
    create,
    update
};
