// db.js - إدارة البيانات والحفظ التلقائي (Autosave)

var STORAGE_KEY = 'qadaya_web_progress';
var DARK_MODE_KEY = 'qadaya_dark_mode';

var db = {
    _allQuestions: null,

    _loadAll: function () {
        if (this._allQuestions) return this._allQuestions;
        this._allQuestions = [].concat(tf1_data, tf2_data, tf3_data, tf4_data, mcq5_data, q6_data);
        return this._allQuestions;
    },

    getAllQuestions: function () {
        var all = this._loadAll();
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        return all.map(function (q) {
            var p = saved[q.id];
            if (p) {
                return Object.assign({}, q, p);
            }
            return Object.assign({}, q, {
                isBookmarked: false,
                userAnswer: null,    // الإجابة التي اختارها المستخدم
                isCorrect: null      // هل الإجابة صحيحة؟
            });
        });
    },

    saveProgress: function (id, data) {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        if (!saved[id]) saved[id] = {};
        Object.assign(saved[id], data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    },

    answerQuestion: function (id, userAnswer) {
        var all = this._loadAll();
        var q = null;
        for (var i = 0; i < all.length; i++) {
            if (all[i].id === id) { q = all[i]; break; }
        }
        if (!q) return null;
        var isCorrect = (userAnswer === q.answer);
        this.saveProgress(id, { userAnswer: userAnswer, isCorrect: isCorrect });
        return isCorrect;
    },

    toggleBookmark: function (id) {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        var current = (saved[id] && saved[id].isBookmarked) || false;
        this.saveProgress(id, { isBookmarked: !current });
        return !current;
    },

    getStats: function () {
        var qs = this.getAllQuestions();
        var total = qs.length;
        var answered = 0, correct = 0, wrong = 0, bookmarked = 0;
        for (var i = 0; i < qs.length; i++) {
            if (qs[i].userAnswer !== null && qs[i].userAnswer !== undefined) {
                answered++;
                if (qs[i].isCorrect) correct++;
                else wrong++;
            }
            if (qs[i].isBookmarked) bookmarked++;
        }
        return { total: total, answered: answered, correct: correct, wrong: wrong, bookmarked: bookmarked };
    },

    getSubjectStats: function () {
        var qs = this.getAllQuestions();
        var stats = {};
        for (var i = 0; i < qs.length; i++) {
            var subj = qs[i].subject;
            if (!stats[subj]) {
                stats[subj] = { total: 0, answered: 0, correct: 0, wrong: 0 };
            }
            stats[subj].total++;
            if (qs[i].userAnswer !== null && qs[i].userAnswer !== undefined) {
                stats[subj].answered++;
                if (qs[i].isCorrect) stats[subj].correct++;
                else stats[subj].wrong++;
            }
        }
        return stats;
    },

    exportData: function () {
        var data = localStorage.getItem(STORAGE_KEY) || "{}";
        var blob = new Blob([data], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = "qadaya_progress.json";
        a.click();
        URL.revokeObjectURL(url);
    },

    importData: function (jsonString) {
        try {
            var data = JSON.parse(jsonString);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) { return false; }
    },

    resetProgress: function () {
        localStorage.removeItem(STORAGE_KEY);
        this._allQuestions = null;
    },

    // Dark mode
    isDarkMode: function () {
        return localStorage.getItem(DARK_MODE_KEY) === 'true';
    },
    setDarkMode: function (val) {
        localStorage.setItem(DARK_MODE_KEY, val ? 'true' : 'false');
    }
};
