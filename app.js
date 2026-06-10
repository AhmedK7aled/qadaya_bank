(function () {
    'use strict';

    // === Config ===
    var PER_PAGE = 15;
    var currentPage = 1;
    var currentFiltered = [];

    // === DOM ===
    var qList = document.getElementById('question-list');
    var filterSubject = document.getElementById('filter-subject');
    var filterType = document.getElementById('filter-type');
    var filterStatus = document.getElementById('filter-status');
    var searchInput = document.getElementById('search-input');
    var searchClear = document.getElementById('search-clear');
    var questionCount = document.getElementById('question-count');
    var paginationEl = document.getElementById('pagination');

    var navQuestions = document.getElementById('nav-questions');
    var navProgress = document.getElementById('nav-progress');
    var viewQuestions = document.getElementById('questions-view');
    var viewProgress = document.getElementById('progress-view');
    var mainProgressChart = document.getElementById('main-progress-chart');
    var progressGrid = document.getElementById('progress-grid');
    var btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    var btnCloseSidebar = document.getElementById('btn-close-sidebar');
    var sidebar = document.getElementById('sidebar');
    var sidebarOverlay = document.getElementById('sidebar-overlay');

    var statTotal = document.getElementById('stat-total');
    var statCorrect = document.getElementById('stat-correct');
    var statWrong = document.getElementById('stat-wrong');
    var statBookmarked = document.getElementById('stat-bookmarked');
    var statPercent = document.getElementById('stat-percent');
    var progressBar = document.getElementById('progress-bar');

    var btnExport = document.getElementById('btn-export');
    var btnImportTrigger = document.getElementById('btn-import-trigger');
    var importFile = document.getElementById('import-file');
    var btnReset = document.getElementById('btn-reset');
    var btnDarkMode = document.getElementById('btn-dark-mode');
    var btnPrintAll = document.getElementById('btn-print-all');
    var btnPrintBookmarked = document.getElementById('btn-print-bookmarked');
    var btnPrintSubject = document.getElementById('btn-print-subject');
    var printSubjectSelect = document.getElementById('print-subject-select');
    var toastEl = document.getElementById('toast');

    // === Toast ===
    var toastTimer = null;
    function showToast(msg, type) {
        clearTimeout(toastTimer);
        toastEl.textContent = msg;
        toastEl.className = 'toast show ' + (type || '');
        toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 2200);
    }

    // === Dark Mode ===
    function applyDarkMode() {
        if (db.isDarkMode()) { document.body.classList.add('dark'); btnDarkMode.textContent = '☀️'; }
        else { document.body.classList.remove('dark'); btnDarkMode.textContent = '🌙'; }
    }
    applyDarkMode();
    btnDarkMode.addEventListener('click', function () { db.setDarkMode(!db.isDarkMode()); applyDarkMode(); });

    // === Stats ===
    var hasCelebrated = false;
    function updateStats() {
        var s = db.getStats();
        statTotal.textContent = s.total;
        statCorrect.textContent = s.correct;
        statWrong.textContent = s.wrong;
        statBookmarked.textContent = s.bookmarked;
        var pct = s.total > 0 ? Math.round((s.answered / s.total) * 100) : 0;
        statPercent.textContent = pct + '%';
        progressBar.style.width = pct + '%';

        if (pct === 100 && s.correct > 0 && !hasCelebrated) {
            hasCelebrated = true;
            if (window.confetti) {
                var duration = 3000;
                var end = Date.now() + duration;
                (function frame() {
                    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 9999 });
                    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 9999 });
                    if (Date.now() < end) requestAnimationFrame(frame);
                }());
            }
        }

        if (viewProgress && viewProgress.style.display !== 'none') {
            renderProgressView();
        }
    }

    // === Progress View Rendering ===
    function createCircleChart(percent, isMain) {
        var cls = isMain ? 'circular-chart main' : 'circular-chart';
        var colorClass = 'color-red';
        if (percent >= 75) colorClass = 'color-green';
        else if (percent >= 40) colorClass = 'color-orange';
        
        return '<svg viewBox="0 0 36 36" class="' + cls + '">' +
          '<path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />' +
          '<path class="circle ' + colorClass + '" stroke-dasharray="' + percent + ', 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />' +
          '<text x="18" y="20.35" class="percentage">' + percent + '%</text>' +
        '</svg>';
    }

    function renderProgressView() {
        if (!mainProgressChart || !progressGrid) return;
        var s = db.getStats();
        var mainPct = s.total > 0 ? Math.round((s.answered / s.total) * 100) : 0;
        mainProgressChart.innerHTML = createCircleChart(mainPct, true);

        var subjStats = db.getSubjectStats();
        var gridHtml = '';
        for (var subj in subjStats) {
            var ss = subjStats[subj];
            var pct = ss.total > 0 ? Math.round((ss.answered / ss.total) * 100) : 0;
            gridHtml += '<div class="subject-stat-card">' +
                '<h3>' + subj + '</h3>' +
                createCircleChart(pct, false) +
                '<div class="stat-details">' +
                    '<div><span>الإجمالي</span>' + ss.total + '</div>' +
                    '<div style="color:#10B981"><span>صحيح</span>' + ss.correct + '</div>' +
                    '<div style="color:#EF4444"><span>خاطئ</span>' + ss.wrong + '</div>' +
                '</div>' +
            '</div>';
        }
        progressGrid.innerHTML = gridHtml;
    }

    // === Navigation ===
    if (navQuestions) navQuestions.addEventListener('click', function() {
        navQuestions.classList.add('active');
        if (navProgress) navProgress.classList.remove('active');
        viewQuestions.style.display = 'block';
        viewProgress.style.display = 'none';
        if (window.innerWidth <= 768) toggleSidebar();
    });
    if (navProgress) navProgress.addEventListener('click', function() {
        navProgress.classList.add('active');
        if (navQuestions) navQuestions.classList.remove('active');
        viewQuestions.style.display = 'none';
        viewProgress.style.display = 'block';
        renderProgressView();
        if (window.innerWidth <= 768) toggleSidebar();
    });

    // === Filter ===
    function getFilteredQuestions() {
        var questions = db.getAllQuestions();
        var sVal = filterSubject.value;
        var tVal = filterType.value;
        var stVal = filterStatus.value;
        var qStr = searchInput.value.trim().toLowerCase();

        return questions.filter(function (q) {
            if (sVal !== 'all' && q.subject !== sVal) return false;
            if (tVal !== 'all' && q.type !== tVal) return false;
            if (stVal === 'unanswered' && q.userAnswer !== null && q.userAnswer !== undefined) return false;
            if (stVal === 'correct' && !q.isCorrect) return false;
            if (stVal === 'wrong' && q.isCorrect !== false) return false;
            if (stVal === 'bookmarked' && !q.isBookmarked) return false;

            if (qStr !== '') {
                var matchText = q.text.toLowerCase().indexOf(qStr) > -1;
                var matchOptions = false;
                if (q.options) {
                    for (var i = 0; i < q.options.length; i++) {
                        if (q.options[i].toLowerCase().indexOf(qStr) > -1) {
                            matchOptions = true; break;
                        }
                    }
                }
                if (!matchText && !matchOptions) return false;
            }

            return true;
        });
    }

    // === Pagination ===
    function getTotalPages() { return Math.max(1, Math.ceil(currentFiltered.length / PER_PAGE)); }

    function renderPagination() {
        paginationEl.innerHTML = '';
        var total = getTotalPages();
        if (total <= 1) return;

        // Prev
        var prev = document.createElement('button');
        prev.textContent = '«';
        prev.disabled = (currentPage <= 1);
        prev.addEventListener('click', function () { goToPage(currentPage - 1); });
        paginationEl.appendChild(prev);

        // Page numbers (smart range)
        var start = Math.max(1, currentPage - 2);
        var end = Math.min(total, currentPage + 2);
        if (start > 1) {
            appendPageBtn(1);
            if (start > 2) { var dots = document.createElement('span'); dots.className = 'page-info'; dots.textContent = '…'; paginationEl.appendChild(dots); }
        }
        for (var i = start; i <= end; i++) appendPageBtn(i);
        if (end < total) {
            if (end < total - 1) { var dots2 = document.createElement('span'); dots2.className = 'page-info'; dots2.textContent = '…'; paginationEl.appendChild(dots2); }
            appendPageBtn(total);
        }

        // Next
        var next = document.createElement('button');
        next.textContent = '»';
        next.disabled = (currentPage >= total);
        next.addEventListener('click', function () { goToPage(currentPage + 1); });
        paginationEl.appendChild(next);

        // Info
        var info = document.createElement('span');
        info.className = 'page-info';
        info.textContent = 'صفحة ' + currentPage + ' من ' + total;
        paginationEl.appendChild(info);
    }

    function appendPageBtn(num) {
        var b = document.createElement('button');
        b.textContent = num;
        if (num === currentPage) b.className = 'active';
        b.addEventListener('click', function () { goToPage(num); });
        paginationEl.appendChild(b);
    }

    function goToPage(p) {
        currentPage = p;
        renderCurrentPage();
        renderPagination();
        window.scrollTo({ top: qList.offsetTop - 20, behavior: 'smooth' });
    }

    // === Intersection Observer & Keyboard Navigation ===
    var activeQuestionId = null;
    var qObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if(entry.isIntersecting) {
                document.querySelectorAll('.question-card').forEach(function(c) {
                    c.classList.remove('focused-question');
                });
                entry.target.classList.add('focused-question');
                activeQuestionId = entry.target.id.replace('q-', '');
            }
        });
    }, { rootMargin: '-30% 0px -50% 0px', threshold: 0 });

    document.addEventListener('keydown', function(e) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        if (!activeQuestionId) return;
        var card = document.getElementById('q-' + activeQuestionId);
        if (!card) return;
        
        var q = currentFiltered.find(function(item) { return item.id === activeQuestionId; });
        if (!q || (q.userAnswer !== null && q.userAnswer !== undefined)) return; 

        if (q.type === 'صح/خطأ') {
            if (e.key === 'y' || e.key === 'Y' || e.key === 'ص') {
                var btn = card.querySelector('.tf-sah');
                if (btn) btn.click();
            } else if (e.key === 'n' || e.key === 'N' || e.key === 'خ') {
                var btn = card.querySelector('.tf-khata');
                if (btn) btn.click();
            }
        } else if (q.type === 'اختيار من متعدد') {
            if (['1', '2', '3', '4'].indexOf(e.key) > -1) {
                var idx = parseInt(e.key) - 1;
                var opts = card.querySelectorAll('.mcq-option');
                if (opts[idx]) opts[idx].click();
            }
        }
    });

    // === Render ===
    function renderQuestions() {
        currentFiltered = getFilteredQuestions();
        currentPage = 1;
        questionCount.textContent = 'عدد الأسئلة: ' + currentFiltered.length;
        renderCurrentPage();
        renderPagination();
    }

    function renderCurrentPage() {
        qList.innerHTML = '';
        if (qObserver) qObserver.disconnect();
        
        if (currentFiltered.length === 0) {
            qList.innerHTML = '<div class="empty-state">لا توجد أسئلة تطابق الفلاتر الحالية.</div>';
            return;
        }
        var start = (currentPage - 1) * PER_PAGE;
        var end = Math.min(start + PER_PAGE, currentFiltered.length);
        for (var idx = start; idx < end; idx++) {
            var card = buildCard(currentFiltered[idx]);
            qList.appendChild(card);
            if (qObserver) qObserver.observe(card);
        }
        attachCardListeners();
    }

    function highlightText(text, query) {
        if (!query) return text;
        var regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
        return text.replace(regex, '<mark class="highlight">$1</mark>');
    }
    
    function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function parseMarkdown(text) {
        if (!text) return '';
        var html = text;

        var parts = html.split(/(<[^>]*>)/);
        for (var i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                parts[i] = parts[i].replace(/([A-Za-z][A-Za-z0-9\-_]*(?:\s+[A-Za-z0-9\-_]+)*)/g, '<span class="english-text" dir="ltr">$1</span>');
            }
        }
        html = parts.join('');

        // Headings
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        // Replace trailing/standalone ## with dots for fill-in-the-blank
        html = html.replace(/##/g, '........');
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Underline
        html = html.replace(/__(.*?)__/g, '<u>$1</u>');
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function buildCard(q) {
        var qStr = searchInput.value.trim();
        var card = document.createElement('div');
        var cls = 'question-card';
        if (q.isCorrect === true) cls += ' answered-correct';
        else if (q.isCorrect === false) cls += ' answered-wrong';
        if (q.isBookmarked) cls += ' bookmarked';
        card.className = cls;
        card.id = 'q-' + q.id;

        var answered = (q.userAnswer !== null && q.userAnswer !== undefined);
        var typeBadge = q.type === 'صح/خطأ'
            ? '<span class="badge badge-tf">صح / خطأ</span>'
            : '<span class="badge badge-mcq">اختيار من متعدد</span>';

        var interactiveHtml = '';
        if (q.type === 'صح/خطأ') {
            var sahC = '', khaC = '';
            if (answered) {
                if (q.answer === 'صح') { sahC = 'option-correct'; if (q.userAnswer !== 'صح') khaC = 'option-wrong-selected'; }
                else { khaC = 'option-correct'; if (q.userAnswer !== 'خطأ') sahC = 'option-wrong-selected'; }
            }
            interactiveHtml =
                '<div class="tf-buttons">' +
                '<button class="tf-btn tf-sah ' + sahC + '" data-id="' + q.id + '" data-answer="صح" ' + (answered ? 'disabled' : '') + '>✔ صح</button>' +
                '<button class="tf-btn tf-khata ' + khaC + '" data-id="' + q.id + '" data-answer="خطأ" ' + (answered ? 'disabled' : '') + '>✖ خطأ</button>' +
                '</div>';
        } else {
            interactiveHtml = '<ul class="q-options">';
            if (q.options) {
                q.options.forEach(function (opt) {
                    var oc = '';
                    if (answered) {
                        if (q.answer === opt || opt.indexOf(q.answer) === 0 || q.answer.indexOf(opt.substring(0, 2)) === 0) oc = 'option-correct';
                        if (q.userAnswer === opt && q.userAnswer !== q.answer && !(q.answer === opt || opt.indexOf(q.answer) === 0 || q.answer.indexOf(opt.substring(0, 2)) === 0)) oc = 'option-wrong-selected';
                    }
                    interactiveHtml += '<li class="mcq-option ' + oc + '" data-id="' + q.id + '" data-option="' + escapeAttr(opt) + '" ' + (answered ? 'style="pointer-events:none"' : '') + '>' + highlightText(parseMarkdown(opt), qStr) + '</li>';
                });
            }
            interactiveHtml += '</ul>';
        }

        var resultHtml = '';
        if (answered) {
            resultHtml = q.isCorrect
                ? '<div class="result-badge result-correct">✔ إجابة صحيحة!</div>'
                : '<div class="result-badge result-wrong">✖ إجابة خاطئة — الإجابة: ' + q.answer + '</div>';
        }

        var bookmarkIconOutline = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';
        var bookmarkIconFilled = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>';
        var bookmarkHtml = (q.isBookmarked ? bookmarkIconFilled + ' محفوظ' : bookmarkIconOutline + ' حفظ');

        card.innerHTML =
            '<div class="q-header">' +
            '<div class="q-meta">' + typeBadge + '<span class="q-subject">' + q.subject + '</span></div>' +
            '<div class="q-actions"><button class="btn-bookmark ' + (q.isBookmarked ? 'active' : '') + '" data-id="' + q.id + '">' + bookmarkHtml + '</button></div>' +
            '</div>' +
            '<div class="q-text">' + highlightText(parseMarkdown(q.text), qStr) + '</div>' +
            interactiveHtml + resultHtml;
        return card;
    }

    function escapeAttr(s) { return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function unescapeAttr(s) { var d = document.createElement('div'); d.innerHTML = s; return d.textContent; }

    // === Card Listeners ===
    function attachCardListeners() {
        var bk = document.querySelectorAll('.btn-bookmark');
        for (var i = 0; i < bk.length; i++) bk[i].addEventListener('click', function () {
            var n = db.toggleBookmark(this.getAttribute('data-id'));
            showToast(n ? '🔖 تم الحفظ' : '🔖 تمت الإزالة', n ? 'toast-success' : '');
            currentFiltered = getFilteredQuestions(); updateStats(); renderCurrentPage(); renderPagination();
        });
        var tf = document.querySelectorAll('.tf-btn');
        for (var j = 0; j < tf.length; j++) tf[j].addEventListener('click', function () {
            var qId = this.getAttribute('data-id');
            var ok = db.answerQuestion(qId, this.getAttribute('data-answer'));
            if (!ok) {
                var card = document.getElementById('q-' + qId);
                if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
            }
            showToast(ok ? '✔ أحسنت! 🎉' : '✖ خاطئة', ok ? 'toast-success' : 'toast-wrong');
            currentFiltered = getFilteredQuestions(); updateStats(); renderCurrentPage(); renderPagination();
            if (ok) {
                setTimeout(function() {
                    var card = document.getElementById('q-' + qId);
                    if (card && card.nextElementSibling && !card.nextElementSibling.classList.contains('answered-correct') && !card.nextElementSibling.classList.contains('answered-wrong')) {
                        card.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        });
        var mc = document.querySelectorAll('.mcq-option');
        for (var k = 0; k < mc.length; k++) mc[k].addEventListener('click', function () {
            var qId = this.getAttribute('data-id');
            var ok = db.answerQuestion(qId, unescapeAttr(this.getAttribute('data-option')));
            if (!ok) {
                var card = document.getElementById('q-' + qId);
                if (card) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
            }
            showToast(ok ? '✔ أحسنت! 🎉' : '✖ خاطئة', ok ? 'toast-success' : 'toast-wrong');
            currentFiltered = getFilteredQuestions(); updateStats(); renderCurrentPage(); renderPagination();
            if (ok) {
                setTimeout(function() {
                    var card = document.getElementById('q-' + qId);
                    if (card && card.nextElementSibling && !card.nextElementSibling.classList.contains('answered-correct') && !card.nextElementSibling.classList.contains('answered-wrong')) {
                        card.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        });
    }

    // ======================================================
    //  PRINT ENGINE
    // ======================================================
    function buildPrintHTML(title, questionsArr, noAnswers) {
        var grouped = {};
        questionsArr.forEach(function (q) {
            if (!grouped[q.subject]) grouped[q.subject] = [];
            grouped[q.subject].push(q);
        });

        var h = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">';
        h += '<title>' + title + '</title><style>';
        h += '@import url("https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap");';
        h += '*{box-sizing:border-box;margin:0;padding:0}';
        h += 'body{font-family:"Tajawal",sans-serif;direction:rtl;color:#334155;padding:30px 40px;line-height:1.8;background:#fff;}';
        h += '.hdr{text-align:center;border-bottom:3px solid #E2E8F0;padding-bottom:18px;margin-bottom:30px}';
        h += '.hdr h1{font-size:1.8rem;color:#2563EB;margin-bottom:4px;font-weight:800;}';
        h += '.hdr .sub{font-size:.95rem;color:#64748B}';
        h += '.hdr .cnt{font-size:1rem;color:#334155;margin-top:4px;font-weight:500;}';
        h += '.sec{margin-bottom:30px;page-break-inside:avoid}';
        h += '.sec-title{font-size:1.3rem;color:#3B82F6;border-bottom:2px solid #DBEAFE;padding-bottom:6px;margin-bottom:14px;font-weight:700;}';
        h += '.qi{margin-bottom:16px;padding:14px 16px;border:1px solid #E2E8F0;border-radius:12px;page-break-inside:avoid;background:#F8FAFC}';
        h += '.qi-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}';
        h += '.qi-num{font-size:.85rem;color:#64748B;font-weight:700;background:#E2E8F0;padding:3px 10px;border-radius:6px}';
        h += '.qi-type{font-size:.8rem;padding:3px 10px;border-radius:12px;font-weight:700}';
        h += '.qi-tf{background:#DBEAFE;color:#1E40AF}.qi-mcq{background:#F3E8FF;color:#6B21A8}';
        h += '.qi-text{font-size:1.1rem;font-weight:700;margin-bottom:8px;color:#1E293B}';
        h += '.qi-opts{list-style:none;padding:0}.qi-opts li{padding:6px 12px;margin-bottom:4px;background:#EEF2FF;border-radius:8px;font-size:1rem;color:#334155;}';
        h += '.qi-ans{font-size:.95rem;color:#10B981;font-weight:700;margin-top:8px}';
        h += '.english-text{color:#2563EB;font-family:sans-serif;font-weight:800;padding:0 4px;direction:ltr;unicode-bidi:embed;display:inline-block}';
        h += '.ftr{text-align:center;color:#94A3B8;font-size:.85rem;border-top:1px solid #E2E8F0;padding-top:14px}';
        h += '@page{margin:15mm;@bottom-center{content:"صفحة " counter(page);font-family:"Tajawal",sans-serif;font-size:12px;color:#64748B}}';
        h += '@media print{body{padding:0}.qi{border:1px solid #CBD5E1;background:#fff}.sec,.qi{page-break-inside:avoid}}';
        h += '</style></head><body>';

        h += '<div class="hdr"><h1>📚 ' + title + '</h1>';
        h += '<div class="cnt">عدد الأسئلة: ' + questionsArr.length + '</div>';
        if (noAnswers) h += '<div class="sub">(نسخة الطالب)</div>';
        h += '</div>';

        var c = 0;
        var subjects = Object.keys(grouped);
        for (var s = 0; s < subjects.length; s++) {
            var sub = subjects[s];
            var qs = grouped[sub];
            h += '<div class="sec"><h2 class="sec-title">📌 ' + sub + ' (' + qs.length + ' سؤال)</h2>';
            for (var i = 0; i < qs.length; i++) {
                c++;
                var q = qs[i];
                var tc = q.type === 'صح/خطأ' ? 'qi-tf' : 'qi-mcq';
                var tl = q.type === 'صح/خطأ' ? 'صح / خطأ' : 'اختيار من متعدد';
                h += '<div class="qi"><div class="qi-hdr"><span class="qi-num">س' + c + '</span><span class="qi-type ' + tc + '">' + tl + '</span></div>';
                h += '<div class="qi-text">' + parseMarkdown(q.text) + '</div>';
                if (q.options && q.options.length) {
                    h += '<ul class="qi-opts">';
                    for (var j = 0; j < q.options.length; j++) h += '<li>' + parseMarkdown(q.options[j]) + '</li>';
                    h += '</ul>';
                }
                if (!noAnswers) {
                    var ansColor = (q.answer === 'خطأ') ? ' style="color:#EF4444;"' : '';
                    var ansIcon = (q.answer === 'خطأ') ? '✖' : '✔';
                    h += '<div class="qi-ans"' + ansColor + '>' + ansIcon + ' الإجابة: ' + q.answer + '</div>';
                }
                h += '</div>';
            }
            h += '</div>';
        }

        h += '<div class="ftr">تم إعداد هذا الملف بواسطة بنك أسئلة القضايا المجتمعية</div>';
        h += '<script>window.onload=function(){setTimeout(function(){window.print();}, 500)};<\/script></body></html>';
        return h;
    }

    function openPrint(title, arr) {
        if (!arr.length) { showToast('لا توجد أسئلة للطباعة', 'toast-wrong'); return; }
        var noAns = document.getElementById('print-no-answers').checked;
        var w = window.open('', '_blank');
        w.document.write(buildPrintHTML(title, arr, noAns));
        w.document.close();
    }

    // Print All
    btnPrintAll.addEventListener('click', function () {
        var noAns = document.getElementById('print-no-answers').checked;
        openPrint('جميع الأسئلة - بنك أسئلة القضايا المجتمعية', db.getAllQuestions(), noAns);
    });

    // Print Bookmarked
    btnPrintBookmarked.addEventListener('click', function () {
        var noAns = document.getElementById('print-no-answers').checked;
        var bk = db.getAllQuestions().filter(function (q) { return q.isBookmarked; });
        openPrint('الأسئلة المحفوظة 🔖', bk, noAns);
    });

    // Print by Subject
    btnPrintSubject.addEventListener('click', function () {
        var sub = printSubjectSelect.value;
        if (!sub) { showToast('اختر موضوعاً أولاً', 'toast-wrong'); return; }
        var noAns = document.getElementById('print-no-answers').checked;
        var qs = db.getAllQuestions().filter(function (q) { return q.subject === sub; });
        openPrint(sub, qs, noAns);
    });

    // === Data Controls ===
    btnExport.addEventListener('click', function () { db.exportData(); });
    btnImportTrigger.addEventListener('click', function () { importFile.click(); });
    importFile.addEventListener('change', function () {
        var f = this.files[0]; if (!f) return;
        var r = new FileReader();
        r.onload = function (e) {
            if (db.importData(e.target.result)) { showToast('✅ تم الاستيراد!', 'toast-success'); updateStats(); renderQuestions(); }
            else showToast('❌ خطأ في الملف', 'toast-wrong');
        };
        r.readAsText(f); this.value = '';
    });
    btnReset.addEventListener('click', function () {
        if (confirm('⚠️ هل أنت متأكد من إعادة تعيين كل التقدم؟')) {
            db.resetProgress(); updateStats(); renderQuestions();
            showToast('تمت إعادة التعيين', '');
        }
    });

    // === Filters ===
    filterSubject.addEventListener('change', function () { renderQuestions(); });
    filterType.addEventListener('change', function () { renderQuestions(); });
    filterStatus.addEventListener('change', function () { renderQuestions(); });

    // === Search ===
    searchInput.addEventListener('input', function () {
        searchClear.className = this.value.trim() ? 'search-clear visible' : 'search-clear';
        renderQuestions();
    });
    searchClear.addEventListener('click', function () {
        searchInput.value = '';
        this.className = 'search-clear';
        renderQuestions();
    });

    // === Sidebar Toggle ===
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    }
    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', toggleSidebar);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // === Back to Top ===
    var btnBackToTop = document.getElementById('btn-back-to-top');
    if (btnBackToTop) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 300) btnBackToTop.classList.add('visible');
            else btnBackToTop.classList.remove('visible');
        });
        btnBackToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // === Init ===
    updateStats();
    renderQuestions();
})();
