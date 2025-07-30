/** ULPCookies.js
 *  Version: 0.1.3 (Enhanced)
 *  Date:    21 Agustus 2024
 ** Description:
 *      Manajemen Cookie dan Cookie Consents dengan Optimasi
 ** kompatibilitas browser modern (Chrome, Firefox, Safari, Edge).
 *
 *  by KangFirm NoteWork, https://kangfirm.info/
 ** License: BSD 2-Clause License
 *    see https://github.com/UnderLabPC/ULPCookies/blob/master/LICENSE
 */ var modFiles = 'ULPCookies.js';
var modNames = 'ULPCookies';
var ULPCookies = ULPCookies || (function() {
	'use strict';
//> deteksi browser lama, tidak mendukung IE <10
	const isLegacyBrowser = /MSIE [1-9]\.|Trident\/[1-7]\.|Edge\/[1-4]\./.test(navigator.userAgent);
  if ((typeof navigator !== 'undefined' && navigator !== null) && isLegacyBrowser) {
	console.warn(`[WARN]  Proses dibatalkan! ${modNames} mendeteksi browser Anda (IE <10) tidak didukung.`);
	return;
  }
//
//> Konfigurasi Default
	const objConfig = {
		cookiesPrefix: 'ulpc_',
		consentCookie: 'cookie_consent',
		consentExpiry: 365,
		localStorageKey: 'ulpc_cookie_consent',
		consentRequired: true,
		consentModeGTag: false,
		ccpaEnabled: false,
		ccpaText: 'Do Not Sell My Personal Information',
		ccpaLink: '/do-not-sell',
		kelompok: {
			necessary: {
				required: true,
				title: 'Penting',
				description: 'Diperlukan untuk fungsi dasar situs'
			},
			preferenc: {
				required: false,
				title: 'Preferensi',
				description: 'Untuk menyimpan preferensi pengalaman pengguna'
			},
			analytics: {
				required: false,
				title: 'Analitik',
				description: 'Untuk analisis data penggunaan situs'
			},
			marketing: {
				required: false,
				title: 'Pemasaran',
				description: 'Untuk personalisasi iklan'
			}
		},
		lazyLoadBanner: false,
		autoShowBanner: true,
		banerPos_: 'bottom',
		banerTema: 'dark',
		bannerIsi: {
			txtJudul: 'Kami menggunakan cookie',
			txtPesan: 'Kami menggunakan cookie untuk meningkatkan pengalaman Anda sebagai pengguna.',
			acceptstr: 'Terima',acceptAll: 'Terima Semua',
			rejectstr: 'Tolak',rejectAll: 'Tolak Semua',
			settingan: 'Pengaturan',
			txtSave_: 'Simpan Pengaturan',
			txtClose: 'Tutup'
		}
	};
//> Manajemen Status
	const state = {
		configs: {...objConfig},
		consent: null,
		coQueue: [],
		dataListeners: {
			consentChange: [],
			auditLog: []
		},
		bannerElement: null,
		scriptBlocked: [],
		isInitialized: false
	};
//> Utilitas
	const utils = {
		//> hapus data coookie
		deleteCookie: function(names, paths = '/') {
			document.cookie = `${names}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=${paths}`;
		},
		getCookie: function(names) {
			const _dco = document.cookie.split(';');
		  for(let i=0; i<_dco.length; i++) {
				let _coo = _dco[i].trim();
			  if (_coo.startsWith(names+'=')) {
				return _coo.substring(names.length + 1);
			  }
		  }	return null;
		},
		setCookie: function(names, value, days, path = '/') {
			const _dtm = new Date();
			_dtm.setTime(_dtm.getTime() + (days * 24 * 60 * 60 * 1000));
			const _exp = 'expires='+ _dtm.toUTCString();
			document.cookie = `${names}=${value};${_exp};path=${path}`;
		},
		//> generate ID unik untuk cookie
		generateCookieId: function() {
			return state.configs.cookiesPrefix +'id_'+ Math.random().toString(36).substr(2, 9);
		},
		//> proses antrian cookie
		processCookieQueue() {
		  while(state.coQueue.length > 0) {
			const {name, value, days, category} = state.coQueue.shift();
			  if (this.hasConsent(category)) {
				this.setCookie(name, value, days);
			  }
		  }
		},
		//> penyimpanan preferensi consent
		saveConsent: function(consent) {
			//> simpan di localStorage jika tersedia
		  if (typeof localStorage !== 'undefined') {
			localStorage.setItem(state.configs.localStorageKey, JSON.stringify(consent));
		  }
			//> simpan juga di cookie sebagai fallback
			utils.setCookie(
				state.configs.consentCookie,
				JSON.stringify(consent),
				state.configs.consentExpiry
			);
			state.consent = consent;
			//> trigger event
			objErrors.triggerEvent('consentChange', consent);
		},
		loadConsent: function() {
			//> coba dari localStorage
		  if (typeof localStorage !== 'undefined') {
				const saved = localStorage.getItem(state.configs.localStorageKey);
			  if (saved) return JSON.parse(saved);
		  }
			//> coba dari cookie
			const cookie = utils.getCookie(state.configs.consentCookie);
			return cookie ? JSON.parse(cookie) : null;
		},
		//> periksa, apakah consent sudah diberikan untuk kategori
		hasConsent: function(category) {
		  if (!state.consent) return false;
			return state.consent[category] === true;
//			return state.consent?.[category] === true;
		},
		//> Google Consent Mode
		updateGoogleConsent() {
		  if (!window.gtag || !state.configs.consentModeGTag) return;
			gtag('consent', 'update', {
				'ad_storage':               state.consent.marketing ? 'granted' : 'denied',
				'analytics_storage':        state.consent.analytics ? 'granted' : 'denied',
				'functionality_storage':    state.consent.preferenc ? 'granted' : 'denied',
				'security_storage':         'granted'
			});
		},
		//> deteksi Peraturan Privasi (implementasi sederhana - bisa diperluas)
		detectPrivacyLaw: function() {
			//> deteksi GDPR (negara-negara eropa)
			const lang = navigator.language || navigator.userLanguage;
			const country = lang.split('-')[1];
			const countryEU = ['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'];
		  if (countryEU.includes(country)) return 'gdpr';
			//> deteksi CCPA (California)
			const gettimeCA = Intl.DateTimeFormat().resolvedOptions().timeZone;
		  if (/America\/(Los_Angeles|New_York)/.test(gettimeCA)) return 'ccpa';
			//> deteksi LGDP (Brazil)
		  if (navigator.language.includes('pt-BR')) return 'lgpd';
			return 'none';
		},
		blockScripts() {
			document.querySelectorAll('script[data-cookie-category]').forEach(scpdcc => {
				const category = scpdcc.getAttribute('data-cookie-category');
			  if (!utils.hasConsent(category)) {
				state.scriptBlocked.push({
					element: scpdcc,
					original: scpdcc.outerHTML
				});
				scpdcc.remove();
			  }
			});
		},
		unblockScripts() {
			state.scriptBlocked.forEach(item => {
			  if (utils.hasConsent(item.category)) {
				const newScript = document.createElement('script');
				newScript.innerHTML = item.element.innerHTML;
				//> salin semua atribut
				[...item.element.attributes].forEach(attr => {
					newScript.setAttribute(attr.name, attr.value);
				});
				item.element.parentNode.replaceChild(newScript, item.element);
			  }
			});
			state.scriptBlocked = [];
		},
		on: function(evt, cb_) {
		  if (state.dataListeners[evt]) {
			state.dataListeners[evt].push(cb_);
		  }
		},
		off: function(evt, cb_) {
		  if (state.dataListeners[evt]) {
			const index = state.dataListeners[evt].indexOf(cb_);
			  if (index !== -1)
			state.dataListeners[evt].splice(index, 1);
		  }
		},
	};
//> Error Handling
	const objErrors = {
		//> audit logging
		auditLog(action, details = {}) {
			const entry = {
				timestamp: new Date().toISOString(),
				action,
				...details
			};
			//> simpan di localStorage
		  if (typeof localStorage !== 'undefined') {
			const logs = JSON.parse(localStorage.getItem('cookie_audit') || []);
			logs.push(entry);
			localStorage.setItem('cookie_audit', JSON.stringify(logs));
		  }	this.triggerEvent('auditLog', entry);
		},
		triggerEvent: function(evt, dt_) {
		  if (state.dataListeners[evt])
			state.dataListeners[evt].forEach(cb => cb(dt_));
		},
	};
//> Cookie Consent Banner
	const objBanner = {
		//> buat element consent banner
		create: function() {
			const cfg = state.configs;
			const classTema = ''+((cfg.banerTema===0||cfg.banerTema==='gelap'||cfg.banerTema==='dark'||cfg.banerTema==='d')?'d':'l');
			const clsPosisi = ''+((cfg.banerPos_==='bottom'||cfg.banerPos_==='btm'||cfg.banerPos_==='b0')?'b0':'t0');
			const elBanners = document.createElement('div');
			elBanners.id = 'kf-modal-cookies';
			elBanners.className = `kf-cookie-banner kf-theme-${classTema} kf-pos-${clsPosisi}`;
			const bannerHTML = `
	<div id="kf-cookie-modal-banners" class="kf-banner-content">
		<h3>${cfg.bannerIsi.txtJudul}</h3>
		<p>${cfg.bannerIsi.txtPesan}</p>${cfg.ccpaEnabled ? `
		<div class="kf-ccpa"><a href="${cfg.ccpaLink}">${cfg.ccpaText}</a></div>` : ''}
		<div class="kf-banner-actions">
			<button id="kf-cookie-seting" class="kf-btn kf-btn-seting">${cfg.bannerIsi.settingan}</button>
			<button id="kf-cookie-accept" class="kf-btn kf-btn-accept aktif">${cfg.bannerIsi.acceptAll}</button>
			<button id="kf-cookie-reject" class="kf-btn kf-btn-reject">${cfg.bannerIsi.rejectAll}</button>
		</div>
	</div>
	<div id="kf-cookie-modal-setting" class="kf-modal-setting">
		<div class="kf-modal-content">
			<h3>${cfg.bannerIsi.settingan}</h3>
			<form id="kf-cookie-modal-objform">${Object.entries(cfg.kelompok).map(([key, cat]) => `
				<div class="kf-category">
					<label class="kf-category-toggle">
						<input type="checkbox" name="${key}" ${(cat.required?'disabled checked':(state.consent[key]?'checked':''))}/>
						<span class="kf-toggle-slider"></span>
					</label>
					<div class="kf-category-info">
						<strong>${cat.title}</strong>
						<p>${cat.description}</p>
					</div>
				</div>`).join('')}
			</form>
			<div class="kf-modal-actions">
				<button id="kf-cookie-save_" class="kf-btn kf-btn-accept aktif">${cfg.bannerIsi.txtSave_}</button>
				<button id="kf-cookie-close" class="kf-btn kf-btn-text">${cfg.bannerIsi.txtClose}</button>
			</div>
		</div>
	</div>	`;
			elBanners.innerHTML = bannerHTML;
			document.body.appendChild(elBanners.firstElementChild);
			state.bannerElement = document.getElementById('kf-cookie-banner');
			//> tambahkan event dataListeners
			document.getElementById('kf-cookie-accept').addEventListener('click', () => {
				const consent = {};
			  for(const cat in cfg.kelompok) {
				consent[cat] = true;
			  }	utils.saveConsent(consent);
				objBanner.hide();
			});
			//
			document.getElementById('kf-cookie-reject').addEventListener('click', () => {
				const consent = {};
			  for(const cat in cfg.kelompok) {
				consent[cat] = cfg.kelompok[cat].required; //> hanya yang diperlukan
			  }	utils.saveConsent(consent);
				objBanner.hide();
			});
			//
			document.getElementById('kf-cookie-save').addEventListener('click', () => {
				const frm = document.getElementById('kf-cookie-modal-objform');
				const consent = {};
			  for(const cat in cfg.kelompok) {
				//> untuk kategori required, selalu true
				consent[cat] = cfg.kelompok[cat].required || frm[cat].checked;
			  }	utils.saveConsent(consent);
				document.getElementById('kf-cookie-modal-setting').style.display = 'none';
				objBanner.hide();
			});
			//
			document.getElementById('kf-cookie-settings').addEventListener('click', () => {
				document.getElementById('kf-cookie-modal-setting').style.display = 'block';
				objErrors.auditLog('BANNER_HIDES');
			});
			//
			document.getElementById('kf-cookie-close').addEventListener('click', () => {
				document.getElementById('kf-cookie-modal-setting').style.display = 'none';
				objErrors.auditLog('BANNER_SHOWN');
			});
		},
		//> tampilkan consent banners
		show: function() {
		  if (state.bannerElement) {
			state.bannerElement.style.display = 'block';
		  }
		},
		//> sembunyikan consent banners
		hide: function() {
		  if (state.bannerElement) {
			state.bannerElement.style.display = 'none';
		  }
		}
	};
//> Core Loader
	const objLoader = {
		handleScroll() {if (window.scrollY > 100) {objLoader.showBanner();}},
		showBanner() {if (!state.consent && state.configs.consentRequired) {objBanner.show();}},
		init() {
		  if (state.configs.lazyLoadBanner) {
			window.addEventListener('scroll', this.handleScroll, {once: true});
			setTimeout(() => this.showBanner(), 3000);
		  }else {this.showBanner();}
		},
	};
	const objStyles = () => {
		const css_ = `

		`;
		const stl_ = document.createElement('style');
		stl_.textContent = css_;
		(document.head||document.body).appendChild(stl_);
	};
//> Public API
	const getAPI = {
		deleteCookie: function(name) {
			const fullName = `${state.configs.cookiesPrefix}${name}`;
			const kukiName = name.startsWith(state.configs.cookiesPrefix) ? name : fullName;
			utils.deleteCookie(kukiName);
			objErrors.auditLog('COOKIE_DELETED', { name });
			return true;
		},
		getCookie: function(name) {
			const fullName = `${state.configs.cookiesPrefix}${name}`;
			const kukiName = name.startsWith(state.configs.cookiesPrefix) ? name : fullName;
			return utils.getCookie(kukiName);
		},
		setCookie: function(name, value, days, category = 'necessary', options = {}) {
		  if (!state.isInitialized) this.init();
			let cookieName = name;
		  if (options.generateId)
			cookieName = utils.generateCookieId();
			const fullName = `${state.configs.cookiesPrefix}${cookieName}`;
			//> periksa consent untuk kategori
		  if (state.configs.consentRequired && !utils.hasConsent(category)) {
			console.warn(`[WARN]  ${modNames} tidak dapat menyetel cookie: Consent untuk kategori ${category} tidak diberikan`);
			state.coQueue.push({name: fullName, value, days, category});
			return false;
		  }
			//> tambahkan prefix jika diperlukan
			const kukiName = name.startsWith(state.configs.cookiesPrefix) ? name : fullName;
			utils.setCookie(kukiName, value, days);
			objErrors.auditLog('COOKIE_SET', {name, category});
			return true;
		},
		//> atur cookie untuk analytics
		setAnalyticsCookie(value, days) {
			const cookieName = utils.generateCookieId();
			return this.setCookie(cookieName, value, days, 'analytics');
		},
		//> rotasi cookie secara berkala
		rotateAnalyticsCookies() {
			//> hapus cookie analytics lama
			const cAnalytics = document.cookie.match(/ulpc_id_.*/g) || [];
			cAnalytics.forEach(cookie => {
				const name = cookie.split('=')[0];
				utils.deleteCookie(name);
			});
			//> buat cookie baru
			this.setAnalyticsCookie('fresh', 30);
		},
		//> dapatkan atau buat cookie UserID
		getOrCreateUserID() {
			const cookieName = `${state.configs.cookiePrefix}user_id`;
			let userId = utils.getCookie(cookieName);
		  if (!userId) {
			userId = utils.generateCookieId();
			utils.setCookie(cookieName, userId, 365, 'analytics');
		  }	return userId;
		},
		getConsent: function() {return {...state.consent};},
		hasConsent: (category) => utils.hasConsent(category),
		updateConsent: function(consent) {
			utils.saveConsent(consent);
			utils.unblockScripts();
			utils.processCookieQueue();
			utils.updateGoogleConsent();
			return true;
		},
		hideBanner: function() {if (state.bannerElement) {objBanner.hide();}},
		showBanner: function() {if (!state.bannerElement) {objBanner.create();}objBanner.show();},
		//> Google Consent Mode helpers
		gtag() {
		  if (window.gtag) {
			window.gtag(...arguments);
		  }else {
			console.warn('gtag not loaded');
		  }
		},
		on: (evt, cb_) => utils.on(evt, cb_),
		off: (evt, cb_) => utils.off(evt, cb_),
		init: function(userConfig = {}) {
		  if (state.isInitialized) return;
			gtag('configs', 'UA-XXXXX-Y');  //> inisialisasi Google Analytics
			//> gabungkan konfigurasi
			state.configs = {...defaultConfig, ...userConfig};
			//> deteksi peraturan privasi
			const privacyLaw = utils.detectPrivacyLaw();
			state.configs.consentRequired = privacyLaw !== 'none';
			//> muat consent yang tersimpan
			state.consent = utils.loadConsent();
			//> jika consent belum ada dan diperlukan, tampilkan banner
			const consentRequired = state.configs.consentRequired && utils.shouldRequireConsent();
			  if (!state.consent && consentRequired) {
			// Set consent default (hanya yang required)
				const defaultConsent = {};
				  for (const cat in state.configs.kelompok) {
					defaultConsent[cat] = state.configs.kelompok[cat].required;
				  }	state.consent = defaultConsent;
					utils.saveConsent(state.consent);
			//> blokir script yang tidak diizinkan
				utils.blockScripts();
			//> inisialisasi dan buat banner jika diinginkan
				  if (state.configs.autoShowBanner) {
//					objBanner.create();
//					objBanner.show();
					objLoader.init();
				  }
			  }
			state.isInitialized = true;
			objErrors.auditLog('MODULE_INITIALIZED');
			return true;
		}
	};
  if (typeof document !== 'undefined') {
	document.addEventListener('DOMContentLoaded', function() {getAPI.init();});
  }	objStyles();
	return getAPI;
})(/*
 ** `self` is undefined in Firefox for Android content script context
 ** while `this` is nsIContentFrameMessageManager
 ** with an attribute `content` that corresponds to the window
 */	typeof self !== 'undefined' && self ||
	typeof window !== 'undefined' && window ||
	this.content
);/*  Ekspor modul: UMD (Universal Module Definition)
 */ (function(root, factory) {
  if ((typeof define !== 'undefined' || define !== null) &&
  typeof define === 'function' && define.amd) {
	define([], factory);
  }else if ((typeof module !== 'undefined' || typeof module !== null) &&
  typeof module === 'object' && module.exports) {
	module.exports = factory();
  }else {
	root.ULPCookies = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
	return ULPCookies;
}));
