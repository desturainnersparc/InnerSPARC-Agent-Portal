/**
 * CertificationPanel.js
 * Standalone panel variant aligned with runtime certification-panel.js.
 */

(function (window, document) {
  'use strict';

  async function waitForCertificateAssets(certNode) {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    var images = Array.from(certNode.querySelectorAll('img'));
    await Promise.all(images.map(function (img) {
      if (img.complete) {
        if (typeof img.decode === 'function') {
          return img.decode().catch(function () { return null; });
        }
        return Promise.resolve();
      }

      return new Promise(function (resolve) {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
  }

  async function downloadCertificateAsPdf(selectorOrElement, filename) {
    var cert = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;

    if (!cert) {
      throw new Error('Certificate element not found.');
    }

    if (typeof window.html2canvas !== 'function') {
      throw new Error('html2canvas library is unavailable.');
    }

    var jsPdfApi = window.jspdf && window.jspdf.jsPDF;
    if (typeof jsPdfApi !== 'function') {
      throw new Error('jsPDF library is unavailable.');
    }

    await waitForCertificateAssets(cert);

    var clone = cert.cloneNode(true);
    clone.classList.add('cert-pdf-clone');
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';

    var bg = window.getComputedStyle(cert).backgroundColor;
    clone.style.background = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff';

    var sourceRect = cert.getBoundingClientRect();
    var width = Math.max(1, Math.round(sourceRect.width || cert.offsetWidth || cert.clientWidth));
    var height = Math.max(1, Math.round(sourceRect.height || cert.offsetHeight || cert.clientHeight));

    var offscreen = document.createElement('div');
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-99999px';
    offscreen.style.top = '0';
    offscreen.style.width = width + 'px';
    offscreen.style.height = height + 'px';
    offscreen.style.overflow = 'visible';
    offscreen.style.padding = '0';
    offscreen.style.margin = '0';
    offscreen.style.background = '#ffffff';
    offscreen.appendChild(clone);
    document.body.appendChild(offscreen);

    try {
      await waitForCertificateAssets(clone);

      var scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      var canvas = await window.html2canvas(clone, {
        scale: scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      var pdf = new jsPdfApi({
        unit: 'px',
        format: [canvas.width, canvas.height],
        compress: true
      });
      var imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(filename || 'certificate.pdf');
    } finally {
      if (offscreen.parentNode) {
        offscreen.parentNode.removeChild(offscreen);
      }
    }
  }

  window.downloadCertificateAsPdf = downloadCertificateAsPdf;

  var PANEL_SEQ = 0;

  var DEFAULT_MOCK_CERTIFICATE = {
    fullName: 'Chrishawnee Bertillo',
    certificateDescription: 'Has successfully completed the Employee Onboarding Program.',
    templateImageUrl: '/static/images/Certificate_completion.png',
    programTitle: 'Employee Onboarding Program',
    completionDate: 'March 25, 2026',
    certificateId: 'OB-2026-00124',
    issuedBy: 'HR Department',
    issuedTitle: 'Director, People Operations',
    logoUrl: ''
  };

  function CertificationPanel(options) {
    options = options || {};
    this.devMode = options.devMode !== false;
    this.onPrev = typeof options.onPrev === 'function' ? options.onPrev : null;
    this.instanceId = ++PANEL_SEQ;
    this.state = {
      completed: false,
      certificate: null
    };
  }

  CertificationPanel.prototype.render = function (target, data) {
    var container = typeof target === 'string' ? document.querySelector(target) : target;

    if (!container) {
      console.error('[CertificationPanel] Target container not found:', target);
      return;
    }

    this.state = {
      completed: data && data.completed === true,
      certificate: data && data.certificate ? data.certificate : DEFAULT_MOCK_CERTIFICATE
    };

    container.innerHTML = this.state.completed
      ? this._buildCertificateHTML(this.state.certificate)
      : this._buildEmptyStateHTML();

    this._attachEventListeners(container);
  };

  CertificationPanel.prototype._buildEmptyStateHTML = function () {
    return '' +
      '<section class="cert-panel cert-panel--empty" aria-label="Certificate of Completion">' +
        '<div class="cert-empty">' +
          '<div class="cert-empty-icon">' +
            '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
              '<path d="M9 12l2 2 4-4M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"></path>' +
            '</svg>' +
          '</div>' +
          '<h3 class="cert-empty-title">Certificate of Completion</h3>' +
          '<p class="cert-empty-message">Complete your onboarding program to unlock your Certificate of Completion.</p>' +
          '<p class="cert-empty-hint">You\'re on track! Finish all remaining steps to earn your certificate.</p>' +
        '</div>' +
      '</section>';
  };

  CertificationPanel.prototype._buildCertificateHTML = function (cert) {
    return '' +
      '<section class="cert-panel cert-panel--ready cert-section" aria-label="Certificate of Completion">' +
        '<div class="cert-header-bar">' +
          '<div class="cert-header-left">' +
            '<span class="cert-success-icon" aria-hidden="true">&#10003;</span>' +
            '<span class="cert-header-text">Congratulations! Your certificate is ready</span>' +
          '</div>' +
        '</div>' +
        '<div class="cert-wrapper" id="cpWrapper-' + String(this.instanceId) + '">' +
          '<div class="cert-inner">' + this._buildCertificateContent(cert) + '</div>' +
        '</div>' +
        '<footer class="tpl1-foot" role="contentinfo">' +
          '<span class="tpl1-note">Congratulations</span>' +
          '<div class="tpl1-controls">' +
            '<button class="tpl1-btn" type="button" id="certPrev" aria-label="Previous">Prev</button>' +
            '<button class="tpl1-btn primary" type="button" id="certDownload" aria-label="Download certificate">Download</button>' +
          '</div>' +
        '</footer>' +
      '</section>';
  };

  CertificationPanel.prototype._buildCertificateContent = function (cert) {
    var templateImageUrl = cert.templateImageUrl || '/static/images/Certificate_completion.png';
    var description = (cert.certificateDescription || '').trim();
    if (!description) {
      description = 'Has successfully completed the Employee Onboarding Program.';
    }

    return '' +
      '<div class="cert-content cert-canvas-scale">' +
      '<article class="cert-document cert-canvas-frame" id="certificate-standalone-' + String(this.instanceId) + '">' +
        '<img src="' + this._escapeHtml(templateImageUrl) + '" alt="Certificate template" class="cert-template-image" aria-hidden="true" />' +
        '<main class="cert-overlay-fields" aria-label="Certificate personalization">' +
          '<p class="cert-recipient-name">' + this._escapeHtml(cert.fullName) + '</p>' +
          '<p class="cert-description-text">' + this._escapeHtml(description) + '</p>' +
        '</main>' +
      '</article>' +
      '</div>';
  };

  CertificationPanel.prototype._attachEventListeners = function (container) {
    var self = this;
    var prevBtn = container.querySelector('#certPrev');
    var downloadBtn = container.querySelector('#certDownload');

    if (prevBtn) {
      prevBtn.addEventListener('click', function (event) {
        event.preventDefault();
        if (self.onPrev) {
          self.onPrev();
        } else if (typeof window.prev === 'function') {
          window.prev();
        } else {
          window.history.back();
        }
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function (event) {
        event.preventDefault();
        self.downloadCertificate();
      });
    }

  };

  CertificationPanel.prototype.downloadCertificate = function () {
    var cert = this.state.certificate || {};
    var certId = cert.certificateId ? String(cert.certificateId) : 'certificate';
    var safeCertId = certId.replace(/[^a-zA-Z0-9_-]+/g, '-');
    var fileName = 'Certificate-' + safeCertId + '.pdf';
    var selector = '#certificate-standalone-' + String(this.instanceId);

    if (typeof window.downloadCertificateAsPdf !== 'function') {
      alert('PDF export library is unavailable. Please refresh and try again.');
      return;
    }

    window.downloadCertificateAsPdf(selector, fileName).catch(function (error) {
      console.error('Certificate PDF error', error);
      alert('Unable to generate PDF. Please try again.');
    });
  };

  CertificationPanel.prototype._escapeHtml = function (text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  };

  window.CertificationPanel = CertificationPanel;
})(window, document);
