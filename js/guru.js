// Portal Guru JS Logic
(function() {
  var conf = window.CONFIG;

  var G_teacher = null;
  var G_students = [];
  var G_journals = [];
  var G_modules = getDefaultModules();

  document.addEventListener("DOMContentLoaded", function() {
    var saved = localStorage.getItem(conf.KEY_CUR_TEACHER);
    if (saved) {
      try {
        G_teacher = JSON.parse(saved);
        loadData();
        showDash();
      } catch(e) {
        localStorage.removeItem(conf.KEY_CUR_TEACHER);
      }
    }
    setTimeout(bgSync, 2000);
  });

  function loadData() {
    try { G_students = JSON.parse(localStorage.getItem(conf.KEY_STUDENTS) || "[]"); } catch(e) { G_students = []; }
    try { G_journals = JSON.parse(localStorage.getItem(conf.KEY_JOURNALS) || "[]"); } catch(e) { G_journals = []; }
  }

  function bgSync() {
    if (!conf.GAS_URL) return;
    fetch(conf.GAS_URL)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (!d) return;
        if (d.placements && d.placements.length) {
          d.placements.forEach(function(p) {
            var exists = G_students.some(function(s) {
              return s.name === p.siswa && s.dudi === p.bengkel;
            });
            if (!exists) {
              G_students.push({
                id: Date.now() + Math.random(),
                name: p.siswa || "",
                kelas: p.kelas || "",
                dudi: p.bengkel || "",
                owner: p.pemilik || "",
                wa: p.wa || "",
                addr: p.alamat || "",
                supervisor: p.pembimbing || ""
              });
            }
          });
          localStorage.setItem(conf.KEY_STUDENTS, JSON.stringify(G_students));
          if (G_teacher) renderStudents();
        }
        if (d.jurnal && d.jurnal.length) {
          d.jurnal.forEach(function(j) {
            var exists = G_journals.some(function(x) { return x.id === j.id; });
            if (!exists) G_journals.push(j);
          });
          localStorage.setItem(conf.KEY_JOURNALS, JSON.stringify(G_journals));
          if (G_teacher) renderJurnals();
        }
      })
      .catch(function(err) { console.log("GAS sync skip:", err.message); });
  }

  function showPanel(which) {
    var masuk  = document.getElementById("pn-masuk");
    var daftar = document.getElementById("pn-daftar");
    var tbM    = document.getElementById("tb-masuk");
    var tbD    = document.getElementById("tb-daftar");
    if (which === "masuk") {
      masuk.style.display  = "block";
      daftar.style.display = "none";
      tbM.className = "tab-btn on-ruby";
      tbD.className = "tab-btn off";
    } else {
      masuk.style.display  = "none";
      daftar.style.display = "block";
      tbM.className = "tab-btn off";
      tbD.className = "tab-btn on-ruby";
    }
  }

  function doLogin(e) {
    e.preventDefault();
    var name = (document.getElementById("l-name").value || "").trim();
    var wa   = (document.getElementById("l-wa").value   || "").trim();
    if (!name || !wa) { toast("Lengkapi Data", "Isi nama dan nomor WA.", "err"); return; }

    var list = [];
    try { list = JSON.parse(localStorage.getItem(conf.KEY_TEACHERS) || "[]"); } catch(e2) {}

    var waClean = wa.replace(/[^0-9]/g, "");
    var found = null;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var tWa = (t.wa || "").replace(/[^0-9]/g, "");
      if (t.name && t.name.toLowerCase() === name.toLowerCase() && tWa === waClean) {
        found = t; break;
      }
    }

    if (found) {
      G_teacher = found;
      localStorage.setItem(conf.KEY_CUR_TEACHER, JSON.stringify(found));
      loadData(); showDash();
      toast("Selamat Datang", "Halo " + found.name + "!");
    } else {
      toast("Akun Tidak Ditemukan", "Nama/WA tidak cocok. Cek ejaan atau buat akun baru lewat tab Daftar Baru.", "err");
    }
  }

  function doRegister(e) {
    e.preventDefault();
    var name   = (document.getElementById("r-name").value   || "").trim();
    var school = (document.getElementById("r-school").value || "").trim();
    var subj   = document.getElementById("r-subj").value;
    var wa     = (document.getElementById("r-wa").value     || "").trim();

    if (!name || !school || !wa) { toast("Data Kurang", "Isi nama, sekolah, dan WA.", "err"); return; }

    var cls = [];
    var boxes = document.querySelectorAll("input[name='cls']:checked");
    for (var i = 0; i < boxes.length; i++) { cls.push(boxes[i].value); }

    var teacher = { name: name, school: school, subject: subj, wa: wa, classes: cls };

    var list = [];
    try { list = JSON.parse(localStorage.getItem(conf.KEY_TEACHERS) || "[]"); } catch(e2) {}

    var waClean = wa.replace(/[^0-9]/g, "");
    var idx = -1;
    for (var i2 = 0; i2 < list.length; i2++) {
      if ((list[i2].wa || "").replace(/[^0-9]/g, "") === waClean) { idx = i2; break; }
    }
    if (idx >= 0) { list[idx] = teacher; } else { list.push(teacher); }

    localStorage.setItem(conf.KEY_TEACHERS, JSON.stringify(list));
    localStorage.setItem(conf.KEY_CUR_TEACHER, JSON.stringify(teacher));
    G_teacher = teacher;
    loadData(); showDash();
    toast("Registrasi Berhasil", "Selamat datang, " + name + "!");

    try {
      var url = conf.GAS_URL + "?action=registerTeacher&name=" + encodeURIComponent(name) + "&wa=" + encodeURIComponent(wa) + "&school=" + encodeURIComponent(school);
      fetch(url).catch(function() {});
    } catch(e3) {}
  }

  function doLogout() {
    if (!confirm("Keluar dari sesi ini?")) return;
    localStorage.removeItem(conf.KEY_CUR_TEACHER);
    location.reload();
  }

  function showDash() {
    document.getElementById("auth-section").style.display = "none";
    var dash = document.getElementById("g-dash");
    dash.style.display = "block";
    dash.className = "dash-page shown";
    var mnav = document.getElementById("g-mn");
    if (mnav) mnav.style.display = "flex";
    var t = G_teacher;
    var init = (t.name || "G").replace(/^(drs|dra|ir)\.\s*/i, "").charAt(0).toUpperCase();
    document.getElementById("g-av").textContent   = init;
    document.getElementById("g-name").textContent  = t.name || "Guru";
    document.getElementById("g-school").textContent = t.school || "SMK InfoDesk234";
    document.getElementById("g-subj").textContent   = t.subject || "";
    document.getElementById("g-school-h").textContent = (t.school || "SMK InfoDesk234") + " | Pembimbing: " + t.name;
    renderStudents();
    renderJurnals();
    renderModules();
  }

  var TABS = ["pkl","jurnal","modul","soal","ai"];
  function gSwitch(id) {
    TABS.forEach(function(t) {
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
  }

  function renderStudents() {
    var tb = document.getElementById("pkl-tb");
    if (!G_students.length) {
      tb.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:28px">Belum ada siswa.</td></tr>';
      return renderStats();
    }
    var rows = "";
    G_students.forEach(function(s, i) {
      var waLink = s.wa ? '<a href="https://wa.me/' + s.wa.replace(/[^0-9]/g,"") + '" target="_blank" style="color:var(--accent-cyan)">' + s.wa + '</a>' : "-";
      rows += "<tr><td style='color:var(--text-muted)'>" + (i+1) + "</td><td style='font-weight:600'>" + s.name + "</td><td>" + (s.kelas||"-") + "</td><td>" + (s.dudi||"-") + "</td><td>" + (s.supervisor||s.owner||"-") + "</td><td>" + waLink + "</td><td><span class='badge bg'>Aktif</span></td></tr>";
    });
    tb.innerHTML = rows;
    renderStats();
  }

  function renderStats() {
    var dudis = {};
    G_students.forEach(function(s) { if (s.dudi) dudis[s.dudi] = 1; });
    var statsEl = document.getElementById("pkl-stats");
    if (statsEl) {
      statsEl.innerHTML =
        "<div class='stat-card s-ruby'><div class='stat-val'>" + G_students.length + "</div><div class='stat-label'>Total Siswa PKL</div><i class='fa fa-users stat-icon'></i></div>" +
        "<div class='stat-card s-green'><div class='stat-val'>" + G_students.length + "</div><div class='stat-label'>Status Aktif</div><i class='fa fa-check-circle stat-icon'></i></div>" +
        "<div class='stat-card s-cyan'><div class='stat-val'>" + G_journals.length + "</div><div class='stat-label'>Jurnal Masuk</div><i class='fa fa-book-open stat-icon'></i></div>" +
        "<div class='stat-card s-gold'><div class='stat-val'>" + Object.keys(dudis).length + "</div><div class='stat-label'>DUDI/Bengkel</div><i class='fa fa-industry stat-icon'></i></div>";
    }
  }

  function toggleAF() {
    var f = document.getElementById("add-form");
    f.style.display = (f.style.display === "block") ? "none" : "block";
  }

  function addStu() {
    var name  = (document.getElementById("ns-n").value || "").trim();
    var kelas = document.getElementById("ns-k").value;
    var dudi  = (document.getElementById("ns-d").value || "").trim();
    var owner = (document.getElementById("ns-o").value || "").trim();
    var wa    = (document.getElementById("ns-w").value || "").trim();
    var addr  = (document.getElementById("ns-a").value || "").trim();
    if (!name || !dudi) { toast("Data Kurang", "Isi nama siswa dan bengkel.", "err"); return; }
    G_students.push({ id: Date.now(), name: name, kelas: kelas, dudi: dudi, owner: owner, supervisor: owner, wa: wa, addr: addr });
    localStorage.setItem(conf.KEY_STUDENTS, JSON.stringify(G_students));
    renderStudents(); toggleAF();
    ["ns-n","ns-d","ns-o","ns-w","ns-a"].forEach(function(id2) { document.getElementById(id2).value = ""; });
    toast("Ditambahkan", name + " berhasil ditambahkan.");
    try {
      var p = "action=addPlacement&siswa=" + encodeURIComponent(name) + "&bengkel=" + encodeURIComponent(dudi) + "&kelas=" + encodeURIComponent(kelas) + "&pemilik=" + encodeURIComponent(owner) + "&wa=" + encodeURIComponent(wa) + "&alamat=" + encodeURIComponent(addr) + "&pembimbing=" + encodeURIComponent(G_teacher.name);
      fetch(conf.GAS_URL + "?" + p).catch(function() {});
    } catch(e4) {}
  }

  function exExcel() {
    if (!G_students.length) { toast("Kosong", "Belum ada data.", "err"); return; }
    var h = "<table><tr><th>No</th><th>Nama</th><th>Kelas</th><th>DUDI</th><th>Penyelia</th><th>WA</th><th>Alamat</th></tr>";
    G_students.forEach(function(s, i) {
      h += "<tr><td>" + (i+1) + "</td><td>" + s.name + "</td><td>" + (s.kelas||"") + "</td><td>" + (s.dudi||"") + "</td><td>" + (s.supervisor||"") + "</td><td>" + (s.wa||"") + "</td><td>" + (s.addr||"") + "</td></tr>";
    });
    h += "</table>";
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h], {type:"application/vnd.ms-excel"}));
    a.download = "DataPKL_InfoDesk234.xls"; a.click();
    toast("Ekspor", "File Excel berhasil diunduh.");
  }

  function renderJurnals() {
    var f = document.getElementById("jur-feed");
    if (!f) return;
    if (!G_journals.length) {
      f.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:24px">Belum ada jurnal masuk.</p>';
      return;
    }
    var h = "";
    var rev = G_journals.slice().reverse();
    rev.forEach(function(j) {
      var btnHtml = !j.approved ? "<button class='btn-ok' style='background:rgba(0,230,118,.15);color:var(--accent-green)' onclick='window.apvJ(" + j.id + ")'><i class='fa fa-check'></i> Setujui</button>" : "";
      h += "<div class='j-item'><div class='j-head'><div><div class='j-name'><i class='fa fa-user-graduate' style='color:var(--accent-ruby)'></i> " + (j.studentName||"Siswa") + "</div><div class='j-date'>" + j.date + " | " + (j.dudi||"DUDI") + "</div></div><span class='badge " + (j.approved ? "bg" : "bo") + "'>" + (j.approved ? "Disetujui" : "Menunggu") + "</span></div><div class='j-body'>" + j.content + "</div><div class='j-actions'>" + btnHtml + "<button class='btn-ok' style='background:rgba(0,245,255,.1);color:var(--accent-cyan)' onclick='window.replyWA(" + j.id + ")'><i class='fa-brands fa-whatsapp'></i> Balas WA</button></div></div>";
    });
    f.innerHTML = h;
  }

  function apvJ(id) {
    for (var i = 0; i < G_journals.length; i++) {
      if (G_journals[i].id == id) { G_journals[i].approved = true; break; }
    }
    localStorage.setItem(conf.KEY_JOURNALS, JSON.stringify(G_journals));
    renderJurnals(); toast("Disetujui", "Jurnal berhasil diverifikasi.");
  }

  function replyWA(id) {
    var j = null;
    for (var i = 0; i < G_journals.length; i++) { if (G_journals[i].id == id) { j = G_journals[i]; break; } }
    if (!j) return;
    var msg = "Halo " + j.studentName + ", jurnal Anda tanggal " + j.date + " sudah diterima. Semangat terus!";
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  }

  function importSync() {
    var raw = (document.getElementById("sync-in").value || "").trim();
    if (!raw) { toast("Kosong", "Paste kode sinkronisasi siswa.", "err"); return; }
    try {
      var mk = "JURNAL_SYNC:";
      var idx = raw.indexOf(mk);
      if (idx === -1) throw new Error("Marker tidak ditemukan");
      var b64 = raw.slice(idx + mk.length).replace(/\s/g, "");
      var d = JSON.parse(atob(b64));
      if (!d.studentName || !d.content) throw new Error("Format tidak valid");
      var exists = false;
      for (var i = 0; i < G_journals.length; i++) { if (G_journals[i].id === d.id) { exists = true; break; } }
      if (exists) { toast("Sudah Ada", "Jurnal ini sudah diimpor.", "warn"); return; }
      d.approved = false;
      G_journals.push(d);
      localStorage.setItem(conf.KEY_JOURNALS, JSON.stringify(G_journals));
      renderJurnals(); renderStats();
      document.getElementById("sync-in").value = "";
      toast("Impor Sukses", "Jurnal " + d.studentName + " berhasil ditambahkan!");
    } catch(e5) { toast("Gagal Impor", "Kode tidak valid atau rusak.", "err"); }
  }

  function exJurWord() {
    if (!G_journals.length) { toast("Kosong", "Belum ada jurnal.", "err"); return; }
    var h = "<html><body><h2>Laporan Jurnal PKL - " + (G_teacher.school||"SMK InfoDesk234") + "</h2>";
    G_journals.forEach(function(j, i) {
      h += "<h3>" + (i+1) + ". " + (j.studentName||"Siswa") + " (" + j.date + ")</h3><p>DUDI: " + (j.dudi||"-") + "</p><p>" + j.content + "</p><hr>";
    });
    h += "</body></html>";
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h], {type:"application/msword"}));
    a.download = "Jurnal_PKL.doc"; a.click();
    toast("Ekspor", "File Word berhasil diunduh.");
  }

  function clearJur() {
    if (!confirm("Hapus semua jurnal?")) return;
    G_journals = []; localStorage.setItem(conf.KEY_JOURNALS, "[]"); renderJurnals(); renderStats();
    toast("Bersih", "Semua jurnal dihapus.");
  }

  function getDefaultModules() {
    return [
      { id:1, kelas:"Kelas X",   kode:"M.10.1", title:"K3 dan Alat Ukur Otomotif",    desc:"K3 bengkel, jangka sorong, mikrometer, multimeter.", size:"4.2 MB", link:"" },
      { id:2, kelas:"Kelas X",   kode:"M.10.2", title:"Gambar Teknik Proyeksi",        desc:"Proyeksi ISO, gambar potongan, orthogonal.",            size:"5.8 MB", link:"" },
      { id:3, kelas:"Kelas XI",  kode:"M.11.1", title:"Sistem EFI dan Sensor Engine",  desc:"MAP, IAT, ECT, CKP, O2 sensor, OBD-II scan.",          size:"8.1 MB", link:"" },
      { id:4, kelas:"Kelas XI",  kode:"M.11.2", title:"Sistem Rem dan Kemudi",          desc:"Rem cakram, ABS, power steering, balancing.",           size:"6.3 MB", link:"" },
      { id:5, kelas:"Kelas XII", kode:"M.12.1", title:"Diagnosa Kendaraan dan Scanner", desc:"DTC OBD-II, wiring diagram, scanner Autel/Launch.",     size:"7.5 MB", link:"" },
      { id:6, kelas:"Kelas XII", kode:"M.12.2", title:"Panduan Laporan PKL dan Sidang", desc:"Format laporan, rubrik DUDI, ujian sidang.",            size:"3.1 MB", link:"" }
    ];
  }

  function renderModules() {
    var h = "";
    G_modules.forEach(function(m) {
      h += "<div class='mod-card'><div class='mod-kelas'><i class='fa fa-graduation-cap'></i> " + m.kelas + " - " + m.kode + "</div><div class='mod-title'>" + m.title + "</div><div class='mod-desc'>" + m.desc + "</div><div class='mod-foot'><span><i class='fa fa-file'></i> " + m.size + "</span>" + (m.link ? "<button class='btn-act bp' onclick=\"window.open('" + m.link + "','_blank')\" style='padding:5px 12px;font-size:11px'><i class='fa fa-download'></i> Unduh</button>" : "<span style='color:var(--text-muted);font-size:11px'><i class='fa fa-lock'></i> Hubungi Admin</span>") + "</div></div>";
    });
    document.getElementById("mod-grid").innerHTML = h;
  }

  function addModul() {
    var t = prompt("Judul modul baru:");
    if (!t) return;
    var l = prompt("Link Google Drive (kosongkan jika belum ada):") || "";
    G_modules.push({ id: Date.now(), kelas:"Kelas XI", kode:"BARU", title: t, desc:"Modul baru.", size:"-", link: l });
    renderModules();
    toast("Ditambahkan", t + " berhasil ditambahkan.");
  }

  var soalBase = {
    rem: [
      { q:"Komponen yang mengubah tekanan hidrolis menjadi gaya mekanis pada rem cakram?", o:["A. Master Silinder","B. Kaliper rem","C. Booster rem","D. Proportioning valve"], a:1 },
      { q:"Bleeding rem bertujuan untuk?", o:["A. Mengganti minyak rem","B. Membuang udara dari sistem rem","C. Menyetel celah rem","D. Membersihkan kaliper"], a:1 },
      { q:"Sistem ABS mencegah?", o:["A. Ban terlalu cepat direm","B. Ban terkunci saat pengereman keras","C. Rem terlalu panas","D. Minyak rem habis"], a:1 },
      { q:"Tebal minimum pad rem cakram umumnya?", o:["A. 1 mm","B. 3 mm","C. 5 mm","D. 8 mm"], a:1 }
    ],
    efi: [
      { q:"Sensor yang mengukur masa udara masuk mesin EFI?", o:["A. Sensor ECT","B. Sensor MAF/MAP","C. Sensor O2","D. Sensor TPS"], a:1 },
      { q:"Tekanan bahan bakar sistem EFI umumnya berkisar?", o:["A. 0.5-1 bar","B. 2-4 bar","C. 6-8 bar","D. 10-15 bar"], a:1 },
      { q:"Kode DTC P0115 menandakan kerusakan pada?", o:["A. Sensor MAP","B. Sensor ECT (suhu air)","C. Sensor O2","D. Injector"], a:1 }
    ],
    tune: [
      { q:"Celah busi mesin bensin modern idealnya?", o:["A. 0.2-0.3 mm","B. 0.7-1.0 mm","C. 1.5-2.0 mm","D. 2.5-3.0 mm"], a:1 },
      { q:"Putaran stasioner mesin EFI modern?", o:["A. 400-500 rpm","B. 700-850 rpm","C. 1200-1500 rpm","D. 2000 rpm"], a:1 }
    ]
  };
  var lastSoal = [];

  function genSoal() {
    var kw  = (document.getElementById("sk-kw").value || "").trim().toLowerCase();
    var jml = parseInt(document.getElementById("sk-jml").value) || 10;
    if (!kw) { toast("Kosong", "Masukkan kata kunci materi.", "err"); return; }
    var pool = [];
    var keys = Object.keys(soalBase);
    keys.forEach(function(k) {
      if (kw.indexOf(k) >= 0 || k.indexOf(kw.split(" ")[0]) >= 0) {
        pool = pool.concat(soalBase[k]);
      }
    });
    if (!pool.length) {
      pool = [
        { q:"Jelaskan pengertian " + kw + " pada kendaraan?", o:["A. Sistem tenaga","B. Sistem pengendalian","C. Sistem kelistrikan","D. Sistem transmisi"], a:0 },
        { q:"Fungsi utama " + kw + " pada kendaraan?", o:["A. Efisiensi BBM","B. Keselamatan berkendara","C. Mengurangi emisi","D. Semua benar"], a:3 },
        { q:"Alat yang digunakan memeriksa " + kw + "?", o:["A. Multimeter","B. Scanner OBD","C. Tachometer","D. Sesuai spek kendaraan"], a:3 },
        { q:"Perawatan berkala " + kw + " dilakukan setiap?", o:["A. 5.000 km","B. 10.000 km","C. 20.000 km","D. Sesuai buku manual"], a:3 }
      ];
    }
    pool.sort(function() { return Math.random() - 0.5; });
    pool = pool.slice(0, jml);
    lastSoal = pool;
    var h = "<div class='card'><div class='card-title'><i class='fa fa-list-check' style='color:var(--accent-gold)'></i> Soal: " + kw.toUpperCase() + " (" + pool.length + " butir)</div>";
    pool.forEach(function(s, i) {
      h += "<div class='soal-item'><div class='soal-num'>Soal " + (i+1) + "</div><div class='soal-q'>" + s.q + "</div>";
      if (s.o) {
        h += "<ul class='soal-opts'>";
        s.o.forEach(function(o, j) {
          h += "<li" + (j === s.a ? " class='ans'" : "") + ">" + o + "</li>";
        });
        h += "</ul>";
      }
      h += "</div>";
    });
    h += "</div>";
    document.getElementById("soal-out").innerHTML = h;
    toast("Generate Selesai", pool.length + " soal berhasil dibuat.");
  }

  function exSoalWord() {
    if (!lastSoal.length) { toast("Kosong", "Generate soal dulu.", "err"); return; }
    var h = "<html><body><h2>Lembar Soal: " + document.getElementById("sk-kw").value + "</h2><ol>";
    lastSoal.forEach(function(s) {
      h += "<li><p>" + s.q + "</p>";
      if (s.o) { h += "<ol type='A'>"; s.o.forEach(function(o) { h += "<li>" + o.slice(3) + "</li>"; }); h += "</ol>"; }
      h += "</li><br>";
    });
    h += "</ol></body></html>";
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([h], {type:"application/msword"}));
    a.download = "Soal_" + Date.now() + ".doc"; a.click();
    toast("Ekspor", "Lembar soal diunduh.");
  }

  var aiKB = {
    rpp:    "RPP Kurikulum Merdeka TKR: Tujuan (CP), Kegiatan (praktik 60%), Asesmen (kognitif + psikomotor + afektif). Gunakan model PBL (Project Based Learning).",
    modul:  "Modul ajar TKR ideal: CP/KD, peta konsep, teori ringkas, jobsheet praktik, rubrik penilaian. Format PDF atau HTML interaktif.",
    pkl:    "PKL minimal 6 bulan. Wajib: jurnal harian, laporan akhir, ujian sidang. Monitoring guru pamong minimal 2x/bulan.",
    tkr:    "TKR mencakup: engine, transmisi, kemudi, rem, kelistrikan, EFI. Kurikulum Merdeka berbasis project-based learning.",
    kurikulum: "Kurikulum Merdeka SMK: Capaian Pembelajaran (CP), P5, integrasi industri, asesmen berbasis kompetensi.",
    soal:   "Buat soal HOTS level C3-C6 sesuai taksonomi Bloom. Untuk TKR: fokus pada diagnosis, troubleshooting, dan prosedur kerja."
  };

  function sendChat() {
    var inp = document.getElementById("chat-in");
    var msg = (inp.value || "").trim();
    if (!msg) return;
    inp.value = "";
    var box = document.getElementById("chat-box");
    box.innerHTML += "<div class='chat-msg user'><div class='chat-bubble'>" + msg + "</div></div>";
    setTimeout(function() {
      var low = msg.toLowerCase();
      var rep = "Saya siap membantu! Tanya tentang: RPP, modul ajar, bank soal, metode pembelajaran, kurikulum Merdeka, PKL, atau materi TKR/TSM.";
      Object.keys(aiKB).forEach(function(k) { if (low.indexOf(k) >= 0) rep = aiKB[k]; });
      box.innerHTML += "<div class='chat-msg bot'><div class='chat-bubble'><b>AI Kurikulum:</b><br>" + rep + "</div></div>";
      box.scrollTop = box.scrollHeight;
    }, 600);
    box.scrollTop = box.scrollHeight;
  }

  function clrChat() {
    document.getElementById("chat-box").innerHTML = "<div class='chat-msg bot'><div class='chat-bubble'><b>Halo!</b><br>Chat direset. Silakan tanya.</div></div>";
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

  // Expose functions globally for HTML element event handlers
  window.showPanel = showPanel;
  window.doLogin = doLogin;
  window.doRegister = doRegister;
  window.doLogout = doLogout;
  window.gSwitch = gSwitch;
  window.toggleAF = toggleAF;
  window.addStu = addStu;
  window.exExcel = exExcel;
  window.apvJ = apvJ;
  window.replyWA = replyWA;
  window.importSync = importSync;
  window.exJurWord = exJurWord;
  window.clearJur = clearJur;
  window.addModul = addModul;
  window.genSoal = genSoal;
  window.exSoalWord = exSoalWord;
  window.sendChat = sendChat;
  window.clrChat = clrChat;
  window.toast = toast;
})();
