/**
 * Student Transport Management Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 * Matches Reference Screens: Student Transport Fee
 */

const mockDb = require('../config/mockDb');
const { query } = require('../config/db');
const { success, error } = require('../utils/response');

/**
 * Get Students Transport List with Filters
 * GET /api/transport/students
 */
async function getStudentsTransport(req, res) {
  try {
    const {
      student_name = '',
      session = '',
      course = '',
      department = '',
      academic_year = '',
      semester = '',
      section = '',
      pickup_point = '',
      unpaid_only = 'false'
    } = req.query;

    // Filter from mockDb or DB
    let records = mockDb.studentTransports.map(t => {
      const student = mockDb.students.find(s => s.id === t.student_id);
      const branch = student ? mockDb.branches.find(b => b.id === student.branch_id) : null;
      const pp = mockDb.pickupPoints.find(p => p.id === t.pickup_point_id);

      return {
        id: t.id,
        student_id: t.student_id,
        student_name: t.student_name || (student ? student.full_name : 'Unknown Student'),
        course: t.course || 'B.Tech',
        department: branch ? branch.name : 'Engineering',
        department_code: branch ? branch.code : 'ENG',
        department_id: student ? student.branch_id : t.department_id,
        section: t.section || (student ? student.section : 'A'),
        father_name: t.father_name || (student ? student.father_name : 'N/A'),
        pickup_point: pp ? pp.location_name : (t.pickup_point || 'Not Assigned'),
        pickup_point_id: t.pickup_point_id,
        route_name: pp ? pp.route_name : (t.route_name || 'Route 1'),
        session: t.session || '2026-27',
        academic_year: t.academic_year || '1st Year',
        semester: t.semester || '1st Semester',
        fee_period: t.fee_period || 'Annual',
        total_transport_fees: parseFloat(t.total_transport_fees || 0),
        fees_paid: parseFloat(t.fees_paid || 0),
        balance: parseFloat(t.balance || 0),
        status: t.balance <= 0 ? 'PAID' : (t.fees_paid > 0 ? 'PARTIAL' : 'UNPAID')
      };
    });

    // Apply Filters
    if (student_name && student_name.trim()) {
      const term = student_name.trim().toLowerCase();
      records = records.filter(r => r.student_name.toLowerCase().includes(term));
    }

    if (session && session.trim()) {
      records = records.filter(r => r.session === session.trim());
    }

    if (course && course.trim()) {
      records = records.filter(r => r.course.toLowerCase().includes(course.trim().toLowerCase()));
    }

    if (department && department.trim()) {
      records = records.filter(r => 
        String(r.department_id) === department.trim() || 
        r.department_code.toLowerCase() === department.trim().toLowerCase() ||
        r.department.toLowerCase().includes(department.trim().toLowerCase())
      );
    }

    if (academic_year && academic_year.trim()) {
      records = records.filter(r => r.academic_year === academic_year.trim());
    }

    if (semester && semester.trim()) {
      records = records.filter(r => r.semester === semester.trim());
    }

    if (section && section.trim()) {
      records = records.filter(r => r.section.toUpperCase() === section.trim().toUpperCase());
    }

    if (pickup_point && pickup_point.trim()) {
      records = records.filter(r => 
        String(r.pickup_point_id) === pickup_point.trim() || 
        r.pickup_point.toLowerCase().includes(pickup_point.trim().toLowerCase())
      );
    }

    if (unpaid_only === 'true' || unpaid_only === true) {
      records = records.filter(r => r.balance > 0);
    }

    // Add Sr.No
    const numberedRecords = records.map((r, index) => ({
      sr_no: index + 1,
      ...r
    }));

    return success(res, numberedRecords, 'Student transport records retrieved.');
  } catch (err) {
    console.error('getStudentsTransport error:', err);
    return error(res, 'Failed to fetch student transport records.', 500);
  }
}

/**
 * Get Bus Stops / Pickup Points Master
 * GET /api/transport/pickup-points
 */
async function getPickupPoints(req, res) {
  try {
    return success(res, mockDb.pickupPoints, 'Pickup points list retrieved.');
  } catch (err) {
    return error(res, 'Failed to fetch pickup points.', 500);
  }
}

/**
 * Add or Update Pickup Point
 * POST /api/transport/pickup-points
 */
async function addPickupPoint(req, res) {
  try {
    const { route_name, location_name, annual_fee, semester_fee } = req.body;
    if (!location_name || !annual_fee) {
      return error(res, 'Location name and annual fee are required.', 400);
    }

    const newId = mockDb.pickupPoints.length + 1;
    const newPoint = {
      id: newId,
      route_name: route_name || 'Route 1 - General',
      location_name: location_name.trim(),
      annual_fee: parseFloat(annual_fee),
      semester_fee: semester_fee ? parseFloat(semester_fee) : parseFloat(annual_fee) / 2
    };

    mockDb.pickupPoints.push(newPoint);
    return success(res, newPoint, 'Pickup point created successfully.');
  } catch (err) {
    return error(res, 'Failed to create pickup point.', 500);
  }
}

/**
 * Assign or Update Student Transport Route
 * POST /api/transport/assign
 */
async function assignStudentTransport(req, res) {
  try {
    const {
      student_id,
      pickup_point_id,
      session = '2026-27',
      course = 'B.Tech',
      section = 'A',
      fee_period = 'Annual',
      custom_fee
    } = req.body;

    if (!student_id || !pickup_point_id) {
      return error(res, 'Student ID and Pickup Point are required.', 400);
    }

    const student = mockDb.students.find(s => s.id === parseInt(student_id, 10));
    if (!student) {
      return error(res, 'Student not found.', 404);
    }

    const pp = mockDb.pickupPoints.find(p => p.id === parseInt(pickup_point_id, 10));
    if (!pp) {
      return error(res, 'Pickup point not found.', 404);
    }

    const totalFee = custom_fee ? parseFloat(custom_fee) : (fee_period === 'Semester' ? pp.semester_fee : pp.annual_fee);

    // Check if already assigned
    let existing = mockDb.studentTransports.find(t => t.student_id === student.id && t.session === session);
    if (existing) {
      existing.pickup_point_id = pp.id;
      existing.pickup_point = pp.location_name;
      existing.route_name = pp.route_name;
      existing.fee_period = fee_period;
      existing.total_transport_fees = totalFee;
      existing.balance = totalFee - existing.fees_paid;
      existing.status = existing.balance <= 0 ? 'PAID' : (existing.fees_paid > 0 ? 'PARTIAL' : 'UNPAID');
      return success(res, existing, 'Student transport route updated successfully.');
    }

    const newRecord = {
      id: mockDb.studentTransports.length + 1,
      student_id: student.id,
      student_name: student.full_name,
      pickup_point_id: pp.id,
      pickup_point: pp.location_name,
      route_name: pp.route_name,
      session,
      course,
      department_id: student.branch_id,
      academic_year: '1st Year',
      semester: '1st Semester',
      section: section || student.section || 'A',
      father_name: student.father_name || 'N/A',
      fee_period,
      total_transport_fees: totalFee,
      fees_paid: 0.00,
      balance: totalFee,
      status: 'UNPAID',
      created_at: new Date().toISOString()
    };

    mockDb.studentTransports.push(newRecord);
    student.transport_opted = 1;

    return success(res, newRecord, 'Student transport route assigned successfully.');
  } catch (err) {
    console.error('assignStudentTransport error:', err);
    return error(res, 'Failed to assign student transport route.', 500);
  }
}

/**
 * Collect Transport Fee Digitally
 * POST /api/transport/collect-fee
 */
async function collectTransportFee(req, res) {
  try {
    const {
      transport_id,
      amount,
      payment_method = 'CASH',
      transaction_id = '',
      remarks = 'College Bus Transport Fee Installment'
    } = req.body;

    const tId = parseInt(transport_id, 10);
    const payAmount = parseFloat(amount);

    if (!tId || !payAmount || payAmount <= 0) {
      return error(res, 'Valid transport record and amount are required.', 400);
    }

    const record = mockDb.studentTransports.find(t => t.id === tId);
    if (!record) {
      return error(res, 'Transport record not found.', 404);
    }

    if (payAmount > record.balance) {
      return error(res, `Amount cannot exceed outstanding balance of ₹${record.balance.toLocaleString('en-IN')}.`, 400);
    }

    // Update transport record
    record.fees_paid += payAmount;
    record.balance = record.total_transport_fees - record.fees_paid;
    record.status = record.balance <= 0 ? 'PAID' : 'PARTIAL';

    // Create payment entry
    const payId = mockDb.payments.length + 1;
    const paymentNo = `PAY-TR-${String(payId).padStart(4, '0')}`;
    const txnId = transaction_id || `TR-COUNTER-${Date.now().toString().slice(-6)}`;

    const paymentObj = {
      id: payId,
      payment_no: paymentNo,
      invoice_id: 1,
      student_id: record.student_id,
      amount: payAmount,
      payment_method,
      transaction_id: txnId,
      status: 'SUCCESS',
      verified_by: req.user ? req.user.id : 3,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    mockDb.payments.push(paymentObj);

    // Create receipt
    const recId = mockDb.receipts.length + 1;
    const receiptNo = `BEC-TR-REC-2026-${String(recId).padStart(4, '0')}`;
    const receiptObj = {
      id: recId,
      receipt_no: receiptNo,
      payment_id: payId,
      student_id: record.student_id,
      invoice_id: 1,
      amount_paid: payAmount,
      payment_method,
      transaction_id: txnId,
      issued_date: new Date().toISOString(),
      receipt_data_json: {
        particulars: `College Bus Transport Fee (${record.pickup_point})`,
        student_name: record.student_name,
        course: record.course,
        pickup_point: record.pickup_point,
        route_name: record.route_name,
        remaining_balance: record.balance,
        remarks
      }
    };
    mockDb.receipts.push(receiptObj);

    return success(res, {
      transport: record,
      receipt: receiptObj,
      payment: paymentObj
    }, 'Transport fee payment recorded successfully.');
  } catch (err) {
    console.error('collectTransportFee error:', err);
    return error(res, 'Failed to collect transport fee.', 500);
  }
}

/**
 * Export Transport Data as CSV
 * GET /api/transport/export
 */
async function exportTransportCSV(req, res) {
  try {
    const list = mockDb.studentTransports.map((t, idx) => {
      const student = mockDb.students.find(s => s.id === t.student_id);
      return {
        'Sr.No': idx + 1,
        'Student Name': t.student_name || (student ? student.full_name : ''),
        'Course': t.course || 'B.Tech',
        'Section': t.section || 'A',
        'Father Name': t.father_name || '',
        'Pick Up Point': t.pickup_point || '',
        'Route': t.route_name || '',
        'Total Transport Fees (INR)': t.total_transport_fees,
        'Fees Paid (INR)': t.fees_paid,
        'Balance (INR)': t.balance,
        'Status': t.status
      };
    });

    if (list.length === 0) {
      return res.status(200).send('Sr.No,Student Name,Course,Section,Father Name,Pick Up Point,Total Transport Fees,Fees Paid,Balance\n');
    }

    const headers = Object.keys(list[0]).join(',');
    const rows = list.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="BEC_Student_Transport_Fee_2026.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    return error(res, 'Failed to export transport data.', 500);
  }
}

module.exports = {
  getStudentsTransport,
  getPickupPoints,
  addPickupPoint,
  assignStudentTransport,
  collectTransportFee,
  exportTransportCSV
};
