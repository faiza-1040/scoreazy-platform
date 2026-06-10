document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let currentUser = null;
  let allCourses = [];
  let token = localStorage.getItem('token');
  let quizAnswers = {};
  let quizCurrentStep = 1;
  let activeEnrollment = null; // Currently viewed classroom enrollment

  // --- DOM ELEMENTS ---
  const authModal = document.getElementById('authModal');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const signupName = document.getElementById('signupName');
  const signupEmail = document.getElementById('signupEmail');
  const signupPassword = document.getElementById('signupPassword');

  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');

  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabSignupBtn = document.getElementById('tabSignupBtn');
  const closeAuthBtn = document.getElementById('closeAuthBtn');
  const openLoginBtn = document.getElementById('openLoginBtn');
  const openSignupBtn = document.getElementById('openSignupBtn');

  const checkoutModal = document.getElementById('checkoutModal');
  const enrollmentForm = document.getElementById('enrollmentForm');
  const checkoutCourseId = document.getElementById('checkoutCourseId');
  const summaryCourseTitle = document.getElementById('summaryCourseTitle');
  const summaryCourseAge = document.getElementById('summaryCourseAge');
  const summaryCoursePrice = document.getElementById('summaryCoursePrice');
  const childNameInput = document.getElementById('childName');
  const childAgeInput = document.getElementById('childAge');
  const checkoutError = document.getElementById('checkoutError');
  const closeCheckoutBtn = document.getElementById('closeCheckoutBtn');

  const dashboardPanel = document.getElementById('dashboardPanel');
  const closeDashboardBtn = document.getElementById('closeDashboardBtn');
  const dashboardParentName = document.getElementById('dashboardParentName');
  const dashboardEnrollmentList = document.getElementById('dashboardEnrollmentList');
  const dashboardInvoiceList = document.getElementById('dashboardInvoiceList');

  const dashTabCoursesBtn = document.getElementById('dashTabCoursesBtn');
  const dashTabBillingBtn = document.getElementById('dashTabBillingBtn');
  const dashEnrollmentsSec = document.getElementById('dashEnrollmentsSec');
  const dashBillingSec = document.getElementById('dashBillingSec');

  const coursesGrid = document.getElementById('coursesGrid');
  const navAuthSection = document.getElementById('navAuthSection');

  // --- NEW DOM ELEMENTS ---
  // Search & Filter
  const courseSearch = document.getElementById('courseSearch');
  const filterAge = document.getElementById('filterAge');
  const sortPrice = document.getElementById('sortPrice');

  // Course Details Modal
  const detailsModal = document.getElementById('detailsModal');
  const closeDetailsBtn = document.getElementById('closeDetailsBtn');
  const detailsCourseAge = document.getElementById('detailsCourseAge');
  const detailsCourseTitle = document.getElementById('detailsCourseTitle');
  const detailsCourseDesc = document.getElementById('detailsCourseDesc');
  const detailsSyllabusDays = document.getElementById('detailsSyllabusDays');
  const detailsCoursePrice = document.getElementById('detailsCoursePrice');
  const detailsEnrollBtn = document.getElementById('detailsEnrollBtn');

  // Quiz Wizard
  const quizProgress = document.getElementById('quizProgress');
  const quizStepDots = document.querySelectorAll('.step-dot');
  const quizSteps = document.querySelectorAll('.quiz-step');
  const quizPrevBtn = document.getElementById('quizPrevBtn');
  const quizNextBtn = document.getElementById('quizNextBtn');
  const quizRestartBtn = document.getElementById('recRestartBtn');
  const quizResultScreen = document.getElementById('quizResultScreen');
  const recCourseTitle = document.getElementById('recCourseTitle');
  const recCourseAge = document.getElementById('recCourseAge');
  const recCourseDesc = document.getElementById('recCourseDesc');
  const recViewDetailsBtn = document.getElementById('recViewDetailsBtn');

  // Virtual Classroom
  const dashClassroomSec = document.getElementById('dashClassroomSec');
  const backToEnrollmentsBtn = document.getElementById('backToEnrollmentsBtn');
  const classroomCourseTitle = document.getElementById('classroomCourseTitle');
  const classroomChildName = document.getElementById('classroomChildName');
  const classroomProgressFill = document.getElementById('classroomProgressFill');
  const classroomProgressPercent = document.getElementById('classroomProgressPercent');
  const classroomCertSection = document.getElementById('classroomCertSection');
  const downloadCertBtn = document.getElementById('downloadCertBtn');
  const classroomDaysList = document.getElementById('classroomDaysList');

  // Certificate Modal
  const certificateModal = document.getElementById('certificateModal');
  const closeCertBtn = document.getElementById('closeCertBtn');
  const certChildName = document.getElementById('certChildName');
  const certCourseTitle = document.getElementById('certCourseTitle');
  const certDate = document.getElementById('certDate');
  const printCertBtn = document.getElementById('printCertBtn');

  // --- HELPERS ---

  // Safe JSON parser: returns parsed JSON or { msg: rawText } if server sends plain text
  async function safeJson(res) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    // Server sent plain text (e.g. "Server error") — wrap it so we don't crash
    const text = await res.text();
    return { msg: text || 'An unexpected error occurred. Please try again.' };
  }

  // --- INITS ---
  checkAuthUser();
  fetchCourses();
  handleVerifyToken(); // Handle ?verify= link from email


  // --- EVENT LISTENERS ---

  // Tab toggling in auth modal
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabSignupBtn.classList.remove('active');
    loginForm.classList.remove('d-none');
    signupForm.classList.add('d-none');
    loginError.textContent = '';
  });

  tabSignupBtn.addEventListener('click', () => {
    tabSignupBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    signupForm.classList.remove('d-none');
    loginForm.classList.add('d-none');
    signupError.textContent = '';
  });

  // Modal close listeners
  closeAuthBtn.addEventListener('click', () => {
    authModal.classList.remove('active');
  });

  closeCheckoutBtn.addEventListener('click', () => {
    checkoutModal.classList.remove('active');
  });

  closeDashboardBtn.addEventListener('click', () => {
    dashboardPanel.classList.remove('active');
  });

  closeDetailsBtn.addEventListener('click', () => {
    detailsModal.classList.remove('active');
  });

  closeCertBtn.addEventListener('click', () => {
    certificateModal.classList.remove('active');
  });

  // Close modals on backdrop click
  [authModal, checkoutModal, detailsModal, certificateModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    }
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [authModal, checkoutModal, detailsModal, certificateModal, dashboardPanel].forEach(modal => {
        if (modal) modal.classList.remove('active');
      });
    }
  });

  // Auto-format card number as 1234 5678 1234 5678 and limit input length
  const cardInput = document.getElementById('cardNumber');
  if (cardInput) {
    cardInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      let formatted = '';
      for (let i = 0; i < value.length && i < 16; i++) {
        if (i > 0 && i % 4 === 0) {
          formatted += ' ';
        }
        formatted += value[i];
      }
      e.target.value = formatted;
    });
  }

  // Navigation open auth modal
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => {
      authModal.classList.add('active');
      tabLoginBtn.click();
    });
  }

  if (openSignupBtn) {
    openSignupBtn.addEventListener('click', () => {
      authModal.classList.add('active');
      tabSignupBtn.click();
    });
  }

  // Dashboard inner tabs
  dashTabCoursesBtn.addEventListener('click', () => {
    dashTabCoursesBtn.classList.add('active');
    dashTabBillingBtn.classList.remove('active');
    dashEnrollmentsSec.classList.remove('d-none');
    dashBillingSec.classList.add('d-none');
    dashClassroomSec.classList.add('d-none');
    loadDashboardEnrollments();
  });

  dashTabBillingBtn.addEventListener('click', () => {
    dashTabBillingBtn.classList.add('active');
    dashTabCoursesBtn.classList.remove('active');
    dashBillingSec.classList.remove('d-none');
    dashEnrollmentsSec.classList.add('d-none');
    dashClassroomSec.classList.add('d-none');
    loadDashboardInvoices();
  });

  // Search & Filter listeners
  courseSearch.addEventListener('input', applyFiltersAndRender);
  filterAge.addEventListener('change', applyFiltersAndRender);
  sortPrice.addEventListener('change', applyFiltersAndRender);

  // Classroom back button
  backToEnrollmentsBtn.addEventListener('click', () => {
    dashClassroomSec.classList.add('d-none');
    dashEnrollmentsSec.classList.remove('d-none');
    dashTabCoursesBtn.classList.add('active');
    loadDashboardEnrollments();
  });

  // Certificate Modal buttons
  printCertBtn.addEventListener('click', () => {
    window.print();
  });

  // Details Enroll Button trigger
  detailsEnrollBtn.addEventListener('click', () => {
    const courseId = detailsEnrollBtn.getAttribute('data-id');
    detailsModal.classList.remove('active');
    openEnrollmentCheckout(courseId);
  });

  // --- QUIZ EVENT LISTENERS & LOGIC ---
  const quizOptions = document.querySelectorAll('.quiz-option');
  quizOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const parent = opt.parentElement;
      // Remove active from peers
      parent.querySelectorAll('.quiz-option').forEach(peer => peer.classList.remove('active'));
      // Add active to current
      opt.classList.add('active');

      const optionName = opt.getAttribute('data-name');
      const optionValue = opt.getAttribute('data-value');
      quizAnswers[optionName] = optionValue;

      // Enable next button
      quizNextBtn.removeAttribute('disabled');
    });
  });

  quizNextBtn.addEventListener('click', () => {
    if (quizCurrentStep < 4) {
      // Hide current step
      document.getElementById(`step${quizCurrentStep}`).classList.add('d-none');
      quizCurrentStep++;
      // Show next step
      document.getElementById(`step${quizCurrentStep}`).classList.remove('d-none');

      // Update step dots
      quizStepDots.forEach((dot, idx) => {
        if (idx + 1 === quizCurrentStep) dot.classList.add('active');
      });

      // Update progress bar
      quizProgress.style.width = `${quizCurrentStep * 25}%`;

      // Show back button
      quizPrevBtn.classList.remove('d-none');

      // Check if next option is already selected
      const currentStepElement = document.getElementById(`step${quizCurrentStep}`);
      const hasActive = currentStepElement.querySelector('.quiz-option.active');
      if (hasActive) {
        quizNextBtn.removeAttribute('disabled');
      } else {
        quizNextBtn.setAttribute('disabled', 'true');
      }

      if (quizCurrentStep === 4) {
        quizNextBtn.innerHTML = 'Calculate Match <i class="fas fa-magic ms-1"></i>';
      }
    } else if (quizCurrentStep === 4) {
      // Calculate and display result
      calculateQuizRecommendation();
    }
  });

  quizPrevBtn.addEventListener('click', () => {
    if (quizCurrentStep > 1) {
      // Hide current step
      if (quizCurrentStep === 5) {
        quizResultScreen.classList.add('d-none');
        quizNextBtn.classList.remove('d-none');
      } else {
        document.getElementById(`step${quizCurrentStep}`).classList.add('d-none');
      }

      // Remove active dot of higher index
      quizStepDots[quizCurrentStep - 1].classList.remove('active');

      quizCurrentStep--;
      // Show previous step
      document.getElementById(`step${quizCurrentStep}`).classList.remove('d-none');

      // Update progress bar
      quizProgress.style.width = `${quizCurrentStep * 25}%`;

      // Adjust buttons
      quizNextBtn.innerHTML = 'Next <i class="fas fa-chevron-right ms-1"></i>';
      quizNextBtn.removeAttribute('disabled'); // Allow going forward since option was set before

      if (quizCurrentStep === 1) {
        quizPrevBtn.classList.add('d-none');
      }
    }
  });

  quizRestartBtn.addEventListener('click', () => {
    quizAnswers = {};
    quizCurrentStep = 1;

    // Hide results, show step 1
    quizResultScreen.classList.add('d-none');
    document.getElementById('step1').classList.remove('d-none');
    document.getElementById('step2').classList.add('d-none');
    document.getElementById('step3').classList.add('d-none');
    document.getElementById('step4').classList.add('d-none');

    // Reset options
    quizOptions.forEach(opt => opt.classList.remove('active'));

    // Reset progress
    quizProgress.style.width = '25%';
    quizStepDots.forEach((dot, idx) => {
      if (idx === 0) dot.classList.add('active');
      else dot.classList.remove('active');
    });

    // Reset navigation buttons
    quizPrevBtn.classList.add('d-none');
    quizNextBtn.classList.remove('d-none');
    quizNextBtn.innerHTML = 'Next <i class="fas fa-chevron-right ms-1"></i>';
    quizNextBtn.setAttribute('disabled', 'true');
  });

  function calculateQuizRecommendation() {
    if (allCourses.length === 0) return;

    const age = quizAnswers.age; // K-2, 3-5, 6-8
    const goal = quizAnswers.goal; // express, social, debate
    const comfort = quizAnswers.comfort; // shy, medium, active
    const style = quizAnswers.style; // story, play, logic

    // Find courses matching the age group
    let matchingCourses = allCourses.filter(c => c.ageGroup.includes(age));
    let recommended = null;

    if (matchingCourses.length > 0) {
      if (age === 'K-2') {
        // Confidence Explorers vs Social Skills Safari
        if (goal === 'social' || style === 'play') {
          recommended = matchingCourses.find(c => c.title.includes('Safari')) || matchingCourses[0];
        } else {
          recommended = matchingCourses.find(c => c.title.includes('Explorers')) || matchingCourses[0];
        }
      } else if (age === '3-5') {
        // Confidence Builders vs Creative Storytellers
        if (goal === 'express' || style === 'story') {
          recommended = matchingCourses.find(c => c.title.includes('Storytellers')) || matchingCourses[0];
        } else {
          recommended = matchingCourses.find(c => c.title.includes('Builders')) || matchingCourses[0];
        }
      } else {
        // Confidence Champions vs Junior Debate Circle
        if (goal === 'debate' || style === 'logic') {
          recommended = matchingCourses.find(c => c.title.includes('Debate')) || matchingCourses[0];
        } else {
          recommended = matchingCourses.find(c => c.title.includes('Champions')) || matchingCourses[0];
        }
      }
    }

    if (!recommended) recommended = allCourses[0];

    // Show Result Screen
    document.getElementById(`step${quizCurrentStep}`).classList.add('d-none');
    quizCurrentStep = 5; // Result state
    quizResultScreen.classList.remove('d-none');
    quizNextBtn.classList.add('d-none');

    // Populate recommend card
    recCourseTitle.textContent = recommended.title;
    recCourseAge.textContent = recommended.ageGroup;
    recCourseAge.className = 'age-badge';
    if (recommended.ageGroup.includes('K-2')) recCourseAge.classList.add('k-2');
    else if (recommended.ageGroup.includes('3-5')) recCourseAge.classList.add('3-5');
    else recCourseAge.classList.add('6-8');

    recCourseDesc.textContent = recommended.description;

    // View Details button triggers syllabus view
    // Remove previous listeners
    const newBtn = recViewDetailsBtn.cloneNode(true);
    recViewDetailsBtn.replaceWith(newBtn);
    newBtn.addEventListener('click', () => {
      openCourseDetails(recommended._id);
    });
  }


  // --- FORM SUBMISSIONS ---

  // Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        // notVerified flag: show a special styled message
        if (data.notVerified) {
          loginError.innerHTML = `
            <span style="color:#e67e22">
              <i class="fas fa-envelope me-1"></i>
              Your email is not verified yet. Please check your inbox and click the verification link.
            </span>`;
        } else {
          throw new Error(data.msg || 'Login failed');
        }
        return;
      }

      localStorage.setItem('token', data.token);
      token = data.token;
      authModal.classList.remove('active');
      loginForm.reset();
      checkAuthUser();
    } catch (err) {
      loginError.textContent = err.message;
    }
  });

  // Signup Submit
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      // Safe JSON parse: avoid crashing if server returns plain text
      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data.msg || 'Signup failed. Please try again.');
      }

      // Account created — show appropriate message
      signupForm.reset();
      signupForm.classList.add('d-none');

      const wrapper = signupForm.parentElement;
      const banner = document.createElement('div');
      banner.id = 'signupSuccessBanner';
      banner.style.cssText = 'text-align:center;padding:30px 10px;';

      if (data.emailSent === false) {
        // Email sending failed — show the verify link directly
        banner.innerHTML = `
          <div style="font-size:3rem;">⚠️</div>
          <h4 style="margin:16px 0 8px;color:#1a1a2e;">Account created!</h4>
          <p style="color:#555;line-height:1.6;">
            We couldn't send the verification email (email service issue).<br/>
            <strong>Click the link below to verify your account right now:</strong>
          </p>
          <a href="${data.verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
            ✅ Verify My Account
          </a>
          <p style="color:#999;font-size:12px;margin-top:8px;">Or paste this in your browser:<br/><span style="color:#4f46e5;word-break:break-all;">${data.verifyUrl}</span></p>
          <button class="btn-submit" style="margin-top:20px;" onclick="document.getElementById('authModal').classList.remove('active');document.getElementById('signupSuccessBanner').remove();document.getElementById('signupForm').classList.remove('d-none');">
            Close
          </button>
        `;
      } else {
        banner.innerHTML = `
          <div style="font-size:3rem;">📧</div>
          <h4 style="margin:16px 0 8px;color:#1a1a2e;">Check your inbox!</h4>
          <p style="color:#555;line-height:1.6;">
            We've sent a verification link to <strong>${email}</strong>.<br/>
            Click the link in the email to activate your account and log in.
          </p>
          ${data.verifyUrl ? `
          <div style="margin-top:20px;padding:15px;background:#f8f9fa;border-radius:8px;border:1px dashed #ccc;">
            <p style="color:#e67e22;font-size:14px;margin-bottom:10px;font-weight:bold;">⚠️ Email blocked by Antivirus?</p>
            <p style="color:#555;font-size:13px;margin-bottom:10px;">Click here to bypass email and verify instantly:</p>
            <a href="${data.verifyUrl}" style="display:inline-block;padding:8px 16px;background:#e67e22;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">✅ Verify Instantly</a>
          </div>` : ''}
          <button class="btn-submit" style="margin-top:20px;" onclick="document.getElementById('authModal').classList.remove('active');document.getElementById('signupSuccessBanner').remove();document.getElementById('signupForm').classList.remove('d-none');">
            Got it!
          </button>
        `;
      }

      wrapper.appendChild(banner);
    } catch (err) {
      signupError.textContent = err.message;
    }
  });

  // Checkout / Enrollment Submit
  enrollmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    checkoutError.textContent = '';
    const courseId = checkoutCourseId.value;
    const childName = childNameInput.value.trim();
    const childAge = childAgeInput.value;

    try {
      const res = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ courseId, childName, childAge })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || 'Enrollment failed');
      }

      // Success! Clear form and close modal
      enrollmentForm.reset();
      checkoutModal.classList.remove('active');

      // Seed default day 1 progress in localStorage for this new enrollment
      localStorage.setItem(`completed_days_${data.enrollment._id}`, JSON.stringify([1]));

      // Open dashboard panel & select enrollment tab
      dashboardPanel.classList.add('active');
      dashTabCoursesBtn.click();
    } catch (err) {
      checkoutError.textContent = err.message;
    }
  });

  // --- CORE UTILITY FUNCTIONS ---

  // Check user authorization state
  async function checkAuthUser() {
    if (!token) {
      currentUser = null;
      renderNavAuth(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Token expired or invalid');
      }
      currentUser = await res.json();
      renderNavAuth(true);
    } catch (err) {
      console.warn(err);
      localStorage.removeItem('token');
      token = null;
      currentUser = null;
      renderNavAuth(false);
    }
  }

  // Render Navbar right authentication section based on status
  function renderNavAuth(isLoggedIn) {
    if (isLoggedIn && currentUser) {
      navAuthSection.innerHTML = `
        <button class="btn-user-menu" id="openDashboardBtn">
          <i class="fas fa-user-circle text-orange"></i> Hi, ${currentUser.name.split(' ')[0]}
        </button>
        <button class="btn-login" id="logoutBtn" style="border-color: #666; color: #666;">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      `;

      // Bind dynamic actions
      document.getElementById('openDashboardBtn').addEventListener('click', () => {
        dashboardPanel.classList.add('active');
        dashTabCoursesBtn.click();
      });

      document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        token = null;
        currentUser = null;
        checkAuthUser();
        dashboardPanel.classList.remove('active');
      });
    } else {
      navAuthSection.innerHTML = `
        <button class="btn-login" id="openLoginBtn"><i class="fas fa-sign-in-alt me-1"></i> Login</button>
        <button class="btn-signup" id="openSignupBtn">Sign Up</button>
      `;

      // Re-bind listeners for static buttons loaded dynamically
      document.getElementById('openLoginBtn').addEventListener('click', () => {
        authModal.classList.add('active');
        tabLoginBtn.click();
      });
      document.getElementById('openSignupBtn').addEventListener('click', () => {
        authModal.classList.add('active');
        tabSignupBtn.click();
      });
    }
  }

  // Fetch available courses
  async function fetchCourses() {
    try {
      const res = await fetch('/api/courses?limit=50');
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      // API returns { total, page, totalPages, courses: [...] }
      allCourses = Array.isArray(data) ? data : (data.courses || []);
      applyFiltersAndRender();
    } catch (err) {
      console.error('Error fetching courses:', err);
      coursesGrid.innerHTML = `
        <div class="loading-spinner text-danger">
          <i class="fas fa-exclamation-triangle"></i> Failed to load courses. Please make sure MongoDB and the server are running.
        </div>
      `;
    }
  }

  // Filter & Sort core logic
  function applyFiltersAndRender() {
    const searchVal = courseSearch.value.toLowerCase().trim();
    const ageVal = filterAge.value;
    const sortVal = sortPrice.value;

    let filtered = [...allCourses];

    // Filter by Age
    if (ageVal !== 'all') {
      const tag = ageVal === 'k-2' ? 'K-2' : (ageVal === '3-5' ? '3-5' : '6-8');
      filtered = filtered.filter(course => course.ageGroup.includes(tag));
    }

    // Filter by Search Query
    if (searchVal !== '') {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchVal) ||
        course.description.toLowerCase().includes(searchVal)
      );
    }

    // Sort
    if (sortVal === 'low-high') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'high-low') {
      filtered.sort((a, b) => b.price - a.price);
    }

    renderCoursesGrid(filtered);
  }

  // Render course cards in grid
  function renderCoursesGrid(courses) {
    if (courses.length === 0) {
      coursesGrid.innerHTML = '<p class="text-center w-100 py-5 text-muted">No courses match your selection.</p>';
      return;
    }

    coursesGrid.innerHTML = courses.map(course => {
      let badgeClass = '3-5';
      if (course.ageGroup.includes('K-2')) badgeClass = 'k-2';
      else if (course.ageGroup.includes('6-8')) badgeClass = '6-8';

      return `
        <div class="course-card fade-in appear">
          <div class="course-card-header">
            <span class="age-badge ${badgeClass}">${course.ageGroup}</span>
            <h4 class="course-title">${course.title}</h4>
            <p class="course-description">${course.description}</p>
          </div>
          <div class="course-card-footer">
            <div class="course-price-info">
              <span class="course-price-label">Tuition fee</span>
              <span class="course-price">$${course.price}</span>
            </div>
            <button class="btn-enroll-card" data-id="${course._id}">Learn More</button>
          </div>
        </div>
      `;
    }).join('');

    // Bind event listeners for card details actions
    document.querySelectorAll('.btn-enroll-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const courseId = e.target.getAttribute('data-id');
        openCourseDetails(courseId);
      });
    });
  }

  // Open Details & Syllabus Modal
  function openCourseDetails(courseId) {
    const course = allCourses.find(c => c._id === courseId);
    if (!course) return;

    detailsCourseTitle.textContent = course.title;
    detailsCourseDesc.textContent = course.description;
    detailsCoursePrice.textContent = `$${course.price.toFixed(2)}`;

    detailsCourseAge.textContent = course.ageGroup;
    detailsCourseAge.className = 'age-badge';
    if (course.ageGroup.includes('K-2')) detailsCourseAge.classList.add('k-2');
    else if (course.ageGroup.includes('3-5')) detailsCourseAge.classList.add('3-5');
    else detailsCourseAge.classList.add('6-8');

    // Populate daily syllabus items
    if (course.syllabus && course.syllabus.length > 0) {
      detailsSyllabusDays.innerHTML = course.syllabus.map(day => `
        <div class="syllabus-day-item mb-2 p-3 bg-light rounded">
          <div class="d-flex align-items-center mb-1">
            <span class="badge badge-orange text-white me-2">Day ${day.day}</span>
            <h6 class="mb-0 fw-bold">${day.title}</h6>
          </div>
          <p class="small text-muted mb-0 ms-4 ps-2">${day.description}</p>
        </div>
      `).join('');
    } else {
      detailsSyllabusDays.innerHTML = '<p class="text-muted small">No syllabus details loaded.</p>';
    }

    detailsEnrollBtn.setAttribute('data-id', course._id);
    detailsModal.classList.add('active');
  }

  // Open checkout process
  function openEnrollmentCheckout(courseId) {
    if (!currentUser) {
      // Prompt auth first
      authModal.classList.add('active');
      tabSignupBtn.click();
      signupError.textContent = 'Please register or log in to enroll in a course.';
      return;
    }

    const course = allCourses.find(c => c._id === courseId);
    if (!course) return;

    checkoutCourseId.value = course._id;
    summaryCourseTitle.textContent = course.title;
    summaryCourseAge.textContent = course.ageGroup;
    summaryCoursePrice.textContent = `$${course.price.toFixed(2)}`;

    checkoutError.textContent = '';
    checkoutModal.classList.add('active');
  }

  // --- DASHBOARD LOADER FUNCTIONS ---

  // Load parent dashboard enrollments
  async function loadDashboardEnrollments() {
    dashboardEnrollmentList.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
      const res = await fetch('/api/courses/enrollments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const enrollments = await res.json();

      if (!res.ok) throw new Error();

      dashboardParentName.textContent = currentUser ? currentUser.name : 'Parent';

      if (enrollments.length === 0) {
        dashboardEnrollmentList.innerHTML = `
          <p class="text-muted text-center py-4">No active enrollments yet. Browse courses to get started!</p>
        `;
        return;
      }

      dashboardEnrollmentList.innerHTML = enrollments.map(enr => {
        // Calculate progress percentage
        let completed = [];
        try {
          const stored = localStorage.getItem(`completed_days_${enr._id}`);
          completed = stored ? JSON.parse(stored) : [1]; // Default to day 1 done
        } catch (e) {
          completed = [1];
        }
        const pct = Math.round((completed.length / 5) * 100);

        return `
          <div class="dash-enrollment-card">
            <h6>${enr.courseId.title}</h6>
            <span class="child-badge"><i class="fas fa-child me-1"></i> Child: ${enr.childName} (Age ${enr.childAge})</span>
            <div class="progress-container mt-2">
              <div class="progress-header">
                <span>Course Progress</span>
                <span>${pct}% (Day ${completed.length} of 5)</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${pct}%"></div>
              </div>
            </div>
            <button class="btn-submit btn-orange btn-sm mt-3 w-100 open-classroom-btn" data-id="${enr._id}">
              <i class="fas fa-chalkboard-teacher me-1"></i> Go to Classroom
            </button>
          </div>
        `;
      }).join('');

      // Add classroom view triggers
      document.querySelectorAll('.open-classroom-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const enrollId = btn.getAttribute('data-id');
          const enrollment = enrollments.find(e => e._id === enrollId);
          if (enrollment) {
            openClassroom(enrollment);
          }
        });
      });

    } catch (err) {
      dashboardEnrollmentList.innerHTML = `
        <p class="text-danger text-center py-4"><i class="fas fa-exclamation-circle"></i> Error retrieving enrollments.</p>
      `;
    }
  }

  // Open Classroom detailed tracker
  function openClassroom(enrollment) {
    activeEnrollment = enrollment;

    // Hide list section, show classroom view
    dashEnrollmentsSec.classList.add('d-none');
    dashBillingSec.classList.add('d-none');
    dashClassroomSec.classList.remove('d-none');

    classroomCourseTitle.textContent = enrollment.courseId.title;
    classroomChildName.innerHTML = `<i class="fas fa-child"></i> Student: <strong>${enrollment.childName}</strong> (Age ${enrollment.childAge})`;

    renderClassroomDays(enrollment);
  }

  // Render Daily Classroom syllabus tasks
  function renderClassroomDays(enrollment) {
    let completed = [];
    try {
      const stored = localStorage.getItem(`completed_days_${enrollment._id}`);
      completed = stored ? JSON.parse(stored) : [1];
    } catch (e) {
      completed = [1];
    }

    const pct = Math.round((completed.length / 5) * 100);
    classroomProgressFill.style.width = `${pct}%`;
    classroomProgressPercent.textContent = `${pct}%`;

    // Show/hide Certificate prompt
    if (completed.length === 5) {
      classroomCertSection.classList.remove('d-none');
      // Set up click action to open certificate
      downloadCertBtn.onclick = () => {
        openCertificate(enrollment);
      };
    } else {
      classroomCertSection.classList.add('d-none');
    }

    // Populate day list details
    const syllabus = enrollment.courseId.syllabus || [
      { day: 1, title: 'Day 1 Warmup', description: 'Introduction challenge' },
      { day: 2, title: 'Day 2 Presentation', description: 'Practice eye contact' },
      { day: 3, title: 'Day 3 Vocal control', description: 'Practice voice modulation' },
      { day: 4, title: 'Day 4 Peer exercise', description: 'Collaborate with a buddy' },
      { day: 5, title: 'Day 5 Graduation speech', description: 'Record graduation speech' }
    ];

    classroomDaysList.innerHTML = syllabus.map(day => {
      const isDone = completed.includes(day.day);
      const isOpen = day.day === 1 || completed.includes(day.day - 1) || isDone; // Unlock sequence
      const cardClass = isDone ? 'day-done' : (isOpen ? 'day-unlocked' : 'day-locked');
      const checkState = isDone ? 'checked' : '';
      const disabledState = isOpen ? '' : 'disabled';

      return `
        <div class="classroom-day-card p-3 mb-2 border rounded ${cardClass}">
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <span class="day-num-label">Day ${day.day}</span>
              <h6 class="mb-0 fw-bold">${day.title}</h6>
            </div>
            <div class="form-check">
              <input class="form-check-input day-completion-checkbox" type="checkbox" 
                data-day="${day.day}" ${checkState} ${disabledState}>
              <label class="form-check-label small text-muted">Complete</label>
            </div>
          </div>
          
          <div class="day-card-details mt-2 pl-4">
            <p class="small text-muted mb-2">${day.description}</p>
            ${isOpen ? `
              <div class="day-task-action p-2 bg-light rounded small mt-1">
                <i class="fas fa-play text-orange me-1"></i> <strong>Exercise:</strong> Read this lesson together and practice with your kid!
              </div>
            ` : `
              <div class="day-task-action p-2 bg-light rounded small text-muted mt-1">
                <i class="fas fa-lock me-1"></i> Unlock by completing Day ${day.day - 1} exercise first.
              </div>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Bind checkboxes to click
    document.querySelectorAll('.day-completion-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const clickedDay = parseInt(chk.getAttribute('data-day'));

        let completedDays = [];
        try {
          const stored = localStorage.getItem(`completed_days_${enrollment._id}`);
          completedDays = stored ? JSON.parse(stored) : [1];
        } catch (err) {
          completedDays = [1];
        }

        if (chk.checked) {
          if (!completedDays.includes(clickedDay)) {
            completedDays.push(clickedDay);
          }
        } else {
          completedDays = completedDays.filter(d => d !== clickedDay);
        }

        // Sort days
        completedDays.sort((a, b) => a - b);
        localStorage.setItem(`completed_days_${enrollment._id}`, JSON.stringify(completedDays));

        // Re-render
        renderClassroomDays(enrollment);
      });
    });
  }

  // Open Certificate modal
  function openCertificate(enrollment) {
    certChildName.textContent = enrollment.childName;
    certCourseTitle.textContent = enrollment.courseId.title;

    // Formatting today's date
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    certDate.textContent = new Date().toLocaleDateString('en-US', options);

    certificateModal.classList.add('active');
  }

  // Load parent dashboard invoices
  async function loadDashboardInvoices() {
    dashboardInvoiceList.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
      const res = await fetch('/api/billing/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const transactions = await res.json();

      if (!res.ok) throw new Error();

      if (transactions.length === 0) {
        dashboardInvoiceList.innerHTML = `
          <p class="text-muted text-center py-4">No invoices found.</p>
        `;
        return;
      }

      dashboardInvoiceList.innerHTML = transactions.map(txn => {
        const payDate = new Date(txn.paidAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        });
        const courseName = txn.enrollmentId && txn.enrollmentId.courseId
          ? txn.enrollmentId.courseId.title
          : 'Microcourse Tuition';

        return `
          <div class="dash-invoice-card">
            <div class="invoice-details">
              <span class="invoice-title">${courseName}</span>
              <span class="invoice-date">${payDate}</span>
              <span class="invoice-id">Receipt: ${txn.transactionId}</span>
            </div>
            <div class="invoice-amount-block">
              <span class="invoice-amount">$${txn.amount.toFixed(2)}</span>
              <div class="invoice-status"><i class="fas fa-check-circle me-1"></i>${txn.status}</div>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      dashboardInvoiceList.innerHTML = `
        <p class="text-danger text-center py-4"><i class="fas fa-exclamation-circle"></i> Error retrieving transactions.</p>
      `;
    }
  }

  // --- CHATBOT WIDGET CONTROLLER ---
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatWindow = document.getElementById('chatWindow');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const chatInputForm = document.getElementById('chatInputForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  if (chatToggleBtn && chatWindow) {
    // Open/Close toggle
    chatToggleBtn.addEventListener('click', () => {
      chatWindow.classList.toggle('active');
      // Hide the pulse badge on click
      const badge = chatToggleBtn.querySelector('.chat-badge-pulse');
      if (badge) badge.style.display = 'none';

      // Focus input
      if (chatWindow.classList.contains('active')) {
        setTimeout(() => chatInput.focus(), 300);
      }
    });

    if (closeChatBtn) {
      closeChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chatWindow.classList.remove('active');
      });
    }

    // Handle send message
    chatInputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const messageText = chatInput.value.trim();
      if (!messageText) return;

      // Append User message
      appendChatMessage(messageText, 'user');
      chatInput.value = '';

      // Generate bot response with simulation delay
      showChatbotTypingIndicator();

      setTimeout(() => {
        removeChatbotTypingIndicator();
        const response = generateChatbotResponse(messageText);
        appendChatMessage(response, 'bot');
      }, 1000 + Math.random() * 800); // 1.0s to 1.8s delay
    });

    // Handle quick reply clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-reply-pill')) {
        const query = e.target.getAttribute('data-query');
        const text = e.target.textContent;

        appendChatMessage(text, 'user');

        showChatbotTypingIndicator();
        setTimeout(() => {
          removeChatbotTypingIndicator();
          const response = generateChatbotResponse(query);
          appendChatMessage(response, 'bot');
        }, 800);
      }
    });
  }

  function appendChatMessage(text, sender) {
    // Remove old quick replies container so they always go at the very bottom
    const existingReplies = chatMessages.querySelector('.quick-replies-wrapper');
    if (existingReplies) {
      existingReplies.remove();
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}`;
    msgDiv.innerHTML = `<div class="msg-bubble">${text}</div>`;
    chatMessages.appendChild(msgDiv);

    // Re-append suggested quick replies if bot just sent a message
    if (sender === 'bot') {
      const repliesDiv = document.createElement('div');
      repliesDiv.className = 'quick-replies-wrapper mt-3';
      repliesDiv.innerHTML = `
        <span class="small text-muted d-block mb-1"><i class="fas fa-lightbulb"></i> Suggested Questions:</span>
        <div class="quick-reply-pills">
          <button class="quick-reply-pill" data-query="recommend a course">Which course suits my kid?</button>
          <button class="quick-reply-pill" data-query="prices">How much is tuition?</button>
          <button class="quick-reply-pill" data-query="overcoming shyness">How to help a shy child?</button>
          <button class="quick-reply-pill" data-query="what is the syllabus">Show me the syllabus</button>
        </div>
      `;
      chatMessages.appendChild(repliesDiv);
    }

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showChatbotTypingIndicator() {
    const existingIndicator = document.getElementById('chatTypingIndicator');
    if (existingIndicator) return;

    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'msg bot typing-msg';
    loaderDiv.id = 'chatTypingIndicator';
    loaderDiv.innerHTML = `
      <div class="msg-bubble bg-light py-2">
        <div class="typing-loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(loaderDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeChatbotTypingIndicator() {
    const indicator = document.getElementById('chatTypingIndicator');
    if (indicator) indicator.remove();
  }

  function generateChatbotResponse(query) {
    const text = query.toLowerCase().trim();

    // Recommend courses
    if (text.includes('recommend') || text.includes('which course') || text.includes('choice') || text.includes('suit') || text.includes('choose')) {
      return `I recommend using our **Confidence Assessment Quiz** (in the pink card section above) for a personalized choice! 
      
      But here is a quick guide:
      - For **Grades K-2** (Ages 5-8): Try **Confidence Explorers** (expression) or **Social Skills Safari** (friendship/empathy).
      - For **Grades 3-5** (Ages 8-11): Try **Confidence Builders** (public speaking) or **Creative Storytellers** (voice acting/drama).
      - For **Grades 6-8** (Ages 11-14): Try **Confidence Champions** (leadership/anxiety hacks) or **Junior Debate Circle** (structured logic).`;
    }

    // Prices
    if (text.includes('price') || text.includes('cost') || text.includes('fee') || text.includes('tuition') || text.includes('much is')) {
      return `Our microcourses range from **$29.00 to $65.00** depending on the specific program. 
      
      - **Confidence Explorers**: $29
      - **Social Skills Safari**: $35
      - **Creative Storytellers**: $45
      - **Confidence Builders**: $49
      - **Confidence Champions**: $59
      - **Junior Debate Circle**: $65
      
      Tuition covers all 5 days of live interactive sessions and assignments. No hidden fees!`;
    }

    // Syllabus
    if (text.includes('syllabus') || text.includes('what is the') || text.includes('schedule') || text.includes('day-by-day') || text.includes('curriculum')) {
      return `Each microcourse is structured as a **5-Day program**! You can explore the daily schedule by clicking **"Learn More"** on any course card in our catalog. 
      
      For example, in **Confidence Builders**, here is the curriculum:
      - **Day 1**: Breaking the Ice (Body language hacks)
      - **Day 2**: Speaking with Eyes (Eye contact practice)
      - **Day 3**: The Storyteller's Pitch (Voice modulation exercises)
      - **Day 4**: Impromptu Fun (Improv & quick-thinking games)
      - **Day 5**: Graduation (A 1-minute speech in front of peers)`;
    }

    // Help with shyness / confidence advice
    if (text.includes('shy') || text.includes('scared') || text.includes('anxiety') || text.includes('fear') || text.includes('overcoming shyness') || text.includes('stage fright')) {
      return `Help your child build confidence with these simple daily exercises at home:
      1. **Puppet play**: Shyer kids often express thoughts more comfortably when talking through a puppet or toy.
      2. **The "High/Low" Dinner game**: Ask your child to share the best and worst parts of their day. This fosters verbal expression in a comfortable environment.
      3. **Praise effort, not outcomes**: Emphasize their courage for speaking up, regardless of whether they stutered or made mistakes! 
      
      Our courses use these educational psychology principles to guide students step-by-step.`;
    }

    // Live or offline
    if (text.includes('live') || text.includes('online') || text.includes('offline') || text.includes('zoom') || text.includes('where is')) {
      return `All Scoreazy microcourses are **100% online**! Sessions are conducted live via secure video classrooms with our trained mentors. This makes it convenient to join from the comfort of your home.`;
    }

    // Age / Grades division
    if (text.includes('age') || text.includes('grade') || text.includes('k-2') || text.includes('3-5') || text.includes('6-8') || text.includes('teens')) {
      return `We group our programs into three developmental age bands to ensure classes are age-appropriate:
      - **Grades K-2** (approx. Ages 5-8): focus on play-based expression.
      - **Grades 3-5** (approx. Ages 8-11): focus on group sharing & speech variety.
      - **Grades 6-8** (approx. Ages 11-14): focus on leadership, anxiety-management, and debate.`;
    }

    // Hello / Greetings
    if (text.includes('hello') || text.includes('hi ') || text.startsWith('hi') || text.includes('hey') || text.includes('greetings')) {
      return `Hello! How can I help you today? Ask me about our courses, pricing, syllabus schedules, or tips for boosting child confidence! 😊`;
    }

    // Help / Support
    if (text.includes('help') || text.includes('support') || text.includes('contact') || text.includes('email') || text.includes('phone')) {
      return `For support, you can reach the Scoreazy team at **support@scoreazy.com**. If you have billing issues, you can review invoices in your **Parent Dashboard** after logging in.`;
    }

    // Default fallback response
    return `Thank you for asking! I'm here to help you navigate our courses and understand child confidence techniques. 
    
    Could you tell me a little more? For instance:
    - What is your child's age group?
    - Are you looking for public speaking, friendship skills, or debate?
    - Or would you like details about course tuition?`;
  }

  // ------------------------------------------------------------------
  // Handle ?verify=TOKEN in URL (called from email verification link)
  // ------------------------------------------------------------------
  async function handleVerifyToken() {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify');

    if (!verifyToken) return;

    // Clean the URL immediately so user doesn't share the token
    window.history.replaceState({}, document.title, window.location.pathname);

    // Show a loading toast
    showToast('⏳ Verifying your email, please wait...', '#4f46e5');

    try {
      const res = await fetch(`/api/auth/verify/${verifyToken}`);
      const data = await res.json();

      if (!res.ok) {
        showToast('❌ ' + (data.msg || 'Verification failed. The link may have already been used.'), '#e74c3c');
        return;
      }

      // Auto-login the user
      localStorage.setItem('token', data.token);
      token = data.token;
      await checkAuthUser();

      showToast('✅ Email verified! Welcome to Scoreazy, ' + data.user.name + '!', '#27ae60', 5000);
    } catch (err) {
      console.error('Verification error:', err);
      showToast('❌ Something went wrong during verification. Please try again.', '#e74c3c');
    }
  }

  // ------------------------------------------------------------------
  // Toast notification helper
  // ------------------------------------------------------------------
  function showToast(message, bgColor = '#333', duration = 4000) {
    const existing = document.getElementById('scoreazyToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'scoreazyToast';
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${bgColor};
      color: #fff;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      z-index: 99999;
      opacity: 0;
      transition: opacity 0.3s ease;
      max-width: 90vw;
      text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Fade in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
    });

    // Fade out and remove
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Mobile Menu Logic
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileCloseBtn = document.getElementById('mobileCloseBtn');
  const navMenuWrapper = document.getElementById('navMenuWrapper');
  const allNavLinks = document.querySelectorAll('.nav-links a');

  if (mobileMenuBtn && navMenuWrapper) {
    mobileMenuBtn.addEventListener('click', () => {
      navMenuWrapper.classList.add('active');
    });
  }

  if (mobileCloseBtn && navMenuWrapper) {
    mobileCloseBtn.addEventListener('click', () => {
      navMenuWrapper.classList.remove('active');
    });
  }

  // Close sidebar when a link is clicked
  if (allNavLinks.length > 0 && navMenuWrapper) {
    allNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenuWrapper.classList.remove('active');
      });
    });
  }

  // Close sidebar when login or signup buttons inside sidebar are clicked
  if (openLoginBtn && navMenuWrapper) {
    openLoginBtn.addEventListener('click', () => navMenuWrapper.classList.remove('active'));
  }
  if (openSignupBtn && navMenuWrapper) {
    openSignupBtn.addEventListener('click', () => navMenuWrapper.classList.remove('active'));
  }

});
