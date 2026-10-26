const db = require('./database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('--- Starting AICTE CMS Seed Operation ---');

  // Clear existing records in proper FK order
  await db.exec(`
    DELETE FROM alerts;
    DELETE FROM case_links;
    DELETE FROM case_actions;
    DELETE FROM cases;
    DELETE FROM institutions;
    DELETE FROM users;
  `);

  // 1. Seed Users (5 key government roles)
  const defaultPasswordHash = bcrypt.hashSync('aicte@2026', 10);

  const usersStmt = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, bureau, designation, email)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const initialUsers = [
    ['admin_mgmt', defaultPasswordHash, 'Dr. Rajendra S. Verma', 'Senior Management', 'Council Secretariat', 'Member Secretary / Adviser-I', 'ms@aicte-india.org'],
    ['rb_director', defaultPasswordHash, 'Shri Anand Kumar Gupta', 'Regulation Bureau', 'Regulation Bureau', 'Director (Regulations)', 'dir.reg@aicte-india.org'],
    ['pgrc_director', defaultPasswordHash, 'Smt. Manjula Sundaram', 'PGRC', 'PGRC', 'Director (Public Grievance)', 'dir.pgrc@aicte-india.org'],
    ['approval_officer', defaultPasswordHash, 'Er. Vikramaditya Rathore', 'Other Bureau', 'Approval Bureau', 'Assistant Director (Approvals)', 'vikram.ab@aicte-india.org'],
    ['ro_officer', defaultPasswordHash, 'Dr. K. Venkatesh Rao', 'Regional Office', 'Southern Regional Office', 'Regional Officer (SRO-Chennai)', 'ro.chennai@aicte-india.org'],
    ['rb_analyst', defaultPasswordHash, 'Pooja Deshmukh', 'Regulation Bureau', 'Regulation Bureau', 'Senior Technical Officer (RB)', 'pooja.rb@aicte-india.org'],
    ['pgrc_officer', defaultPasswordHash, 'Deepak Joshi', 'PGRC', 'PGRC', 'Section Officer (Grievances)', 'deepak.pgrc@aicte-india.org']
  ];

  for (const u of initialUsers) {
    await usersStmt.run(...u);
  }
  console.log(`[+] Seeded ${initialUsers.length} official users.`);

  // 2. Seed 63 Realistic Technical Institutions across 5 AICTE Regions
  const rawInstitutions = [
    // Northern Region (NRO / NWRO) - Delhi, UP, Punjab, Haryana, J&K
    { id: '1-10294811', name: 'Delhi Institute of Advanced Engineering & Technology', state: 'Delhi', region: 'Northern', type: 'Engineering & Technology', address: 'Plot 4, Sector 12, Dwarka, New Delhi 110078' },
    { id: '1-10492812', name: 'Noida College of Technology & Management', state: 'Uttar Pradesh', region: 'Northern', type: 'Engineering & Technology', address: 'Knowledge Park III, Greater Noida, UP 201308' },
    { id: '1-10827364', name: 'Meerut Institute of Engineering and Technology', state: 'Uttar Pradesh', region: 'Northern', type: 'Engineering & Technology', address: 'NH-58, Bypass Road, Baghpat Crossing, Meerut 250005' },
    { id: '1-11293845', name: 'Chandigarh Poly-Technic College', state: 'Punjab', region: 'Northern', type: 'Polytechnic Diploma', address: 'Sector 42-B, Chandigarh 160036' },
    { id: '1-11728394', name: 'Amritsar School of Pharmacy & Life Sciences', state: 'Punjab', region: 'Northern', type: 'Pharmacy', address: 'GT Road, Bye-Pass, Amritsar 143001' },
    { id: '1-12049382', name: 'Haryana College of Architecture and Design', state: 'Haryana', region: 'Northern', type: 'Architecture', address: 'Vill. Jagadhri, Yamuna Nagar, Haryana 135003' },
    { id: '1-12394857', name: 'Guru Gobind Singh Memorial Institute of Tech', state: 'Delhi', region: 'Northern', type: 'Engineering & Technology', address: 'Kashmere Gate, Old Delhi 110006' },
    { id: '1-12749382', name: 'Lucknow Institute of Computer Applications & Mgmt', state: 'Uttar Pradesh', region: 'Northern', type: 'Management (MCA/MBA)', address: 'Faizabad Road, Lucknow, UP 226028' },
    { id: '1-13029384', name: 'Kanpur Technical Campus (Inst of Engg)', state: 'Uttar Pradesh', region: 'Northern', type: 'Engineering & Technology', address: 'Kalyanpur, GT Road, Kanpur 208016' },
    { id: '1-13482930', name: 'Rohtak Institute of Polytechnic Sciences', state: 'Haryana', region: 'Northern', type: 'Polytechnic Diploma', address: 'Near Bus Stand, Rohtak 124001' },
    { id: '1-13829401', name: 'Aligarh College of Engineering & Research', state: 'Uttar Pradesh', region: 'Northern', type: 'Engineering & Technology', address: 'Mathura Bypass, Aligarh 202001' },
    { id: '1-14029482', name: 'Jammu Institute of Engineering and Sciences', state: 'Jammu and Kashmir', region: 'Northern', type: 'Engineering & Technology', address: 'Mirpur, Jammu 180001' },

    // Southern Region (SRO / SWRO) - Tamil Nadu, Karnataka, Kerala, Andhra, Telangana
    { id: '1-20394811', name: 'Sri Ramakrishna College of Engineering & Tech', state: 'Tamil Nadu', region: 'Southern', type: 'Engineering & Technology', address: 'Avinashi Road, Peelamedu, Coimbatore 641004' },
    { id: '1-20839201', name: 'Chennai Academy of Maritime & Tech Sciences', state: 'Tamil Nadu', region: 'Southern', type: 'Engineering & Technology', address: 'East Coast Road, Uthandi, Chennai 600119' },
    { id: '1-21394827', name: 'Bangalore Institute of Management Studies (BIMS)', state: 'Karnataka', region: 'Southern', type: 'Management (MCA/MBA)', address: '8th Mile, Mysuru Road, Bengaluru 560059' },
    { id: '1-21829402', name: 'Kochi College of Engineering and Polytechnic', state: 'Kerala', region: 'Southern', type: 'Polytechnic Diploma', address: 'Kalamassery, Ernakulam, Kochi 682039' },
    { id: '1-22384910', name: 'Hyderabad Technical & Pharmacy Institute', state: 'Telangana', region: 'Southern', type: 'Pharmacy', address: 'Gachibowli, Serilingampally, Hyderabad 500032' },
    { id: '1-22839401', name: 'Visakhapatnam Institute of Technology and Sci', state: 'Andhra Pradesh', region: 'Southern', type: 'Engineering & Technology', address: 'Madhurawada, Visakhapatnam 530048' },
    { id: '1-23294810', name: 'Madurai Institute of Engineering College', state: 'Tamil Nadu', region: 'Southern', type: 'Engineering & Technology', address: 'Pottapalayam, Sivagangai-Madurai 630611' },
    { id: '1-23849102', name: 'Mysore School of Architecture & Urban Planning', state: 'Karnataka', region: 'Southern', type: 'Architecture', address: 'Hunsur Road, Mysore 570018' },
    { id: '1-24294811', name: 'Thiruvananthapuram Institute of Polytechnic Stud', state: 'Kerala', region: 'Southern', type: 'Polytechnic Diploma', address: 'Thampanoor, Thiruvananthapuram 695001' },
    { id: '1-24839204', name: 'Guntur Engineering and Technology College', state: 'Andhra Pradesh', region: 'Southern', type: 'Engineering & Technology', address: 'Nallapadu, Guntur 522005' },
    { id: '1-25294810', name: 'Warangal Institute of Pharmaceutical Studies', state: 'Telangana', region: 'Southern', type: 'Pharmacy', address: 'Mulugu Road, Hanamkonda, Warangal 506002' },
    { id: '1-25839201', name: 'Salem Technical Institute of Higher Studies', state: 'Tamil Nadu', region: 'Southern', type: 'Engineering & Technology', address: 'NH-7, Sankari Main Road, Salem 636010' },
    { id: '1-26294812', name: 'Hubballi College of Polytechnic & Vocational Trg', state: 'Karnataka', region: 'Southern', type: 'Polytechnic Diploma', address: 'Vidyanagar, Hubballi 580031' },

    // Western Region (WRO) - Maharashtra, Gujarat, Goa
    { id: '1-30294811', name: 'Pune Apex Institute of Engineering & Technology', state: 'Maharashtra', region: 'Western', type: 'Engineering & Technology', address: 'Survey No. 44/1, Vadgaon Budruk, Pune 411041' },
    { id: '1-30839202', name: 'Mumbai Metropolitan Institute of Technology', state: 'Maharashtra', region: 'Western', type: 'Engineering & Technology', address: 'Mahakali Caves Road, Andheri East, Mumbai 400093' },
    { id: '1-31294820', name: 'Ahmedabad Institute of Technology & Mgmt', state: 'Gujarat', region: 'Western', type: 'Management (MCA/MBA)', address: 'Near Gota Cross Road, S.G. Highway, Ahmedabad 382481' },
    { id: '1-31749203', name: 'Nagpur Polytechnic College of Industrial Tech', state: 'Maharashtra', region: 'Western', type: 'Polytechnic Diploma', address: 'Hingna Road, Digdoh Hills, Nagpur 440019' },
    { id: '1-32294810', name: 'Vadodara School of Pharmacy & Health Sciences', state: 'Gujarat', region: 'Western', type: 'Pharmacy', address: 'Waghodia Road, Vadodara 391760' },
    { id: '1-32839201', name: 'Goa Coastal Academy of Architecture & Planning', state: 'Goa', region: 'Western', type: 'Architecture', address: 'Farmagudi, Ponda, Goa 403401' },
    { id: '1-33294815', name: 'Nashik Valley College of Engineering', state: 'Maharashtra', region: 'Western', type: 'Engineering & Technology', address: 'Gangapur Road, Nashik 422013' },
    { id: '1-33839204', name: 'Surat Institute of Diploma Engineering', state: 'Gujarat', region: 'Western', type: 'Polytechnic Diploma', address: 'Adajan Hazira Road, Surat 395009' },
    { id: '1-34294810', name: 'Aurangabad Marathwada Institute of Technology', state: 'Maharashtra', region: 'Western', type: 'Engineering & Technology', address: 'Beed Bypass Road, Chhatrapati Sambhajinagar 431010' },
    { id: '1-34839203', name: 'Rajkot College of Computer Science & Mgmt', state: 'Gujarat', region: 'Western', type: 'Management (MCA/MBA)', address: 'Kalawad Road, Rajkot 360005' },
    { id: '1-35294811', name: 'Kolhapur Institute of Technology & Polytechnic', state: 'Maharashtra', region: 'Western', type: 'Engineering & Technology', address: 'Gokul Shirgaon, Kolhapur 416234' },
    { id: '1-35839202', name: 'Navi Mumbai Engineering & Research Institute', state: 'Maharashtra', region: 'Western', type: 'Engineering & Technology', address: 'Sector 7, Sanpada, Navi Mumbai 400705' },

    // Eastern Region (ERO) - West Bengal, Odisha, Bihar, Jharkhand, Assam, Meghalaya
    { id: '1-40294811', name: 'Kolkata Institute of Engineering and Mgmt', state: 'West Bengal', region: 'Eastern', type: 'Engineering & Technology', address: 'Salt Lake City, Sector V, Kolkata 700091' },
    { id: '1-40839205', name: 'Bhubaneswar School of Technology and Applied Sci', state: 'Odisha', region: 'Eastern', type: 'Engineering & Technology', address: 'Chandaka Industrial Estate, Patia, Bhubaneswar 751024' },
    { id: '1-41294812', name: 'Patna Regional Institute of Polytechnic', state: 'Bihar', region: 'Eastern', type: 'Polytechnic Diploma', address: 'Bailey Road, Saguna More, Patna 801503' },
    { id: '1-41839203', name: 'Ranchi College of Pharmacy and Drug Sciences', state: 'Jharkhand', region: 'Eastern', type: 'Pharmacy', address: 'Bariatu Road, Ranchi 834009' },
    { id: '1-42294814', name: 'Guwahati Technical Institute & Engineering', state: 'Assam', region: 'Eastern', type: 'Engineering & Technology', address: 'Jalukbari, Guwahati 781014' },
    { id: '1-42839201', name: 'Durgapur Advanced Institute of Technology', state: 'West Bengal', region: 'Eastern', type: 'Engineering & Technology', address: 'City Centre, Durgapur 713216' },
    { id: '1-43294810', name: 'Cuttack Academy of Diploma Studies', state: 'Odisha', region: 'Eastern', type: 'Polytechnic Diploma', address: 'Madhupatna, Cuttack 753010' },
    { id: '1-43839202', name: 'Muzaffarpur Institute of Management & Science', state: 'Bihar', region: 'Eastern', type: 'Management (MCA/MBA)', address: 'Club Road, Muzaffarpur 842002' },
    { id: '1-44294811', name: 'Siliguri College of Architecture and Rural Design', state: 'West Bengal', region: 'Eastern', type: 'Architecture', address: 'Matigara, Siliguri 734010' },
    { id: '1-44839204', name: 'Jamshedpur Engineering & Polytechnic Inst', state: 'Jharkhand', region: 'Eastern', type: 'Engineering & Technology', address: 'Adityapur Industrial Area, Jamshedpur 831013' },
    { id: '1-45294813', name: 'Silchar Polytechnic Institute of Technology', state: 'Assam', region: 'Eastern', type: 'Polytechnic Diploma', address: 'Meherpur, Silchar 788015' },
    { id: '1-45839201', name: 'Shillong Institute of Engineering & Computer App', state: 'Meghalaya', region: 'Eastern', type: 'Engineering & Technology', address: 'Laitumkhrah, Shillong 793003' },

    // Central Region (CRO) - Madhya Pradesh, Chhattisgarh, Rajasthan
    { id: '1-50294811', name: 'Bhopal Institute of Technology & Science (BITS)', state: 'Madhya Pradesh', region: 'Central', type: 'Engineering & Technology', address: 'Bhojpur Road, Bangrasia, Bhopal 462045' },
    { id: '1-50839203', name: 'Indore College of Engineering & Research', state: 'Madhya Pradesh', region: 'Central', type: 'Engineering & Technology', address: 'Rau-Pithampur Road, Indore 453331' },
    { id: '1-51294812', name: 'Jaipur Technical Campus of Engineering & Tech', state: 'Rajasthan', region: 'Central', type: 'Engineering & Technology', address: 'Sitapura Industrial Area, Tonk Road, Jaipur 302022' },
    { id: '1-51839204', name: 'Raipur Institute of Technology and Management', state: 'Chhattisgarh', region: 'Central', type: 'Management (MCA/MBA)', address: 'Mandir Hasaud, NH-6, Raipur 492101' },
    { id: '1-52294815', name: 'Gwalior Polytechnic and Vocational Institute', state: 'Madhya Pradesh', region: 'Central', type: 'Polytechnic Diploma', address: 'Morar Cantt, Gwalior 474006' },
    { id: '1-52839202', name: 'Jodhpur Academy of Pharmacy & Medical Sci', state: 'Rajasthan', region: 'Central', type: 'Pharmacy', address: 'Pali Road, Mogra, Jodhpur 342802' },
    { id: '1-53294810', name: 'Bhilai Institute of Advanced Technology', state: 'Chhattisgarh', region: 'Central', type: 'Engineering & Technology', address: 'Sector 7, Bhilai Nagar 490006' },
    { id: '1-53839201', name: 'Udaipur College of Architecture & Heritage Plan', state: 'Rajasthan', region: 'Central', type: 'Architecture', address: 'Pratap Nagar, Udaipur 313001' },
    { id: '1-54294812', name: 'Jabalpur Regional Polytechnic College', state: 'Madhya Pradesh', region: 'Central', type: 'Polytechnic Diploma', address: 'South Civil Lines, Jabalpur 482001' },
    { id: '1-54839203', name: 'Kota Institute of Technology & Engineering', state: 'Rajasthan', region: 'Central', type: 'Engineering & Technology', address: 'Ranpur Industrial Area, Kota 324005' },
    { id: '1-55294811', name: 'Bilaspur Technical Training Institute', state: 'Chhattisgarh', region: 'Central', type: 'Polytechnic Diploma', address: 'Koni, Bilaspur 495009' },
    { id: '1-55839202', name: 'Ujjain Institute of Management & Science', state: 'Madhya Pradesh', region: 'Central', type: 'Management (MCA/MBA)', address: 'Dewas Road, Ujjain 456010' },
    { id: '1-56294810', name: 'Ajmer Engineering & Technological Institute', state: 'Rajasthan', region: 'Central', type: 'Engineering & Technology', address: 'Badliya Chouraha, N.H. 8, Ajmer 305025' },
    { id: '1-56839201', name: 'Rewa College of Polytechnic Studies', state: 'Madhya Pradesh', region: 'Central', type: 'Polytechnic Diploma', address: 'Kothi Compound, Rewa 486001' }
  ];

  const instStmt = db.prepare(`
    INSERT INTO institutions (aicte_permanent_id, name, address, state, region, type, contact_email)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const inst of rawInstitutions) {
    const emailPrefix = inst.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    await instStmt.run(inst.id, inst.name, inst.address, inst.state, inst.region, inst.type, `principal@${emailPrefix}.edu.in`);
  }
  console.log(`[+] Seeded ${rawInstitutions.length} technical institutions.`);

  // 3. Plan deliberate overlaps:
  // 18 institutions with OPEN cases in BOTH Regulation Bureau (RB) and PGRC!
  const overlapInstIds = [
    '1-10294811', // Delhi Institute of Advanced Engineering & Technology
    '1-10827364', // Meerut Institute of Engg
    '1-11293845', // Chandigarh Poly-Technic College
    '1-12749382', // Lucknow Institute of Computer Applications
    '1-20394811', // Sri Ramakrishna College of Engg
    '1-21394827', // Bangalore Institute of Mgmt Studies
    '1-22384910', // Hyderabad Technical & Pharmacy
    '1-23294810', // Madurai Institute of Engineering
    '1-30294811', // Pune Apex Institute of Engg
    '1-30839202', // Mumbai Metropolitan Institute
    '1-31749203', // Nagpur Polytechnic
    '1-33294815', // Nashik Valley College
    '1-40294811', // Kolkata Institute of Engineering
    '1-40839205', // Bhubaneswar School of Tech
    '1-41839203', // Ranchi College of Pharmacy
    '1-50294811', // Bhopal Institute of Technology (BITS)
    '1-50839203', // Indore College of Engineering
    '1-51294812'  // Jaipur Technical Campus
  ];

  const categories = [
    { cat: 'Faculty Deficiency & Qualification Mismatch', bureaus: ['Regulation Bureau', 'Approval Bureau'] },
    { cat: 'Illegal Fee Surcharge & Capitation Levy', bureaus: ['PGRC', 'Regulation Bureau'] },
    { cat: 'Non-Refund of Caution Deposit & Fee Retention', bureaus: ['PGRC', 'Regional Office'] },
    { cat: 'Withholding of Original Certificates & Marksheets', bureaus: ['PGRC', 'Regional Office'] },
    { cat: 'Faculty Salary Arrears & 7th CPC Non-Compliance', bureaus: ['Regulation Bureau', 'PGRC'] },
    { cat: 'Unapproved Course & Illegal Seat Augmentation', bureaus: ['Regulation Bureau', 'Approval Bureau'] },
    { cat: 'Infrastructural Non-Compliance & Deficient Labs', bureaus: ['Regulation Bureau', 'Approval Bureau'] },
    { cat: 'Ragging & Non-Constitution of Anti-Ragging Cell', bureaus: ['PGRC', 'Regional Office'] },
    { cat: 'Misleading Advertisements & Fake Affiliation Claims', bureaus: ['Regulation Bureau', 'Approval Bureau'] },
    { cat: 'Irregular Examination Conduct & Attendance Tampering', bureaus: ['PGRC', 'Regulation Bureau'] }
  ];

  const officersByBureau = {
    'Regulation Bureau': ['Shri Anand Kumar Gupta', 'Pooja Deshmukh', 'Er. R. K. Singhal', 'Dr. S. K. Roy'],
    'PGRC': ['Smt. Manjula Sundaram', 'Deepak Joshi', 'Shri R. P. Maurya', 'Adv. N. C. Sharma'],
    'Approval Bureau': ['Er. Vikramaditya Rathore', 'Dr. Shalini Srivastava', 'Shri Alok Sen'],
    'Regional Office': ['Dr. K. Venkatesh Rao', 'Shri P. C. Trivedi', 'Dr. Arindam Bose', 'Er. B. S. Meena']
  };

  const actionsPool = [
    { act: 'Complaint Registered on Portal', next: 'Preliminary Scrutiny by Scrutiny Committee' },
    { act: 'Preliminary Scrutiny Completed', next: 'Issue Show Cause Notice (SCN) to Trust' },
    { act: 'Show Cause Notice Dispatched', next: 'Await Institutional Reply (14 Days)' },
    { act: 'Institutional Reply Received', next: 'Verification by Subject Expert Committee' },
    { act: 'Physical/Virtual Inspection Ordered', next: 'Submit Fact-Finding Expert Visit Report (EVR)' },
    { act: 'Inspection Report Reviewed by SAC', next: 'Standing Appellate Committee Hearing' },
    { act: 'Personal Hearing Scheduled', next: 'Final Decision & Speaking Order' },
    { act: 'Non-Compliance Penalty Recommended', next: 'Council Approval for Action' },
    { act: 'Compliance Verified & Penalty Imposed', next: 'Closure Report & Case Disposal' }
  ];

  // Helper date generators based on current date
  const now = new Date('2026-10-26T12:00:00Z');
  function daysAgo(d) {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
  function daysFuture(d) {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }

  const caseStmt = db.prepare(`
    INSERT INTO cases (
      case_id, aicte_permanent_id, category, description,
      received_date, status, bureau, assigned_officer,
      last_action, next_action, last_action_date,
      expected_disposal_date, priority, complainant_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const actionStmt = db.prepare(`
    INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const linkStmt = db.prepare(`
    INSERT INTO case_links (case_id_1, case_id_2, link_type, created_by, remarks)
    VALUES (?, ?, ?, ?, ?)
  `);

  const alertStmt = db.prepare(`
    INSERT INTO alerts (alert_type, title, description, severity, aicte_permanent_id, case_id, created_at, is_resolved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let caseCounter = 1000;
  const casesList = [];

  // =========================================================================
  // CALIBRATED SLA TIMELINE PLAN:
  // User Requirement:
  // "roughly 20-25% of open cases are past their expected disposal date,
  //  about 10% are within 7 days of it, and the rest are comfortably within timeline.
  //  Keep the age variety and the planted RB/PGRC overlaps."
  //
  // Total Cases: 254
  // Target Disposed: 54
  // Target Open Cases: 200
  // Target Overdue Open Cases: 44 (~22.0% of open cases)
  // Target Approaching SLA (within 7 days): 20 (~10.0% of open cases)
  // Target Comfortably within timeline: 136 (~68.0% of open cases)
  // =========================================================================

  let openCaseCount = 0;

  // Function to calculate calibrated expected_disposal_date for open cases
  // openIndex will go from 0 to 199.
  // 0 to 43 (44 cases): Overdue (past date: 1 to 35 days ago)
  // 44 to 63 (20 cases): Approaching SLA (0 to 6 days in future)
  // 64 to 199 (136 cases): Comfortably within timeline (12 to 75 days in future)
  function computeSlaDateForOpenCase(openIdx, ageDays) {
    if (openIdx < 44) {
      // Overdue: past deadline (between 2 and 32 days overdue)
      const overdueBy = 2 + (openIdx % 30);
      return daysAgo(overdueBy);
    } else if (openIdx < 64) {
      // Approaching SLA: within 0 to 6 days
      const daysLeft = (openIdx - 44) % 7;
      return daysFuture(daysLeft);
    } else {
      // Comfortably within timeline: 12 to 70 days in future
      const offset = (openIdx - 64);
      const daysAhead = 12 + ((offset * 3) % 58);
      return daysFuture(daysAhead);
    }
  }

  // 3a. Generate Deliberate Overlapping Open Cases in both RB & PGRC (18 pairs = 36 open cases)
  console.log('[*] Generating planted overlapping cases across RB and PGRC...');
  for (let idx = 0; idx < overlapInstIds.length; idx++) {
    const instId = overlapInstIds[idx];
    const inst = rawInstitutions.find(i => i.id === instId);

    // Case 1: Regulation Bureau (Open: Pending, Under Process, or Escalated)
    caseCounter++;
    const rbCaseId = `AICTE-RB-2026-${caseCounter}`;
    // Varied age: from 18 days up to 125 days (some >90 days)
    const rbAgeDays = 18 + ((idx * 7) % 108);
    const rbReceived = daysAgo(rbAgeDays);
    const rbStatus = rbAgeDays > 75 ? (idx % 2 === 0 ? 'Escalated' : 'Under Process') : (idx % 3 === 0 ? 'Pending' : 'Under Process');
    const rbPriority = rbAgeDays > 60 ? 'Urgent' : 'High';
    const rbOfficer = officersByBureau['Regulation Bureau'][idx % officersByBureau['Regulation Bureau'].length];
    
    const rbExpected = computeSlaDateForOpenCase(openCaseCount++, rbAgeDays);

    await caseStmt.run(
      rbCaseId,
      instId,
      'Faculty Deficiency & Qualification Mismatch',
      `Inspection revealed severe cadre ratio shortfall (1:34 against mandatory 1:15) and unqualified ad-hoc adjunct lecturers in ${inst.name}. Show cause proceedings initiated by Regulation Bureau.`,
      rbReceived,
      rbStatus,
      'Regulation Bureau',
      rbOfficer,
      'Expert Committee Report Submitted to SAC',
      'Appellate Hearing and Regulatory Sanction Order',
      daysAgo(Math.max(1, Math.floor(rbAgeDays * 0.4))),
      rbExpected,
      rbPriority,
      'Anonymous Whistleblower / AICTE Vigilance'
    );
    casesList.push({ id: rbCaseId, instId, bureau: 'Regulation Bureau', status: rbStatus, priority: rbPriority });

    // Actions for RB case
    await actionStmt.run(rbCaseId, 'Complaint Registered on Portal', 'System Administrator', 'Regulation Bureau', `${rbReceived} 10:15:00`, 'Formal grievance registered under AICTE Regulation Clause 4.2');
    await actionStmt.run(rbCaseId, 'Preliminary Scrutiny Completed', rbOfficer, 'Regulation Bureau', `${daysAgo(Math.max(1, rbAgeDays - 8))} 14:30:00`, 'Prima facie evidence of non-approved faculty appointments found in SAR.');
    await actionStmt.run(rbCaseId, 'Issue Show Cause Notice (SCN) to Trust', rbOfficer, 'Regulation Bureau', `${daysAgo(Math.max(1, rbAgeDays - 15))} 11:00:00`, 'Notice issued with 14 days compliance period.');

    // Case 2: PGRC (Open: Pending, Under Process, or Escalated)
    caseCounter++;
    const pgrcCaseId = `AICTE-PGRC-2026-${caseCounter}`;
    const pgrcAgeDays = 15 + ((idx * 6) % 95);
    const pgrcReceived = daysAgo(pgrcAgeDays);
    const pgrcStatus = idx % 3 === 0 ? 'Pending' : (idx % 4 === 0 ? 'Escalated' : 'Under Process');
    const pgrcPriority = 'High';
    const pgrcOfficer = officersByBureau['PGRC'][idx % officersByBureau['PGRC'].length];

    const pgrcExpected = computeSlaDateForOpenCase(openCaseCount++, pgrcAgeDays);

    await caseStmt.run(
      pgrcCaseId,
      instId,
      'Faculty Salary Arrears & 7th CPC Non-Compliance',
      `Joint student-faculty grievance regarding 7 months unpaid salary arrears and unauthorized deductions under threat of service termination at ${inst.name}.`,
      pgrcReceived,
      pgrcStatus,
      'PGRC',
      pgrcOfficer,
      'Notice issued to Governing Body',
      'Ombudsman Joint Conciliation Meeting',
      daysAgo(Math.max(1, Math.floor(pgrcAgeDays * 0.35))),
      pgrcExpected,
      pgrcPriority,
      'Faculty Welfare Association'
    );
    casesList.push({ id: pgrcCaseId, instId, bureau: 'PGRC', status: pgrcStatus, priority: pgrcPriority });

    // Actions for PGRC case
    await actionStmt.run(pgrcCaseId, 'Grievance Docket Created', 'PGRC Portal Ingest', 'PGRC', `${pgrcReceived} 09:45:00`, 'Lodged under CPGRAMS - AICTE Integration Channel');
    await actionStmt.run(pgrcCaseId, 'Summons Issued to College Management', pgrcOfficer, 'PGRC', `${daysAgo(Math.max(1, pgrcAgeDays - 6))} 16:00:00`, 'Directing immediate release of withheld salary records.');

    // Link between these 2 cases in case_links
    await linkStmt.run(rbCaseId, pgrcCaseId, 'CROSS_BUREAU_OVERLAP', 'Automated Cross-Check AICTE Linker', 'Parallel proceedings detected against same institution in Regulation Bureau and PGRC.');

    // Add alert
    await alertStmt.run(
      'Cross-Bureau Overlap',
      `Duplicate/Parallel Investigation: ${inst.name}`,
      `Institution ${instId} has concurrent open proceedings in Regulation Bureau (${rbCaseId}) and PGRC (${pgrcCaseId}). Potential conflicting orders or duplicated effort.`,
      rbAgeDays > 60 ? 'Critical' : 'Warning',
      instId,
      rbCaseId,
      `${daysAgo(3)} 11:30:00`,
      0
    );
  }

  // 3b. Generate remaining 218 cases across institutions (with exact 54 Disposed and 164 Open)
  console.log('[*] Generating remaining realistic messy cases across institutions...');
  const allBureaus = ['Regulation Bureau', 'PGRC', 'Approval Bureau', 'Regional Office'];
  const bureauWeights = ['Regulation Bureau', 'Regulation Bureau', 'PGRC', 'PGRC', 'PGRC', 'Approval Bureau', 'Regional Office'];
  const openStatuses = ['Pending', 'Under Process', 'Under Process', 'Transferred', 'Escalated'];
  const priorities = ['Low', 'Medium', 'Medium', 'High', 'Urgent'];

  const institutionCasesMap = {};
  rawInstitutions.forEach(inst => institutionCasesMap[inst.id] = 0);
  overlapInstIds.forEach(id => institutionCasesMap[id] += 2);

  const targetTotalCases = 254;
  const targetDisposedCount = 54;
  let currentDisposedCount = 0;

  while (casesList.length < targetTotalCases) {
    caseCounter++;
    const inst = rawInstitutions[Math.floor(Math.pow(Math.random(), 1.6) * rawInstitutions.length)];
    institutionCasesMap[inst.id] = (institutionCasesMap[inst.id] || 0) + 1;

    const bureau = bureauWeights[Math.floor(Math.random() * bureauWeights.length)];
    const prefix = bureau === 'Regulation Bureau' ? 'RB' : (bureau === 'PGRC' ? 'PGRC' : (bureau === 'Approval Bureau' ? 'AB' : 'RO'));
    const caseId = `AICTE-${prefix}-2026-${caseCounter}`;

    const catObj = categories[Math.floor(Math.random() * categories.length)];
    const category = catObj.cat;

    // Realistic varied ages from 2 days up to 135 days (some > 90 days)
    const ageDays = Math.floor(Math.random() * 133) + 3;
    const receivedDate = daysAgo(ageDays);

    // Determine status: exactly 54 cases will be Disposed, the rest open
    const remainingSlots = targetTotalCases - casesList.length;
    const disposedNeeded = targetDisposedCount - currentDisposedCount;
    let status;

    if (disposedNeeded > 0 && (Math.random() < (disposedNeeded / remainingSlots) || ageDays > 105)) {
      status = 'Disposed';
      currentDisposedCount++;
    } else {
      status = openStatuses[Math.floor(Math.random() * openStatuses.length)];
    }

    let expectedDisposalDate;
    if (status === 'Disposed') {
      // Disposed cases are resolved; expected date was within a realistic window (e.g. 30, 45, 60 days after filing)
      const window = [30, 45, 60][Math.floor(Math.random() * 3)];
      const targetTime = new Date(new Date(receivedDate).getTime() + window * 24 * 60 * 60 * 1000);
      expectedDisposalDate = targetTime.toISOString().split('T')[0];
    } else {
      // Open case: apply calibrated SLA distribution
      expectedDisposalDate = computeSlaDateForOpenCase(openCaseCount++, ageDays);
    }

    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const officerList = officersByBureau[bureau] || officersByBureau['Regulation Bureau'];
    const assignedOfficer = officerList[Math.floor(Math.random() * officerList.length)];

    const actIndex = Math.min(actionsPool.length - 1, Math.floor((ageDays / 120) * (actionsPool.length - 1)));
    const lastAction = actionsPool[actIndex].act;
    const nextAction = status === 'Disposed' ? 'Case Disposed & Closed' : actionsPool[actIndex].next;
    const lastActionDate = daysAgo(Math.max(1, Math.floor(ageDays * 0.4)));

    const complainantTypes = ['Student / Scholar', 'Parent / Guardian', 'Faculty Member', 'Non-Teaching Staff', 'Whistleblower', 'Public Citizen'];
    const complainantType = complainantTypes[Math.floor(Math.random() * complainantTypes.length)];

    const description = `Grievance petition concerning ${category.toLowerCase()} at ${inst.name}. Complainant alleges non-adherence to AICTE Approval Process Handbook (APH) 2025-26 guidelines.`;

    await caseStmt.run(
      caseId,
      inst.id,
      category,
      description,
      receivedDate,
      status,
      bureau,
      assignedOfficer,
      lastAction,
      nextAction,
      lastActionDate,
      expectedDisposalDate,
      priority,
      complainantType
    );

    casesList.push({ id: caseId, instId: inst.id, bureau, status, priority });

    // Seed 1-3 history actions
    const numActions = Math.min(4, Math.max(1, Math.floor(ageDays / 25)));
    for (let a = 0; a < numActions; a++) {
      const act = actionsPool[Math.min(a, actionsPool.length - 1)];
      const actTime = daysAgo(Math.max(1, ageDays - (a * 20)));
      await actionStmt.run(
        caseId,
        act.act,
        assignedOfficer,
        bureau,
        `${actTime} 11:${10 + a * 15}:00`,
        `Formal procedural record updated by ${assignedOfficer}.`
      );
    }

    // Add alert for critical overdue cases
    const isOverdue = new Date(expectedDisposalDate) < now && status !== 'Disposed';
    if (isOverdue && Math.random() < 0.25) {
      await alertStmt.run(
        'Overdue Disposal',
        `Disposal SLA Breach: Case ${caseId}`,
        `Case filed against ${inst.name} is overdue by ${Math.floor((now - new Date(expectedDisposalDate)) / (1000 * 60 * 60 * 24))} days. Immediate intervention required by ${assignedOfficer}.`,
        ageDays > 80 ? 'Critical' : 'Warning',
        inst.id,
        caseId,
        `${daysAgo(2)} 08:30:00`,
        0
      );
    }
  }

  console.log(`[+] Successfully seeded ${casesList.length} cases.`);

  // Print exact summary and SLA breakdown verification
  const totalCasesCount = (await db.prepare('SELECT COUNT(*) as count FROM cases').get()).count;
  const openCasesCount = (await db.prepare(`SELECT COUNT(*) as count FROM cases WHERE status != 'Disposed'`).get()).count;
  const overdueCount = (await db.prepare(`SELECT COUNT(*) as count FROM cases WHERE expected_disposal_date < date('now') AND status != 'Disposed'`).get()).count;
  const approachingCount = (await db.prepare(`SELECT COUNT(*) as count FROM cases WHERE expected_disposal_date >= date('now') AND expected_disposal_date <= date('now', '+7 days') AND status != 'Disposed'`).get()).count;
  const comfortablyCount = (await db.prepare(`SELECT COUNT(*) as count FROM cases WHERE expected_disposal_date > date('now', '+7 days') AND status != 'Disposed'`).get()).count;
  const statusStats = await db.prepare('SELECT status, count(*) as count FROM cases GROUP BY status').all();
  const bureauStats = await db.prepare('SELECT bureau, count(*) as count FROM cases GROUP BY bureau').all();

  console.log('=======================================================');
  console.log('              RE-TUNED SEED SUMMARY                   ');
  console.log('=======================================================');
  console.log(`Total Cases: ${totalCasesCount}`);
  console.log(`Open Cases: ${openCasesCount}`);
  console.log(`Disposed Cases: ${totalCasesCount - openCasesCount}`);
  console.log(`--- SLA COMPLIANCE BREAKDOWN ---`);
  console.log(`Overdue Open Cases (>Expected): ${overdueCount} (${((overdueCount / openCasesCount) * 100).toFixed(1)}% of open cases) [Target: 20-25%]`);
  console.log(`Approaching SLA (within 7 days): ${approachingCount} (${((approachingCount / openCasesCount) * 100).toFixed(1)}% of open cases) [Target: ~10%]`);
  console.log(`Comfortably within SLA: ${comfortablyCount} (${((comfortablyCount / openCasesCount) * 100).toFixed(1)}% of open cases) [Target: ~65-70%]`);
  console.log('Status breakdown:', statusStats);
  console.log('Bureau breakdown:', bureauStats);
  console.log('--- SEED COMPLETED SUCCESSFULLY ---');
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = seedDatabase;
