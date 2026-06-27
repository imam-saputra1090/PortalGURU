// Portal Siswa JS Logic
(function() {
  var conf = window.CONFIG;

  var SS_student = null;
  var uploadedPhotoBase64 = "";
  var SS_journals = [];

  document.addEventListener("DOMContentLoaded", function() {
    var tglInput = document.getElementById("j-date");
    if (tglInput) tglInput.value = new Date().toISOString().split("T")[0];

    var saved = localStorage.getItem(conf.KEY_CUR_STUDENT);
    if (saved) {
      try {
        SS_student = JSON.parse(saved);
        loadSJ();
        showSDash();
      } catch(e) {
        localStorage.removeItem(conf.KEY_CUR_STUDENT);
      }
    }
    fillDropdown();
  });

  function fillDropdown() {
    var sel = document.getElementById("s-select");
    if (!sel) return;
    var local = [];
    try { local = JSON.parse(localStorage.getItem(conf.KEY_STUDENTS) || "[]"); } catch(e) {}
    populateSel(sel, local);

    if (!conf.GAS_URL) return;
    fetch(conf.GAS_URL, { cache: "no-cache" })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.placements && d.placements.length) {
          var mapped = d.placements.map(function(p) {
            return { name: p.siswa, dudi: p.bengkel, supervisor: p.pembimbing };
          });
          localStorage.setItem(conf.KEY_STUDENTS, JSON.stringify(mapped));
          populateSel(sel, mapped);
        }
      })
      .catch(function(err) { console.log("GAS dropdown skip:", err.message); });
  }

  function populateSel(sel, list) {
    var inds = [];
    list.forEach(function(item) {
      var names = (item.name || "").split(",");
      names.forEach(function(n) {
        var nm = n.trim();
        if (nm && !inds.some(function(x) { return x.name === nm; })) {
          inds.push({ name: nm, dudi: item.dudi || "", supervisor: item.supervisor || "" });
        }
      });
    });
    inds.sort(function(a, b) { return a.name.localeCompare(b.name); });
    sel.innerHTML = '<option value="">-- Pilih nama Anda --</option>';
    inds.forEach(function(s) {
      var o = document.createElement("option");
      o.value = s.name;
      o.dataset.dudi = s.dudi;
      o.dataset.sup = s.supervisor;
      o.textContent = s.name + (s.dudi ? " (" + s.dudi + ")" : "");
      sel.appendChild(o);
    });
    if (!inds.length) {
      sel.innerHTML = '<option value="">-- Nama belum terdaftar di Portal Guru --</option>';
    }
  }

  function doSiswaLogin(e) {
    e.preventDefault();
    var sel = document.getElementById("s-select");
    var wa = (document.getElementById("s-wa").value || "").trim();
    var name = sel.value;
    if (!name || !wa) { toast("Lengkapi Data", "Pilih nama dan isi WA/NISN.", "err"); return; }

    var opt = sel.options[sel.selectedIndex];
    SS_student = {
      name: name,
      wa: wa,
      dudi: opt.dataset.dudi || "",
      supervisor: opt.dataset.sup || ""
    };
    localStorage.setItem(conf.KEY_CUR_STUDENT, JSON.stringify(SS_student));
    loadSJ();
    showSDash();
    toast("Selamat Datang", "Halo " + name + "! Selamat menulis jurnal hari ini.");
  }

  function doSiswaLogout() {
    if (!confirm("Keluar dari sesi siswa?")) return;
    localStorage.removeItem(conf.KEY_CUR_STUDENT);
    location.reload();
  }

  function showSDash() {
    document.getElementById("s-auth").style.display = "none";
    var dash = document.getElementById("s-dash");
    // let CSS class shown handle grid display
    dash.className = "dash-page shown";
    var mnav = document.getElementById("s-mn");
    if (mnav) mnav.style.display = "flex";
    var s = SS_student;
    var init = (s.name || "S").charAt(0).toUpperCase();
    document.getElementById("ss-av").textContent = init;
    document.getElementById("ss-name").textContent = s.name;
    document.getElementById("ss-dudi").textContent = "DUDI: " + (s.dudi || "-");
    document.getElementById("ss-wa").textContent = "WA: " + s.wa;
    var jDudi = document.getElementById("j-dudi");
    if (jDudi) jDudi.value = s.dudi || "";
    document.getElementById("ss-head").textContent = "Pembimbing: " + (s.supervisor || "Guru Pamong");
    renderMyJurnal();
  }

  function loadSJ() {
    var key = conf.KEY_STUDENT_JOURNAL_PREFIX + (SS_student ? SS_student.name : "");
    try { SS_journals = JSON.parse(localStorage.getItem(key) || "[]"); } catch(e) { SS_journals = []; }
  }

  function saveSJ() {
    var key = conf.KEY_STUDENT_JOURNAL_PREFIX + (SS_student ? SS_student.name : "");
    localStorage.setItem(key, JSON.stringify(SS_journals));
  }

  var STABS = ["tulis", "riwayat"];
  function sSwitch(id) {
    STABS.forEach(function(t) {
      var tc = document.getElementById("tc-" + t);
      var nv = document.getElementById("nv-" + t);
      var mn = document.getElementById("mn-" + t);
      if (tc) {
        if (t === id) {
          tc.style.display = "block";
          tc.className = "tab-content active";
        } else {
          tc.style.display = "none";
          tc.className = "tab-content";
        }
      }
      if (nv) nv.className = "nav-item" + (t === id ? " active" : "");
      if (mn) mn.className = "m-btn" + (t === id ? " active" : "");
    });
    if (id === "riwayat") renderMyJurnal();
  }

  function saveJurnal(e) {
    e.preventDefault();
    var date = document.getElementById("j-date").value;
    var dudi = (document.getElementById("j-dudi").value || "").trim();
    var act  = (document.getElementById("j-act").value  || "").trim();
    var isu  = (document.getElementById("j-isu").value  || "").trim();
    if (!date || !act) { toast("Data Kurang", "Isi tanggal dan aktivitas.", "err"); return; }

    var entry = {
      id: Date.now(),
      studentName: SS_student.name,
      wa: SS_student.wa,
      dudi: dudi,
      date: date,
      content: act,
      issue: isu,
      photo: uploadedPhotoBase64 || "", // Store base64 photo locally
      approved: false
    };

    SS_journals.push(entry);
    saveSJ();

    var code = "JURNAL_SYNC:" + btoa(JSON.stringify(entry));
    var syncCodeText = document.getElementById("sync-code");
    if (syncCodeText) syncCodeText.value = code;
    var syncBox = document.getElementById("sync-box");
    if (syncBox) syncBox.style.display = "block";

    document.getElementById("j-act").value = "";
    document.getElementById("j-isu").value = "";
    removePhoto(); // Clear photo input and preview
    toast("Jurnal Disimpan", "Jurnal tanggal " + date + " tersimpan! Mensinkronkan ke Drive...");
    renderMyJurnal();

    // Auto Sync to GAS in background via POST (handles large image payload safely)
    try {
      var payload = {
        action: "addJournal",
        studentName: SS_student.name,
        wa: SS_student.wa,
        dudi: dudi,
        date: date,
        content: act,
        issue: isu,
        photo: entry.photo
      };
      fetch(conf.GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(function(ex) {});
    } catch(e) {}
  }

  function sendWA() {
    var date = document.getElementById("j-date").value;
    var dudi = (document.getElementById("j-dudi").value || "").trim();
    var act  = (document.getElementById("j-act").value  || "").trim();
    var isu  = (document.getElementById("j-isu").value  || "").trim();
    if (!date || !act) { toast("Data Kurang", "Isi tanggal dan aktivitas magang.", "err"); return; }

    var entry = {
      id: Date.now(),
      studentName: SS_student.name,
      wa: SS_student.wa,
      dudi: dudi,
      date: date,
      content: act,
      issue: isu,
      approved: false
    };

    SS_journals.push(entry);
    saveSJ();

    var code = "JURNAL_SYNC:" + btoa(JSON.stringify(entry));
    var textMsg = "*JURNAL HARIAN PKL*\nNama: " + entry.studentName + "\nTanggal: " + entry.date + "\nDUDI: " + entry.dudi + "\n\nAktivitas:\n" + entry.content;
    if (entry.issue) {
      textMsg += "\n\nKendala: " + entry.issue;
    }
    textMsg += "\n\nKode Sync:\n" + code;

    window.open("https://wa.me/?text=" + encodeURIComponent(textMsg), "_blank");
    toast("WA Dibuka", "Kirim pesan jurnal ini ke nomor WA guru pamong Anda.");
    renderMyJurnal();
  }

  function renderMyJurnal() {
    var f = document.getElementById("my-feed");
    if (!f) return;
    if (!SS_journals.length) {
      f.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:30px;">Belum ada riwayat jurnal.</p>';
      return;
    }
    var h = "";
    var rev = SS_journals.slice().reverse();
    rev.forEach(function(j) {
      var statClass = j.approved ? "bg" : "bo";
      var statText = j.approved ? "Disetujui Guru" : "Menunggu";
      var isuHtml = j.issue ? "<div style='font-size:12px;color:var(--accent-gold);margin-top:8px'><i class='fa fa-triangle-exclamation'></i> Kendala: " + j.issue + "</div>" : "";
      h += "<div class='j-item'><div class='j-head'><div><div class='j-name' style='color:var(--accent-cyan)'><i class='fa fa-calendar-day'></i> " + j.date + "</div><div class='jd'>" + (j.dudi || "-") + "</div></div><span class='badge " + statClass + "'>" + statText + "</span></div><div class='j-body'>" + j.content + "</div>" + isuHtml + "<div class='ja'><button class='btn-ok' style='background:rgba(0,245,255,.1);color:var(--accent-cyan)' onclick='window.resendWA(" + j.id + ")'><i class='fa-brands fa-whatsapp'></i> Kirim Ulang</button></div></div>";
    });
    f.innerHTML = h;
  }

  function resendWA(id) {
    var j = null;
    for (var i = 0; i < SS_journals.length; i++) {
      if (SS_journals[i].id == id) { j = SS_journals[i]; break; }
    }
    if (!j) return;
    var code = "JURNAL_SYNC:" + btoa(JSON.stringify(j));
    var textMsg = "RESEND JURNAL PKL\nNama: " + j.studentName + "\nTanggal: " + j.date + "\n\n" + j.content + "\n\nKode Sync:\n" + code;
    window.open("https://wa.me/?text=" + encodeURIComponent(textMsg), "_blank");
  }

  function copySyncCode() {
    var el = document.getElementById("sync-code");
    if (!el) return;
    el.select();
    document.execCommand("copy");
    toast("Tersalin", "Kode sync jurnal disalin ke clipboard.");
  }

  function exMyJurnal() {
    if (!SS_journals.length) { toast("Kosong", "Belum ada data jurnal.", "err"); return; }
    var s = SS_student;
    var h = "<html><body><h2>Laporan Jurnal PKL</h2><p>Nama: " + s.name + " | WA: " + s.wa + "</p><hr><ol>";
    SS_journals.forEach(function(j) {
      h += "<li><h4>" + j.date + " - " + (j.dudi || "") + "</h4><p>" + j.content + "</p>";
      if (j.issue) h += "<p><i>Kendala: " + j.issue + "</i></p>";
      h += "</li>";
    });
    h += "</ol></body></html>";
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h], {type:"application/msword"}));
    a.download = "Jurnal_" + (s.name || "Siswa") + ".doc";
    a.click();
    toast("Ekspor", "File Word diunduh.");
  }

  function toast(title, msg, type) {
    var el = document.getElementById("toast");
    if (!el) return;
    document.getElementById("t-title").textContent = title;
    document.getElementById("t-msg").textContent   = msg || "";
    var icon = document.getElementById("t-icon");
    if (type === "err")  { icon.textContent = "!"; el.style.borderColor = "var(--accent-ruby)"; }
    else if (type === "warn") { icon.textContent = "~"; el.style.borderColor = "var(--accent-gold)"; }
    else { icon.textContent = "✓"; el.style.borderColor = "var(--accent-cyan)"; }
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.classList.remove("show"); }, 4000);
  }

  
  function previewPhoto(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      uploadedPhotoBase64 = evt.target.result;
      document.getElementById("photo-preview").src = uploadedPhotoBase64;
      document.getElementById("photo-preview-container").style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    uploadedPhotoBase64 = "";
    document.getElementById("j-photo").value = "";
    document.getElementById("photo-preview-container").style.display = "none";
    document.getElementById("photo-preview").src = "";
  }

  window.doSiswaLogin = doSiswaLogin;
  window.previewPhoto = previewPhoto;
  window.removePhoto = removePhoto;
  window.doSiswaLogout = doSiswaLogout;
  window.sSwitch = sSwitch;
  window.saveJurnal = saveJurnal;
  window.sendWA = sendWA;
  window.resendWA = resendWA;
  window.copySyncCode = copySyncCode;
  window.exMyJurnal = exMyJurnal;
  window.toast = toast;
})();
