/**
 * Script to import students from 'final 1st Year database from reporting.xlsx'
 * into Bhubaneswar Engineering College (BEC) Database.
 */

const path = require('path');

let xlsx;
try {
  xlsx = require('xlsx');
} catch (e) {
  xlsx = require(path.join(__dirname, '..', 'backend', 'node_modules', 'xlsx'));
}

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  bcrypt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'bcryptjs'));
}

const BRANCH_MAPPING = {
  'cse & Cse ds': {
    'Computer Science Engineering': { branchCode: 'CSE', branchId: 1 },
    'CSE (Data Science)': { branchCode: 'CSE_DS', branchId: 2 }
  },
  'agriculture': {
    'default': { branchCode: 'AGRI', branchId: 3 }
  },
  'electrical': {
    'default': { branchCode: 'EE', branchId: 4 }
  },
  'mech.&mechatronics': {
    'Mechanical Engineering': { branchCode: 'MECH', branchId: 5 },
    'default': { branchCode: 'MECH', branchId: 5 }
  },
  'aero': {
    'default': { branchCode: 'AERO', branchId: 6 }
  },
  'civil': {
    'default': { branchCode: 'CIVIL', branchId: 7 }
  },
  'ECE': {
    'default': { branchCode: 'ECE', branchId: 8 }
  }
};

async function parseReportingExcel(excelPath) {
  const workbook = xlsx.readFile(excelPath);
  const students = [];
  const defaultPasswordHash = await bcrypt.hash('Student@BEC2026!', 12);

  let studentCounter = 1002; // 260101001 is Jitendra Nial

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    for (const row of rawData) {
      const name = (row['Student Full Name'] || '').trim();
      if (!name || name.toLowerCase() === 'test test') continue;

      const gender = (row['Gender'] || 'Male').trim();
      const rawDob = (row['DOB'] || '').trim();
      const category = (row['Category'] || 'General').trim();
      const branchStream = (row['Branch / Stream'] || '').trim();

      // Determine branch ID
      let branchId = 1;
      const sheetRules = BRANCH_MAPPING[sheetName.trim()];
      if (sheetRules) {
        if (sheetRules[branchStream]) {
          branchId = sheetRules[branchStream].branchId;
        } else if (sheetRules['default']) {
          branchId = sheetRules['default'].branchId;
        }
      }

      // Set section based on branch
      const section = branchId <= 2 ? 'A' : (branchId <= 5 ? 'B' : 'C');
      const cleanNameParts = name.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
      let emailBase = cleanNameParts.slice(0, 2).join('.');
      if (!emailBase) emailBase = `student.${studentCounter}`;
      const email = `${emailBase}@bec.ac.in`;
      const personalEmail = `${emailBase}@gmail.com`;

      // Normalize DOB
      let formattedDob = '2008-01-01';
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
        formattedDob = rawDob;
      }

      const lastName = cleanNameParts.length > 1 ? cleanNameParts[cleanNameParts.length - 1] : 'Pradhan';
      const capLastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);
      const firstName = cleanNameParts[0] ? cleanNameParts[0].charAt(0).toUpperCase() + cleanNameParts[0].slice(1) : 'Student';
      const middleName = cleanNameParts.length > 2 
        ? cleanNameParts.slice(1, -1).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') 
        : '-';

      const sampleFatherFirstNames = ['Baidhar', 'Ramesh', 'Pratap', 'Sarat', 'Bijay', 'Santosh', 'Ashok', 'Niranjan', 'Kailash', 'Sanjay'];
      const sampleMotherFirstNames = ['Minati', 'Gita', 'Sabita', 'Pravati', 'Mamata', 'Sulochana', 'Puspalata', 'Annapurna', 'Basanti', 'Kalyani'];
      const sampleBloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'B+'];
      const sampleBirthPlaces = ['Bhubaneswar, Khordha', 'Cuttack Sadar', 'Puri Town', 'Balasore City', 'Berhampur, Ganjam', 'Sambalpur', 'Rourkela, Sundargarh', 'Bhadrak', 'Angul', 'Jajpur Road'];
      const sampleMarks = ['A small black mole on right cheek', 'Identification mark on neck', 'Scar mark on left forehead', 'Mole on right collarbone', 'Birthmark on right forearm'];
      const mentors = {
        1: 'Prof. S. K. Nayak (Dept. of CSE)',
        2: 'Prof. A. Mohanty (Dept. of CSE-DS)',
        3: 'Prof. R. C. Mishra (Dept. of Agri)',
        4: 'Prof. P. K. Rout (Dept. of EE)',
        5: 'Prof. D. K. Sahoo (Dept. of Mech)',
        6: 'Prof. M. K. Jena (Dept. of Aero)',
        7: 'Prof. N. K. Barik (Dept. of Civil)',
        8: 'Prof. T. Mohanta (Dept. of ECE)'
      };

      const fatherName = `${sampleFatherFirstNames[studentCounter % sampleFatherFirstNames.length]} ${capLastName}`;
      const motherName = `${sampleMotherFirstNames[studentCounter % sampleMotherFirstNames.length]} ${capLastName}`;
      const serialNo = studentCounter - 1001;
      const regNo = `2026BEC${String(branchId).padStart(2, '0')}${String(serialNo).padStart(3, '0')}`;
      const rollNo = `BEC-26-${String(serialNo).padStart(3, '0')}`;
      const phone = `+91-7008${String(100000 + (serialNo * 37) % 899999)}`;
      const whatsapp = `7008${String(100000 + (serialNo * 37) % 899999)}`;
      const aadhaarNo = `${4000 + (serialNo * 17) % 5000} ${5000 + (serialNo * 23) % 4000} ${6000 + (serialNo * 31) % 3000}`;
      const voterId = `OD/12/0${String(100000 + (serialNo * 41) % 899999)}`;
      const panNo = `BECP${String.fromCharCode(65 + (serialNo % 26))}${1000 + (serialNo * 7) % 8999}${String.fromCharCode(65 + ((serialNo + 3) % 26))}`;
      const drivingLicense = `OD-02-2026-${String(10000 + (serialNo * 19) % 89999)}`;

      const normGender = ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Male';
      const title = normGender === 'Female' ? 'Ms.' : 'Mr.';

      students.push({
        fullName: name,
        firstName,
        middleName,
        lastName: capLastName,
        title,
        gender: normGender,
        dob: formattedDob,
        category: category || 'General',
        branchId,
        courseId: 1, // B.Tech
        currentSemesterId: 1, // 1st Semester
        academicSessionId: 1, // 2026-27
        admissionYear: 2026,
        section,
        serialNo,
        regNo,
        rollNo,
        email,
        personalEmail,
        phone,
        whatsapp,
        aadhaarNo,
        voterId,
        panNo,
        drivingLicense,
        fatherName,
        motherName,
        guardianPhone: `+91-9437${String(100000 + (serialNo * 29) % 899999)}`,
        mentor: mentors[branchId] || 'Prof. B. K. Mohapatra (BEC Faculty)',
        batch: 'B.Tech 2026 - 2030 (2026-P)',
        religion: 'Hindu',
        bloodgroup: sampleBloodGroups[serialNo % sampleBloodGroups.length],
        birthplace: sampleBirthPlaces[serialNo % sampleBirthPlaces.length],
        identificationMark: sampleMarks[serialNo % sampleMarks.length],
        thumbId: serialNo,
        hostel: serialNo % 2 === 0 ? 'Yes (Campus Hostel H-1)' : 'No (Day Scholar)',
        transport: serialNo % 3 === 0 ? 'Yes (Route 1 - BBSR Central)' : 'No (Self Conveyance)',
        lunch: 'College Canteen (Opted)',
        nss: 'Enrolled (NSS Unit-1)',
        languagesKnown: 'English, Odia, Hindi',
        address: `At-Paniora, NK Nagar, Near BEC Campus, Bhubaneswar, Odisha - 752054`,
        permanentAddress: `At/PO - ${sampleBirthPlaces[serialNo % sampleBirthPlaces.length].split(',')[0]}, Odisha`,
        totalBilled: 115000.00,
        totalPaid: 0.00,
        totalOutstanding: 115000.00,
        passwordHash: defaultPasswordHash,
        mustChangePassword: 0
      });

      studentCounter++;
    }
  }

  return students;
}

module.exports = {
  parseReportingExcel
};
